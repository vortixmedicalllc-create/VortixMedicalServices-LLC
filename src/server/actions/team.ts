"use server";

import { revalidatePath } from "next/cache";
import { and, count, eq, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { AuthError, destroyAllSessionsForUser, requireActionUser } from "../auth";
import { assignableRoles, canManageUser } from "../permissions";
import { audit } from "../events";
import { issueAuthToken } from "../tokens";
import { appUrl, escapeHtml, isEmailConfigured, sendEmail } from "../email";
import { ROLES, roleLabels, type Role } from "../constants";
import { fieldErrors, formObject, type ActionResult } from "../validation";

export type TeamResult = ActionResult & { link?: string; emailed?: boolean };

function fail(e: unknown): TeamResult {
  if (e instanceof AuthError) return { ok: false, error: e.message };
  console.error("[team] action failed:", e instanceof Error ? e.message : "unknown");
  return { ok: false, error: "Something went wrong. Please try again." };
}

const userSchema = z.object({
  name: z.string().trim().min(2, "Enter a name.").max(100),
  email: z.string().trim().toLowerCase().email("Enter a valid email address.").max(160),
  jobTitle: z.string().trim().max(100).optional(),
  role: z.enum(ROLES),
});

async function ownersLeft(excludeId: string) {
  const db = await getDb();
  const [{ n }] = await db.select({ n: count() }).from(users).where(and(eq(users.role, "owner"), eq(users.isActive, true), ne(users.id, excludeId)));
  return n;
}

async function sendInvite(email: string, name: string, link: string, inviter: string) {
  if (!isEmailConfigured()) return false;
  const r = await sendEmail({
    to: email,
    subject: "You have been invited to Vortix CRM",
    html: `<p>Hello ${escapeHtml(name)},</p><p>${escapeHtml(inviter)} created a Vortix CRM account for you. Use the link below to set your password. The link expires in 72 hours and can be used once.</p><p><a href="${link}">Set your password</a></p>`,
  });
  return r.sent;
}

export async function createUserAction(_: TeamResult, fd: FormData): Promise<TeamResult> {
  try {
    const actor = await requireActionUser("team.manage");
    const parsed = userSchema.safeParse(formObject(fd));
    if (!parsed.success) return { ok: false, error: "Please correct the highlighted fields.", fields: fieldErrors(parsed.error) };
    const u = parsed.data;
    if (!assignableRoles(actor.role).includes(u.role)) return { ok: false, error: "You cannot assign that role.", fields: { role: "Not permitted" } };
    const db = await getDb();
    const [exists] = await db.select({ id: users.id }).from(users).where(sql`lower(${users.email}) = ${u.email}`);
    if (exists) return { ok: false, error: "A user with this email already exists.", fields: { email: "Already in use" } };
    const [row] = await db.insert(users).values({ name: u.name, email: u.email, jobTitle: u.jobTitle ?? null, role: u.role }).returning({ id: users.id });
    const token = await issueAuthToken(row.id, "invite", actor.id);
    const link = appUrl(`/crm/reset-password?token=${token}`);
    const emailed = await sendInvite(u.email, u.name, link, actor.name);
    await audit(db, { actorId: actor.id, action: "user.create", entityType: "user", entityId: row.id, changes: { role: u.role, emailed } });
    revalidatePath("/crm/team");
    return { ok: true, link, emailed, message: `${u.name} was added as ${roleLabels[u.role]}.` };
  } catch (e) {
    return fail(e);
  }
}

export async function updateUserAction(id: string, _: TeamResult, fd: FormData): Promise<TeamResult> {
  try {
    const actor = await requireActionUser("team.manage");
    const db = await getDb();
    const [target] = await db.select().from(users).where(eq(users.id, id));
    if (!target) return { ok: false, error: "User not found." };
    if (!canManageUser(actor, target)) throw new AuthError("Only an Owner can change an Owner account.");
    const parsed = userSchema.safeParse(formObject(fd));
    if (!parsed.success) return { ok: false, error: "Please correct the highlighted fields.", fields: fieldErrors(parsed.error) };
    const u = parsed.data;
    if (u.role !== target.role && !assignableRoles(actor.role).includes(u.role)) return { ok: false, error: "You cannot assign that role." };
    if (target.role === "owner" && u.role !== "owner" && (await ownersLeft(id)) === 0) return { ok: false, error: "At least one active Owner is required." };
    if (u.email !== target.email.toLowerCase()) {
      const [exists] = await db.select({ id: users.id }).from(users).where(and(sql`lower(${users.email}) = ${u.email}`, ne(users.id, id)));
      if (exists) return { ok: false, error: "Another user already uses this email.", fields: { email: "Already in use" } };
    }
    await db.update(users).set({ name: u.name, email: u.email, jobTitle: u.jobTitle ?? null, role: u.role, updatedAt: new Date() }).where(eq(users.id, id));
    await audit(db, {
      actorId: actor.id,
      action: "user.update",
      entityType: "user",
      entityId: id,
      changes: { ...(u.role !== target.role ? { role: { from: target.role, to: u.role } } : {}), ...(u.email !== target.email ? { email: "changed" } : {}) },
    });
    if (u.role !== target.role) await destroyAllSessionsForUser(id); // new permissions take effect at next sign-in
    revalidatePath("/crm/team");
    return { ok: true, message: "User updated." };
  } catch (e) {
    return fail(e);
  }
}

export async function setUserActiveAction(id: string, active: boolean): Promise<TeamResult> {
  try {
    const actor = await requireActionUser("team.manage");
    if (id === actor.id) return { ok: false, error: "You cannot deactivate your own account." };
    const db = await getDb();
    const [target] = await db.select().from(users).where(eq(users.id, id));
    if (!target) return { ok: false, error: "User not found." };
    if (!canManageUser(actor, target)) throw new AuthError("Only an Owner can change an Owner account.");
    if (!active && target.role === "owner" && (await ownersLeft(id)) === 0) return { ok: false, error: "At least one active Owner is required." };
    await db.update(users).set({ isActive: active, updatedAt: new Date() }).where(eq(users.id, id));
    if (!active) await destroyAllSessionsForUser(id);
    await audit(db, { actorId: actor.id, action: active ? "user.activate" : "user.deactivate", entityType: "user", entityId: id });
    revalidatePath("/crm/team");
    return { ok: true, message: active ? "User activated." : "User deactivated and signed out. Their records stay assigned until you reassign them." };
  } catch (e) {
    return fail(e);
  }
}

export async function issueResetLinkAction(id: string): Promise<TeamResult> {
  try {
    const actor = await requireActionUser("team.manage");
    const db = await getDb();
    const [target] = await db.select().from(users).where(eq(users.id, id));
    if (!target) return { ok: false, error: "User not found." };
    if (!canManageUser(actor, target)) throw new AuthError("Only an Owner can change an Owner account.");
    const purpose = target.passwordHash ? "reset" : "invite";
    const token = await issueAuthToken(id, purpose, actor.id);
    const link = appUrl(`/crm/reset-password?token=${token}`);
    const emailed = purpose === "invite" ? await sendInvite(target.email, target.name, link, actor.name) : (await sendEmail({ to: target.email, subject: "Reset your Vortix CRM password", html: `<p>An administrator issued a password reset for your account. The link expires in 60 minutes.</p><p><a href="${link}">Reset password</a></p>` })).sent;
    await audit(db, { actorId: actor.id, action: `user.${purpose}_link`, entityType: "user", entityId: id, changes: { emailed } });
    return { ok: true, link, emailed };
  } catch (e) {
    return fail(e);
  }
}

export type { Role };

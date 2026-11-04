"use server";

import { revalidatePath } from "next/cache";
import { asc, count, eq, gt, inArray, lt, desc, max } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { companySettings, deals, leadSources, pipelineStages, serviceCategories, users } from "@/db/schema";
import { AuthError, destroyAllSessionsForUser, createSession, hashPassword, passwordProblems, requireActionUser, verifyPassword } from "../auth";
import { audit } from "../events";
import { fieldErrors, formObject, type ActionResult } from "../validation";

function fail(e: unknown): ActionResult {
  if (e instanceof AuthError) return { ok: false, error: e.message };
  console.error("[settings] action failed:", e instanceof Error ? e.message : "unknown");
  return { ok: false, error: "Something went wrong. Please try again." };
}

const timezones = new Set(Intl.supportedValuesOf("timeZone"));

export async function saveCompanySettingsAction(_: ActionResult, fd: FormData): Promise<ActionResult> {
  try {
    const user = await requireActionUser("settings.manage");
    const o = formObject(fd);
    const rr = fd.getAll("roundRobinUserIds").map(String).filter(Boolean);
    const parsed = z
      .object({
        companyName: z.string().trim().min(2, "Enter the company name.").max(120),
        logoUrl: z.string().trim().regex(/^\/[\w\-./]+\.(png|svg|jpg|jpeg|webp)$/i, "Use a path to an image in the public folder, such as /images/brand/vortix-logo.png."),
        currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/, "Use a 3-letter currency code such as USD."),
        timezone: z.string().refine((t) => timezones.has(t), "Choose a valid time zone."),
        assignmentMode: z.enum(["unassigned", "user", "round_robin"]),
        assignmentUserId: z.string().uuid().optional(),
      })
      .safeParse(o);
    if (!parsed.success) return { ok: false, error: "Please correct the highlighted fields.", fields: fieldErrors(parsed.error) };
    const s = parsed.data;
    if (s.assignmentMode === "user" && !s.assignmentUserId) return { ok: false, error: "Choose who receives new website leads.", fields: { assignmentUserId: "Required" } };
    if (s.assignmentMode === "round_robin" && rr.length < 1) return { ok: false, error: "Choose at least one team member for round-robin assignment.", fields: { roundRobinUserIds: "Required" } };
    const db = await getDb();
    if (rr.length) {
      const valid = await db.select({ id: users.id }).from(users).where(inArray(users.id, rr));
      if (valid.length !== rr.length) return { ok: false, error: "Invalid team member selection." };
    }
    await db
      .update(companySettings)
      .set({
        companyName: s.companyName,
        logoUrl: s.logoUrl,
        currency: s.currency,
        timezone: s.timezone,
        assignmentMode: s.assignmentMode,
        assignmentUserId: s.assignmentMode === "user" ? s.assignmentUserId! : null,
        roundRobinUserIds: s.assignmentMode === "round_robin" ? rr : [],
        updatedAt: new Date(),
      })
      .where(eq(companySettings.id, 1));
    await audit(db, { actorId: user.id, action: "settings.update", entityType: "settings", entityId: "company", changes: { ...s, roundRobinUserIds: rr } });
    revalidatePath("/crm", "layout");
    return { ok: true, message: "Settings saved." };
  } catch (e) {
    return fail(e);
  }
}

/* ---------------- Lookups ---------------- */

type LookupKind = "sources" | "services" | "stages";
const table = (k: LookupKind) => (k === "sources" ? leadSources : k === "services" ? serviceCategories : pipelineStages);
const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 50);

export async function addLookupAction(kind: LookupKind, _: ActionResult, fd: FormData): Promise<ActionResult> {
  try {
    const user = await requireActionUser("settings.manage");
    const label = String(fd.get("label") || "").trim();
    if (label.length < 2 || label.length > 60) return { ok: false, error: "Enter a name between 2 and 60 characters." };
    const db = await getDb();
    const t = table(kind);
    const key = slug(label) || `item_${Date.now()}`;
    const [exists] = await db.select({ id: t.id }).from(t).where(eq(t.key, key));
    if (exists) return { ok: false, error: "An item with this name already exists." };
    const [{ m }] = await db.select({ m: max(t.sortOrder) }).from(t);
    if (kind === "stages") {
      // New stages go before the closing (won/lost) stages.
      const closing = await db.select().from(pipelineStages).where(eq(pipelineStages.isWon, true));
      const lost = await db.select().from(pipelineStages).where(eq(pipelineStages.isLost, true));
      const firstClosing = Math.min(...[...closing, ...lost].map((s) => s.sortOrder), (m ?? 0) + 1);
      const toShift = await db.select().from(pipelineStages).where(gt(pipelineStages.sortOrder, firstClosing - 1)).orderBy(desc(pipelineStages.sortOrder));
      for (const s of toShift) await db.update(pipelineStages).set({ sortOrder: s.sortOrder + 1 }).where(eq(pipelineStages.id, s.id));
      await db.insert(pipelineStages).values({ key, label, sortOrder: firstClosing });
    } else {
      await db.insert(t).values({ key, label, sortOrder: (m ?? 0) + 1 });
    }
    await audit(db, { actorId: user.id, action: "settings.lookup_add", entityType: kind, entityId: key, changes: { label } });
    revalidatePath("/crm", "layout");
    return { ok: true, message: `"${label}" added.` };
  } catch (e) {
    return fail(e);
  }
}

export async function updateLookupAction(kind: LookupKind, id: number, patch: { label?: string; isActive?: boolean; move?: "up" | "down" }): Promise<ActionResult> {
  try {
    const user = await requireActionUser("settings.manage");
    const db = await getDb();
    const t = table(kind);
    const [item] = await db.select().from(t).where(eq(t.id, id));
    if (!item) return { ok: false, error: "Item not found." };
    if (patch.label !== undefined) {
      const label = patch.label.trim();
      if (label.length < 2 || label.length > 60) return { ok: false, error: "Enter a name between 2 and 60 characters." };
      await db.update(t).set({ label }).where(eq(t.id, id));
    }
    if (patch.isActive !== undefined) {
      if (kind === "sources" && item.key === "website" && !patch.isActive) return { ok: false, error: "The Website source is used by the contact form and cannot be deactivated." };
      if (kind === "stages" && !patch.isActive) {
        const s = item as typeof pipelineStages.$inferSelect;
        if (s.isWon || s.isLost) return { ok: false, error: "The Won and Lost stages are required." };
        const [{ n }] = await db.select({ n: count() }).from(deals).where(eq(deals.stageId, id));
        if (n > 0) return { ok: false, error: `Move the ${n} deal${n === 1 ? "" : "s"} in this stage before deactivating it.` };
      }
      await db.update(t).set({ isActive: patch.isActive }).where(eq(t.id, id));
    }
    if (patch.move) {
      const [neighbor] = await db
        .select()
        .from(t)
        .where(patch.move === "up" ? lt(t.sortOrder, item.sortOrder) : gt(t.sortOrder, item.sortOrder))
        .orderBy(patch.move === "up" ? desc(t.sortOrder) : asc(t.sortOrder))
        .limit(1);
      if (neighbor) {
        await db.update(t).set({ sortOrder: neighbor.sortOrder }).where(eq(t.id, item.id));
        await db.update(t).set({ sortOrder: item.sortOrder }).where(eq(t.id, neighbor.id));
      }
    }
    await audit(db, { actorId: user.id, action: "settings.lookup_update", entityType: kind, entityId: item.key, changes: patch });
    revalidatePath("/crm", "layout");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/* ---------------- Profile ---------------- */

export async function saveProfileAction(_: ActionResult, fd: FormData): Promise<ActionResult> {
  try {
    const user = await requireActionUser();
    const name = String(fd.get("name") || "").trim();
    const jobTitle = String(fd.get("jobTitle") || "").trim();
    if (name.length < 2 || name.length > 100) return { ok: false, error: "Enter your name.", fields: { name: "Required" } };
    const prefs = {
      newLeadAssigned: fd.get("newLeadAssigned") === "on",
      taskAssigned: fd.get("taskAssigned") === "on",
      taskDue: fd.get("taskDue") === "on",
      dealChanges: fd.get("dealChanges") === "on",
    };
    const db = await getDb();
    await db.update(users).set({ name, jobTitle: jobTitle || null, notificationPrefs: prefs, updatedAt: new Date() }).where(eq(users.id, user.id));
    await audit(db, { actorId: user.id, action: "profile.update", entityType: "user", entityId: user.id, changes: { prefs } });
    revalidatePath("/crm", "layout");
    return { ok: true, message: "Profile saved." };
  } catch (e) {
    return fail(e);
  }
}

export async function changePasswordAction(_: ActionResult, fd: FormData): Promise<ActionResult> {
  try {
    const user = await requireActionUser();
    const current = String(fd.get("current") || "");
    const next = String(fd.get("next") || "");
    const confirm = String(fd.get("confirm") || "");
    const db = await getDb();
    const [row] = await db.select({ hash: users.passwordHash }).from(users).where(eq(users.id, user.id));
    if (!(await verifyPassword(current, row?.hash))) return { ok: false, error: "Your current password is incorrect.", fields: { current: "Incorrect" } };
    const problem = passwordProblems(next);
    if (problem) return { ok: false, error: problem, fields: { next: problem } };
    if (next !== confirm) return { ok: false, error: "The new passwords do not match.", fields: { confirm: "Does not match" } };
    await db.update(users).set({ passwordHash: await hashPassword(next), updatedAt: new Date() }).where(eq(users.id, user.id));
    await audit(db, { actorId: user.id, action: "auth.password_changed", entityType: "user", entityId: user.id });
    // Sign out other devices, keep this one signed in with a fresh session
    await destroyAllSessionsForUser(user.id);
    await createSession(user.id);
    return { ok: true, message: "Password changed. Other devices have been signed out." };
  } catch (e) {
    return fail(e);
  }
}

export type { LookupKind };

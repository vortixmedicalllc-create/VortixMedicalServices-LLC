"use server";

import { redirect } from "next/navigation";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { timingSafeEqual } from "node:crypto";
import { getDb } from "@/db";
import { authTokens, users } from "@/db/schema";
import {
  clientIp,
  createSession,
  destroyAllSessionsForUser,
  destroySession,
  getCurrentUser,
  hashPassword,
  hashToken,
  passwordProblems,
  rateLimit,
  verifyPassword,
} from "../auth";
import { audit } from "../events";
import { hasAnyUser, issueAuthToken } from "../tokens";
import { appUrl, escapeHtml, isEmailConfigured, sendEmail } from "../email";

export type FormState = { ok?: boolean; error?: string; message?: string; fields?: Record<string, string> };

const DUMMY_HASH = "scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA==$" + "A".repeat(86) + "==";

export async function loginAction(_: FormState, fd: FormData): Promise<FormState> {
  const email = String(fd.get("email") || "").trim().toLowerCase();
  const password = String(fd.get("password") || "");
  if (!email || !password) return { error: "Enter your email and password." };

  const ip = await clientIp();
  if (rateLimit(`login:${ip}`, 20, 15 * 60_000) || rateLimit(`login:${email}`, 6, 15 * 60_000)) {
    return { error: "Too many sign-in attempts. Please wait 15 minutes and try again." };
  }

  const db = await getDb();
  const [user] = await db.select().from(users).where(sql`lower(${users.email}) = ${email}`).limit(1);
  // Always run a hash comparison to avoid revealing whether the account exists.
  const valid = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !valid || !user.isActive) {
    return { error: "The email or password is incorrect, or the account is inactive." };
  }
  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));
  await audit(db, { actorId: user.id, action: "auth.login", entityType: "user", entityId: user.id, changes: { ip } });
  await createSession(user.id);
  const next = String(fd.get("next") || "");
  redirect(next.startsWith("/crm/") && !next.startsWith("//") ? next : "/crm/dashboard");
}

export async function logoutAction() {
  const user = await getCurrentUser();
  await destroySession();
  if (user) {
    const db = await getDb();
    await audit(db, { actorId: user.id, action: "auth.logout", entityType: "user", entityId: user.id });
  }
  redirect("/crm/login");
}

export async function requestResetAction(_: FormState, fd: FormData): Promise<FormState> {
  const email = String(fd.get("email") || "").trim().toLowerCase();
  if (!email) return { error: "Enter your email address." };
  if (!isEmailConfigured()) {
    return {
      error:
        "Password reset email is not configured for this CRM yet. Please ask an Owner or Admin to generate a reset link for you from the Team page.",
    };
  }
  const ip = await clientIp();
  if (rateLimit(`reset:${ip}`, 5, 15 * 60_000)) return { error: "Too many requests. Please try again later." };

  const db = await getDb();
  const [user] = await db.select().from(users).where(sql`lower(${users.email}) = ${email}`).limit(1);
  if (user && user.isActive) {
    const token = await issueAuthToken(user.id, "reset", null);
    const link = appUrl(`/crm/reset-password?token=${token}`);
    await sendEmail({
      to: user.email,
      subject: "Reset your Vortix CRM password",
      html: `<p>Hello ${escapeHtml(user.name)},</p><p>Use the link below to set a new password. It expires in 60 minutes and can be used once.</p><p><a href="${link}">Reset password</a></p><p>If you did not request this, you can ignore this email.</p>`,
    });
    await audit(db, { actorId: null, action: "auth.reset_requested", entityType: "user", entityId: user.id });
  }
  // Same response whether or not the account exists
  return { ok: true, message: "If an active account uses that email, a reset link has been sent. Check your inbox." };
}

export async function resetPasswordAction(_: FormState, fd: FormData): Promise<FormState> {
  const token = String(fd.get("token") || "");
  const password = String(fd.get("password") || "");
  const confirm = String(fd.get("confirm") || "");
  const problem = passwordProblems(password);
  if (problem) return { error: problem };
  if (password !== confirm) return { error: "The passwords do not match." };

  const db = await getDb();
  const [row] = await db
    .select()
    .from(authTokens)
    .where(and(eq(authTokens.id, hashToken(token)), isNull(authTokens.usedAt), gt(authTokens.expiresAt, new Date())))
    .limit(1);
  if (!row) return { error: "This link is invalid or has expired. Please request a new one." };

  await db.transaction(async (tx) => {
    await tx.update(authTokens).set({ usedAt: new Date() }).where(eq(authTokens.id, row.id));
    await tx.update(users).set({ passwordHash: await hashPassword(password), updatedAt: new Date() }).where(eq(users.id, row.userId));
    await audit(tx, { actorId: row.userId, action: row.purpose === "invite" ? "auth.invite_accepted" : "auth.password_reset", entityType: "user", entityId: row.userId });
  });
  await destroyAllSessionsForUser(row.userId);
  redirect("/crm/login?reset=1");
}

/* ---------------- First owner setup ---------------- */

export async function setupOwnerAction(_: FormState, fd: FormData): Promise<FormState> {
  const expected = process.env.CRM_SETUP_TOKEN || "";
  const provided = String(fd.get("setupToken") || "");
  if (expected.length < 16) return { error: "Setup is disabled. Set CRM_SETUP_TOKEN (at least 16 characters) in the environment." };
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return { error: "The setup token is incorrect." };
  if (await hasAnyUser()) return { error: "Setup has already been completed." };

  const name = String(fd.get("name") || "").trim();
  const email = String(fd.get("email") || "").trim().toLowerCase();
  const password = String(fd.get("password") || "");
  if (name.length < 2) return { error: "Enter your name." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return { error: "Enter a valid email address." };
  const problem = passwordProblems(password);
  if (problem) return { error: problem };

  const db = await getDb();
  const [u] = await db
    .insert(users)
    .values({ name, email, role: "owner", passwordHash: await hashPassword(password), lastLoginAt: new Date() })
    .returning({ id: users.id });
  await audit(db, { actorId: u.id, action: "setup.owner_created", entityType: "user", entityId: u.id });
  await createSession(u.id);
  redirect("/crm/dashboard");
}

import "server-only";
import { createHash, randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq, gt, lt } from "drizzle-orm";
import { getDb } from "@/db";
import { sessions, users, type User } from "@/db/schema";
import { can, type Permission } from "./permissions";
import type { Role } from "./constants";

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, keylen: number, opts: object) => Promise<Buffer>;

export const SESSION_COOKIE = "vx_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days
const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64 };
export const MIN_PASSWORD_LENGTH = 12;

/* ---------------- Passwords (Node.js built-in scrypt) ---------------- */

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const key = await scrypt(password.normalize("NFKC"), salt, SCRYPT.keylen, { N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p, maxmem: 64 * 1024 * 1024 });
  return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${salt.toString("base64")}$${key.toString("base64")}`;
}

export async function verifyPassword(password: string, stored: string | null | undefined) {
  if (!stored) return false;
  const [alg, N, r, p, saltB64, keyB64] = stored.split("$");
  if (alg !== "scrypt") return false;
  const expected = Buffer.from(keyB64, "base64");
  const key = await scrypt(password.normalize("NFKC"), Buffer.from(saltB64, "base64"), expected.length, {
    N: Number(N),
    r: Number(r),
    p: Number(p),
    maxmem: 64 * 1024 * 1024,
  });
  return key.length === expected.length && timingSafeEqual(key, expected);
}

export function passwordProblems(pw: string): string | null {
  if (pw.length < MIN_PASSWORD_LENGTH) return `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
  if (pw.length > 200) return "Password is too long.";
  if (!/[a-zA-Z]/.test(pw) || !/[0-9\W_]/.test(pw)) return "Include letters and at least one number or symbol.";
  return null;
}

/* ---------------- Tokens ---------------- */

export function newToken() {
  return randomBytes(32).toString("base64url");
}
export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

/* ---------------- Sessions ---------------- */

export async function createSession(userId: string) {
  const db = await getDb();
  const token = newToken();
  const h = await headers();
  await db.insert(sessions).values({
    id: hashToken(token),
    userId,
    expiresAt: new Date(Date.now() + SESSION_TTL_MS),
    userAgent: (h.get("user-agent") || "").slice(0, 300),
  });
  // Opportunistic cleanup of expired sessions
  await db.delete(sessions).where(lt(sessions.expiresAt, new Date()));
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    const db = await getDb();
    await db.delete(sessions).where(eq(sessions.id, hashToken(token)));
  }
  jar.delete(SESSION_COOKIE);
}

export async function destroyAllSessionsForUser(userId: string) {
  const db = await getDb();
  await db.delete(sessions).where(eq(sessions.userId, userId));
}

export type SessionUser = Pick<User, "id" | "email" | "name" | "jobTitle" | "notificationPrefs"> & { role: Role };

/** Returns the signed-in, active user or null. Cached per request. */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const db = await getDb();
  const id = hashToken(token);
  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      jobTitle: users.jobTitle,
      role: users.role,
      isActive: users.isActive,
      notificationPrefs: users.notificationPrefs,
      lastSeenAt: sessions.lastSeenAt,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.id, id), gt(sessions.expiresAt, new Date())))
    .limit(1);
  const row = rows[0];
  if (!row || !row.isActive) return null;
  if (Date.now() - row.lastSeenAt.getTime() > 5 * 60 * 1000) {
    await db.update(sessions).set({ lastSeenAt: new Date() }).where(eq(sessions.id, id));
  }
  return { id: row.id, email: row.email, name: row.name, jobTitle: row.jobTitle, role: row.role, notificationPrefs: row.notificationPrefs };
});

/** For pages: redirect to login when not signed in. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/crm/login");
  return user;
}

export class AuthError extends Error {
  constructor(message = "You do not have permission to perform this action.") {
    super(message);
  }
}

/** For server actions and route handlers: throws when unauthorized. */
export async function requireActionUser(perm?: Permission): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new AuthError("Your session has expired. Please sign in again.");
  if (perm && !can(user.role, perm)) throw new AuthError();
  return user;
}

/** For pages: render a 403 state by redirecting to dashboard with a notice. */
export async function requirePagePermission(perm: Permission) {
  const user = await requireUser();
  if (!can(user.role, perm)) redirect("/crm/dashboard?denied=1");
  return user;
}

/* ---------------- Rate limiting (shared, database-backed) ---------------- */

export { rateLimit } from "./ratelimit";

export async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
}

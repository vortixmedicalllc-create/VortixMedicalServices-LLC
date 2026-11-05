import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { and, eq, isNotNull, lt, or } from "drizzle-orm";
import { getDb } from "@/db";
import { authTokens, rateLimits, sessions, users } from "@/db/schema";
import { refreshTaskReminders } from "@/server/notifications";
import { flushEmailOutbox, requeueFailedEmails } from "@/server/outbox";

/**
 * Daily maintenance, called by Vercel Cron (see vercel.json) or any scheduler:
 *   GET /api/cron/daily   with header   Authorization: Bearer <CRON_SECRET>
 *
 * 1. Creates due-soon and overdue task reminders for every active user.
 * 2. Sends queued notification emails (and retries earlier failures).
 * 3. Removes expired sessions, used or expired one-time tokens, and stale rate-limit rows.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

function authorized(req: NextRequest) {
  const secret = process.env.CRON_SECRET || "";
  if (secret.length < 16) return false;
  const given = Buffer.from(req.headers.get("authorization") || "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const db = await getDb();
  const now = new Date();

  const people = await db.select({ id: users.id }).from(users).where(eq(users.isActive, true));
  for (const p of people) await refreshTaskReminders(p.id);

  await requeueFailedEmails();
  const email = await flushEmailOutbox(200);

  await db.delete(sessions).where(lt(sessions.expiresAt, now));
  await db.delete(authTokens).where(or(lt(authTokens.expiresAt, new Date(now.getTime() - 7 * 86400_000)), and(isNotNull(authTokens.usedAt), lt(authTokens.usedAt, new Date(now.getTime() - 7 * 86400_000)))));
  await db.delete(rateLimits).where(lt(rateLimits.resetAt, now));

  return NextResponse.json({ ok: true, users: people.length, emailsSent: email.sent, emailsFailed: email.failed });
}

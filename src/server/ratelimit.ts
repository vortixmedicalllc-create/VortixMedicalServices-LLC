/**
 * Fixed-window rate limiting stored in PostgreSQL, so the limit holds across every
 * server instance (serverless hosts run many). Keys are hashed before storage, so
 * IP addresses and emails are not kept in readable form.
 */
import { createHash } from "node:crypto";
import { sql } from "drizzle-orm";
import { getDb } from "@/db";
import { rateLimits } from "@/db/schema";

const memory = new Map<string, { count: number; reset: number }>();

function memoryLimit(key: string, max: number, windowMs: number) {
  const now = Date.now();
  const b = memory.get(key);
  if (!b || b.reset < now) {
    memory.set(key, { count: 1, reset: now + windowMs });
    return false;
  }
  b.count += 1;
  return b.count > max;
}

/** Returns true when `key` has exceeded `max` attempts in the current `windowMs` window. */
export async function rateLimit(key: string, max: number, windowMs: number): Promise<boolean> {
  const hashed = createHash("sha256").update(key).digest("hex");
  try {
    const db = await getDb();
    const resetAt = new Date(Date.now() + windowMs);
    const [row] = await db
      .insert(rateLimits)
      .values({ key: hashed, count: 1, resetAt })
      .onConflictDoUpdate({
        target: rateLimits.key,
        set: {
          count: sql`case when ${rateLimits.resetAt} < now() then 1 else ${rateLimits.count} + 1 end`,
          resetAt: sql`case when ${rateLimits.resetAt} < now() then ${resetAt.toISOString()}::timestamptz else ${rateLimits.resetAt} end`,
        },
      })
      .returning({ count: rateLimits.count });
    return row.count > max;
  } catch (e) {
    // If the database is unavailable, fall back to a per-instance limit rather than failing open entirely.
    console.error("[ratelimit] falling back to memory:", e instanceof Error ? e.message.slice(0, 120) : "unknown");
    return memoryLimit(hashed, max, windowMs);
  }
}

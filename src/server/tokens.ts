import "server-only";
import { and, count, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { authTokens, users } from "@/db/schema";
import { hashToken, newToken } from "./auth";

/** Issues a one-time token. Returns the raw token (only ever shown or emailed once). */
export async function issueAuthToken(userId: string, purpose: "reset" | "invite", createdById: string | null) {
  const db = await getDb();
  const token = newToken();
  const ttl = purpose === "invite" ? 72 * 3600_000 : 60 * 60_000;
  // Invalidate any outstanding tokens of the same purpose
  await db
    .update(authTokens)
    .set({ usedAt: new Date() })
    .where(and(eq(authTokens.userId, userId), eq(authTokens.purpose, purpose), isNull(authTokens.usedAt)));
  await db.insert(authTokens).values({ id: hashToken(token), userId, purpose, expiresAt: new Date(Date.now() + ttl), createdById });
  return token;
}

export async function hasAnyUser() {
  const db = await getDb();
  const [{ n }] = await db.select({ n: count() }).from(users);
  return n > 0;
}


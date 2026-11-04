import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { getDb, DatabaseConfigError } from "@/db";

/**
 * Deployment health check. Reports whether the database is configured, reachable,
 * and migrated. It never returns connection strings, hostnames, or error text
 * from the database server, only a status code and a fix-it hint.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Status = "ok" | "not_configured" | "connection_failed" | "auth_failed" | "tables_missing" | "error";

const hints: Record<Status, string> = {
  ok: "Database is connected and migrated.",
  not_configured: "DATABASE_URL is not set in the hosting environment variables. Add it and redeploy.",
  connection_failed: "The database server could not be reached. Check the host in DATABASE_URL, and that the database is not paused.",
  auth_failed: "The database rejected the username or password in DATABASE_URL. Copy the connection string again.",
  tables_missing: "Connected, but the tables do not exist yet. Set DATABASE_AUTO_MIGRATE=true and redeploy, or run `npm run db:migrate`.",
  error: "Unexpected database error. Check the hosting provider's function logs.",
};

export async function GET() {
  let status: Status = "ok";
  let users: number | undefined;
  try {
    const db = await getDb();
    const r = await db.execute(sql`select to_regclass('public.users') is not null as ready`);
    const ready = (r.rows?.[0] as { ready?: boolean } | undefined)?.ready;
    if (!ready) status = "tables_missing";
    else {
      const c = await db.execute(sql`select count(*)::int as n from users`);
      users = (c.rows?.[0] as { n?: number } | undefined)?.n;
    }
  } catch (e) {
    const err = e as { code?: string; cause?: { code?: string } };
    const code = err?.code ?? err?.cause?.code ?? "";
    if (e instanceof DatabaseConfigError) status = "not_configured";
    else if (code === "28P01" || code === "28000") status = "auth_failed";
    else if (code === "42P01") status = "tables_missing";
    else if (["ENOTFOUND", "ECONNREFUSED", "ETIMEDOUT", "EAI_AGAIN", "ECONNRESET"].includes(code)) status = "connection_failed";
    else status = "error";
    console.error("[health] database check failed:", status, code || (e instanceof Error ? e.message : "unknown"));
  }
  return NextResponse.json(
    { status, hint: hints[status], ...(status === "ok" ? { accountsCreated: (users ?? 0) > 0 } : {}) },
    { status: status === "ok" ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}

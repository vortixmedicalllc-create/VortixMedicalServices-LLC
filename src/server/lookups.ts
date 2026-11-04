import "server-only";
import { cache } from "react";
import { and, asc, eq, isNull, or, type SQL, type AnyColumn } from "drizzle-orm";
import { getDb } from "@/db";
import { companySettings, leadSources, pipelineStages, serviceCategories, users } from "@/db/schema";
import { can } from "./permissions";
import type { SessionUser } from "./auth";

export const getSettings = cache(async () => {
  const db = await getDb();
  const [s] = await db.select().from(companySettings).where(eq(companySettings.id, 1));
  return s;
});

export const getServices = cache(async () => {
  const db = await getDb();
  return db.select().from(serviceCategories).orderBy(asc(serviceCategories.sortOrder));
});

export const getSources = cache(async () => {
  const db = await getDb();
  return db.select().from(leadSources).orderBy(asc(leadSources.sortOrder));
});

export const getStages = cache(async () => {
  const db = await getDb();
  return db.select().from(pipelineStages).orderBy(asc(pipelineStages.sortOrder));
});

/** Users that records can be assigned to. */
export const getTeam = cache(async () => {
  const db = await getDb();
  return db
    .select({ id: users.id, name: users.name, role: users.role, isActive: users.isActive, email: users.email })
    .from(users)
    .orderBy(asc(users.name));
});

export async function labelMaps() {
  const [services, sources, stages, team] = await Promise.all([getServices(), getSources(), getStages(), getTeam()]);
  return {
    service: Object.fromEntries(services.map((s) => [s.key, s.label])) as Record<string, string>,
    source: Object.fromEntries(sources.map((s) => [s.key, s.label])) as Record<string, string>,
    stage: Object.fromEntries(stages.map((s) => [s.id, s])) as Record<number, (typeof stages)[number]>,
    user: Object.fromEntries(team.map((u) => [u.id, u.name])) as Record<string, string>,
    services,
    sources,
    stages,
    team,
  };
}

/**
 * Restricts queries to records the user may see. Users without
 * `records.view_all` only see records they own, are assigned, or created.
 */
export function scopeWhere(user: SessionUser, cols: { owner?: AnyColumn; created?: AnyColumn }): SQL | undefined {
  if (can(user.role, "records.view_all")) return undefined;
  const conds: SQL[] = [];
  if (cols.owner) conds.push(eq(cols.owner, user.id));
  if (cols.created) conds.push(eq(cols.created, user.id));
  return or(...conds);
}

export function activeOnly(archivedCol: AnyColumn, showArchived?: boolean) {
  return showArchived ? undefined : isNull(archivedCol);
}

export { and };

/* ---------------- Formatting ---------------- */

export function fmtDate(d: Date | string | null | undefined, tz: string, withTime = false) {
  if (!d) return null;
  const date = typeof d === "string" ? new Date(d.length === 10 ? `${d}T12:00:00Z` : d) : d;
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    month: "short",
    day: "numeric",
    year: "numeric",
    ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
  }).format(date);
}

export function fmtMoney(v: string | number | null | undefined, currency: string) {
  if (v === null || v === undefined || v === "") return null;
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(Number(v));
  } catch {
    return `${currency} ${Number(v).toLocaleString("en-US")}`;
  }
}

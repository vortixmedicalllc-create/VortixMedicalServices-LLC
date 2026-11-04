import "server-only";
import { and, asc, count, desc, eq, gte, ilike, isNotNull, isNull, lte, notInArray, or, type SQL } from "drizzle-orm";
import { getDb } from "@/db";
import { leads } from "@/db/schema";
import type { SessionUser } from "../auth";
import { scopeWhere } from "../lookups";
import { LEAD_STATUSES, PAGE_SIZE, PRIORITIES } from "../constants";
import { dateRange, pageOf, sp1, type SP } from "@/components/crm/lists";

const sortCols = {
  created: leads.createdAt,
  name: leads.lastName,
  company: leads.companyName,
  status: leads.status,
  priority: leads.priority,
  followup: leads.nextFollowUpAt,
  contacted: leads.lastContactAt,
  number: leads.number,
} as const;

export function leadFilters(user: SessionUser, sp: SP): SQL | undefined {
  const q = sp1(sp, "q");
  const status = sp1(sp, "status");
  const priority = sp1(sp, "priority");
  const assignee = sp1(sp, "assignee");
  const { from, to } = dateRange(sp);
  const now = new Date();
  const conds: (SQL | undefined)[] = [
    sp1(sp, "archived") ? isNotNull(leads.archivedAt) : isNull(leads.archivedAt),
    scopeWhere(user, { owner: leads.assignedToId, created: leads.createdById }),
    q
      ? or(
          ilike(leads.firstName, `%${q}%`),
          ilike(leads.lastName, `%${q}%`),
          ilike(leads.email, `%${q}%`),
          ilike(leads.companyName, `%${q}%`),
          ilike(leads.phone, `%${q}%`),
        )
      : undefined,
    status && (LEAD_STATUSES as readonly string[]).includes(status) ? eq(leads.status, status as (typeof LEAD_STATUSES)[number]) : undefined,
    priority && (PRIORITIES as readonly string[]).includes(priority) ? eq(leads.priority, priority as (typeof PRIORITIES)[number]) : undefined,
    sp1(sp, "service") ? eq(leads.serviceKey, sp1(sp, "service")!) : undefined,
    sp1(sp, "source") ? eq(leads.sourceKey, sp1(sp, "source")!) : undefined,
    assignee ? (assignee === "unassigned" ? isNull(leads.assignedToId) : eq(leads.assignedToId, assignee)) : undefined,
    from ? gte(leads.createdAt, from) : undefined,
    to ? lte(leads.createdAt, to) : undefined,
    sp1(sp, "duplicates") ? isNotNull(leads.possibleDuplicateOfId) : undefined,
    sp1(sp, "website") ? eq(leads.isWebsiteInquiry, true) : undefined,
    sp1(sp, "followup") === "week"
      ? and(gte(leads.nextFollowUpAt, now), lte(leads.nextFollowUpAt, new Date(now.getTime() + 7 * 86400_000)), notInArray(leads.status, ["converted", "lost"]))
      : undefined,
    sp1(sp, "followup") === "overdue" ? and(lte(leads.nextFollowUpAt, now), notInArray(leads.status, ["converted", "lost"])) : undefined,
  ];
  return and(...conds.filter(Boolean));
}

export function leadOrder(sp: SP) {
  const key = (sp1(sp, "sort") || "created") as keyof typeof sortCols;
  const col = sortCols[key] ?? leads.createdAt;
  return [sp1(sp, "dir") === "asc" ? asc(col) : desc(col), desc(leads.number)];
}

export async function listLeads(user: SessionUser, sp: SP, opts: { all?: boolean } = {}) {
  const db = await getDb();
  const where = leadFilters(user, sp);
  const rowsQ = db
    .select()
    .from(leads)
    .where(where)
    .orderBy(...leadOrder(sp))
    .limit(opts.all ? 10000 : PAGE_SIZE)
    .offset(opts.all ? 0 : (pageOf(sp) - 1) * PAGE_SIZE);
  const [rows, [{ total }]] = await Promise.all([rowsQ, db.select({ total: count() }).from(leads).where(where)]);
  return { rows, total };
}

/** Returns the lead only if the user may see it. */
export async function getLeadForUser(user: SessionUser, id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const db = await getDb();
  const [row] = await db
    .select()
    .from(leads)
    .where(and(eq(leads.id, id), scopeWhere(user, { owner: leads.assignedToId, created: leads.createdById })));
  return row ?? null;
}

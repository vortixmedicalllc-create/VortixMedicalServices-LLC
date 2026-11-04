import "server-only";
import { and, count, eq, gte, inArray, isNull, lte, notInArray, sql, sum, type SQL } from "drizzle-orm";
import { getDb } from "@/db";
import { companies, contacts, deals, leads, pipelineStages, tasks, users } from "@/db/schema";
import type { SessionUser } from "../auth";
import { can } from "../permissions";
import { scopeWhere } from "../lookups";

export type DashFilters = { from?: Date; to?: Date; service?: string; assignee?: string };

const nn = <T,>(a: (T | undefined)[]) => a.filter(Boolean) as T[];

export function leadWhere(user: SessionUser, f: DashFilters, extra: (SQL | undefined)[] = []) {
  return and(
    isNull(leads.archivedAt),
    isNull(leads.mergedIntoId),
    scopeWhere(user, { owner: leads.assignedToId, created: leads.createdById }),
    f.from ? gte(leads.createdAt, f.from) : undefined,
    f.to ? lte(leads.createdAt, f.to) : undefined,
    f.service ? eq(leads.serviceKey, f.service) : undefined,
    f.assignee ? (f.assignee === "unassigned" ? isNull(leads.assignedToId) : eq(leads.assignedToId, f.assignee)) : undefined,
    ...nn(extra),
  );
}

export function dealWhere(user: SessionUser, f: DashFilters, extra: (SQL | undefined)[] = []) {
  return and(
    isNull(deals.archivedAt),
    scopeWhere(user, { owner: deals.ownerId, created: deals.createdById }),
    f.from ? gte(deals.createdAt, f.from) : undefined,
    f.to ? lte(deals.createdAt, f.to) : undefined,
    f.service ? eq(deals.serviceKey, f.service) : undefined,
    f.assignee ? eq(deals.ownerId, f.assignee) : undefined,
    ...nn(extra),
  );
}

export async function getDashboard(user: SessionUser, f: DashFilters, tz: string) {
  const db = await getDb();
  const now = new Date();
  const week = new Date(now.getTime() + 7 * 86400_000);

  const taskScope = can(user.role, "records.view_all") ? undefined : eq(tasks.assignedToId, user.id);
  const taskWhere = (extra: SQL) =>
    and(taskScope, f.assignee ? eq(tasks.assignedToId, f.assignee) : undefined, notInArray(tasks.status, ["completed", "cancelled"]), extra);

  const [leadCounts] = await db
    .select({
      total: count(),
      newCount: sql<number>`count(*) filter (where ${leads.status} = 'new')`.mapWith(Number),
      qualified: sql<number>`count(*) filter (where ${leads.status} = 'qualified')`.mapWith(Number),
      converted: sql<number>`count(*) filter (where ${leads.status} = 'converted')`.mapWith(Number),
    })
    .from(leads)
    .where(leadWhere(user, f));

  const [{ companiesN }] = await db
    .select({ companiesN: count() })
    .from(companies)
    .where(
      and(
        isNull(companies.archivedAt),
        scopeWhere(user, { owner: companies.ownerId, created: companies.createdById }),
        f.from ? gte(companies.createdAt, f.from) : undefined,
        f.to ? lte(companies.createdAt, f.to) : undefined,
        f.assignee ? eq(companies.ownerId, f.assignee) : undefined,
      ),
    );
  const [{ contactsN }] = await db
    .select({ contactsN: count() })
    .from(contacts)
    .where(
      and(
        isNull(contacts.archivedAt),
        scopeWhere(user, { owner: contacts.ownerId, created: contacts.createdById }),
        f.from ? gte(contacts.createdAt, f.from) : undefined,
        f.to ? lte(contacts.createdAt, f.to) : undefined,
        f.assignee ? eq(contacts.ownerId, f.assignee) : undefined,
      ),
    );

  const dealRows = await db
    .select({
      stageId: deals.stageId,
      label: pipelineStages.label,
      sortOrder: pipelineStages.sortOrder,
      isWon: pipelineStages.isWon,
      isLost: pipelineStages.isLost,
      n: count(),
      value: sum(deals.value),
    })
    .from(deals)
    .innerJoin(pipelineStages, eq(pipelineStages.id, deals.stageId))
    .where(dealWhere(user, f))
    .groupBy(deals.stageId, pipelineStages.label, pipelineStages.sortOrder, pipelineStages.isWon, pipelineStages.isLost)
    .orderBy(pipelineStages.sortOrder);

  const active = dealRows.filter((d) => !d.isWon && !d.isLost);
  const won = dealRows.filter((d) => d.isWon);
  const lost = dealRows.filter((d) => d.isLost);
  const sumN = (r: typeof dealRows) => r.reduce((a, b) => a + b.n, 0);
  const sumV = (r: typeof dealRows) => r.reduce((a, b) => a + Number(b.value || 0), 0);

  const [{ openTasks }] = await db.select({ openTasks: count() }).from(tasks).where(taskWhere(sql`true`));
  const [{ overdue }] = await db.select({ overdue: count() }).from(tasks).where(taskWhere(sql`${tasks.dueAt} < ${now}`));
  const [{ followUps }] = await db
    .select({ followUps: count() })
    .from(leads)
    .where(leadWhere(user, { ...f, from: undefined, to: undefined }, [gte(leads.nextFollowUpAt, now), lte(leads.nextFollowUpAt, week), notInArray(leads.status, ["converted", "lost"])]));

  // Charts
  const monthExpr = sql<string>`to_char(date_trunc('month', ${leads.createdAt} at time zone ${tz}), 'YYYY-MM')`;
  const defaultFrom = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  const byMonth = await db
    .select({ month: monthExpr, n: count() })
    .from(leads)
    .where(leadWhere(user, { ...f, from: f.from ?? defaultFrom }))
    // Positional references: the tz parameter is bound separately in each clause, which Postgres won't match.
    .groupBy(sql`1`)
    .orderBy(sql`1`);

  const byService = await db
    .select({ key: leads.serviceKey, n: count() })
    .from(leads)
    .where(leadWhere(user, f))
    .groupBy(leads.serviceKey)
    .orderBy(sql`count(*) desc`);

  const bySource = await db
    .select({ key: leads.sourceKey, n: count() })
    .from(leads)
    .where(leadWhere(user, f))
    .groupBy(leads.sourceKey)
    .orderBy(sql`count(*) desc`);

  let team: { id: string; name: string; leads: number; converted: number; won: number; tasksDone: number }[] = [];
  if (can(user.role, "reports.team")) {
    const people = await db.select({ id: users.id, name: users.name }).from(users).where(eq(users.isActive, true)).orderBy(users.name);
    const ids = people.map((p) => p.id);
    if (ids.length) {
      const leadAgg = await db
        .select({
          id: leads.assignedToId,
          n: count(),
          conv: sql<number>`count(*) filter (where ${leads.status} = 'converted')`.mapWith(Number),
        })
        .from(leads)
        .where(leadWhere(user, { ...f, assignee: undefined }, [inArray(leads.assignedToId, ids)]))
        .groupBy(leads.assignedToId);
      const wonAgg = await db
        .select({ id: deals.ownerId, n: count() })
        .from(deals)
        .innerJoin(pipelineStages, eq(pipelineStages.id, deals.stageId))
        .where(dealWhere(user, { ...f, assignee: undefined }, [eq(pipelineStages.isWon, true), inArray(deals.ownerId, ids)]))
        .groupBy(deals.ownerId);
      const taskAgg = await db
        .select({ id: tasks.assignedToId, n: count() })
        .from(tasks)
        .where(
          and(
            eq(tasks.status, "completed"),
            inArray(tasks.assignedToId, ids),
            f.from ? gte(tasks.completedAt, f.from) : undefined,
            f.to ? lte(tasks.completedAt, f.to) : undefined,
          ),
        )
        .groupBy(tasks.assignedToId);
      team = people
        .filter((p) => !f.assignee || p.id === f.assignee)
        .map((p) => ({
          id: p.id,
          name: p.name,
          leads: leadAgg.find((x) => x.id === p.id)?.n ?? 0,
          converted: leadAgg.find((x) => x.id === p.id)?.conv ?? 0,
          won: wonAgg.find((x) => x.id === p.id)?.n ?? 0,
          tasksDone: taskAgg.find((x) => x.id === p.id)?.n ?? 0,
        }));
    }
  }

  return {
    leads: leadCounts,
    companies: companiesN,
    contacts: contactsN,
    deals: { active: sumN(active), won: sumN(won), lost: sumN(lost), pipelineValue: sumV(active), wonValue: sumV(won) },
    tasks: { open: openTasks, overdue },
    followUps,
    charts: { byMonth, byService, bySource, byStage: dealRows, team },
  };
}

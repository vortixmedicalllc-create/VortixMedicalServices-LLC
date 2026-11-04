import "server-only";
import { and, asc, count, desc, eq, gte, ilike, inArray, isNotNull, isNull, lt, lte, notInArray, or, type SQL } from "drizzle-orm";
import { getDb } from "@/db";
import { activities, companies, contacts, deals, leads, pipelineStages, tasks, users } from "@/db/schema";
import type { SessionUser } from "../auth";
import { can } from "../permissions";
import { scopeWhere } from "../lookups";
import { COMPANY_TYPES, CONTACT_TYPES, PAGE_SIZE, PRIORITIES, RELATIONSHIP_STATUSES, TASK_STATUSES } from "../constants";
import { dateRange, pageOf, sp1, type SP } from "@/components/crm/lists";

const isUuid = (id?: string | null) => !!id && /^[0-9a-f-]{36}$/i.test(id);
const inList = <T extends readonly string[]>(list: T, v?: string): v is T[number] => !!v && (list as readonly string[]).includes(v);
const order = (sp: SP, cols: Record<string, SQL | Parameters<typeof asc>[0]>, def: string) => {
  const col = cols[sp1(sp, "sort") || def] ?? cols[def];
  return sp1(sp, "dir") === "asc" ? asc(col as never) : desc(col as never);
};
const paging = (sp: SP, all?: boolean) => ({ limit: all ? 10000 : PAGE_SIZE, offset: all ? 0 : (pageOf(sp) - 1) * PAGE_SIZE });

/* ---------------- Contacts ---------------- */

export function contactWhere(user: SessionUser, sp: SP) {
  const q = sp1(sp, "q");
  const type = sp1(sp, "type");
  const owner = sp1(sp, "owner");
  const { from, to } = dateRange(sp);
  return and(
    sp1(sp, "archived") ? isNotNull(contacts.archivedAt) : isNull(contacts.archivedAt),
    scopeWhere(user, { owner: contacts.ownerId, created: contacts.createdById }),
    q ? or(ilike(contacts.firstName, `%${q}%`), ilike(contacts.lastName, `%${q}%`), ilike(contacts.email, `%${q}%`), ilike(contacts.phone, `%${q}%`)) : undefined,
    inList(CONTACT_TYPES, type) ? eq(contacts.contactType, type) : undefined,
    isUuid(owner) ? eq(contacts.ownerId, owner!) : undefined,
    isUuid(sp1(sp, "company")) ? eq(contacts.companyId, sp1(sp, "company")!) : undefined,
    from ? gte(contacts.createdAt, from) : undefined,
    to ? lte(contacts.createdAt, to) : undefined,
  );
}

export async function listContacts(user: SessionUser, sp: SP, all = false) {
  const db = await getDb();
  const where = contactWhere(user, sp);
  const { limit, offset } = paging(sp, all);
  const rows = await db
    .select({ c: contacts, companyName: companies.name })
    .from(contacts)
    .leftJoin(companies, eq(companies.id, contacts.companyId))
    .where(where)
    .orderBy(order(sp, { created: contacts.createdAt, name: contacts.lastName, company: companies.name, type: contacts.contactType }, "created"))
    .limit(limit)
    .offset(offset);
  const [{ total }] = await db.select({ total: count() }).from(contacts).where(where);
  return { rows, total };
}

export async function getContactForUser(user: SessionUser, id: string) {
  if (!isUuid(id)) return null;
  const db = await getDb();
  const [r] = await db.select().from(contacts).where(and(eq(contacts.id, id), scopeWhere(user, { owner: contacts.ownerId, created: contacts.createdById })));
  return r ?? null;
}

/* ---------------- Companies ---------------- */

export function companyWhere(user: SessionUser, sp: SP) {
  const q = sp1(sp, "q");
  const type = sp1(sp, "type");
  const rel = sp1(sp, "relationship");
  const owner = sp1(sp, "owner");
  const { from, to } = dateRange(sp);
  return and(
    sp1(sp, "archived") ? isNotNull(companies.archivedAt) : isNull(companies.archivedAt),
    scopeWhere(user, { owner: companies.ownerId, created: companies.createdById }),
    q ? or(ilike(companies.name, `%${q}%`), ilike(companies.email, `%${q}%`), ilike(companies.city, `%${q}%`), ilike(companies.website, `%${q}%`)) : undefined,
    inList(COMPANY_TYPES, type) ? eq(companies.companyType, type) : undefined,
    inList(RELATIONSHIP_STATUSES, rel) ? eq(companies.relationshipStatus, rel) : undefined,
    sp1(sp, "state") ? ilike(companies.state, sp1(sp, "state")!) : undefined,
    isUuid(owner) ? eq(companies.ownerId, owner!) : undefined,
    from ? gte(companies.createdAt, from) : undefined,
    to ? lte(companies.createdAt, to) : undefined,
  );
}

export async function listCompanies(user: SessionUser, sp: SP, all = false) {
  const db = await getDb();
  const where = companyWhere(user, sp);
  const { limit, offset } = paging(sp, all);
  const rows = await db
    .select()
    .from(companies)
    .where(where)
    .orderBy(order(sp, { created: companies.createdAt, name: companies.name, type: companies.companyType, relationship: companies.relationshipStatus, city: companies.city }, "created"))
    .limit(limit)
    .offset(offset);
  const [{ total }] = await db.select({ total: count() }).from(companies).where(where);
  return { rows, total };
}

export async function getCompanyForUser(user: SessionUser, id: string) {
  if (!isUuid(id)) return null;
  const db = await getDb();
  const [r] = await db.select().from(companies).where(and(eq(companies.id, id), scopeWhere(user, { owner: companies.ownerId, created: companies.createdById })));
  return r ?? null;
}

/* ---------------- Deals ---------------- */

export function dealWhereSp(user: SessionUser, sp: SP) {
  const q = sp1(sp, "q");
  const state = sp1(sp, "state");
  const owner = sp1(sp, "owner");
  const stage = Number(sp1(sp, "stage"));
  const { from, to } = dateRange(sp);
  return and(
    sp1(sp, "archived") ? isNotNull(deals.archivedAt) : isNull(deals.archivedAt),
    scopeWhere(user, { owner: deals.ownerId, created: deals.createdById }),
    q ? or(ilike(deals.name, `%${q}%`), ilike(companies.name, `%${q}%`)) : undefined,
    stage ? eq(deals.stageId, stage) : undefined,
    state === "open" ? and(eq(pipelineStages.isWon, false), eq(pipelineStages.isLost, false)) : undefined,
    state === "won" ? eq(pipelineStages.isWon, true) : undefined,
    state === "lost" ? eq(pipelineStages.isLost, true) : undefined,
    sp1(sp, "service") ? eq(deals.serviceKey, sp1(sp, "service")!) : undefined,
    isUuid(owner) ? eq(deals.ownerId, owner!) : undefined,
    isUuid(sp1(sp, "company")) ? eq(deals.companyId, sp1(sp, "company")!) : undefined,
    from ? gte(deals.createdAt, from) : undefined,
    to ? lte(deals.createdAt, to) : undefined,
    sp1(sp, "closeFrom") ? gte(deals.expectedCloseDate, sp1(sp, "closeFrom")!) : undefined,
    sp1(sp, "closeTo") ? lte(deals.expectedCloseDate, sp1(sp, "closeTo")!) : undefined,
  );
}

export async function listDeals(user: SessionUser, sp: SP, all = false) {
  const db = await getDb();
  const where = dealWhereSp(user, sp);
  const { limit, offset } = paging(sp, all);
  const base = () =>
    db
      .select({ d: deals, companyName: companies.name, stage: pipelineStages, contactFirst: contacts.firstName, contactLast: contacts.lastName })
      .from(deals)
      .innerJoin(pipelineStages, eq(pipelineStages.id, deals.stageId))
      .leftJoin(companies, eq(companies.id, deals.companyId))
      .leftJoin(contacts, eq(contacts.id, deals.primaryContactId));
  const rows = await base()
    .where(where)
    .orderBy(order(sp, { created: deals.createdAt, name: deals.name, value: deals.value, close: deals.expectedCloseDate, stage: pipelineStages.sortOrder, updated: deals.updatedAt }, "updated"))
    .limit(limit)
    .offset(offset);
  const [{ total }] = await db
    .select({ total: count() })
    .from(deals)
    .innerJoin(pipelineStages, eq(pipelineStages.id, deals.stageId))
    .leftJoin(companies, eq(companies.id, deals.companyId))
    .where(where);
  return { rows, total };
}

export async function getDealForUser(user: SessionUser, id: string) {
  if (!isUuid(id)) return null;
  const db = await getDb();
  const [r] = await db.select().from(deals).where(and(eq(deals.id, id), scopeWhere(user, { owner: deals.ownerId, created: deals.createdById })));
  return r ?? null;
}

/* ---------------- Tasks ---------------- */

export function taskWhereSp(user: SessionUser, sp: SP) {
  const view = sp1(sp, "view") || "open";
  const status = sp1(sp, "status");
  const priority = sp1(sp, "priority");
  const assignee = sp1(sp, "assignee");
  const now = new Date();
  const startToday = new Date(now);
  startToday.setHours(0, 0, 0, 0);
  const endToday = new Date(startToday.getTime() + 86400_000);
  const open = notInArray(tasks.status, ["completed", "cancelled"]);
  const { from, to } = dateRange(sp);
  const q = sp1(sp, "q");
  return and(
    can(user.role, "records.view_all") ? undefined : or(eq(tasks.assignedToId, user.id), eq(tasks.createdById, user.id)),
    view === "mine" ? and(eq(tasks.assignedToId, user.id), open) : undefined,
    view === "open" ? open : undefined,
    view === "overdue" ? and(open, lt(tasks.dueAt, now)) : undefined,
    view === "today" ? and(open, gte(tasks.dueAt, startToday), lt(tasks.dueAt, endToday)) : undefined,
    view === "upcoming" ? and(open, gte(tasks.dueAt, now), lt(tasks.dueAt, new Date(now.getTime() + 7 * 86400_000))) : undefined,
    view === "completed" ? eq(tasks.status, "completed") : undefined,
    inList(TASK_STATUSES, status) ? eq(tasks.status, status) : undefined,
    inList(PRIORITIES, priority) ? eq(tasks.priority, priority) : undefined,
    assignee ? (assignee === "unassigned" ? isNull(tasks.assignedToId) : isUuid(assignee) ? eq(tasks.assignedToId, assignee) : undefined) : undefined,
    from ? gte(tasks.dueAt, from) : undefined,
    to ? lte(tasks.dueAt, to) : undefined,
    q ? ilike(tasks.title, `%${q}%`) : undefined,
  );
}

const taskSelect = {
  t: tasks,
  assigneeName: users.name,
  leadFirst: leads.firstName,
  leadLast: leads.lastName,
  contactFirst: contacts.firstName,
  contactLast: contacts.lastName,
  companyName: companies.name,
  dealName: deals.name,
};

export async function listTasks(user: SessionUser, sp: SP, all = false) {
  const db = await getDb();
  const where = taskWhereSp(user, sp);
  const { limit, offset } = paging(sp, all);
  const rows = await db
    .select(taskSelect)
    .from(tasks)
    .leftJoin(users, eq(users.id, tasks.assignedToId))
    .leftJoin(leads, eq(leads.id, tasks.leadId))
    .leftJoin(contacts, eq(contacts.id, tasks.contactId))
    .leftJoin(companies, eq(companies.id, tasks.companyId))
    .leftJoin(deals, eq(deals.id, tasks.dealId))
    .where(where)
    .orderBy(order(sp, { due: tasks.dueAt, created: tasks.createdAt, priority: tasks.priority, title: tasks.title }, "due"), desc(tasks.createdAt))
    .limit(limit)
    .offset(offset);
  const [{ total }] = await db.select({ total: count() }).from(tasks).where(where);
  return { rows, total };
}

export type RelatedRef = { leadId?: string | null; contactId?: string | null; companyId?: string | null; dealId?: string | null };

function relatedWhere<T extends { leadId: unknown; contactId: unknown; companyId: unknown; dealId: unknown }>(table: T, ref: RelatedRef) {
  const t = table as unknown as typeof tasks;
  const conds: SQL[] = [];
  if (ref.leadId) conds.push(eq(t.leadId, ref.leadId));
  if (ref.contactId) conds.push(eq(t.contactId, ref.contactId));
  if (ref.companyId) conds.push(eq(t.companyId, ref.companyId));
  if (ref.dealId) conds.push(eq(t.dealId, ref.dealId));
  return conds.length ? or(...conds) : undefined;
}

export async function tasksFor(ref: RelatedRef) {
  const db = await getDb();
  const where = relatedWhere(tasks, ref);
  if (!where) return [];
  return db
    .select(taskSelect)
    .from(tasks)
    .leftJoin(users, eq(users.id, tasks.assignedToId))
    .leftJoin(leads, eq(leads.id, tasks.leadId))
    .leftJoin(contacts, eq(contacts.id, tasks.contactId))
    .leftJoin(companies, eq(companies.id, tasks.companyId))
    .leftJoin(deals, eq(deals.id, tasks.dealId))
    .where(where)
    .orderBy(asc(tasks.status), asc(tasks.dueAt))
    .limit(100);
}

export async function getTaskForUser(user: SessionUser, id: string) {
  if (!isUuid(id)) return null;
  const db = await getDb();
  const [r] = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, id), can(user.role, "records.view_all") ? undefined : or(eq(tasks.assignedToId, user.id), eq(tasks.createdById, user.id))));
  return r ?? null;
}

/* ---------------- Activities ---------------- */

const activitySelect = {
  a: activities,
  authorName: users.name,
  leadFirst: leads.firstName,
  leadLast: leads.lastName,
  contactFirst: contacts.firstName,
  contactLast: contacts.lastName,
  companyName: companies.name,
  dealName: deals.name,
};

export async function activitiesFor(ref: RelatedRef, types?: string[]) {
  const db = await getDb();
  const where = relatedWhere(activities, ref);
  if (!where) return [];
  return db
    .select(activitySelect)
    .from(activities)
    .leftJoin(users, eq(users.id, activities.createdById))
    .leftJoin(leads, eq(leads.id, activities.leadId))
    .leftJoin(contacts, eq(contacts.id, activities.contactId))
    .leftJoin(companies, eq(companies.id, activities.companyId))
    .leftJoin(deals, eq(deals.id, activities.dealId))
    .where(and(where, types?.length ? inArray(activities.type, types as never) : undefined))
    .orderBy(desc(activities.occurredAt))
    .limit(200);
}

/** Activities across records the user can see (via the visibility of the related lead/contact/company/deal). */
export function activityWhereSp(user: SessionUser, sp: SP) {
  const type = sp1(sp, "type");
  const by = sp1(sp, "by");
  const { from, to } = dateRange(sp);
  const q = sp1(sp, "q");
  const scoped = can(user.role, "records.view_all")
    ? undefined
    : or(
        eq(activities.createdById, user.id),
        eq(leads.assignedToId, user.id),
        eq(contacts.ownerId, user.id),
        eq(companies.ownerId, user.id),
        eq(deals.ownerId, user.id),
      );
  return and(
    scoped,
    type ? eq(activities.type, type as never) : undefined,
    isUuid(by) ? eq(activities.createdById, by!) : undefined,
    from ? gte(activities.occurredAt, from) : undefined,
    to ? lte(activities.occurredAt, to) : undefined,
    q ? ilike(activities.description, `%${q}%`) : undefined,
  );
}

export async function listActivities(user: SessionUser, sp: SP) {
  const db = await getDb();
  const where = activityWhereSp(user, sp);
  const { limit, offset } = paging(sp);
  const rows = await db
    .select(activitySelect)
    .from(activities)
    .leftJoin(users, eq(users.id, activities.createdById))
    .leftJoin(leads, eq(leads.id, activities.leadId))
    .leftJoin(contacts, eq(contacts.id, activities.contactId))
    .leftJoin(companies, eq(companies.id, activities.companyId))
    .leftJoin(deals, eq(deals.id, activities.dealId))
    .where(where)
    .orderBy(desc(activities.occurredAt))
    .limit(limit)
    .offset(offset);
  const [{ total }] = await db
    .select({ total: count() })
    .from(activities)
    .leftJoin(leads, eq(leads.id, activities.leadId))
    .leftJoin(contacts, eq(contacts.id, activities.contactId))
    .leftJoin(companies, eq(companies.id, activities.companyId))
    .leftJoin(deals, eq(deals.id, activities.dealId))
    .where(where);
  return { rows, total };
}

/** Confirms the user can see every record referenced. Used before attaching tasks/activities. */
export async function canAccessRefs(user: SessionUser, ref: RelatedRef) {
  const { getLeadForUser } = await import("./leads");
  if (ref.leadId && !(await getLeadForUser(user, ref.leadId))) return false;
  if (ref.contactId && !(await getContactForUser(user, ref.contactId))) return false;
  if (ref.companyId && !(await getCompanyForUser(user, ref.companyId))) return false;
  if (ref.dealId && !(await getDealForUser(user, ref.dealId))) return false;
  return true;
}

/** Options for record pickers (company/contact/deal selects), scoped to the user. */
export async function pickerOptions(user: SessionUser) {
  const db = await getDb();
  const [cos, cts, dls] = await Promise.all([
    db
      .select({ id: companies.id, name: companies.name })
      .from(companies)
      .where(and(isNull(companies.archivedAt), scopeWhere(user, { owner: companies.ownerId, created: companies.createdById })))
      .orderBy(asc(companies.name))
      .limit(1000),
    db
      .select({ id: contacts.id, first: contacts.firstName, last: contacts.lastName, companyId: contacts.companyId })
      .from(contacts)
      .where(and(isNull(contacts.archivedAt), scopeWhere(user, { owner: contacts.ownerId, created: contacts.createdById })))
      .orderBy(asc(contacts.lastName))
      .limit(2000),
    db
      .select({ id: deals.id, name: deals.name })
      .from(deals)
      .where(and(isNull(deals.archivedAt), scopeWhere(user, { owner: deals.ownerId, created: deals.createdById })))
      .orderBy(asc(deals.name))
      .limit(1000),
  ]);
  return {
    companies: cos.map((c) => ({ value: c.id, label: c.name })),
    contacts: cts.map((c) => ({ value: c.id, label: `${c.first} ${c.last}`.trim(), companyId: c.companyId })),
    deals: dls.map((d) => ({ value: d.id, label: d.name })),
  };
}

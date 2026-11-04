"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, isNull, ne } from "drizzle-orm";
import { getDb } from "@/db";
import { companies, contacts, dealStageHistory, deals, pipelineStages } from "@/db/schema";
import { AuthError, requireActionUser } from "../auth";
import { can, canEdit } from "../permissions";
import { audit, logActivity, notify } from "../events";
import { getCompanyForUser, getContactForUser, getDealForUser, canAccessRefs } from "../queries/records";
import { companySchema, contactSchema, dealSchema, fieldErrors, formObject, normalize, type ActionResult } from "../validation";

function fail(e: unknown): ActionResult {
  if (e instanceof AuthError) return { ok: false, error: e.message };
  console.error("[crm] action failed:", e instanceof Error ? e.message : "unknown");
  return { ok: false, error: "Something went wrong while saving. Please try again." };
}

function diff(before: Record<string, unknown>, after: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(after)) {
    if (k === "updatedAt") continue;
    if (String(before[k] ?? "") !== String(after[k] ?? "")) out[k] = { from: before[k] ?? null, to: after[k] ?? null };
  }
  return out;
}

/** Ensures the chosen owner is allowed: users without assign permission can only choose themselves. */
function ownerFor(user: { id: string; role: Parameters<typeof can>[0] }, requested: string | undefined, current?: string | null) {
  const value = requested ?? null;
  if (value === (current ?? null)) return { ok: true as const, value };
  if (!can(user.role, "records.assign") && value !== user.id) return { ok: false as const };
  return { ok: true as const, value };
}

/* ---------------- Contacts ---------------- */

export async function saveContactAction(id: string | null, _: ActionResult & { duplicateId?: string }, fd: FormData): Promise<ActionResult & { duplicateId?: string }> {
  let savedId: string;
  try {
    const user = await requireActionUser(id ? undefined : "records.create");
    const parsed = contactSchema.safeParse(formObject(fd));
    if (!parsed.success) return { ok: false, error: "Please correct the highlighted fields.", fields: fieldErrors(parsed.error) };
    const c = parsed.data;
    const db = await getDb();
    const existing = id ? await getContactForUser(user, id) : null;
    if (id && !existing) return { ok: false, error: "Contact not found." };
    if (existing && !canEdit(user, existing)) throw new AuthError();
    const owner = ownerFor(user, c.ownerId ?? (id ? undefined : user.id), existing?.ownerId);
    if (!owner.ok) return { ok: false, error: "You can only assign records to yourself.", fields: { ownerId: "Not permitted" } };
    if (c.companyId && !(await canAccessRefs(user, { companyId: c.companyId }))) throw new AuthError();
    const emailNorm = normalize.email(c.email);
    if (emailNorm && fd.get("confirmDuplicate") !== "1") {
      const [dup] = await db
        .select({ id: contacts.id })
        .from(contacts)
        .where(and(eq(contacts.emailNormalized, emailNorm), isNull(contacts.archivedAt), id ? ne(contacts.id, id) : undefined))
        .limit(1);
      if (dup) return { ok: false, error: "Another contact already uses this email address.", duplicateId: dup.id };
    }
    const values = {
      firstName: c.firstName,
      lastName: c.lastName ?? "",
      email: c.email ?? null,
      emailNormalized: emailNorm,
      phone: c.phone ?? null,
      jobTitle: c.jobTitle ?? null,
      companyId: c.companyId ?? null,
      contactType: c.contactType,
      ownerId: owner.value,
      notes: c.notes ?? null,
    };
    savedId = await db.transaction(async (tx) => {
      if (existing) {
        await tx.update(contacts).set({ ...values, updatedAt: new Date() }).where(eq(contacts.id, existing.id));
        await audit(tx, { actorId: user.id, action: "contact.update", entityType: "contact", entityId: existing.id, changes: diff(existing, values) });
        if (values.ownerId && values.ownerId !== existing.ownerId) {
          await logActivity(tx, { type: "assignment_change", description: "Owner changed.", createdById: user.id, contactId: existing.id });
          await notify(tx, [values.ownerId], { type: "lead_assigned", title: `Contact assigned to you: ${c.firstName} ${c.lastName ?? ""}`.trim(), href: `/crm/contacts/${existing.id}`, exceptUserId: user.id, dedupeKey: `contact_owner:${existing.id}:${values.ownerId}:${Date.now()}` });
        }
        return existing.id;
      }
      const [row] = await tx.insert(contacts).values({ ...values, createdById: user.id }).returning({ id: contacts.id });
      await logActivity(tx, { type: "system", description: "Contact created.", createdById: user.id, contactId: row.id, companyId: values.companyId });
      await audit(tx, { actorId: user.id, action: "contact.create", entityType: "contact", entityId: row.id });
      return row.id;
    });
  } catch (e) {
    return fail(e);
  }
  revalidatePath("/crm", "layout");
  redirect(`/crm/contacts/${savedId}?saved=1`);
}

/* ---------------- Companies ---------------- */

export async function saveCompanyAction(id: string | null, _: ActionResult & { duplicateId?: string }, fd: FormData): Promise<ActionResult & { duplicateId?: string }> {
  let savedId: string;
  try {
    const user = await requireActionUser(id ? undefined : "records.create");
    const parsed = companySchema.safeParse(formObject(fd));
    if (!parsed.success) return { ok: false, error: "Please correct the highlighted fields.", fields: fieldErrors(parsed.error) };
    const c = parsed.data;
    const db = await getDb();
    const existing = id ? await getCompanyForUser(user, id) : null;
    if (id && !existing) return { ok: false, error: "Company not found." };
    if (existing && !canEdit(user, existing)) throw new AuthError();
    const owner = ownerFor(user, c.ownerId ?? (id ? undefined : user.id), existing?.ownerId);
    if (!owner.ok) return { ok: false, error: "You can only assign records to yourself.", fields: { ownerId: "Not permitted" } };
    const norm = normalize.company(c.name)!;
    if (fd.get("confirmDuplicate") !== "1") {
      const [dup] = await db
        .select({ id: companies.id })
        .from(companies)
        .where(and(eq(companies.nameNormalized, norm), isNull(companies.archivedAt), id ? ne(companies.id, id) : undefined))
        .limit(1);
      if (dup) return { ok: false, error: "A company with this name already exists.", duplicateId: dup.id };
    }
    const values = {
      name: c.name,
      nameNormalized: norm,
      website: c.website ?? null,
      email: c.email ?? null,
      phone: c.phone ?? null,
      industry: c.industry ?? null,
      companyType: c.companyType,
      address: c.address ?? null,
      city: c.city ?? null,
      state: c.state ?? null,
      country: c.country ?? null,
      ownerId: owner.value,
      relationshipStatus: c.relationshipStatus,
      notes: c.notes ?? null,
    };
    savedId = await db.transaction(async (tx) => {
      if (existing) {
        await tx.update(companies).set({ ...values, updatedAt: new Date() }).where(eq(companies.id, existing.id));
        const changes = diff(existing, values);
        await audit(tx, { actorId: user.id, action: "company.update", entityType: "company", entityId: existing.id, changes });
        if (changes.relationshipStatus) await logActivity(tx, { type: "status_change", description: `Relationship status changed to ${values.relationshipStatus.replace("_", " ")}.`, createdById: user.id, companyId: existing.id });
        if (values.ownerId && values.ownerId !== existing.ownerId) await logActivity(tx, { type: "assignment_change", description: "Owner changed.", createdById: user.id, companyId: existing.id });
        return existing.id;
      }
      const [row] = await tx.insert(companies).values({ ...values, createdById: user.id }).returning({ id: companies.id });
      await logActivity(tx, { type: "system", description: "Company created.", createdById: user.id, companyId: row.id });
      await audit(tx, { actorId: user.id, action: "company.create", entityType: "company", entityId: row.id });
      return row.id;
    });
  } catch (e) {
    return fail(e);
  }
  revalidatePath("/crm", "layout");
  redirect(`/crm/companies/${savedId}?saved=1`);
}

/* ---------------- Deals ---------------- */

export async function saveDealAction(id: string | null, _: ActionResult, fd: FormData): Promise<ActionResult> {
  let savedId: string;
  try {
    const user = await requireActionUser(id ? undefined : "records.create");
    const parsed = dealSchema.safeParse(formObject(fd));
    if (!parsed.success) return { ok: false, error: "Please correct the highlighted fields.", fields: fieldErrors(parsed.error) };
    const d = parsed.data;
    const db = await getDb();
    const existing = id ? await getDealForUser(user, id) : null;
    if (id && !existing) return { ok: false, error: "Deal not found." };
    if (existing && !canEdit(user, existing)) throw new AuthError();
    const owner = ownerFor(user, d.ownerId ?? (id ? undefined : user.id), existing?.ownerId);
    if (!owner.ok) return { ok: false, error: "You can only assign records to yourself.", fields: { ownerId: "Not permitted" } };
    if (!(await canAccessRefs(user, { companyId: d.companyId, contactId: d.primaryContactId }))) throw new AuthError();
    const [stage] = await db.select().from(pipelineStages).where(eq(pipelineStages.id, d.stageId));
    if (!stage) return { ok: false, error: "Choose a valid pipeline stage.", fields: { stageId: "Invalid stage" } };
    const values = {
      name: d.name,
      companyId: d.companyId ?? null,
      primaryContactId: d.primaryContactId ?? null,
      serviceKey: d.serviceKey ?? null,
      value: d.value ?? null,
      currency: d.currency,
      stageId: d.stageId,
      probability: d.probability ?? null,
      expectedCloseDate: d.expectedCloseDate ?? null,
      ownerId: owner.value,
      description: d.description ?? null,
    };
    savedId = await db.transaction(async (tx) => {
      if (existing) {
        const closed = stage.isWon || stage.isLost;
        await tx.update(deals).set({ ...values, closedAt: closed ? existing.closedAt ?? new Date() : null, updatedAt: new Date() }).where(eq(deals.id, existing.id));
        const changes = diff(existing, values);
        await audit(tx, { actorId: user.id, action: "deal.update", entityType: "deal", entityId: existing.id, changes });
        if (existing.stageId !== d.stageId) await recordStageChange(tx, existing, stage, user.id);
        if (values.ownerId && values.ownerId !== existing.ownerId) {
          await logActivity(tx, { type: "assignment_change", description: "Deal owner changed.", createdById: user.id, dealId: existing.id });
          await notify(tx, [values.ownerId], { type: "deal_changed", title: `Deal assigned to you: ${d.name}`, href: `/crm/deals/${existing.id}`, exceptUserId: user.id, dedupeKey: `deal_owner:${existing.id}:${values.ownerId}:${Date.now()}` });
        }
        return existing.id;
      }
      const [row] = await tx.insert(deals).values({ ...values, closedAt: stage.isWon || stage.isLost ? new Date() : null, createdById: user.id }).returning({ id: deals.id });
      await tx.insert(dealStageHistory).values({ dealId: row.id, fromStageId: null, toStageId: d.stageId, changedById: user.id });
      await logActivity(tx, { type: "system", description: `Deal created in stage ${stage.label}.`, createdById: user.id, dealId: row.id, companyId: values.companyId, contactId: values.primaryContactId });
      await audit(tx, { actorId: user.id, action: "deal.create", entityType: "deal", entityId: row.id });
      if (values.ownerId) await notify(tx, [values.ownerId], { type: "deal_changed", title: `Deal assigned to you: ${d.name}`, href: `/crm/deals/${row.id}`, exceptUserId: user.id, dedupeKey: `deal_owner:${row.id}:${values.ownerId}` });
      return row.id;
    });
  } catch (e) {
    return fail(e);
  }
  revalidatePath("/crm", "layout");
  redirect(`/crm/deals/${savedId}?saved=1`);
}

type Tx = Parameters<Parameters<Awaited<ReturnType<typeof getDb>>["transaction"]>[0]>[0];

async function recordStageChange(tx: Tx, deal: typeof deals.$inferSelect, to: typeof pipelineStages.$inferSelect, actorId: string) {
  const [from] = await tx.select().from(pipelineStages).where(eq(pipelineStages.id, deal.stageId));
  await tx.insert(dealStageHistory).values({ dealId: deal.id, fromStageId: deal.stageId, toStageId: to.id, changedById: actorId });
  await logActivity(tx, {
    type: "status_change",
    description: `Stage changed from ${from?.label ?? "Unknown"} to ${to.label}.`,
    createdById: actorId,
    dealId: deal.id,
    companyId: deal.companyId,
    metadata: { from: deal.stageId, to: to.id },
  });
  await notify(tx, [deal.ownerId], {
    type: "deal_changed",
    title: `${deal.name} moved to ${to.label}`,
    href: `/crm/deals/${deal.id}`,
    exceptUserId: actorId,
    dedupeKey: `deal_stage:${deal.id}:${to.id}:${Date.now()}`,
  });
}

export async function moveDealStageAction(id: string, stageId: number): Promise<ActionResult> {
  try {
    const user = await requireActionUser();
    const deal = await getDealForUser(user, id);
    if (!deal) return { ok: false, error: "Deal not found." };
    if (!canEdit(user, deal)) throw new AuthError();
    if (deal.stageId === stageId) return { ok: true };
    const db = await getDb();
    const [stage] = await db.select().from(pipelineStages).where(eq(pipelineStages.id, Number(stageId)));
    if (!stage || !stage.isActive) return { ok: false, error: "Choose a valid pipeline stage." };
    await db.transaction(async (tx) => {
      await tx
        .update(deals)
        .set({ stageId: stage.id, closedAt: stage.isWon || stage.isLost ? new Date() : null, updatedAt: new Date() })
        .where(eq(deals.id, id));
      await recordStageChange(tx, deal, stage, user.id);
      await audit(tx, { actorId: user.id, action: "deal.stage", entityType: "deal", entityId: id, changes: { from: deal.stageId, to: stage.id } });
    });
    revalidatePath("/crm", "layout");
    return { ok: true, message: `Moved to ${stage.label}.` };
  } catch (e) {
    return fail(e);
  }
}

/* ---------------- Archive / restore ---------------- */

export async function archiveRecordAction(kind: "contact" | "company" | "deal", id: string, restore = false): Promise<ActionResult> {
  try {
    const user = await requireActionUser("records.archive");
    const db = await getDb();
    const now = restore ? null : new Date();
    if (kind === "contact") {
      if (!(await getContactForUser(user, id))) return { ok: false, error: "Not found." };
      await db.update(contacts).set({ archivedAt: now, updatedAt: new Date() }).where(eq(contacts.id, id));
    } else if (kind === "company") {
      if (!(await getCompanyForUser(user, id))) return { ok: false, error: "Not found." };
      await db.update(companies).set({ archivedAt: now, updatedAt: new Date() }).where(eq(companies.id, id));
    } else {
      if (!(await getDealForUser(user, id))) return { ok: false, error: "Not found." };
      await db.update(deals).set({ archivedAt: now, updatedAt: new Date() }).where(eq(deals.id, id));
    }
    await audit(db, { actorId: user.id, action: `${kind}.${restore ? "restore" : "archive"}`, entityType: kind, entityId: id });
    revalidatePath("/crm", "layout");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

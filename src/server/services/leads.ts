/**
 * Lead domain logic, free of Next.js dependencies so it can be integration-tested.
 * All multi-step writes run inside database transactions.
 */
import { and, asc, eq, inArray, isNull, ne, or, sql } from "drizzle-orm";
import type { Db } from "@/db";
import { activities, companies, companySettings, contacts, deals, leads, pipelineStages, tasks, users } from "@/db/schema";
import { audit, logActivity, notify } from "../events";
import { normalize } from "../validation";
import { leadStatusLabels, type LeadStatus, type Priority } from "../constants";

export type LeadInput = {
  firstName: string;
  lastName?: string;
  email: string;
  phone?: string;
  companyName?: string;
  jobTitle?: string;
  website?: string;
  industry?: string;
  serviceKey?: string;
  sourceKey: string;
  status?: LeadStatus;
  priority?: Priority;
  assignedToId?: string | null;
  nextFollowUpAt?: Date;
  lastContactAt?: Date;
  notes?: string;
  inquiryMessage?: string;
  isWebsiteInquiry?: boolean;
};

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

/** Find an existing active lead that matches by email, or by company name plus last name. */
export async function findDuplicateLead(tx: Tx | Db, emailNorm: string, companyNorm: string | null, excludeId?: string) {
  const conds = [eq(leads.emailNormalized, emailNorm)];
  if (companyNorm) conds.push(eq(leads.companyNameNormalized, companyNorm));
  const rows = await tx
    .select({ id: leads.id, number: leads.number, email: leads.emailNormalized, companyNameNormalized: leads.companyNameNormalized, firstName: leads.firstName, lastName: leads.lastName, status: leads.status })
    .from(leads)
    .where(and(isNull(leads.archivedAt), isNull(leads.mergedIntoId), or(...conds), excludeId ? ne(leads.id, excludeId) : undefined))
    .orderBy(asc(leads.createdAt))
    .limit(5);
  const byEmail = rows.find((r) => r.email === emailNorm);
  return byEmail ?? rows[0] ?? null;
}

export async function findContactByEmail(tx: Tx | Db, emailNorm: string) {
  const [c] = await tx
    .select()
    .from(contacts)
    .where(and(eq(contacts.emailNormalized, emailNorm), isNull(contacts.archivedAt)))
    .limit(1);
  return c ?? null;
}

/** Applies the configured website lead assignment rule. Returns a user id or null. */
export async function resolveAutoAssignee(tx: Tx) {
  const [s] = await tx.select().from(companySettings).where(eq(companySettings.id, 1));
  if (!s || s.assignmentMode === "unassigned") return null;
  if (s.assignmentMode === "user") {
    if (!s.assignmentUserId) return null;
    const [u] = await tx.select({ id: users.id }).from(users).where(and(eq(users.id, s.assignmentUserId), eq(users.isActive, true)));
    return u?.id ?? null;
  }
  // round robin across active users in the configured list
  const ids = s.roundRobinUserIds || [];
  if (!ids.length) return null;
  const active = await tx.select({ id: users.id }).from(users).where(and(inArray(users.id, ids), eq(users.isActive, true)));
  const activeIds = ids.filter((id) => active.some((a) => a.id === id));
  if (!activeIds.length) return null;
  const pick = activeIds[s.roundRobinCursor % activeIds.length];
  await tx.update(companySettings).set({ roundRobinCursor: s.roundRobinCursor + 1 }).where(eq(companySettings.id, 1));
  return pick;
}

async function adminIds(tx: Tx) {
  const rows = await tx
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.isActive, true), inArray(users.role, ["owner", "admin"])));
  return rows.map((r) => r.id);
}

export async function createLead(db: Db, input: LeadInput, actorId: string | null) {
  return db.transaction(async (tx) => {
    const emailNorm = normalize.email(input.email)!;
    const companyNorm = normalize.company(input.companyName);
    const dup = await findDuplicateLead(tx, emailNorm, companyNorm);

    let assignedToId = input.assignedToId ?? null;
    if (input.isWebsiteInquiry && !assignedToId) assignedToId = await resolveAutoAssignee(tx);

    const [lead] = await tx
      .insert(leads)
      .values({
        firstName: input.firstName,
        lastName: input.lastName ?? "",
        email: input.email.trim(),
        emailNormalized: emailNorm,
        phone: input.phone ?? null,
        companyName: input.companyName ?? null,
        companyNameNormalized: companyNorm,
        jobTitle: input.jobTitle ?? null,
        website: input.website ?? null,
        industry: input.industry ?? null,
        serviceKey: input.serviceKey ?? null,
        sourceKey: input.sourceKey,
        status: input.status ?? "new",
        priority: input.priority ?? "normal",
        assignedToId,
        nextFollowUpAt: input.nextFollowUpAt ?? null,
        lastContactAt: input.lastContactAt ?? null,
        notes: input.notes ?? null,
        inquiryMessage: input.inquiryMessage ?? null,
        isWebsiteInquiry: !!input.isWebsiteInquiry,
        possibleDuplicateOfId: dup?.id ?? null,
        createdById: actorId,
      })
      .returning();

    await logActivity(tx, {
      type: "system",
      description: input.isWebsiteInquiry ? "Lead created from website inquiry." : "Lead created.",
      createdById: actorId,
      leadId: lead.id,
      metadata: dup ? { possibleDuplicateOf: dup.id } : undefined,
    });
    await audit(tx, { actorId, action: "lead.create", entityType: "lead", entityId: lead.id, changes: { source: input.sourceKey, website: !!input.isWebsiteInquiry } });

    const name = `${lead.firstName} ${lead.lastName}`.trim();
    const href = `/crm/leads/${lead.id}`;
    if (input.isWebsiteInquiry) {
      const recipients = assignedToId ? [assignedToId] : await adminIds(tx);
      await notify(tx, recipients, {
        type: "website_lead",
        title: `New website inquiry from ${name}`,
        body: [lead.companyName, dup ? "Possible duplicate" : null].filter(Boolean).join(" · ") || undefined,
        href,
        dedupeKey: `website_lead:${lead.id}`,
      });
    } else if (assignedToId) {
      await notify(tx, [assignedToId], { type: "lead_assigned", title: `Lead assigned to you: ${name}`, href, dedupeKey: `lead_assigned:${lead.id}:${assignedToId}`, exceptUserId: actorId });
    }
    return { lead, duplicate: dup };
  });
}

/** Records status and assignment changes as activity + audit + notifications. */
export async function updateLead(
  db: Db,
  id: string,
  patch: Partial<LeadInput>,
  actorId: string,
) {
  return db.transaction(async (tx) => {
    const [before] = await tx.select().from(leads).where(eq(leads.id, id));
    if (!before) throw new Error("Lead not found.");
    const values: Partial<typeof leads.$inferInsert> = { updatedAt: new Date() };
    for (const k of ["firstName", "lastName", "phone", "companyName", "jobTitle", "website", "industry", "serviceKey", "sourceKey", "status", "priority", "assignedToId", "nextFollowUpAt", "lastContactAt", "notes"] as const) {
      if (k in patch) (values as Record<string, unknown>)[k] = patch[k] ?? null;
    }
    if (values.lastName === null) values.lastName = "";
    if (patch.email) {
      values.email = patch.email.trim();
      values.emailNormalized = normalize.email(patch.email)!;
    }
    if ("companyName" in patch) values.companyNameNormalized = normalize.company(patch.companyName);
    const [after] = await tx.update(leads).set(values).where(eq(leads.id, id)).returning();

    const changes: Record<string, unknown> = {};
    for (const k of Object.keys(values)) {
      if (k === "updatedAt") continue;
      const a = (before as Record<string, unknown>)[k];
      const b = (after as Record<string, unknown>)[k];
      if (String(a ?? "") !== String(b ?? "")) changes[k] = { from: a instanceof Date ? a.toISOString() : a, to: b instanceof Date ? b.toISOString() : b };
    }
    if (!Object.keys(changes).length) return after;

    if (changes.status) {
      await logActivity(tx, {
        type: "status_change",
        description: `Status changed from ${leadStatusLabels[before.status]} to ${leadStatusLabels[after.status]}.`,
        createdById: actorId,
        leadId: id,
        metadata: { from: before.status, to: after.status },
      });
    }
    if (changes.assignedToId) {
      const [u] = after.assignedToId ? await tx.select({ name: users.name }).from(users).where(eq(users.id, after.assignedToId)) : [];
      await logActivity(tx, {
        type: "assignment_change",
        description: u ? `Assigned to ${u.name}.` : "Unassigned.",
        createdById: actorId,
        leadId: id,
        metadata: { from: before.assignedToId, to: after.assignedToId },
      });
      if (after.assignedToId) {
        await notify(tx, [after.assignedToId], {
          type: "lead_assigned",
          title: `Lead assigned to you: ${after.firstName} ${after.lastName}`.trim(),
          href: `/crm/leads/${id}`,
          dedupeKey: `lead_assigned:${id}:${after.assignedToId}:${Date.now()}`,
          exceptUserId: actorId,
        });
      }
    }
    await audit(tx, { actorId, action: "lead.update", entityType: "lead", entityId: id, changes });
    return after;
  });
}

export type ConvertOptions = {
  companyId?: string | null; // link existing company
  createCompany?: boolean;
  contactId?: string | null; // link existing contact
  createDeal?: boolean;
  dealName?: string;
  dealValue?: string;
  dealStageId?: number;
};

/**
 * Converts a lead in one transaction: links or creates the company and contact,
 * optionally creates a deal, carries activity history and open tasks over to the
 * new records, and keeps the original lead (status Converted) for history.
 */
export async function convertLead(db: Db, leadId: string, opts: ConvertOptions, actorId: string) {
  return db.transaction(async (tx) => {
    const [lead] = await tx.select().from(leads).where(eq(leads.id, leadId)).for("update");
    if (!lead) throw new Error("Lead not found.");
    if (lead.convertedAt) throw new Error("This lead has already been converted.");
    if (lead.archivedAt) throw new Error("Restore this lead before converting it.");

    // Company: explicit link, else match by normalized name, else create
    let companyId: string | null = opts.companyId || null;
    let companyCreated = false;
    if (!companyId && lead.companyName && opts.createCompany !== false) {
      const norm = normalize.company(lead.companyName)!;
      const [existing] = await tx
        .select({ id: companies.id })
        .from(companies)
        .where(and(eq(companies.nameNormalized, norm), isNull(companies.archivedAt)))
        .limit(1);
      if (existing) companyId = existing.id;
      else {
        const [c] = await tx
          .insert(companies)
          .values({
            name: lead.companyName,
            nameNormalized: norm,
            website: lead.website,
            industry: lead.industry,
            ownerId: lead.assignedToId ?? actorId,
            createdById: actorId,
          })
          .returning({ id: companies.id });
        companyId = c.id;
        companyCreated = true;
      }
    }

    // Contact: explicit link, else match by email, else create
    let contactId: string | null = opts.contactId || null;
    let contactCreated = false;
    if (!contactId) {
      const existing = await findContactByEmail(tx, lead.emailNormalized);
      if (existing) {
        contactId = existing.id;
        if (!existing.companyId && companyId) await tx.update(contacts).set({ companyId }).where(eq(contacts.id, existing.id));
      } else {
        const [c] = await tx
          .insert(contacts)
          .values({
            firstName: lead.firstName,
            lastName: lead.lastName,
            email: lead.email,
            emailNormalized: lead.emailNormalized,
            phone: lead.phone,
            jobTitle: lead.jobTitle,
            companyId,
            contactType: "prospect",
            ownerId: lead.assignedToId ?? actorId,
            notes: lead.notes,
            createdById: actorId,
          })
          .returning({ id: contacts.id });
        contactId = c.id;
        contactCreated = true;
      }
    }

    // Optional deal
    let dealId: string | null = null;
    if (opts.createDeal) {
      let stageId = opts.dealStageId;
      if (!stageId) {
        const [first] = await tx.select({ id: pipelineStages.id }).from(pipelineStages).where(eq(pipelineStages.isActive, true)).orderBy(asc(pipelineStages.sortOrder)).limit(1);
        stageId = first.id;
      }
      const [s] = await tx.select({ currency: companySettings.currency }).from(companySettings).where(eq(companySettings.id, 1));
      const [d] = await tx
        .insert(deals)
        .values({
          name: opts.dealName?.trim() || `${lead.companyName || `${lead.firstName} ${lead.lastName}`.trim()} opportunity`,
          companyId,
          primaryContactId: contactId,
          leadId: lead.id,
          serviceKey: lead.serviceKey,
          value: opts.dealValue || null,
          currency: s?.currency || "USD",
          stageId,
          ownerId: lead.assignedToId ?? actorId,
          createdById: actorId,
        })
        .returning({ id: deals.id });
      dealId = d.id;
      await logActivity(tx, { type: "system", description: "Deal created from lead conversion.", createdById: actorId, dealId, leadId: lead.id, companyId, contactId });
    }

    // Carry history forward without removing the lead link
    await tx
      .update(activities)
      .set({ contactId: sql`coalesce(${activities.contactId}, ${contactId})`, companyId: sql`coalesce(${activities.companyId}, ${companyId})` })
      .where(eq(activities.leadId, lead.id));
    await tx
      .update(tasks)
      .set({ contactId: sql`coalesce(${tasks.contactId}, ${contactId})`, companyId: sql`coalesce(${tasks.companyId}, ${companyId})`, dealId: sql`coalesce(${tasks.dealId}, ${dealId})` })
      .where(eq(tasks.leadId, lead.id));

    await tx
      .update(leads)
      .set({
        status: "converted",
        convertedAt: new Date(),
        convertedContactId: contactId,
        convertedCompanyId: companyId,
        convertedDealId: dealId,
        companyId: companyId ?? lead.companyId,
        updatedAt: new Date(),
      })
      .where(eq(leads.id, lead.id));

    await logActivity(tx, {
      type: "status_change",
      description: `Lead converted.${companyCreated ? " Company created." : companyId ? " Linked to existing company." : ""}${contactCreated ? " Contact created." : " Linked to existing contact."}${dealId ? " Deal created." : ""}`,
      createdById: actorId,
      leadId: lead.id,
      contactId,
      companyId,
      dealId,
      metadata: { from: lead.status, to: "converted" },
    });
    await audit(tx, { actorId, action: "lead.convert", entityType: "lead", entityId: lead.id, changes: { companyId, contactId, dealId, companyCreated, contactCreated } });
    return { companyId, contactId, dealId, companyCreated, contactCreated };
  });
}

/** Merges a duplicate lead into a target lead. History moves to the target; the source is archived, not deleted. */
export async function mergeLead(db: Db, sourceId: string, targetId: string, actorId: string) {
  if (sourceId === targetId) throw new Error("Choose a different lead to merge into.");
  return db.transaction(async (tx) => {
    const rows = await tx.select().from(leads).where(inArray(leads.id, [sourceId, targetId]));
    const source = rows.find((r) => r.id === sourceId);
    const target = rows.find((r) => r.id === targetId);
    if (!source || !target) throw new Error("Lead not found.");
    if (source.convertedAt) throw new Error("A converted lead cannot be merged.");

    await tx.update(activities).set({ leadId: targetId }).where(eq(activities.leadId, sourceId));
    await tx.update(tasks).set({ leadId: targetId }).where(eq(tasks.leadId, sourceId));
    const mergedNotes = [target.notes, source.notes ? `Merged from lead L-${String(source.number).padStart(5, "0")}: ${source.notes}` : null, source.inquiryMessage ? `Inquiry (L-${String(source.number).padStart(5, "0")}): ${source.inquiryMessage}` : null]
      .filter(Boolean)
      .join("\n\n");
    await tx
      .update(leads)
      .set({
        notes: mergedNotes || null,
        phone: target.phone ?? source.phone,
        jobTitle: target.jobTitle ?? source.jobTitle,
        website: target.website ?? source.website,
        updatedAt: new Date(),
      })
      .where(eq(leads.id, targetId));
    await tx.update(leads).set({ mergedIntoId: targetId, archivedAt: new Date(), possibleDuplicateOfId: null, updatedAt: new Date() }).where(eq(leads.id, sourceId));
    await tx.update(leads).set({ possibleDuplicateOfId: targetId }).where(eq(leads.possibleDuplicateOfId, sourceId));
    await logActivity(tx, {
      type: "system",
      description: `Merged duplicate lead L-${String(source.number).padStart(5, "0")} into this lead.`,
      createdById: actorId,
      leadId: targetId,
      metadata: { mergedFrom: sourceId },
    });
    await audit(tx, { actorId, action: "lead.merge", entityType: "lead", entityId: targetId, changes: { mergedFrom: sourceId } });
  });
}

export const leadCode = (n: number) => `L-${String(n).padStart(5, "0")}`;
export const dealCode = (n: number) => `D-${String(n).padStart(5, "0")}`;

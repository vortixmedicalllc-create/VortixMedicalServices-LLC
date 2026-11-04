"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { leads } from "@/db/schema";
import { AuthError, requireActionUser } from "../auth";
import { can, canEdit } from "../permissions";
import { audit } from "../events";
import { getLeadForUser } from "../queries/leads";
import { convertLead, createLead, findDuplicateLead, leadCode, mergeLead, updateLead } from "../services/leads";
import { fieldErrors, formObject, leadSchema, normalize, type ActionResult } from "../validation";
import { LEAD_STATUSES } from "../constants";

export type LeadFormState = ActionResult & { duplicate?: { id: string; label: string } };

function fail(e: unknown): ActionResult {
  if (e instanceof AuthError) return { ok: false, error: e.message };
  if (e instanceof Error && /not found|already|Restore|merge|Choose/.test(e.message)) return { ok: false, error: e.message };
  console.error("[crm] action failed:", e instanceof Error ? e.message : "unknown");
  return { ok: false, error: "Something went wrong while saving. Please try again." };
}

export async function createLeadAction(_: LeadFormState, fd: FormData): Promise<LeadFormState> {
  let id: string;
  try {
    const user = await requireActionUser("records.create");
    const parsed = leadSchema.safeParse(formObject(fd));
    if (!parsed.success) return { ok: false, error: "Please correct the highlighted fields.", fields: fieldErrors(parsed.error) };
    const data = parsed.data;
    if (data.assignedToId && data.assignedToId !== user.id && !can(user.role, "records.assign")) {
      return { ok: false, error: "You can only assign new leads to yourself.", fields: { assignedToId: "Not permitted" } };
    }
    if (!data.assignedToId && !can(user.role, "records.view_all")) data.assignedToId = user.id; // keep it visible to its creator's queue
    const db = await getDb();
    if (fd.get("confirmDuplicate") !== "1") {
      const dup = await findDuplicateLead(db, normalize.email(data.email)!, normalize.company(data.companyName));
      if (dup) {
        return {
          ok: false,
          error: "A lead with this email or company already exists. Review it, or confirm to create this lead anyway (it will be flagged as a possible duplicate).",
          duplicate: { id: dup.id, label: `${leadCode(dup.number)} · ${dup.firstName} ${dup.lastName}`.trim() },
        };
      }
    }
    const { lead } = await createLead(db, { ...data, assignedToId: data.assignedToId ?? null }, user.id);
    id = lead.id;
  } catch (e) {
    return fail(e);
  }
  revalidatePath("/crm", "layout");
  redirect(`/crm/leads/${id}?created=1`);
}

export async function updateLeadAction(id: string, _: LeadFormState, fd: FormData): Promise<LeadFormState> {
  try {
    const user = await requireActionUser();
    const lead = await getLeadForUser(user, id);
    if (!lead) return { ok: false, error: "Lead not found." };
    if (!canEdit(user, lead)) throw new AuthError();
    const parsed = leadSchema.safeParse(formObject(fd));
    if (!parsed.success) return { ok: false, error: "Please correct the highlighted fields.", fields: fieldErrors(parsed.error) };
    const data = parsed.data;
    if ((data.assignedToId ?? null) !== lead.assignedToId && !can(user.role, "records.assign")) {
      return { ok: false, error: "You do not have permission to reassign leads.", fields: { assignedToId: "Not permitted" } };
    }
    if (data.status === "converted" && !lead.convertedAt) {
      return { ok: false, error: "Use Convert Lead to convert this lead so the company, contact, and deal are linked.", fields: { status: "Use Convert Lead" } };
    }
    const db = await getDb();
    await updateLead(db, id, { ...data, assignedToId: data.assignedToId ?? null }, user.id);
  } catch (e) {
    return fail(e);
  }
  revalidatePath("/crm", "layout");
  redirect(`/crm/leads/${id}?saved=1`);
}

export async function setLeadStatusAction(id: string, status: string): Promise<ActionResult> {
  try {
    const user = await requireActionUser();
    const s = z.enum(LEAD_STATUSES).parse(status);
    if (s === "converted") return { ok: false, error: "Use Convert Lead to convert a lead." };
    const lead = await getLeadForUser(user, id);
    if (!lead) return { ok: false, error: "Lead not found." };
    if (!canEdit(user, lead)) throw new AuthError();
    if (lead.convertedAt) return { ok: false, error: "Converted leads keep their Converted status." };
    await updateLead(await getDb(), id, { status: s }, user.id);
    revalidatePath(`/crm/leads/${id}`);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function assignLeadsAction(ids: string[], assigneeId: string | null): Promise<ActionResult> {
  try {
    const user = await requireActionUser("records.assign");
    const parsed = z.object({ ids: z.array(z.string().uuid()).min(1).max(500), assigneeId: z.string().uuid().nullable() }).parse({ ids, assigneeId });
    const db = await getDb();
    let n = 0;
    for (const id of parsed.ids) {
      const lead = await getLeadForUser(user, id);
      if (!lead) continue;
      await updateLead(db, id, { assignedToId: parsed.assigneeId }, user.id);
      n++;
    }
    revalidatePath("/crm", "layout");
    return { ok: true, message: `${n} lead${n === 1 ? "" : "s"} updated.` };
  } catch (e) {
    return fail(e);
  }
}

export async function setLeadFollowUpAction(id: string, when: string | null): Promise<ActionResult> {
  try {
    const user = await requireActionUser();
    const lead = await getLeadForUser(user, id);
    if (!lead) return { ok: false, error: "Lead not found." };
    if (!canEdit(user, lead)) throw new AuthError();
    const date = when ? new Date(when) : null;
    if (date && Number.isNaN(date.getTime())) return { ok: false, error: "Enter a valid date." };
    // A present-but-undefined key clears the follow-up date.
    await updateLead(await getDb(), id, { nextFollowUpAt: date ?? undefined }, user.id);
    revalidatePath(`/crm/leads/${id}`);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function archiveLeadAction(id: string, restore = false): Promise<ActionResult> {
  try {
    const user = await requireActionUser("records.archive");
    const lead = await getLeadForUser(user, id);
    if (!lead) return { ok: false, error: "Lead not found." };
    const db = await getDb();
    await db.update(leads).set({ archivedAt: restore ? null : new Date(), updatedAt: new Date() }).where(eq(leads.id, id));
    await audit(db, { actorId: user.id, action: restore ? "lead.restore" : "lead.archive", entityType: "lead", entityId: id });
    revalidatePath("/crm", "layout");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function convertLeadAction(id: string, _: ActionResult, fd: FormData): Promise<ActionResult> {
  let result: Awaited<ReturnType<typeof convertLead>>;
  try {
    const user = await requireActionUser("leads.convert");
    const lead = await getLeadForUser(user, id);
    if (!lead) return { ok: false, error: "Lead not found." };
    if (!canEdit(user, lead)) throw new AuthError();
    const o = formObject(fd);
    const parsed = z
      .object({
        companyId: z.string().uuid().optional(),
        contactId: z.string().uuid().optional(),
        createDeal: z.string().optional(),
        dealName: z.string().max(160).optional(),
        dealValue: z
          .string()
          .optional()
          .refine((v) => !v || /^\d{1,12}(\.\d{1,2})?$/.test(v.replace(/,/g, "")), "Enter an amount such as 25000."),
        dealStageId: z.coerce.number().int().positive().optional(),
      })
      .safeParse(o);
    if (!parsed.success) return { ok: false, error: "Please correct the highlighted fields.", fields: fieldErrors(parsed.error) };
    const p = parsed.data;
    result = await convertLead(
      await getDb(),
      id,
      {
        companyId: p.companyId,
        contactId: p.contactId,
        createDeal: p.createDeal === "1",
        dealName: p.dealName,
        dealValue: p.dealValue?.replace(/,/g, ""),
        dealStageId: p.dealStageId,
      },
      user.id,
    );
  } catch (e) {
    return fail(e);
  }
  revalidatePath("/crm", "layout");
  redirect(result.dealId ? `/crm/deals/${result.dealId}?converted=1` : `/crm/contacts/${result.contactId}?converted=1`);
}

export async function mergeLeadAction(sourceId: string, targetId: string): Promise<ActionResult> {
  try {
    const user = await requireActionUser("leads.merge");
    const [a, b] = await Promise.all([getLeadForUser(user, sourceId), getLeadForUser(user, targetId)]);
    if (!a || !b) return { ok: false, error: "Lead not found." };
    await mergeLead(await getDb(), sourceId, targetId, user.id);
  } catch (e) {
    return fail(e);
  }
  revalidatePath("/crm", "layout");
  redirect(`/crm/leads/${targetId}?merged=1`);
}

export async function dismissDuplicateAction(id: string): Promise<ActionResult> {
  try {
    const user = await requireActionUser("leads.merge");
    const lead = await getLeadForUser(user, id);
    if (!lead) return { ok: false, error: "Lead not found." };
    const db = await getDb();
    await db.update(leads).set({ possibleDuplicateOfId: null }).where(eq(leads.id, id));
    await audit(db, { actorId: user.id, action: "lead.duplicate_dismissed", entityType: "lead", entityId: id });
    revalidatePath(`/crm/leads/${id}`);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

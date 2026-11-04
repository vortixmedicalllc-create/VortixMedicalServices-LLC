"use server";

/** Activities (calls, emails, meetings, notes) and tasks. */
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { leads, tasks } from "@/db/schema";
import { AuthError, requireActionUser } from "../auth";
import { can } from "../permissions";
import { audit, logActivity, notify } from "../events";
import { canAccessRefs, getTaskForUser, type RelatedRef } from "../queries/records";
import { activitySchema, fieldErrors, formObject, taskSchema, type ActionResult } from "../validation";
import { activityTypeLabels, TASK_STATUSES } from "../constants";

function fail(e: unknown): ActionResult {
  if (e instanceof AuthError) return { ok: false, error: e.message };
  console.error("[crm] action failed:", e instanceof Error ? e.message : "unknown");
  return { ok: false, error: "Something went wrong while saving. Please try again." };
}

const refOf = (o: RelatedRef): RelatedRef => ({ leadId: o.leadId || null, contactId: o.contactId || null, companyId: o.companyId || null, dealId: o.dealId || null });

export async function logActivityAction(_: ActionResult, fd: FormData): Promise<ActionResult> {
  try {
    const user = await requireActionUser("activities.log");
    const parsed = activitySchema.safeParse(formObject(fd));
    if (!parsed.success) return { ok: false, error: "Please correct the highlighted fields.", fields: fieldErrors(parsed.error) };
    const a = parsed.data;
    const ref = refOf(a);
    if (!ref.leadId && !ref.contactId && !ref.companyId && !ref.dealId) return { ok: false, error: "Choose the record this activity relates to." };
    if (!(await canAccessRefs(user, ref))) throw new AuthError();
    const db = await getDb();
    const when = a.occurredAt ?? new Date();
    await db.transaction(async (tx) => {
      await logActivity(tx, { type: a.type, description: a.description, createdById: user.id, occurredAt: when, ...ref, metadata: { manual: true } });
      // Calls, emails and meetings count as contact with the lead
      if (ref.leadId && ["call", "email", "meeting"].includes(a.type)) {
        await tx.update(leads).set({ lastContactAt: when, updatedAt: new Date() }).where(eq(leads.id, ref.leadId));
      }
      await audit(tx, { actorId: user.id, action: "activity.log", entityType: ref.dealId ? "deal" : ref.leadId ? "lead" : ref.contactId ? "contact" : "company", entityId: ref.dealId || ref.leadId || ref.contactId || ref.companyId, changes: { type: a.type } });
    });
    revalidatePath("/crm", "layout");
    return { ok: true, message: `${activityTypeLabels[a.type]} logged.` };
  } catch (e) {
    return fail(e);
  }
}

export async function saveTaskAction(taskId: string | null, _: ActionResult, fd: FormData): Promise<ActionResult> {
  try {
    const user = await requireActionUser();
    const parsed = taskSchema.safeParse(formObject(fd));
    if (!parsed.success) return { ok: false, error: "Please correct the highlighted fields.", fields: fieldErrors(parsed.error) };
    const t = parsed.data;
    const ref = refOf(t);
    if (!(await canAccessRefs(user, ref))) throw new AuthError();
    const assignee = t.assignedToId ?? user.id;
    if (assignee !== user.id && !can(user.role, "records.assign")) {
      return { ok: false, error: "You can only assign tasks to yourself.", fields: { assignedToId: "Not permitted" } };
    }
    if (!can(user.role, "activities.log") && !can(user.role, "records.create")) throw new AuthError();
    const db = await getDb();

    if (taskId) {
      const existing = await getTaskForUser(user, taskId);
      if (!existing) return { ok: false, error: "Task not found." };
      if (!can(user.role, "tasks.manage_any") && existing.assignedToId !== user.id && existing.createdById !== user.id) throw new AuthError();
      await db.transaction(async (tx) => {
        await tx
          .update(tasks)
          .set({
            title: t.title,
            description: t.description ?? null,
            ...ref,
            assignedToId: assignee,
            dueAt: t.dueAt ?? null,
            priority: t.priority,
            status: t.status,
            completedAt: t.status === "completed" ? existing.completedAt ?? new Date() : null,
            updatedAt: new Date(),
          })
          .where(eq(tasks.id, taskId));
        if (assignee !== existing.assignedToId) {
          await notify(tx, [assignee], { type: "task_assigned", title: `Task assigned to you: ${t.title}`, href: "/crm/tasks?view=mine", dedupeKey: `task_assigned:${taskId}:${assignee}`, exceptUserId: user.id });
        }
        await audit(tx, { actorId: user.id, action: "task.update", entityType: "task", entityId: taskId, changes: { status: t.status } });
      });
    } else {
      await db.transaction(async (tx) => {
        const [row] = await tx
          .insert(tasks)
          .values({ title: t.title, description: t.description ?? null, ...ref, assignedToId: assignee, dueAt: t.dueAt ?? null, priority: t.priority, status: t.status, createdById: user.id })
          .returning({ id: tasks.id });
        await notify(tx, [assignee], { type: "task_assigned", title: `Task assigned to you: ${t.title}`, href: "/crm/tasks?view=mine", dedupeKey: `task_assigned:${row.id}:${assignee}`, exceptUserId: user.id });
        if (ref.leadId || ref.contactId || ref.companyId || ref.dealId) {
          await logActivity(tx, { type: "follow_up", description: `Task created: ${t.title}${t.dueAt ? ` (due ${t.dueAt.toISOString().slice(0, 10)})` : ""}.`, createdById: user.id, ...ref, metadata: { taskId: row.id } });
        }
        if (ref.leadId && t.dueAt) {
          await tx.update(leads).set({ nextFollowUpAt: t.dueAt }).where(eq(leads.id, ref.leadId));
        }
        await audit(tx, { actorId: user.id, action: "task.create", entityType: "task", entityId: row.id });
      });
    }
    revalidatePath("/crm", "layout");
    return { ok: true, message: taskId ? "Task updated." : "Task created." };
  } catch (e) {
    return fail(e);
  }
}

export async function setTaskStatusAction(taskId: string, status: string): Promise<ActionResult> {
  try {
    const user = await requireActionUser();
    const s = z.enum(TASK_STATUSES).parse(status);
    const task = await getTaskForUser(user, taskId);
    if (!task) return { ok: false, error: "Task not found." };
    if (!can(user.role, "tasks.manage_any") && task.assignedToId !== user.id && task.createdById !== user.id) throw new AuthError();
    if (user.role === "read_only") throw new AuthError();
    const db = await getDb();
    await db.transaction(async (tx) => {
      await tx.update(tasks).set({ status: s, completedAt: s === "completed" ? new Date() : null, updatedAt: new Date() }).where(eq(tasks.id, taskId));
      if (s === "completed") {
        await logActivity(tx, { type: "follow_up", description: `Task completed: ${task.title}.`, createdById: user.id, leadId: task.leadId, contactId: task.contactId, companyId: task.companyId, dealId: task.dealId, metadata: { taskId } });
      }
      await audit(tx, { actorId: user.id, action: "task.status", entityType: "task", entityId: taskId, changes: { from: task.status, to: s } });
    });
    revalidatePath("/crm", "layout");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

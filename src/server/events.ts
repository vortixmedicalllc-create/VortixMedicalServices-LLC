/** Audit logging, activity history, and in-app notifications. */
import { and, eq, inArray } from "drizzle-orm";
import type { Db } from "@/db";
import { activities, auditLogs, notifications, users, type NotificationPrefs } from "@/db/schema";
import type { ActivityType } from "./constants";
import { isEmailConfigured } from "./email";
import { scheduleOutboxFlush } from "./outbox";

type Tx = Pick<Db, "insert" | "select" | "update">;

export async function audit(
  tx: Tx,
  e: { actorId: string | null; action: string; entityType: string; entityId?: string | null; changes?: Record<string, unknown> },
) {
  await tx.insert(auditLogs).values({
    actorId: e.actorId,
    action: e.action,
    entityType: e.entityType,
    entityId: e.entityId ?? null,
    changes: e.changes ?? null,
  });
}

export async function logActivity(
  tx: Tx,
  a: {
    type: ActivityType;
    description: string;
    createdById: string | null;
    leadId?: string | null;
    contactId?: string | null;
    companyId?: string | null;
    dealId?: string | null;
    occurredAt?: Date;
    metadata?: Record<string, unknown>;
  },
) {
  await tx.insert(activities).values({
    type: a.type,
    description: a.description,
    createdById: a.createdById,
    leadId: a.leadId ?? null,
    contactId: a.contactId ?? null,
    companyId: a.companyId ?? null,
    dealId: a.dealId ?? null,
    occurredAt: a.occurredAt ?? new Date(),
    metadata: a.metadata ?? null,
  });
}

const prefKey: Record<string, keyof NotificationPrefs> = {
  lead_assigned: "newLeadAssigned",
  website_lead: "newLeadAssigned",
  task_assigned: "taskAssigned",
  task_due: "taskDue",
  task_overdue: "taskDue",
  deal_changed: "dealChanges",
};

/**
 * Create in-app notifications. Respects each user's preferences (default on)
 * and skips duplicates via dedupeKey.
 */
export async function notify(
  tx: Tx,
  userIds: (string | null | undefined)[],
  n: { type: string; title: string; body?: string; href?: string; dedupeKey?: string; exceptUserId?: string | null },
) {
  const ids = [...new Set(userIds.filter((x): x is string => !!x && x !== n.exceptUserId))];
  if (!ids.length) return;
  const recipients = await tx
    .select({ id: users.id, prefs: users.notificationPrefs })
    .from(users)
    .where(and(inArray(users.id, ids), eq(users.isActive, true)));
  const key = prefKey[n.type];
  const allowed = recipients.filter((r) => !key || r.prefs?.[key] !== false);
  if (!allowed.length) return;
  const emailOn = isEmailConfigured();
  const rows = allowed.map((r) => ({
    userId: r.id,
    type: n.type,
    title: n.title,
    body: n.body ?? null,
    href: n.href ?? null,
    dedupeKey: n.dedupeKey ?? null,
    // Queue an email when email is configured and the person has not turned email alerts off.
    emailStatus: emailOn && r.prefs?.emailAlerts !== false ? ("pending" as const) : null,
  }));
  await tx.insert(notifications).values(rows).onConflictDoNothing();
  const queued = rows.some((r) => r.emailStatus === "pending");
  if (queued) await scheduleOutboxFlush();
}

import "server-only";
import { and, desc, eq, gt, inArray, isNull, lt, notInArray, count } from "drizzle-orm";
import { getDb } from "@/db";
import { notifications, tasks } from "@/db/schema";
import { notify } from "./events";

/**
 * Creates "due soon" and "overdue" notifications for the user's open tasks.
 * Runs when the user loads the CRM; each task produces each reminder once.
 */
export async function refreshTaskReminders(userId: string) {
  const db = await getDb();
  const now = new Date();
  const soon = new Date(now.getTime() + 24 * 3600_000);
  const open = await db
    .select({ id: tasks.id, title: tasks.title, dueAt: tasks.dueAt })
    .from(tasks)
    .where(and(eq(tasks.assignedToId, userId), notInArray(tasks.status, ["completed", "cancelled"]), lt(tasks.dueAt, soon)));
  for (const t of open) {
    if (!t.dueAt) continue;
    const overdue = t.dueAt < now;
    await notify(db, [userId], {
      type: overdue ? "task_overdue" : "task_due",
      title: overdue ? `Overdue task: ${t.title}` : `Task due within 24 hours: ${t.title}`,
      href: `/crm/tasks?view=${overdue ? "overdue" : "upcoming"}`,
      dedupeKey: `${overdue ? "task_overdue" : "task_due"}:${t.id}`,
    });
  }
}

export async function getNotificationSummary(userId: string) {
  const db = await getDb();
  const [{ n }] = await db.select({ n: count() }).from(notifications).where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
  const latest = await db
    .select()
    .from(notifications)
    .where(and(eq(notifications.userId, userId), gt(notifications.createdAt, new Date(Date.now() - 60 * 24 * 3600_000))))
    .orderBy(desc(notifications.createdAt))
    .limit(8);
  return { unread: n, latest };
}

export async function markNotificationsRead(userId: string, ids?: string[]) {
  const db = await getDb();
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt), ids?.length ? inArray(notifications.id, ids) : undefined));
}

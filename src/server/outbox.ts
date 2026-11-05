/**
 * Email outbox for CRM notifications.
 *
 * `notify()` marks a notification "pending" when the recipient wants email alerts
 * and email is configured. Pending rows are sent here, AFTER the request's database
 * work has committed (via Next.js `after()`), and again by the daily cron job as a
 * safety net. Each row is claimed atomically, so two server instances never send
 * the same email twice.
 */
import { and, eq, inArray, lt } from "drizzle-orm";
import { getDb } from "@/db";
import { notifications, users } from "@/db/schema";
import { appUrl, emailButton, escapeHtml, isEmailConfigured, sendEmail } from "./email";

export async function flushEmailOutbox(limit = 40) {
  if (!isEmailConfigured()) return { sent: 0, failed: 0 };
  const db = await getDb();
  const pending = await db
    .select({ id: notifications.id })
    .from(notifications)
    .where(eq(notifications.emailStatus, "pending"))
    .limit(limit);
  let sent = 0;
  let failed = 0;
  for (const { id } of pending) {
    // Claim the row; if another instance claimed it first, skip.
    const [claimed] = await db
      .update(notifications)
      .set({ emailStatus: "sent" })
      .where(and(eq(notifications.id, id), eq(notifications.emailStatus, "pending")))
      .returning();
    if (!claimed) continue;
    const [u] = await db.select({ email: users.email, name: users.name, active: users.isActive }).from(users).where(eq(users.id, claimed.userId));
    if (!u || !u.active) continue;
    const link = claimed.href ? appUrl(claimed.href) : appUrl("/crm/notifications");
    const r = await sendEmail({
      to: u.email,
      subject: claimed.title,
      html: `<p>Hello ${escapeHtml(u.name.split(" ")[0])},</p><p><strong>${escapeHtml(claimed.title)}</strong></p>${claimed.body ? `<p>${escapeHtml(claimed.body)}</p>` : ""}${emailButton(link, "Open in Vortix CRM")}<p style="font-size:13px;color:#4a626c">You can turn off email alerts in Vortix CRM under My Profile.</p>`,
    });
    if (r.sent) sent++;
    else {
      failed++;
      await db.update(notifications).set({ emailStatus: "failed" }).where(eq(notifications.id, id));
    }
  }
  return { sent, failed };
}

/** Queue a flush after the current response. Outside a request (tests, scripts) it is a no-op. */
export async function scheduleOutboxFlush() {
  if (!isEmailConfigured()) return;
  try {
    const { after } = await import("next/server");
    after(() => flushEmailOutbox().catch((e) => console.error("[outbox] flush failed:", e instanceof Error ? e.message : "unknown")));
  } catch {
    // Not in a request scope; the daily job will pick the email up.
  }
}

/** Old failures are retried once a day by the cron job. */
export async function requeueFailedEmails(olderThanMinutes = 30) {
  const db = await getDb();
  const cutoff = new Date(Date.now() - olderThanMinutes * 60_000);
  await db
    .update(notifications)
    .set({ emailStatus: "pending" })
    .where(and(eq(notifications.emailStatus, "failed"), lt(notifications.createdAt, cutoff), inArray(notifications.type, ["lead_assigned", "website_lead", "task_assigned"])));
}

import type { Metadata } from "next";
import { and, count, eq, notInArray } from "drizzle-orm";
import { getDb } from "@/db";
import { tasks } from "@/db/schema";
import { requireUser } from "@/server/auth";
import { can } from "@/server/permissions";
import { roleLabels } from "@/server/constants";
import { getNotificationSummary, refreshTaskReminders } from "@/server/notifications";
import { CrmShell } from "@/components/crm/CrmShell";

export const metadata: Metadata = { title: { default: "Vortix CRM", template: "%s | Vortix CRM" }, robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function CrmLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  await refreshTaskReminders(user.id);
  const db = await getDb();
  const [{ summary }, [{ open }]] = await Promise.all([
    getNotificationSummary(user.id).then((summary) => ({ summary })),
    db
      .select({ open: count() })
      .from(tasks)
      .where(and(eq(tasks.assignedToId, user.id), notInArray(tasks.status, ["completed", "cancelled"]))),
  ]);

  const allowed = ["dashboard", "leads", "contacts", "companies", "deals", "tasks", "activities", "settings"] as const;
  const nav: string[] = [...allowed];
  if (can(user.role, "reports.view")) nav.splice(7, 0, "reports");
  if (can(user.role, "team.view")) nav.splice(nav.indexOf("settings"), 0, "team");

  return (
    <CrmShell
      user={{ name: user.name, email: user.email, roleLabel: roleLabels[user.role] }}
      allowed={nav as never}
      unread={summary.unread}
      openTasks={open}
      notifications={summary.latest.map((n) => ({
        id: n.id,
        title: n.title,
        body: n.body,
        href: n.href,
        readAt: n.readAt?.toISOString() ?? null,
        createdAt: n.createdAt.toISOString(),
      }))}
    >
      {children}
    </CrmShell>
  );
}

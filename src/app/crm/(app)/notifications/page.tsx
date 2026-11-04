import type { Metadata } from "next";
import Link from "next/link";
import { and, count, desc, eq } from "drizzle-orm";
import { Bell } from "lucide-react";
import { getDb } from "@/db";
import { notifications } from "@/db/schema";
import { requireUser } from "@/server/auth";
import { fmtDate, getSettings } from "@/server/lookups";
import { PAGE_SIZE } from "@/server/constants";
import { MarkAllRead } from "@/components/crm/MarkAllRead";
import { Pagination, pageOf, type SP } from "@/components/crm/lists";
import { Card, EmptyState, PageHeader } from "@/components/crm/ui";
import { cx } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const db = await getDb();
  const settings = await getSettings();
  const where = and(eq(notifications.userId, user.id));
  const rows = await db.select().from(notifications).where(where).orderBy(desc(notifications.createdAt)).limit(PAGE_SIZE).offset((pageOf(sp) - 1) * PAGE_SIZE);
  const [{ total }] = await db.select({ total: count() }).from(notifications).where(where);
  return (
    <>
      <PageHeader
        title="Notifications"
        description="In-app alerts for new leads, assignments, tasks, due dates, and deal changes. Change which alerts you receive in My Profile."
        actions={<MarkAllRead />}
      />
      <Card bodyClassName="p-0">
        {rows.length ? (
          <ul className="divide-y divide-line">
            {rows.map((n) => (
              <li key={n.id} className={cx("flex gap-3 px-5 py-3.5", !n.readAt && "bg-tint/40")}>
                <span aria-hidden className={cx("mt-2 size-2 shrink-0 rounded-full", n.readAt ? "bg-line" : "bg-blue")} />
                <div className="min-w-0 flex-1">
                  <p className="text-[0.9rem] font-semibold">
                    {!n.readAt && <span className="sr-only">Unread: </span>}
                    {n.href ? <Link href={n.href} className="hover:text-blue">{n.title}</Link> : n.title}
                  </p>
                  {n.body && <p className="text-sm text-muted">{n.body}</p>}
                  <p className="mt-0.5 text-xs text-muted">{fmtDate(n.createdAt, settings.timezone, true)}</p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={<Bell className="size-5" />} title="No notifications yet" />
        )}
      </Card>
      <Pagination total={total} sp={sp} basePath="/crm/notifications" />
    </>
  );
}

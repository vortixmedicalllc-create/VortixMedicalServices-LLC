import type { Metadata } from "next";
import Link from "next/link";
import { and, asc, count, eq, isNull, notInArray } from "drizzle-orm";
import { Check, Minus } from "lucide-react";
import { getDb } from "@/db";
import { deals, leads, pipelineStages, tasks, users } from "@/db/schema";
import { requirePagePermission } from "@/server/auth";
import { assignableRoles, can, canManageUser, permissionLabels, rolePermissions, type Permission } from "@/server/permissions";
import { ROLES, roleLabels } from "@/server/constants";
import { fmtDate, getSettings } from "@/server/lookups";
import { isEmailConfigured } from "@/server/email";
import { AddUserButton, UserRowActions } from "@/components/crm/TeamClient";
import { Alert, Badge, Card, PageHeader } from "@/components/crm/ui";
import { tdCls, thCls } from "@/components/crm/lists";

export const metadata: Metadata = { title: "Team" };

export default async function TeamPage() {
  const user = await requirePagePermission("team.view");
  const db = await getDb();
  const settings = await getSettings();
  const manage = can(user.role, "team.manage");
  const people = await db.select().from(users).orderBy(asc(users.name));
  const [openLeads, openTasks, openDeals] = await Promise.all([
    db.select({ id: leads.assignedToId, n: count() }).from(leads).where(and(isNull(leads.archivedAt), notInArray(leads.status, ["converted", "lost"]))).groupBy(leads.assignedToId),
    db.select({ id: tasks.assignedToId, n: count() }).from(tasks).where(notInArray(tasks.status, ["completed", "cancelled"])).groupBy(tasks.assignedToId),
    db
      .select({ id: deals.ownerId, n: count() })
      .from(deals)
      .innerJoin(pipelineStages, eq(pipelineStages.id, deals.stageId))
      .where(and(isNull(deals.archivedAt), eq(pipelineStages.isWon, false), eq(pipelineStages.isLost, false)))
      .groupBy(deals.ownerId),
  ]);
  const n = (rows: { id: string | null; n: number }[], id: string) => rows.find((r) => r.id === id)?.n ?? 0;
  const roleOpts = assignableRoles(user.role).map((r) => ({ value: r, label: roleLabels[r] }));
  const perms = Object.keys(permissionLabels) as Permission[];

  return (
    <>
      <PageHeader title="Team" description="People with access to Vortix CRM, their roles, and their current workload." actions={manage ? <AddUserButton roles={roleOpts} /> : undefined} />
      {manage && !isEmailConfigured() && (
        <Alert tone="info" className="mb-4">
          Email delivery is not configured, so invitations and reset links are not emailed. After you add someone, copy their one-time link and share it through a secure channel.
        </Alert>
      )}
      <div className="overflow-x-auto rounded-[8px] border border-line bg-white">
        <table className="w-full min-w-[860px]">
          <thead className="border-b border-line bg-surface-muted">
            <tr>
              <th scope="col" className={thCls}>Name</th>
              <th scope="col" className={thCls}>Role</th>
              <th scope="col" className={thCls}>Status</th>
              <th scope="col" className={`${thCls} text-right`}>Open leads</th>
              <th scope="col" className={`${thCls} text-right`}>Open deals</th>
              <th scope="col" className={`${thCls} text-right`}>Open tasks</th>
              <th scope="col" className={thCls}>Last sign-in</th>
              {manage && <th scope="col" className={`${thCls} text-right`}>Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {people.map((p) => (
              <tr key={p.id}>
                <td className={tdCls}>
                  <span className="font-semibold">{p.name}</span>
                  {p.id === user.id && <span className="ml-1.5 text-xs text-muted">(you)</span>}
                  <span className="block text-xs text-muted">{p.email}{p.jobTitle ? ` · ${p.jobTitle}` : ""}</span>
                </td>
                <td className={tdCls}><Badge tone={p.role === "owner" || p.role === "admin" ? "slate" : "gray"}>{roleLabels[p.role]}</Badge></td>
                <td className={tdCls}>
                  {!p.isActive ? <Badge tone="red">Inactive</Badge> : !p.passwordHash ? <Badge tone="amber">Invited</Badge> : <Badge tone="teal">Active</Badge>}
                </td>
                <td className={`${tdCls} text-right tabular-nums`}><Link href={`/crm/leads?assignee=${p.id}`} className="hover:text-blue">{n(openLeads, p.id)}</Link></td>
                <td className={`${tdCls} text-right tabular-nums`}><Link href={`/crm/deals?owner=${p.id}&state=open`} className="hover:text-blue">{n(openDeals, p.id)}</Link></td>
                <td className={`${tdCls} text-right tabular-nums`}><Link href={`/crm/tasks?view=open&assignee=${p.id}`} className="hover:text-blue">{n(openTasks, p.id)}</Link></td>
                <td className={`${tdCls} whitespace-nowrap text-muted`}>{fmtDate(p.lastLoginAt, settings.timezone, true) ?? "Never"}</td>
                {manage && (
                  <td className={tdCls}>
                    {canManageUser(user, p) ? (
                      <UserRowActions user={{ id: p.id, name: p.name, email: p.email, jobTitle: p.jobTitle, role: p.role, isActive: p.isActive, hasPassword: !!p.passwordHash }} roles={roleOpts} self={p.id === user.id} />
                    ) : (
                      <span className="block text-right text-xs text-muted">Owner only</span>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-sm text-muted">
        See each person&apos;s logged work on the <Link href="/crm/activities" className="text-blue hover:underline">Activities</Link> page using the &quot;Recorded by&quot; filter.
      </p>

      <Card title="Role permissions" className="mt-6" bodyClassName="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-[0.84rem]">
            <caption className="sr-only">Permissions granted to each role</caption>
            <thead className="border-b border-line bg-surface-muted">
              <tr>
                <th scope="col" className={thCls}>Permission</th>
                {ROLES.map((r) => (
                  <th key={r} scope="col" className={`${thCls} text-center`}>{roleLabels[r]}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {perms.map((p) => (
                <tr key={p}>
                  <th scope="row" className="px-4 py-2 text-left font-medium">{permissionLabels[p]}</th>
                  {ROLES.map((r) => (
                    <td key={r} className="px-4 py-2 text-center">
                      {rolePermissions[r].includes(p) ? (
                        <Check aria-label="Allowed" className="mx-auto size-4 text-teal-ink" />
                      ) : (
                        <Minus aria-label="Not allowed" className="mx-auto size-4 text-line" />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="border-t border-line px-5 py-3 text-xs text-muted">
          Users without &quot;View all records&quot; see only records they own, are assigned, or created. Only Owners can manage Owner accounts. Permissions are enforced on the server for every page, action, and export.
        </p>
      </Card>
    </>
  );
}

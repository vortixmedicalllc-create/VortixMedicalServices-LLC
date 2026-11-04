import type { Metadata } from "next";
import { and, count, desc, eq, gte, lte, type SQL } from "drizzle-orm";
import { getDb } from "@/db";
import { auditLogs, users } from "@/db/schema";
import { requirePagePermission } from "@/server/auth";
import { fmtDate, getSettings, labelMaps } from "@/server/lookups";
import { PAGE_SIZE } from "@/server/constants";
import { FilterBar } from "@/components/crm/FilterBar";
import { Pagination, Table, dateRange, pageOf, sp1, tdCls, thCls, type SP } from "@/components/crm/lists";
import { PageHeader } from "@/components/crm/ui";

export const metadata: Metadata = { title: "Audit Log" };

const ENTITY_LINK: Record<string, string> = { lead: "leads", contact: "contacts", company: "companies", deal: "deals" };

export default async function AuditPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requirePagePermission("audit.view");
  const sp = await searchParams;
  const db = await getDb();
  const [settings, maps] = await Promise.all([getSettings(), labelMaps()]);
  const { from, to } = dateRange(sp);
  const conds: (SQL | undefined)[] = [
    sp1(sp, "entity") ? eq(auditLogs.entityType, sp1(sp, "entity")!) : undefined,
    sp1(sp, "actor") && /^[0-9a-f-]{36}$/.test(sp1(sp, "actor")!) ? eq(auditLogs.actorId, sp1(sp, "actor")!) : undefined,
    from ? gte(auditLogs.createdAt, from) : undefined,
    to ? lte(auditLogs.createdAt, to) : undefined,
  ];
  const where = and(...conds);
  const rows = await db
    .select({ a: auditLogs, actor: users.name })
    .from(auditLogs)
    .leftJoin(users, eq(users.id, auditLogs.actorId))
    .where(where)
    .orderBy(desc(auditLogs.createdAt))
    .limit(PAGE_SIZE)
    .offset((pageOf(sp) - 1) * PAGE_SIZE);
  const [{ total }] = await db.select({ total: count() }).from(auditLogs).where(where);

  return (
    <>
      <PageHeader
        title="Audit Log"
        crumbs={[{ label: "Settings", href: "/crm/settings" }, { label: "Audit Log" }]}
        description="A record of sign-ins, data changes, exports, and administrative actions. Entries cannot be edited in the CRM."
      />
      <FilterBar
        filters={[
          { type: "select", name: "entity", label: "Area", options: ["lead", "contact", "company", "deal", "task", "user", "settings", "leads", "contacts", "companies", "deals", "report"].map((e) => ({ value: e, label: e })) },
          { type: "select", name: "actor", label: "User", options: maps.team.map((t) => ({ value: t.id, label: t.name })) },
          { type: "date", name: "from", label: "From" },
          { type: "date", name: "to", label: "To" },
        ]}
      />
      <Table>
        <thead className="border-b border-line bg-surface-muted">
          <tr>
            <th scope="col" className={thCls}>When</th>
            <th scope="col" className={thCls}>User</th>
            <th scope="col" className={thCls}>Action</th>
            <th scope="col" className={thCls}>Record</th>
            <th scope="col" className={thCls}>Details</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map(({ a, actor }) => (
            <tr key={a.id}>
              <td className={`${tdCls} whitespace-nowrap text-muted`}>{fmtDate(a.createdAt, settings.timezone, true)}</td>
              <td className={tdCls}>{actor ?? (a.actorId ? "Former user" : "System or website")}</td>
              <td className={`${tdCls} font-mono text-xs`}>{a.action}</td>
              <td className={tdCls}>
                {a.entityId && ENTITY_LINK[a.entityType] ? (
                  <a href={`/crm/${ENTITY_LINK[a.entityType]}/${a.entityId}`} className="text-blue hover:underline">{a.entityType}</a>
                ) : (
                  a.entityType
                )}
              </td>
              <td className={`${tdCls} max-w-[360px]`}>
                {a.changes ? <code className="block truncate font-mono text-xs text-muted" title={JSON.stringify(a.changes)}>{JSON.stringify(a.changes)}</code> : <span className="text-muted">—</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
      <Pagination total={total} sp={sp} basePath="/crm/settings/audit" />
    </>
  );
}

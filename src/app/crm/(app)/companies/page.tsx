import type { Metadata } from "next";
import Link from "next/link";
import { Building2, Download, Plus } from "lucide-react";
import { requireUser } from "@/server/auth";
import { can } from "@/server/permissions";
import { fmtDate, getSettings, labelMaps } from "@/server/lookups";
import { listCompanies } from "@/server/queries/records";
import { COMPANY_TYPES, companyTypeLabels, RELATIONSHIP_STATUSES, relationshipLabels } from "@/server/constants";
import { FilterBar } from "@/components/crm/FilterBar";
import { Pagination, SortTh, Table, qs, tdCls, thCls, type SP } from "@/components/crm/lists";
import { Badge, EmptyState, LinkButton, PageHeader } from "@/components/crm/ui";

export const metadata: Metadata = { title: "Companies" };

export default async function CompaniesPage({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const [settings, maps, { rows, total }] = await Promise.all([getSettings(), labelMaps(), listCompanies(user, sp)]);
  const base = "/crm/companies";
  return (
    <>
      <PageHeader
        title="Companies"
        description="Healthcare organizations and business accounts."
        actions={
          <>
            {can(user.role, "records.export") && (
              <a href={`/crm/export/companies${qs(sp, { page: undefined })}`} className="inline-flex h-10 items-center gap-2 rounded-[5px] bg-white px-4 font-display text-[0.85rem] font-semibold text-slate ring-1 ring-inset ring-line hover:bg-surface-muted">
                <Download aria-hidden className="size-4" /> Export CSV
              </a>
            )}
            {can(user.role, "records.create") && (
              <LinkButton href="/crm/companies/new" variant="primary">
                <Plus aria-hidden className="size-4" /> New Company
              </LinkButton>
            )}
          </>
        }
      />
      <FilterBar
        filters={[
          { type: "search", name: "q", label: "Search companies", placeholder: "Search name, email, city, website" },
          { type: "select", name: "type", label: "Type", options: COMPANY_TYPES.map((t) => ({ value: t, label: companyTypeLabels[t] })) },
          { type: "select", name: "relationship", label: "Relationship", options: RELATIONSHIP_STATUSES.map((t) => ({ value: t, label: relationshipLabels[t] })) },
          ...(can(user.role, "records.view_all") ? [{ type: "select" as const, name: "owner", label: "Owner", options: maps.team.map((t) => ({ value: t.id, label: t.name })) }] : []),
          { type: "checkbox", name: "archived", label: "Archived" },
        ]}
      />
      {rows.length === 0 ? (
        <div className="rounded-[8px] border border-line bg-white">
          <EmptyState icon={<Building2 className="size-5" />} title="No companies found" text="Companies are created when leads are converted, or you can add one manually." />
        </div>
      ) : (
        <Table>
          <thead className="border-b border-line bg-surface-muted">
            <tr>
              <SortTh label="Company" col="name" sp={sp} basePath={base} />
              <SortTh label="Type" col="type" sp={sp} basePath={base} />
              <SortTh label="Relationship" col="relationship" sp={sp} basePath={base} />
              <SortTh label="Location" col="city" sp={sp} basePath={base} />
              <th scope="col" className={thCls}>Owner</th>
              <SortTh label="Created" col="created" sp={sp} basePath={base} />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((c) => (
              <tr key={c.id} className="hover:bg-surface-muted/60">
                <td className={tdCls}>
                  <Link href={`/crm/companies/${c.id}`} className="font-semibold hover:text-blue">{c.name}</Link>
                  {c.website && <span className="block text-xs text-muted">{c.website}</span>}
                </td>
                <td className={tdCls}>{companyTypeLabels[c.companyType]}</td>
                <td className={tdCls}>
                  <Badge tone={c.relationshipStatus === "active_client" ? "teal" : c.relationshipStatus === "inactive" || c.relationshipStatus === "former_client" ? "gray" : "blue"}>
                    {relationshipLabels[c.relationshipStatus]}
                  </Badge>
                </td>
                <td className={tdCls}>{[c.city, c.state].filter(Boolean).join(", ") || <span className="text-muted">—</span>}</td>
                <td className={tdCls}>{c.ownerId ? maps.user[c.ownerId] : <span className="text-muted">—</span>}</td>
                <td className={`${tdCls} whitespace-nowrap text-muted`}>{fmtDate(c.createdAt, settings.timezone)}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      <Pagination total={total} sp={sp} basePath={base} />
    </>
  );
}

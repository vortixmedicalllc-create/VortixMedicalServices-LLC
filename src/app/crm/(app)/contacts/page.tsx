import type { Metadata } from "next";
import Link from "next/link";
import { Download, Plus, UserRound } from "lucide-react";
import { requireUser } from "@/server/auth";
import { can } from "@/server/permissions";
import { fmtDate, getSettings, labelMaps } from "@/server/lookups";
import { listContacts } from "@/server/queries/records";
import { CONTACT_TYPES, contactTypeLabels } from "@/server/constants";
import { FilterBar } from "@/components/crm/FilterBar";
import { Pagination, SortTh, Table, qs, tdCls, thCls, type SP } from "@/components/crm/lists";
import { Badge, EmptyState, LinkButton, PageHeader } from "@/components/crm/ui";

export const metadata: Metadata = { title: "Contacts" };

export default async function ContactsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const [settings, maps, { rows, total }] = await Promise.all([getSettings(), labelMaps(), listContacts(user, sp)]);
  const base = "/crm/contacts";
  return (
    <>
      <PageHeader
        title="Contacts"
        description="People at prospective and existing client organizations."
        actions={
          <>
            {can(user.role, "records.export") && (
              <a href={`/crm/export/contacts${qs(sp, { page: undefined })}`} className="inline-flex h-10 items-center gap-2 rounded-[5px] bg-white px-4 font-display text-[0.85rem] font-semibold text-slate ring-1 ring-inset ring-line hover:bg-surface-muted">
                <Download aria-hidden className="size-4" /> Export CSV
              </a>
            )}
            {can(user.role, "records.create") && (
              <LinkButton href="/crm/contacts/new" variant="primary">
                <Plus aria-hidden className="size-4" /> New Contact
              </LinkButton>
            )}
          </>
        }
      />
      <FilterBar
        filters={[
          { type: "search", name: "q", label: "Search contacts", placeholder: "Search name, email, phone" },
          { type: "select", name: "type", label: "Type", options: CONTACT_TYPES.map((t) => ({ value: t, label: contactTypeLabels[t] })) },
          ...(can(user.role, "records.view_all") ? [{ type: "select" as const, name: "owner", label: "Owner", options: maps.team.map((t) => ({ value: t.id, label: t.name })) }] : []),
          { type: "date", name: "from", label: "Created from" },
          { type: "date", name: "to", label: "Created to" },
          { type: "checkbox", name: "archived", label: "Archived" },
        ]}
      />
      {rows.length === 0 ? (
        <div className="rounded-[8px] border border-line bg-white">
          <EmptyState icon={<UserRound className="size-5" />} title="No contacts found" text="Contacts are created when leads are converted, or you can add one manually." />
        </div>
      ) : (
        <Table>
          <thead className="border-b border-line bg-surface-muted">
            <tr>
              <SortTh label="Name" col="name" sp={sp} basePath={base} />
              <SortTh label="Company" col="company" sp={sp} basePath={base} />
              <th scope="col" className={thCls}>Email</th>
              <th scope="col" className={`${thCls} hidden md:table-cell`}>Phone</th>
              <SortTh label="Type" col="type" sp={sp} basePath={base} />
              <th scope="col" className={thCls}>Owner</th>
              <SortTh label="Created" col="created" sp={sp} basePath={base} />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map(({ c, companyName }) => (
              <tr key={c.id} className="hover:bg-surface-muted/60">
                <td className={tdCls}>
                  <Link href={`/crm/contacts/${c.id}`} className="font-semibold hover:text-blue">{`${c.firstName} ${c.lastName}`.trim()}</Link>
                  {c.jobTitle && <span className="block text-xs text-muted">{c.jobTitle}</span>}
                </td>
                <td className={tdCls}>{companyName && c.companyId ? <Link href={`/crm/companies/${c.companyId}`} className="hover:text-blue">{companyName}</Link> : <span className="text-muted">—</span>}</td>
                <td className={tdCls}>{c.email ?? <span className="text-muted">—</span>}</td>
                <td className={`${tdCls} hidden md:table-cell`}>{c.phone ?? <span className="text-muted">—</span>}</td>
                <td className={tdCls}><Badge tone={c.contactType === "client" ? "teal" : "gray"}>{contactTypeLabels[c.contactType]}</Badge></td>
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

import type { Metadata } from "next";
import { Download, Inbox, Plus } from "lucide-react";
import { requireUser } from "@/server/auth";
import { can } from "@/server/permissions";
import { fmtDate, getSettings, labelMaps } from "@/server/lookups";
import { listLeads } from "@/server/queries/leads";
import { leadCode } from "@/server/services/leads";
import { LEAD_STATUSES, leadStatusLabels, PRIORITIES, priorityLabels } from "@/server/constants";
import { FilterBar } from "@/components/crm/FilterBar";
import { LeadsTable } from "@/components/crm/LeadsTable";
import { Pagination, SortTh, qs, thCls, type SP } from "@/components/crm/lists";
import { EmptyState, LinkButton, PageHeader } from "@/components/crm/ui";

export const metadata: Metadata = { title: "Leads" };

export default async function LeadsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const [settings, maps, { rows, total }] = await Promise.all([getSettings(), labelMaps(), listLeads(user, sp)]);
  const tz = settings.timezone;
  const now = Date.now();
  const base = "/crm/leads";
  const team = maps.team.filter((t) => t.isActive).map((t) => ({ value: t.id, label: t.name }));

  return (
    <>
      <PageHeader
        title="Leads"
        description={can(user.role, "records.view_all") ? "Business inquiries and prospective clients." : "Leads assigned to you or created by you."}
        actions={
          <>
            {can(user.role, "records.export") && (
              <a href={`/crm/export/leads${qs(sp, { page: undefined })}`} className="inline-flex h-10 items-center gap-2 rounded-[5px] bg-white px-4 font-display text-[0.85rem] font-semibold text-slate ring-1 ring-inset ring-line hover:bg-surface-muted">
                <Download aria-hidden className="size-4" /> Export CSV
              </a>
            )}
            {can(user.role, "records.create") && (
              <LinkButton href="/crm/leads/new" variant="primary">
                <Plus aria-hidden className="size-4" /> New Lead
              </LinkButton>
            )}
          </>
        }
      />
      <FilterBar
        filters={[
          { type: "search", name: "q", label: "Search leads", placeholder: "Search name, email, company, phone" },
          { type: "select", name: "status", label: "Status", options: LEAD_STATUSES.map((s) => ({ value: s, label: leadStatusLabels[s] })) },
          { type: "select", name: "service", label: "Service", options: maps.services.map((s) => ({ value: s.key, label: s.label })) },
          { type: "select", name: "source", label: "Source", options: maps.sources.map((s) => ({ value: s.key, label: s.label })) },
          { type: "select", name: "priority", label: "Priority", options: PRIORITIES.map((p) => ({ value: p, label: priorityLabels[p] })) },
          ...(can(user.role, "records.view_all")
            ? [{ type: "select" as const, name: "assignee", label: "Assigned to", options: [{ value: "unassigned", label: "Unassigned" }, ...team] }]
            : []),
          { type: "date", name: "from", label: "Created from" },
          { type: "date", name: "to", label: "Created to" },
          { type: "select", name: "followup", label: "Follow-up", options: [{ value: "week", label: "Next 7 days" }, { value: "overdue", label: "Overdue" }], all: "Any" },
          { type: "checkbox", name: "website", label: "Website only" },
          { type: "checkbox", name: "duplicates", label: "Possible duplicates" },
          { type: "checkbox", name: "archived", label: "Archived" },
        ]}
      />
      {rows.length === 0 ? (
        <div className="rounded-[8px] border border-line bg-white">
          <EmptyState
            icon={<Inbox className="size-5" />}
            title={total === 0 && Object.keys(sp).length === 0 ? "No leads yet" : "No leads match these filters"}
            text={total === 0 && Object.keys(sp).length === 0 ? "Inquiries from the website contact form appear here automatically. You can also add a lead manually." : "Try changing or clearing the filters."}
            action={can(user.role, "records.create") ? <LinkButton href="/crm/leads/new" variant="primary">New Lead</LinkButton> : undefined}
          />
        </div>
      ) : (
        <LeadsTable
          canAssign={can(user.role, "records.assign")}
          team={team}
          headers={
            <>
              <SortTh label="Lead" col="name" sp={sp} basePath={base} />
              <SortTh label="Company" col="company" sp={sp} basePath={base} />
              <th scope="col" className={thCls}>Service</th>
              <SortTh label="Status" col="status" sp={sp} basePath={base} />
              <SortTh label="Priority" col="priority" sp={sp} basePath={base} />
              <th scope="col" className={thCls}>Assigned</th>
              <SortTh label="Next follow-up" col="followup" sp={sp} basePath={base} />
              <SortTh label="Created" col="created" sp={sp} basePath={base} />
            </>
          }
          rows={rows.map((r) => ({
            id: r.id,
            code: leadCode(r.number),
            name: `${r.firstName} ${r.lastName}`.trim(),
            email: r.email,
            company: r.companyName,
            service: r.serviceKey ? maps.service[r.serviceKey] ?? r.serviceKey : null,
            source: maps.source[r.sourceKey] ?? r.sourceKey,
            status: r.status,
            statusLabel: leadStatusLabels[r.status],
            priority: r.priority,
            priorityLabel: priorityLabels[r.priority],
            assignee: r.assignedToId ? maps.user[r.assignedToId] ?? "Former user" : null,
            created: fmtDate(r.createdAt, tz)!,
            followUp: fmtDate(r.nextFollowUpAt, tz),
            followUpOverdue: !!r.nextFollowUpAt && r.nextFollowUpAt.getTime() < now && !["converted", "lost"].includes(r.status),
            website: r.isWebsiteInquiry,
            duplicate: !!r.possibleDuplicateOfId,
          }))}
        />
      )}
      <Pagination total={total} sp={sp} basePath={base} />
    </>
  );
}

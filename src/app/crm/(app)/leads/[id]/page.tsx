import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq, isNull } from "drizzle-orm";
import { Globe, Pencil } from "lucide-react";
import { getDb } from "@/db";
import { companies, deals, leads, pipelineStages } from "@/db/schema";
import { requireUser } from "@/server/auth";
import { can, canEdit } from "@/server/permissions";
import { fmtDate, fmtMoney, getSettings, labelMaps } from "@/server/lookups";
import { getLeadForUser } from "@/server/queries/leads";
import { activitiesFor, pickerOptions, tasksFor } from "@/server/queries/records";
import { leadCode, findContactByEmail } from "@/server/services/leads";
import { LEAD_STATUSES, leadStatusLabels, priorityLabels } from "@/server/constants";
import { normalize } from "@/server/validation";
import { ActivityButtons, QuickNote, TaskButton, TaskList } from "@/components/crm/record-client";
import { Timeline, editableTaskIds, toTaskRows } from "@/components/crm/record";
import { ArchiveLeadButton, AssignButton, ConvertButton, DuplicateBanner, FollowUpButton, LeadStatusSelect } from "@/components/crm/LeadActions";
import { Alert, Badge, Card, DefinitionList, EmptyState, LinkButton, PageHeader, leadStatusTone, priorityTone } from "@/components/crm/ui";
import { cx } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Lead" };

const TABS = [
  ["overview", "Overview"],
  ["notes", "Notes"],
  ["activities", "Activities"],
  ["tasks", "Tasks"],
  ["company", "Related Company"],
  ["deals", "Related Deals"],
] as const;

export default async function LeadPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { id } = await params;
  const sp = await searchParams;
  const user = await requireUser();
  const lead = await getLeadForUser(user, id);
  if (!lead) notFound();
  const db = await getDb();
  const [settings, maps] = await Promise.all([getSettings(), labelMaps()]);
  const tz = settings.timezone;
  const tab = TABS.some(([k]) => k === sp.tab) ? sp.tab! : "overview";
  const editable = canEdit(user, lead) && !lead.mergedIntoId;
  const name = `${lead.firstName} ${lead.lastName}`.trim();

  const companyId = lead.convertedCompanyId ?? lead.companyId;
  const [acts, taskRows, [company], relatedDeals, dupTarget] = await Promise.all([
    activitiesFor({ leadId: id }),
    tasksFor({ leadId: id }),
    companyId ? db.select().from(companies).where(eq(companies.id, companyId)) : Promise.resolve([] as (typeof companies.$inferSelect)[]),
    db
      .select({ d: deals, stage: pipelineStages.label })
      .from(deals)
      .innerJoin(pipelineStages, eq(pipelineStages.id, deals.stageId))
      .where(and(isNull(deals.archivedAt), companyId ? eq(deals.companyId, companyId) : eq(deals.leadId, id))),
    lead.possibleDuplicateOfId
      ? db.select({ id: leads.id, number: leads.number, firstName: leads.firstName, lastName: leads.lastName }).from(leads).where(eq(leads.id, lead.possibleDuplicateOfId))
      : Promise.resolve([]),
  ]);
  const tasksView = toTaskRows(taskRows, tz);
  const team = maps.team.filter((t) => t.isActive).map((t) => ({ value: t.id, label: t.name }));

  // For conversion: preselect matches so duplicates are not created
  let convertProps: Parameters<typeof ConvertButton>[0] | null = null;
  if (editable && !lead.convertedAt && !lead.archivedAt && can(user.role, "leads.convert")) {
    const pick = await pickerOptions(user);
    const norm = normalize.company(lead.companyName);
    const [matchCo] = norm ? await db.select({ id: companies.id }).from(companies).where(and(eq(companies.nameNormalized, norm), isNull(companies.archivedAt))) : [];
    const matchContact = await findContactByEmail(db, lead.emailNormalized);
    convertProps = {
      id,
      defaultDealName: `${lead.companyName || name} opportunity`,
      companies: pick.companies,
      contacts: pick.contacts,
      stages: maps.stages.filter((s) => s.isActive && !s.isWon && !s.isLost).map((s) => ({ value: String(s.id), label: s.label })),
      matchCompanyId: matchCo?.id ?? null,
      matchContactId: matchContact?.id ?? null,
    };
  }

  const followOverdue = lead.nextFollowUpAt && lead.nextFollowUpAt.getTime() < Date.now() && !["converted", "lost"].includes(lead.status);

  return (
    <>
      <PageHeader
        crumbs={[{ label: "Leads", href: "/crm/leads" }, { label: leadCode(lead.number) }]}
        title={name}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <Badge tone={leadStatusTone[lead.status]}>{leadStatusLabels[lead.status]}</Badge>
            <Badge tone={priorityTone[lead.priority]}>{priorityLabels[lead.priority]} priority</Badge>
            {lead.isWebsiteInquiry && (
              <Badge tone="teal">
                <Globe aria-hidden className="mr-1 size-3" /> Website inquiry
              </Badge>
            )}
            {lead.archivedAt && <Badge>Archived</Badge>}
            {lead.mergedIntoId && <Badge>Merged</Badge>}
            <span>{[lead.jobTitle, lead.companyName].filter(Boolean).join(" at ")}</span>
          </span>
        }
        actions={
          editable && (
            <LinkButton href={`/crm/leads/${id}/edit`} size="sm">
              <Pencil aria-hidden className="size-3.5" /> Edit
            </LinkButton>
          )
        }
      />

      {sp.created && <Alert tone="success" className="mb-4">Lead created.</Alert>}
      {sp.saved && <Alert tone="success" className="mb-4">Changes saved.</Alert>}
      {sp.merged && <Alert tone="success" className="mb-4">The duplicate lead was merged into this lead.</Alert>}
      {lead.mergedIntoId && (
        <Alert tone="info" className="mb-4">
          This lead was merged. <Link href={`/crm/leads/${lead.mergedIntoId}`} className="font-semibold text-blue underline">Open the lead it was merged into</Link>.
        </Alert>
      )}
      {lead.convertedAt && (
        <Alert tone="info" className="mb-4">
          Converted on {fmtDate(lead.convertedAt, tz)}.{" "}
          {lead.convertedContactId && <Link href={`/crm/contacts/${lead.convertedContactId}`} className="font-semibold text-blue underline">View contact</Link>}
          {lead.convertedDealId && (
            <>
              {" · "}
              <Link href={`/crm/deals/${lead.convertedDealId}`} className="font-semibold text-blue underline">View deal</Link>
            </>
          )}
        </Alert>
      )}
      {dupTarget[0] && !lead.mergedIntoId && (
        <DuplicateBanner id={id} target={{ id: dupTarget[0].id, label: `${leadCode(dupTarget[0].number)} ${dupTarget[0].firstName} ${dupTarget[0].lastName}`.trim() }} canMerge={can(user.role, "leads.merge") && !lead.convertedAt} />
      )}

      {/* Quick actions */}
      {(editable || can(user.role, "activities.log")) && !lead.archivedAt && (
        <div className="mb-5 flex flex-wrap items-center gap-2 rounded-[8px] border border-line bg-white p-3">
          {editable && (
            <LeadStatusSelect
              id={id}
              status={lead.status}
              disabled={!!lead.convertedAt}
              statuses={LEAD_STATUSES.filter((s) => s !== "converted" || lead.convertedAt).map((s) => ({ value: s, label: leadStatusLabels[s] }))}
            />
          )}
          {editable && can(user.role, "records.assign") && <AssignButton id={id} current={lead.assignedToId} team={team} />}
          {can(user.role, "activities.log") && <ActivityButtons refs={{ leadId: id }} compact />}
          {editable && <FollowUpButton id={id} current={lead.nextFollowUpAt?.toISOString() ?? null} />}
          {(editable || can(user.role, "activities.log")) && <TaskButton refs={{ leadId: id }} team={team} currentUserId={user.id} canAssign={can(user.role, "records.assign")} />}
          <span className="flex-1" />
          {convertProps && <ConvertButton {...convertProps} />}
          {can(user.role, "records.archive") && <ArchiveLeadButton id={id} archived={false} />}
        </div>
      )}
      {lead.archivedAt && can(user.role, "records.archive") && !lead.mergedIntoId && (
        <div className="mb-5">
          <ArchiveLeadButton id={id} archived />
        </div>
      )}

      {/* Tabs */}
      <nav aria-label="Lead sections" className="mb-5 flex gap-1 overflow-x-auto overflow-y-hidden border-b border-line">
        {TABS.map(([k, label]) => (
          <Link
            key={k}
            href={`/crm/leads/${id}${k === "overview" ? "" : `?tab=${k}`}`}
            aria-current={tab === k ? "page" : undefined}
            className={cx("-mb-px whitespace-nowrap border-b-2 px-3 py-2.5 text-[0.85rem] font-semibold", tab === k ? "border-blue text-blue" : "border-transparent text-muted hover:text-slate")}
          >
            {label}
            {k === "tasks" && tasksView.length > 0 && <span className="ml-1.5 text-xs text-muted">{tasksView.length}</span>}
          </Link>
        ))}
      </nav>

      {tab === "overview" && (
        <div className="grid gap-5 xl:grid-cols-3">
          <div className="space-y-5 xl:col-span-2">
            <Card title="Contact information">
              <DefinitionList
                items={[
                  ["Lead ID", leadCode(lead.number)],
                  ["Business email", <a key="e" href={`mailto:${lead.email}`} className="text-blue hover:underline">{lead.email}</a>],
                  ["Phone", lead.phone ? <a href={`tel:${lead.phone}`} className="text-blue hover:underline">{lead.phone}</a> : null],
                  ["Job title", lead.jobTitle],
                ]}
              />
            </Card>
            <Card title="Company information">
              <DefinitionList
                items={[
                  ["Company", company ? <Link href={`/crm/companies/${company.id}`} className="text-blue hover:underline">{company.name}</Link> : lead.companyName],
                  ["Website", lead.website ? <a href={lead.website.startsWith("http") ? lead.website : `https://${lead.website}`} target="_blank" rel="noopener noreferrer" className="text-blue hover:underline">{lead.website}</a> : null],
                  ["Industry", lead.industry],
                ]}
              />
            </Card>
            {lead.inquiryMessage && (
              <Card title="Original website inquiry">
                <p className="whitespace-pre-wrap text-[0.92rem] leading-relaxed text-slate">{lead.inquiryMessage}</p>
              </Card>
            )}
            {lead.notes && (
              <Card title="Lead notes">
                <p className="whitespace-pre-wrap text-[0.92rem] leading-relaxed text-slate">{lead.notes}</p>
              </Card>
            )}
          </div>
          <div className="space-y-5">
            <Card title="Details">
              <DefinitionList
                items={[
                  ["Service interest", lead.serviceKey ? maps.service[lead.serviceKey] ?? lead.serviceKey : null],
                  ["Lead source", maps.source[lead.sourceKey] ?? lead.sourceKey],
                  ["Assigned to", lead.assignedToId ? maps.user[lead.assignedToId] ?? "Former user" : <span className="text-muted">Unassigned</span>],
                  ["Created", fmtDate(lead.createdAt, tz, true)],
                  ["Last contact", fmtDate(lead.lastContactAt, tz, true)],
                  ["Next follow-up", lead.nextFollowUpAt ? <span className={followOverdue ? "font-semibold text-[#a3241a]" : ""}>{fmtDate(lead.nextFollowUpAt, tz, true)}{followOverdue ? " (overdue)" : ""}</span> : null],
                ]}
              />
            </Card>
            <Card title="Recent activity">
              <Timeline items={acts.slice(0, 5)} tz={tz} />
              {acts.length > 5 && (
                <Link href={`/crm/leads/${id}?tab=activities`} className="mt-4 inline-block text-sm font-semibold text-blue hover:underline">
                  View all {acts.length} activities
                </Link>
              )}
            </Card>
          </div>
        </div>
      )}

      {tab === "notes" && (
        <div className="grid gap-5 lg:grid-cols-3">
          {can(user.role, "activities.log") && (
            <Card title="Add a note" className="lg:order-2">
              <QuickNote refs={{ leadId: id }} />
            </Card>
          )}
          <Card title="Notes" className="lg:col-span-2">
            <Timeline items={acts.filter((a) => a.a.type === "note")} tz={tz} />
          </Card>
        </div>
      )}

      {tab === "activities" && (
        <Card title="Activity history" actions={can(user.role, "activities.log") ? <div className="flex flex-wrap gap-2"><ActivityButtons refs={{ leadId: id }} compact /></div> : undefined}>
          <Timeline items={acts} tz={tz} />
        </Card>
      )}

      {tab === "tasks" && (
        <Card title="Tasks" actions={<TaskButton refs={{ leadId: id }} team={team} currentUserId={user.id} canAssign={can(user.role, "records.assign")} />}>
          {tasksView.length ? (
            <TaskList items={tasksView} team={team} currentUserId={user.id} canAssign={can(user.role, "records.assign")} editableIds={editableTaskIds(user, taskRows)} showRelated={false} />
          ) : (
            <EmptyState title="No tasks yet" text="Create a follow-up task so this lead is not forgotten." />
          )}
        </Card>
      )}

      {tab === "company" && (
        <Card title="Related company">
          {company ? (
            <DefinitionList
              items={[
                ["Company", <Link key="c" href={`/crm/companies/${company.id}`} className="font-semibold text-blue hover:underline">{company.name}</Link>],
                ["Website", company.website],
                ["Phone", company.phone],
                ["Location", [company.city, company.state].filter(Boolean).join(", ") || null],
              ]}
            />
          ) : (
            <EmptyState title="No company linked yet" text={lead.companyName ? `Converting this lead will link or create "${lead.companyName}".` : "Add a company name to this lead, then convert it."} />
          )}
        </Card>
      )}

      {tab === "deals" && (
        <Card title="Related deals" bodyClassName="p-0">
          {relatedDeals.length ? (
            <ul className="divide-y divide-line">
              {relatedDeals.map(({ d, stage }) => (
                <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
                  <Link href={`/crm/deals/${d.id}`} className="font-semibold text-slate hover:text-blue">{d.name}</Link>
                  <span className="flex items-center gap-3 text-sm text-muted">
                    <Badge>{stage}</Badge>
                    {fmtMoney(d.value, d.currency) ?? "Value not set"}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No related deals" text="Deals are created when a lead is converted, or from the Deals page." />
          )}
        </Card>
      )}
    </>
  );
}

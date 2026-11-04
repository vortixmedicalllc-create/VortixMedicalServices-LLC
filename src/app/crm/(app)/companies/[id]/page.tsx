import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq, isNull, or } from "drizzle-orm";
import { Pencil, Plus } from "lucide-react";
import { getDb } from "@/db";
import { contacts, deals, leads, pipelineStages } from "@/db/schema";
import { requireUser } from "@/server/auth";
import { can, canEdit } from "@/server/permissions";
import { fmtDate, fmtMoney, getSettings, labelMaps } from "@/server/lookups";
import { activitiesFor, getCompanyForUser, tasksFor } from "@/server/queries/records";
import { companyTypeLabels, leadStatusLabels, relationshipLabels } from "@/server/constants";
import { leadCode } from "@/server/services/leads";
import { ActivityButtons, QuickNote, TaskButton, TaskList } from "@/components/crm/record-client";
import { Timeline, editableTaskIds, toTaskRows } from "@/components/crm/record";
import { ArchiveRecordButton } from "@/components/crm/forms";
import { Alert, Badge, Card, DefinitionList, EmptyState, LinkButton, PageHeader, leadStatusTone } from "@/components/crm/ui";

export const metadata: Metadata = { title: "Company" };

export default async function CompanyPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { id } = await params;
  const sp = await searchParams;
  const user = await requireUser();
  const c = await getCompanyForUser(user, id);
  if (!c) notFound();
  const db = await getDb();
  const [settings, maps] = await Promise.all([getSettings(), labelMaps()]);
  const tz = settings.timezone;
  const editable = canEdit(user, c);
  const team = maps.team.filter((t) => t.isActive).map((t) => ({ value: t.id, label: t.name }));
  const canCreate = can(user.role, "records.create");

  const [people, relDeals, relLeads, acts, taskRows] = await Promise.all([
    db.select().from(contacts).where(and(eq(contacts.companyId, id), isNull(contacts.archivedAt))).orderBy(contacts.lastName),
    db
      .select({ d: deals, stage: pipelineStages.label, isWon: pipelineStages.isWon, isLost: pipelineStages.isLost })
      .from(deals)
      .innerJoin(pipelineStages, eq(pipelineStages.id, deals.stageId))
      .where(and(eq(deals.companyId, id), isNull(deals.archivedAt)))
      .orderBy(desc(deals.updatedAt)),
    db
      .select()
      .from(leads)
      .where(and(isNull(leads.archivedAt), or(eq(leads.companyId, id), eq(leads.convertedCompanyId, id), eq(leads.companyNameNormalized, c.nameNormalized))))
      .orderBy(desc(leads.createdAt))
      .limit(50),
    activitiesFor({ companyId: id }),
    tasksFor({ companyId: id }),
  ]);
  const visibleLeads = can(user.role, "records.view_all") ? relLeads : relLeads.filter((l) => l.assignedToId === user.id || l.createdById === user.id);
  const tasksView = toTaskRows(taskRows, tz);
  const openValue = relDeals.filter((d) => !d.isWon && !d.isLost).reduce((a, b) => a + Number(b.d.value || 0), 0);

  return (
    <>
      <PageHeader
        crumbs={[{ label: "Companies", href: "/crm/companies" }, { label: c.name }]}
        title={c.name}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <Badge tone={c.relationshipStatus === "active_client" ? "teal" : "blue"}>{relationshipLabels[c.relationshipStatus]}</Badge>
            <span>{companyTypeLabels[c.companyType]}</span>
            {c.archivedAt && <Badge>Archived</Badge>}
          </span>
        }
        actions={
          <>
            {editable && (
              <LinkButton href={`/crm/companies/${id}/edit`} size="sm">
                <Pencil aria-hidden className="size-3.5" /> Edit
              </LinkButton>
            )}
            {can(user.role, "records.archive") && <ArchiveRecordButton kind="company" id={id} archived={!!c.archivedAt} noun="company" />}
          </>
        }
      />
      {sp.saved && <Alert tone="success" className="mb-4">Company saved.</Alert>}

      {can(user.role, "activities.log") && !c.archivedAt && (
        <div className="mb-5 flex flex-wrap gap-2 rounded-[8px] border border-line bg-white p-3">
          <ActivityButtons refs={{ companyId: id }} compact />
          <TaskButton refs={{ companyId: id }} team={team} currentUserId={user.id} canAssign={can(user.role, "records.assign")} />
          {canCreate && (
            <>
              <LinkButton href={`/crm/contacts/new?company=${id}`} size="sm"><Plus aria-hidden className="size-3.5" /> Contact</LinkButton>
              <LinkButton href={`/crm/deals/new?company=${id}`} size="sm"><Plus aria-hidden className="size-3.5" /> Deal</LinkButton>
            </>
          )}
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-3">
        <div className="space-y-5 xl:col-span-2">
          <Card title="Company details">
            <DefinitionList
              items={[
                ["Website", c.website ? <a href={c.website.startsWith("http") ? c.website : `https://${c.website}`} target="_blank" rel="noopener noreferrer" className="text-blue hover:underline">{c.website}</a> : null],
                ["Business email", c.email ? <a href={`mailto:${c.email}`} className="text-blue hover:underline">{c.email}</a> : null],
                ["Phone", c.phone],
                ["Industry", c.industry],
                ["Address", [c.address, c.city, c.state, c.country].filter(Boolean).join(", ") || null],
                ["Owner", c.ownerId ? maps.user[c.ownerId] : null],
                ["Open pipeline", fmtMoney(openValue, settings.currency) ?? "$0"],
                ["Created", fmtDate(c.createdAt, tz)],
              ]}
            />
            {c.notes && <p className="mt-5 whitespace-pre-wrap border-t border-line pt-4 text-[0.92rem] leading-relaxed">{c.notes}</p>}
          </Card>
          <Card title={`Contacts (${people.length})`} bodyClassName="p-0">
            {people.length ? (
              <ul className="divide-y divide-line">
                {people.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
                    <span>
                      <Link href={`/crm/contacts/${p.id}`} className="font-semibold hover:text-blue">{`${p.firstName} ${p.lastName}`.trim()}</Link>
                      {p.jobTitle && <span className="ml-2 text-sm text-muted">{p.jobTitle}</span>}
                    </span>
                    <span className="text-sm text-muted">{p.email}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="No contacts yet" />
            )}
          </Card>
          <Card title={`Deals (${relDeals.length})`} bodyClassName="p-0">
            {relDeals.length ? (
              <ul className="divide-y divide-line">
                {relDeals.map(({ d, stage }) => (
                  <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
                    <Link href={`/crm/deals/${d.id}`} className="font-semibold hover:text-blue">{d.name}</Link>
                    <span className="flex items-center gap-3 text-sm text-muted">
                      <Badge>{stage}</Badge>
                      {fmtMoney(d.value, d.currency) ?? "Value not set"}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="No deals yet" />
            )}
          </Card>
          <Card title="Activity history">
            <Timeline items={acts} tz={tz} showRelated />
          </Card>
        </div>
        <div className="space-y-5">
          <Card title="Tasks">
            {tasksView.length ? (
              <TaskList items={tasksView} team={team} currentUserId={user.id} canAssign={can(user.role, "records.assign")} editableIds={editableTaskIds(user, taskRows)} />
            ) : (
              <p className="text-sm text-muted">No tasks yet.</p>
            )}
          </Card>
          <Card title={`Leads (${visibleLeads.length})`} bodyClassName="p-0">
            {visibleLeads.length ? (
              <ul className="divide-y divide-line">
                {visibleLeads.map((l) => (
                  <li key={l.id} className="flex items-center justify-between gap-2 px-5 py-3">
                    <Link href={`/crm/leads/${l.id}`} className="text-sm font-semibold hover:text-blue">
                      {`${l.firstName} ${l.lastName}`.trim()} <span className="font-normal text-muted">{leadCode(l.number)}</span>
                    </Link>
                    <Badge tone={leadStatusTone[l.status]}>{leadStatusLabels[l.status]}</Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="No related leads" />
            )}
          </Card>
          {can(user.role, "activities.log") && (
            <Card title="Add a note">
              <QuickNote refs={{ companyId: id }} />
            </Card>
          )}
        </div>
      </div>
    </>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq, isNull, or } from "drizzle-orm";
import { Pencil } from "lucide-react";
import { getDb } from "@/db";
import { companies, deals, leads, pipelineStages } from "@/db/schema";
import { requireUser } from "@/server/auth";
import { can, canEdit } from "@/server/permissions";
import { fmtDate, fmtMoney, getSettings, labelMaps } from "@/server/lookups";
import { activitiesFor, getContactForUser, tasksFor } from "@/server/queries/records";
import { contactTypeLabels } from "@/server/constants";
import { leadCode } from "@/server/services/leads";
import { ActivityButtons, QuickNote, TaskButton, TaskList } from "@/components/crm/record-client";
import { Timeline, editableTaskIds, toTaskRows } from "@/components/crm/record";
import { ArchiveRecordButton } from "@/components/crm/forms";
import { Alert, Badge, Card, DefinitionList, EmptyState, LinkButton, PageHeader } from "@/components/crm/ui";

export const metadata: Metadata = { title: "Contact" };

export default async function ContactPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { id } = await params;
  const sp = await searchParams;
  const user = await requireUser();
  const c = await getContactForUser(user, id);
  if (!c) notFound();
  const db = await getDb();
  const [settings, maps] = await Promise.all([getSettings(), labelMaps()]);
  const tz = settings.timezone;
  const name = `${c.firstName} ${c.lastName}`.trim();
  const editable = canEdit(user, c);
  const team = maps.team.filter((t) => t.isActive).map((t) => ({ value: t.id, label: t.name }));

  const [[company], relDeals, sourceLeads, acts, taskRows] = await Promise.all([
    c.companyId ? db.select().from(companies).where(eq(companies.id, c.companyId)) : Promise.resolve([] as (typeof companies.$inferSelect)[]),
    db
      .select({ d: deals, stage: pipelineStages.label })
      .from(deals)
      .innerJoin(pipelineStages, eq(pipelineStages.id, deals.stageId))
      .where(and(eq(deals.primaryContactId, id), isNull(deals.archivedAt))),
    c.emailNormalized && can(user.role, "records.view_all")
      ? db.select({ id: leads.id, number: leads.number, status: leads.status }).from(leads).where(or(eq(leads.convertedContactId, id), eq(leads.emailNormalized, c.emailNormalized)))
      : db.select({ id: leads.id, number: leads.number, status: leads.status }).from(leads).where(eq(leads.convertedContactId, id)),
    activitiesFor({ contactId: id }),
    tasksFor({ contactId: id }),
  ]);
  const tasksView = toTaskRows(taskRows, tz);

  return (
    <>
      <PageHeader
        crumbs={[{ label: "Contacts", href: "/crm/contacts" }, { label: name }]}
        title={name}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <Badge tone={c.contactType === "client" ? "teal" : "gray"}>{contactTypeLabels[c.contactType]}</Badge>
            {c.archivedAt && <Badge>Archived</Badge>}
            {[c.jobTitle, company?.name].filter(Boolean).join(" at ")}
          </span>
        }
        actions={
          <>
            {editable && (
              <LinkButton href={`/crm/contacts/${id}/edit`} size="sm">
                <Pencil aria-hidden className="size-3.5" /> Edit
              </LinkButton>
            )}
            {can(user.role, "records.archive") && <ArchiveRecordButton kind="contact" id={id} archived={!!c.archivedAt} noun="contact" />}
          </>
        }
      />
      {sp.saved && <Alert tone="success" className="mb-4">Contact saved.</Alert>}
      {sp.converted && <Alert tone="success" className="mb-4">Lead converted. This contact now holds the lead&apos;s history.</Alert>}

      {can(user.role, "activities.log") && !c.archivedAt && (
        <div className="mb-5 flex flex-wrap gap-2 rounded-[8px] border border-line bg-white p-3">
          <ActivityButtons refs={{ contactId: id, companyId: c.companyId ?? undefined }} compact />
          <TaskButton refs={{ contactId: id, companyId: c.companyId ?? undefined }} team={team} currentUserId={user.id} canAssign={can(user.role, "records.assign")} />
          {can(user.role, "records.create") && <LinkButton href={`/crm/deals/new?contact=${id}${c.companyId ? `&company=${c.companyId}` : ""}`} size="sm">New Deal</LinkButton>}
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-3">
        <div className="space-y-5 xl:col-span-2">
          <Card title="Contact details">
            <DefinitionList
              items={[
                ["Email", c.email ? <a href={`mailto:${c.email}`} className="text-blue hover:underline">{c.email}</a> : null],
                ["Phone", c.phone ? <a href={`tel:${c.phone}`} className="text-blue hover:underline">{c.phone}</a> : null],
                ["Job title", c.jobTitle],
                ["Company", company ? <Link href={`/crm/companies/${company.id}`} className="text-blue hover:underline">{company.name}</Link> : null],
                ["Owner", c.ownerId ? maps.user[c.ownerId] : null],
                ["Created", fmtDate(c.createdAt, tz, true)],
              ]}
            />
            {c.notes && <p className="mt-5 whitespace-pre-wrap border-t border-line pt-4 text-[0.92rem] leading-relaxed">{c.notes}</p>}
          </Card>
          <Card title="Activity timeline" actions={can(user.role, "activities.log") ? <span className="text-xs text-muted">{acts.length} entries</span> : undefined}>
            <Timeline items={acts} tz={tz} showRelated />
          </Card>
        </div>
        <div className="space-y-5">
          <Card title="Tasks" actions={<TaskButton refs={{ contactId: id }} team={team} currentUserId={user.id} canAssign={can(user.role, "records.assign")} label="Add" />}>
            {tasksView.length ? (
              <TaskList items={tasksView} team={team} currentUserId={user.id} canAssign={can(user.role, "records.assign")} editableIds={editableTaskIds(user, taskRows)} showRelated={false} />
            ) : (
              <p className="text-sm text-muted">No tasks yet.</p>
            )}
          </Card>
          <Card title="Related deals" bodyClassName="p-0">
            {relDeals.length ? (
              <ul className="divide-y divide-line">
                {relDeals.map(({ d, stage }) => (
                  <li key={d.id} className="px-5 py-3">
                    <Link href={`/crm/deals/${d.id}`} className="font-semibold hover:text-blue">{d.name}</Link>
                    <p className="text-xs text-muted">{stage} · {fmtMoney(d.value, d.currency) ?? "Value not set"}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="No deals" />
            )}
          </Card>
          {sourceLeads.length > 0 && (
            <Card title="Related leads">
              <ul className="space-y-2 text-sm">
                {sourceLeads.map((l) => (
                  <li key={l.id}>
                    <Link href={`/crm/leads/${l.id}`} className="text-blue hover:underline">{leadCode(l.number)}</Link> <span className="text-muted">({l.status.replace("_", " ")})</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
          {can(user.role, "activities.log") && (
            <Card title="Add a note">
              <QuickNote refs={{ contactId: id }} />
            </Card>
          )}
        </div>
      </div>
    </>
  );
}

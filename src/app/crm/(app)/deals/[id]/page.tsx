import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { Pencil } from "lucide-react";
import { getDb } from "@/db";
import { companies, contacts, dealStageHistory, leads, users } from "@/db/schema";
import { requireUser } from "@/server/auth";
import { can, canEdit } from "@/server/permissions";
import { fmtDate, fmtMoney, getSettings, labelMaps } from "@/server/lookups";
import { activitiesFor, getDealForUser, tasksFor } from "@/server/queries/records";
import { dealCode, leadCode } from "@/server/services/leads";
import { ActivityButtons, QuickNote, TaskButton, TaskList } from "@/components/crm/record-client";
import { Timeline, editableTaskIds, toTaskRows } from "@/components/crm/record";
import { ArchiveRecordButton } from "@/components/crm/forms";
import { DealStageSelect } from "@/components/crm/DealStageSelect";
import { Alert, Badge, Card, DefinitionList, LinkButton, PageHeader } from "@/components/crm/ui";

export const metadata: Metadata = { title: "Deal" };

export default async function DealPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { id } = await params;
  const sp = await searchParams;
  const user = await requireUser();
  const d = await getDealForUser(user, id);
  if (!d) notFound();
  const db = await getDb();
  const [settings, maps] = await Promise.all([getSettings(), labelMaps()]);
  const tz = settings.timezone;
  const editable = canEdit(user, d) && !d.archivedAt;
  const team = maps.team.filter((t) => t.isActive).map((t) => ({ value: t.id, label: t.name }));
  const stage = maps.stage[d.stageId];

  const [[company], [contact], [lead], history, acts, taskRows] = await Promise.all([
    d.companyId ? db.select().from(companies).where(eq(companies.id, d.companyId)) : Promise.resolve([] as (typeof companies.$inferSelect)[]),
    d.primaryContactId ? db.select().from(contacts).where(eq(contacts.id, d.primaryContactId)) : Promise.resolve([] as (typeof contacts.$inferSelect)[]),
    d.leadId ? db.select({ id: leads.id, number: leads.number }).from(leads).where(eq(leads.id, d.leadId)) : Promise.resolve([] as { id: string; number: number }[]),
    db
      .select({ h: dealStageHistory, by: users.name })
      .from(dealStageHistory)
      .leftJoin(users, eq(users.id, dealStageHistory.changedById))
      .where(eq(dealStageHistory.dealId, id))
      .orderBy(asc(dealStageHistory.changedAt)),
    activitiesFor({ dealId: id }),
    tasksFor({ dealId: id }),
  ]);
  const tasksView = toTaskRows(taskRows, tz);
  const refs = { dealId: id, companyId: d.companyId ?? undefined, contactId: d.primaryContactId ?? undefined };

  return (
    <>
      <PageHeader
        crumbs={[{ label: "Deals", href: "/crm/deals" }, { label: dealCode(d.number) }]}
        title={d.name}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <Badge tone={stage?.isWon ? "teal" : stage?.isLost ? "red" : "blue"}>{stage?.label}</Badge>
            {d.archivedAt && <Badge>Archived</Badge>}
            {company && <Link href={`/crm/companies/${company.id}`} className="hover:text-blue">{company.name}</Link>}
          </span>
        }
        actions={
          <>
            {editable && (
              <LinkButton href={`/crm/deals/${id}/edit`} size="sm">
                <Pencil aria-hidden className="size-3.5" /> Edit
              </LinkButton>
            )}
            {can(user.role, "records.archive") && <ArchiveRecordButton kind="deal" id={id} archived={!!d.archivedAt} noun="deal" />}
          </>
        }
      />
      {sp.saved && <Alert tone="success" className="mb-4">Deal saved.</Alert>}
      {sp.converted && <Alert tone="success" className="mb-4">Lead converted. The company, contact, and this deal are now linked, and the lead&apos;s history has been carried over.</Alert>}

      <div className="mb-5 flex flex-wrap items-center gap-2 rounded-[8px] border border-line bg-white p-3">
        {editable && <DealStageSelect id={id} stageId={d.stageId} stages={maps.stages.filter((s) => s.isActive).map((s) => ({ value: String(s.id), label: s.label }))} />}
        {can(user.role, "activities.log") && !d.archivedAt && (
          <>
            <ActivityButtons refs={refs} compact />
            <TaskButton refs={refs} team={team} currentUserId={user.id} canAssign={can(user.role, "records.assign")} />
          </>
        )}
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <div className="space-y-5 xl:col-span-2">
          <Card title="Deal details">
            <DefinitionList
              items={[
                ["Deal ID", dealCode(d.number)],
                ["Value", fmtMoney(d.value, d.currency) ?? <span className="text-muted">Not set</span>],
                ["Probability", d.probability !== null ? `${d.probability}%` : null],
                ["Expected close", fmtDate(d.expectedCloseDate, tz)],
                ["Service", d.serviceKey ? maps.service[d.serviceKey] ?? d.serviceKey : null],
                ["Owner", d.ownerId ? maps.user[d.ownerId] : null],
                ["Company", company ? <Link href={`/crm/companies/${company.id}`} className="text-blue hover:underline">{company.name}</Link> : null],
                ["Primary contact", contact ? <Link href={`/crm/contacts/${contact.id}`} className="text-blue hover:underline">{`${contact.firstName} ${contact.lastName}`.trim()}</Link> : null],
                ["Source lead", lead ? <Link href={`/crm/leads/${lead.id}`} className="text-blue hover:underline">{leadCode(lead.number)}</Link> : null],
                ["Created", fmtDate(d.createdAt, tz)],
                ["Last updated", fmtDate(d.updatedAt, tz, true)],
                ["Closed", fmtDate(d.closedAt, tz)],
              ]}
            />
            {d.description && <p className="mt-5 whitespace-pre-wrap border-t border-line pt-4 text-[0.92rem] leading-relaxed">{d.description}</p>}
          </Card>
          <Card title="Activity history">
            <Timeline items={acts} tz={tz} />
          </Card>
        </div>
        <div className="space-y-5">
          <Card title="Stage history">
            <ol className="space-y-3">
              {history.map(({ h, by }) => (
                <li key={h.id} className="text-sm">
                  <p className="font-semibold">{maps.stage[h.toStageId]?.label ?? "Stage removed"}</p>
                  <p className="text-xs text-muted">
                    {h.fromStageId ? `From ${maps.stage[h.fromStageId]?.label ?? "previous stage"} · ` : "Created · "}
                    {fmtDate(h.changedAt, tz, true)}
                    {by ? ` · ${by}` : ""}
                  </p>
                </li>
              ))}
            </ol>
          </Card>
          <Card title="Tasks">
            {tasksView.length ? (
              <TaskList items={tasksView} team={team} currentUserId={user.id} canAssign={can(user.role, "records.assign")} editableIds={editableTaskIds(user, taskRows)} showRelated={false} />
            ) : (
              <p className="text-sm text-muted">No tasks yet.</p>
            )}
          </Card>
          {can(user.role, "activities.log") && (
            <Card title="Add a note">
              <QuickNote refs={refs} />
            </Card>
          )}
        </div>
      </div>
    </>
  );
}

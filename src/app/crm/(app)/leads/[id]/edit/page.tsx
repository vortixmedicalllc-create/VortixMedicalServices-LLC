import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/server/auth";
import { can, canEdit } from "@/server/permissions";
import { labelMaps } from "@/server/lookups";
import { getLeadForUser } from "@/server/queries/leads";
import { updateLeadAction } from "@/server/actions/leads";
import { leadCode } from "@/server/services/leads";
import { LEAD_STATUSES, leadStatusLabels, PRIORITIES, priorityLabels } from "@/server/constants";
import { LeadForm } from "@/components/crm/LeadForm";
import { PageHeader } from "@/components/crm/ui";

export const metadata: Metadata = { title: "Edit Lead" };

export default async function EditLeadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const lead = await getLeadForUser(user, id);
  if (!lead) notFound();
  if (!canEdit(user, lead)) redirect(`/crm/leads/${id}`);
  const maps = await labelMaps();
  const name = `${lead.firstName} ${lead.lastName}`.trim();
  return (
    <div className="max-w-4xl">
      <PageHeader title={`Edit ${name}`} crumbs={[{ label: "Leads", href: "/crm/leads" }, { label: leadCode(lead.number), href: `/crm/leads/${id}` }, { label: "Edit" }]} />
      <LeadForm
        action={updateLeadAction.bind(null, id)}
        initial={{ ...lead, nextFollowUpAt: lead.nextFollowUpAt?.toISOString() ?? null, lastContactAt: lead.lastContactAt?.toISOString() ?? null }}
        services={maps.services.map((s) => ({ value: s.key, label: s.label }))}
        sources={maps.sources.map((s) => ({ value: s.key, label: s.label }))}
        statuses={LEAD_STATUSES.filter((s) => s !== "converted" || lead.convertedAt).map((s) => ({ value: s, label: leadStatusLabels[s] }))}
        priorities={PRIORITIES.map((p) => ({ value: p, label: priorityLabels[p] }))}
        team={maps.team.filter((t) => t.isActive || t.id === lead.assignedToId).map((t) => ({ value: t.id, label: t.name }))}
        canAssign={can(user.role, "records.assign")}
        currentUserId={user.id}
        cancelHref={`/crm/leads/${id}`}
        submitLabel="Save Changes"
      />
    </div>
  );
}

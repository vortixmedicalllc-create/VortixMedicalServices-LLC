import type { Metadata } from "next";
import { requirePagePermission } from "@/server/auth";
import { can } from "@/server/permissions";
import { labelMaps } from "@/server/lookups";
import { createLeadAction } from "@/server/actions/leads";
import { LEAD_STATUSES, leadStatusLabels, PRIORITIES, priorityLabels } from "@/server/constants";
import { LeadForm } from "@/components/crm/LeadForm";
import { PageHeader } from "@/components/crm/ui";

export const metadata: Metadata = { title: "New Lead" };

export default async function NewLeadPage() {
  const user = await requirePagePermission("records.create");
  const maps = await labelMaps();
  return (
    <div className="max-w-4xl">
      <PageHeader title="New Lead" crumbs={[{ label: "Leads", href: "/crm/leads" }, { label: "New" }]} />
      <LeadForm
        action={createLeadAction}
        services={maps.services.filter((s) => s.isActive).map((s) => ({ value: s.key, label: s.label }))}
        sources={maps.sources.filter((s) => s.isActive).map((s) => ({ value: s.key, label: s.label }))}
        statuses={LEAD_STATUSES.filter((s) => s !== "converted").map((s) => ({ value: s, label: leadStatusLabels[s] }))}
        priorities={PRIORITIES.map((p) => ({ value: p, label: priorityLabels[p] }))}
        team={maps.team.filter((t) => t.isActive).map((t) => ({ value: t.id, label: t.name }))}
        canAssign={can(user.role, "records.assign")}
        currentUserId={user.id}
        cancelHref="/crm/leads"
        submitLabel="Create Lead"
      />
    </div>
  );
}

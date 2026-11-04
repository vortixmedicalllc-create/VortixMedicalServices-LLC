import type { Metadata } from "next";
import { History } from "lucide-react";
import { requireUser } from "@/server/auth";
import { can } from "@/server/permissions";
import { getSettings, labelMaps } from "@/server/lookups";
import { listActivities } from "@/server/queries/records";
import { ACTIVITY_TYPES, activityTypeLabels } from "@/server/constants";
import { FilterBar } from "@/components/crm/FilterBar";
import { Timeline } from "@/components/crm/record";
import { Pagination, type SP } from "@/components/crm/lists";
import { Card, EmptyState, PageHeader } from "@/components/crm/ui";

export const metadata: Metadata = { title: "Activities" };

export default async function ActivitiesPage({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const [settings, maps, { rows, total }] = await Promise.all([getSettings(), labelMaps(), listActivities(user, sp)]);
  return (
    <>
      <PageHeader
        title="Activities"
        description="Calls, emails, meetings, notes, and record changes across the CRM. To log a new activity, open the related lead, contact, company, or deal."
      />
      <FilterBar
        filters={[
          { type: "search", name: "q", label: "Search activity text" },
          { type: "select", name: "type", label: "Type", options: ACTIVITY_TYPES.map((t) => ({ value: t, label: activityTypeLabels[t] })) },
          ...(can(user.role, "records.view_all") ? [{ type: "select" as const, name: "by", label: "Recorded by", options: maps.team.map((t) => ({ value: t.id, label: t.name })) }] : []),
          { type: "date", name: "from", label: "From" },
          { type: "date", name: "to", label: "To" },
        ]}
      />
      <Card>{rows.length ? <Timeline items={rows} tz={settings.timezone} showRelated /> : <EmptyState icon={<History className="size-5" />} title="No activities found" />}</Card>
      <Pagination total={total} sp={sp} basePath="/crm/activities" />
    </>
  );
}

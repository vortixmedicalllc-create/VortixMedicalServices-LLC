import type { Metadata } from "next";
import { requirePagePermission } from "@/server/auth";
import { can } from "@/server/permissions";
import { getSettings, labelMaps } from "@/server/lookups";
import { pickerOptions } from "@/server/queries/records";
import { saveDealAction } from "@/server/actions/records";
import { DealForm } from "@/components/crm/forms";
import { PageHeader } from "@/components/crm/ui";

export const metadata: Metadata = { title: "New Deal" };

export default async function NewDealPage({ searchParams }: { searchParams: Promise<{ company?: string; contact?: string }> }) {
  const user = await requirePagePermission("records.create");
  const sp = await searchParams;
  const [maps, pick, settings] = await Promise.all([labelMaps(), pickerOptions(user), getSettings()]);
  const stages = maps.stages.filter((s) => s.isActive);
  return (
    <div className="max-w-4xl">
      <PageHeader title="New Deal" crumbs={[{ label: "Deals", href: "/crm/deals" }, { label: "New" }]} />
      <DealForm
        action={saveDealAction.bind(null, null)}
        initial={{ companyId: sp.company, primaryContactId: sp.contact, stageId: String(stages[0]?.id ?? "") }}
        companies={pick.companies}
        contacts={pick.contacts}
        services={maps.services.filter((s) => s.isActive).map((s) => ({ value: s.key, label: s.label }))}
        stages={stages.map((s) => ({ value: String(s.id), label: s.label }))}
        team={maps.team.filter((t) => t.isActive).map((t) => ({ value: t.id, label: t.name }))}
        canAssign={can(user.role, "records.assign")}
        currentUserId={user.id}
        defaultCurrency={settings.currency}
        cancelHref="/crm/deals"
        submitLabel="Create Deal"
      />
    </div>
  );
}

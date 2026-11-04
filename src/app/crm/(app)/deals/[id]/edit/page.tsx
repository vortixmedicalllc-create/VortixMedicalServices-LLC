import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/server/auth";
import { can, canEdit } from "@/server/permissions";
import { getSettings, labelMaps } from "@/server/lookups";
import { getDealForUser, pickerOptions } from "@/server/queries/records";
import { saveDealAction } from "@/server/actions/records";
import { DealForm } from "@/components/crm/forms";
import { PageHeader } from "@/components/crm/ui";

export const metadata: Metadata = { title: "Edit Deal" };

export default async function EditDealPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const d = await getDealForUser(user, id);
  if (!d) notFound();
  if (!canEdit(user, d)) redirect(`/crm/deals/${id}`);
  const [maps, pick, settings] = await Promise.all([labelMaps(), pickerOptions(user), getSettings()]);
  return (
    <div className="max-w-4xl">
      <PageHeader title={`Edit ${d.name}`} crumbs={[{ label: "Deals", href: "/crm/deals" }, { label: d.name, href: `/crm/deals/${id}` }, { label: "Edit" }]} />
      <DealForm
        action={saveDealAction.bind(null, id)}
        initial={{ ...d, stageId: String(d.stageId), probability: d.probability?.toString() ?? "", value: d.value ?? "" }}
        companies={pick.companies}
        contacts={pick.contacts}
        services={maps.services.map((s) => ({ value: s.key, label: s.label }))}
        stages={maps.stages.filter((s) => s.isActive || s.id === d.stageId).map((s) => ({ value: String(s.id), label: s.label }))}
        team={maps.team.filter((t) => t.isActive || t.id === d.ownerId).map((t) => ({ value: t.id, label: t.name }))}
        canAssign={can(user.role, "records.assign")}
        currentUserId={user.id}
        defaultCurrency={settings.currency}
        cancelHref={`/crm/deals/${id}`}
        submitLabel="Save Changes"
      />
    </div>
  );
}

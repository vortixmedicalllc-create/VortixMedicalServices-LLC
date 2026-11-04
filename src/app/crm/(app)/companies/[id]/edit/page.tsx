import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/server/auth";
import { can, canEdit } from "@/server/permissions";
import { labelMaps } from "@/server/lookups";
import { getCompanyForUser } from "@/server/queries/records";
import { saveCompanyAction } from "@/server/actions/records";
import { COMPANY_TYPES, companyTypeLabels, RELATIONSHIP_STATUSES, relationshipLabels } from "@/server/constants";
import { CompanyForm } from "@/components/crm/forms";
import { PageHeader } from "@/components/crm/ui";

export const metadata: Metadata = { title: "Edit Company" };

export default async function EditCompanyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const c = await getCompanyForUser(user, id);
  if (!c) notFound();
  if (!canEdit(user, c)) redirect(`/crm/companies/${id}`);
  const maps = await labelMaps();
  return (
    <div className="max-w-4xl">
      <PageHeader title={`Edit ${c.name}`} crumbs={[{ label: "Companies", href: "/crm/companies" }, { label: c.name, href: `/crm/companies/${id}` }, { label: "Edit" }]} />
      <CompanyForm
        action={saveCompanyAction.bind(null, id)}
        initial={c}
        team={maps.team.filter((t) => t.isActive || t.id === c.ownerId).map((t) => ({ value: t.id, label: t.name }))}
        types={COMPANY_TYPES.map((t) => ({ value: t, label: companyTypeLabels[t] }))}
        relationships={RELATIONSHIP_STATUSES.map((t) => ({ value: t, label: relationshipLabels[t] }))}
        canAssign={can(user.role, "records.assign")}
        currentUserId={user.id}
        cancelHref={`/crm/companies/${id}`}
        submitLabel="Save Changes"
      />
    </div>
  );
}

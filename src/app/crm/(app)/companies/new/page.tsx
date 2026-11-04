import type { Metadata } from "next";
import { requirePagePermission } from "@/server/auth";
import { can } from "@/server/permissions";
import { labelMaps } from "@/server/lookups";
import { saveCompanyAction } from "@/server/actions/records";
import { COMPANY_TYPES, companyTypeLabels, RELATIONSHIP_STATUSES, relationshipLabels } from "@/server/constants";
import { CompanyForm } from "@/components/crm/forms";
import { PageHeader } from "@/components/crm/ui";

export const metadata: Metadata = { title: "New Company" };

export default async function NewCompanyPage() {
  const user = await requirePagePermission("records.create");
  const maps = await labelMaps();
  return (
    <div className="max-w-4xl">
      <PageHeader title="New Company" crumbs={[{ label: "Companies", href: "/crm/companies" }, { label: "New" }]} />
      <CompanyForm
        action={saveCompanyAction.bind(null, null)}
        team={maps.team.filter((t) => t.isActive).map((t) => ({ value: t.id, label: t.name }))}
        types={COMPANY_TYPES.map((t) => ({ value: t, label: companyTypeLabels[t] }))}
        relationships={RELATIONSHIP_STATUSES.map((t) => ({ value: t, label: relationshipLabels[t] }))}
        canAssign={can(user.role, "records.assign")}
        currentUserId={user.id}
        cancelHref="/crm/companies"
        submitLabel="Create Company"
      />
    </div>
  );
}

import type { Metadata } from "next";
import { requirePagePermission } from "@/server/auth";
import { can } from "@/server/permissions";
import { labelMaps } from "@/server/lookups";
import { pickerOptions } from "@/server/queries/records";
import { saveContactAction } from "@/server/actions/records";
import { CONTACT_TYPES, contactTypeLabels } from "@/server/constants";
import { ContactForm } from "@/components/crm/forms";
import { PageHeader } from "@/components/crm/ui";

export const metadata: Metadata = { title: "New Contact" };

export default async function NewContactPage({ searchParams }: { searchParams: Promise<{ company?: string }> }) {
  const user = await requirePagePermission("records.create");
  const sp = await searchParams;
  const [maps, pick] = await Promise.all([labelMaps(), pickerOptions(user)]);
  return (
    <div className="max-w-4xl">
      <PageHeader title="New Contact" crumbs={[{ label: "Contacts", href: "/crm/contacts" }, { label: "New" }]} />
      <ContactForm
        action={saveContactAction.bind(null, null)}
        initial={{ companyId: sp.company }}
        companies={pick.companies}
        team={maps.team.filter((t) => t.isActive).map((t) => ({ value: t.id, label: t.name }))}
        types={CONTACT_TYPES.map((t) => ({ value: t, label: contactTypeLabels[t] }))}
        canAssign={can(user.role, "records.assign")}
        currentUserId={user.id}
        cancelHref="/crm/contacts"
        submitLabel="Create Contact"
      />
    </div>
  );
}

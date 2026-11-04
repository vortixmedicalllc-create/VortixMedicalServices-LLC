import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/server/auth";
import { can, canEdit } from "@/server/permissions";
import { labelMaps } from "@/server/lookups";
import { getContactForUser, pickerOptions } from "@/server/queries/records";
import { saveContactAction } from "@/server/actions/records";
import { CONTACT_TYPES, contactTypeLabels } from "@/server/constants";
import { ContactForm } from "@/components/crm/forms";
import { PageHeader } from "@/components/crm/ui";

export const metadata: Metadata = { title: "Edit Contact" };

export default async function EditContactPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const c = await getContactForUser(user, id);
  if (!c) notFound();
  if (!canEdit(user, c)) redirect(`/crm/contacts/${id}`);
  const [maps, pick] = await Promise.all([labelMaps(), pickerOptions(user)]);
  const name = `${c.firstName} ${c.lastName}`.trim();
  return (
    <div className="max-w-4xl">
      <PageHeader title={`Edit ${name}`} crumbs={[{ label: "Contacts", href: "/crm/contacts" }, { label: name, href: `/crm/contacts/${id}` }, { label: "Edit" }]} />
      <ContactForm
        action={saveContactAction.bind(null, id)}
        initial={c}
        companies={pick.companies}
        team={maps.team.filter((t) => t.isActive || t.id === c.ownerId).map((t) => ({ value: t.id, label: t.name }))}
        types={CONTACT_TYPES.map((t) => ({ value: t, label: contactTypeLabels[t] }))}
        canAssign={can(user.role, "records.assign")}
        currentUserId={user.id}
        cancelHref={`/crm/contacts/${id}`}
        submitLabel="Save Changes"
      />
    </div>
  );
}

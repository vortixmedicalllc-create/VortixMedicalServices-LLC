import type { Metadata } from "next";
import { requireUser } from "@/server/auth";
import { roleLabels } from "@/server/constants";
import { PasswordForm, ProfileForm } from "@/components/crm/SettingsClient";
import { Card, PageHeader } from "@/components/crm/ui";

export const metadata: Metadata = { title: "My Profile" };

export default async function ProfilePage() {
  const user = await requireUser();
  return (
    <>
      <PageHeader
        title="My Profile"
        crumbs={[{ label: "Settings", href: "/crm/settings" }, { label: "My Profile" }]}
        description={`${user.email} · ${roleLabels[user.role]}. Your email and role are managed by an Owner or Admin.`}
      />
      <div className="grid gap-5 xl:grid-cols-2">
        <Card title="Profile and notifications">
          <ProfileForm initial={{ name: user.name, jobTitle: user.jobTitle, prefs: (user.notificationPrefs ?? {}) as Record<string, boolean | undefined> }} />
        </Card>
        <Card title="Change password">
          <PasswordForm />
        </Card>
      </div>
    </>
  );
}

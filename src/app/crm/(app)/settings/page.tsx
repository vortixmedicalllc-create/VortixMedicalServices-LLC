import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/server/auth";
import { can, permissionLabels, rolePermissions } from "@/server/permissions";
import { getSettings, labelMaps } from "@/server/lookups";
import { emailProvider, isEmailConfigured } from "@/server/email";
import { LEAD_STATUSES, leadStatusLabels, ROLES, roleLabels } from "@/server/constants";
import { CompanySettingsForm, LookupEditor } from "@/components/crm/SettingsClient";
import { Alert, Badge, Card, LinkButton, PageHeader } from "@/components/crm/ui";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await requireUser();
  const manage = can(user.role, "settings.manage");
  const [settings, maps] = await Promise.all([getSettings(), labelMaps()]);

  return (
    <>
      <PageHeader
        title="Settings"
        description={manage ? "Company profile, lead and pipeline options, and website lead assignment." : "Organization settings are managed by Owners and Admins."}
        actions={
          <>
            <LinkButton href="/crm/settings/profile">My Profile and Notifications</LinkButton>
            {can(user.role, "audit.view") && <LinkButton href="/crm/settings/audit">Audit Log</LinkButton>}
          </>
        }
      />

      <div className="grid gap-5 xl:grid-cols-2">
        <Card title="Company profile" className="xl:col-span-2">
          {manage ? (
            <CompanySettingsForm
              initial={{ ...settings, roundRobinUserIds: settings.roundRobinUserIds ?? [] }}
              team={maps.team.filter((t) => t.isActive).map((t) => ({ value: t.id, label: t.name }))}
              timezones={Intl.supportedValuesOf("timeZone").filter((t) => t.startsWith("America/") || t.startsWith("Pacific/Honolulu") || t === "UTC" || t.startsWith("Asia/") || t.startsWith("Europe/"))}
            />
          ) : (
            <dl className="grid gap-4 text-sm sm:grid-cols-3">
              <div><dt className="text-muted">Company</dt><dd className="font-semibold">{settings.companyName}</dd></div>
              <div><dt className="text-muted">Currency</dt><dd className="font-semibold">{settings.currency}</dd></div>
              <div><dt className="text-muted">Time zone</dt><dd className="font-semibold">{settings.timezone}</dd></div>
            </dl>
          )}
        </Card>

        <Card title="Integrations">
          <ul className="space-y-3 text-sm">
            <li className="flex items-start justify-between gap-3">
              <span>
                <span className="block font-semibold">Email delivery{emailProvider() ? ` (${emailProvider() === "smtp" ? "SMTP" : "Resend"})` : ""}</span>
                <span className="text-muted">Invitations, password resets, new-inquiry emails, and email alerts.</span>
              </span>
              {isEmailConfigured() ? <Badge tone="teal">Connected</Badge> : <Badge tone="amber">Not configured</Badge>}
            </li>
            <li className="flex items-start justify-between gap-3">
              <span>
                <span className="block font-semibold">Calendar</span>
                <span className="text-muted">Tasks with a due date offer an Add to calendar download for Google, Outlook, or Apple Calendar.</span>
              </span>
              <Badge tone="teal">Active</Badge>
            </li>
            <li className="flex items-start justify-between gap-3">
              <span>
                <span className="block font-semibold">Daily reminder job</span>
                <span className="text-muted">Creates due and overdue task reminders and sends queued emails once a day.</span>
              </span>
              {process.env.CRON_SECRET && process.env.CRON_SECRET.length >= 16 ? <Badge tone="teal">Configured</Badge> : <Badge tone="amber">Needs CRON_SECRET</Badge>}
            </li>
            <li className="flex items-start justify-between gap-3">
              <span>
                <span className="block font-semibold">Mailbox sync</span>
                <span className="text-muted">Not available in this version. Log emails and meetings manually on each record.</span>
              </span>
              <Badge>Not available</Badge>
            </li>
            <li className="flex items-start justify-between gap-3">
              <span>
                <span className="block font-semibold">Website contact form</span>
                <span className="text-muted">Creates a lead with the source Website for every valid inquiry.</span>
              </span>
              <Badge tone="teal">Active</Badge>
            </li>
          </ul>
          {!isEmailConfigured() && <p className="mt-4 text-xs text-muted">To enable email, set either SMTP_HOST, SMTP_USER and SMTP_PASS (for example a Gmail app password), or RESEND_API_KEY and CONTACT_FROM_EMAIL, in the hosting environment. See the README.</p>}
        </Card>

        <Card title="Lead statuses">
          <p className="mb-3 text-sm text-muted">Lead statuses drive conversion and reporting, so they are fixed in this version.</p>
          <div className="flex flex-wrap gap-2">
            {LEAD_STATUSES.map((s) => (
              <Badge key={s}>{leadStatusLabels[s]}</Badge>
            ))}
          </div>
        </Card>

        <Card title="Lead sources">
          {manage ? (
            <LookupEditor kind="sources" noun="lead source" items={maps.sources} fixedKeys={["website"]} />
          ) : (
            <p className="text-sm">{maps.sources.filter((s) => s.isActive).map((s) => s.label).join(", ")}</p>
          )}
        </Card>

        <Card title="Service categories">
          {manage ? (
            <LookupEditor kind="services" noun="service category" items={maps.services} fixedKeys={["dme", "medical_billing", "multiple", "other"]} />
          ) : (
            <p className="text-sm">{maps.services.filter((s) => s.isActive).map((s) => s.label).join(", ")}</p>
          )}
          {manage && <p className="mt-3 text-xs text-muted">The four default categories match the website contact form options and cannot be deactivated. You can rename them or add more for manual leads.</p>}
        </Card>

        <Card title="Pipeline stages">
          {manage ? (
            <LookupEditor
              kind="stages"
              noun="pipeline stage"
              items={maps.stages.map((s) => ({ ...s, note: s.isWon ? "(won)" : s.isLost ? "(lost)" : undefined }))}
              fixedKeys={maps.stages.filter((s) => s.isWon || s.isLost).map((s) => s.key)}
            />
          ) : (
            <p className="text-sm">{maps.stages.filter((s) => s.isActive).map((s) => s.label).join(" → ")}</p>
          )}
          {manage && <p className="mt-3 text-xs text-muted">A stage that still contains deals cannot be deactivated.</p>}
        </Card>

        <Card title="User roles">
          <ul className="space-y-2 text-sm">
            {ROLES.map((r) => (
              <li key={r} className="flex justify-between gap-3">
                <span className="font-semibold">{roleLabels[r]}</span>
                <span className="text-right text-muted">{rolePermissions[r].length} of {Object.keys(permissionLabels).length} permissions</span>
              </li>
            ))}
          </ul>
          {can(user.role, "team.view") && (
            <Link href="/crm/team" className="mt-3 inline-block text-sm font-semibold text-blue hover:underline">
              View the full permissions table
            </Link>
          )}
        </Card>
      </div>

      <Alert tone="info" className="mt-6">
        <strong>Privacy boundary.</strong> Vortix CRM is a business relationship CRM. It must not be used to store patient names linked to care, medical records,
        diagnoses, prescriptions, insurance cards, claims, or any other protected health information. It is not certified or represented as HIPAA compliant.
      </Alert>
    </>
  );
}

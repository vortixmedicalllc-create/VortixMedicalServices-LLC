import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, CalendarClock, Plus } from "lucide-react";
import { requireUser } from "@/server/auth";
import { can } from "@/server/permissions";
import { fmtMoney, getSettings, labelMaps } from "@/server/lookups";
import { getDashboard } from "@/server/queries/dashboard";
import { FilterBar } from "@/components/crm/FilterBar";
import { BarList, ColumnChart, monthSeries } from "@/components/crm/charts";
import { Alert, Card, LinkButton, PageHeader } from "@/components/crm/ui";
import { dateRange, sp1, type SP } from "@/components/crm/lists";
import { cx } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const settings = await getSettings();
  const maps = await labelMaps();
  const { from, to } = dateRange(sp);
  const service = sp1(sp, "service");
  const assignee = can(user.role, "records.view_all") ? sp1(sp, "assignee") : undefined;
  const d = await getDashboard(user, { from, to, service, assignee }, settings.timezone);

  // Filters carried into record lists when a metric is clicked
  const carry = new URLSearchParams();
  if (sp1(sp, "from")) carry.set("from", sp1(sp, "from")!);
  if (sp1(sp, "to")) carry.set("to", sp1(sp, "to")!);
  if (service) carry.set("service", service);
  if (assignee) carry.set("assignee", assignee);
  const link = (base: string, extra: Record<string, string> = {}) => {
    const p = new URLSearchParams(carry);
    for (const [k, v] of Object.entries(extra)) p.set(k, v);
    const s = p.toString();
    return `${base}${s ? `?${s}` : ""}`;
  };
  const dealLink = (extra: Record<string, string> = {}) => {
    const p = new URLSearchParams();
    if (service) p.set("service", service);
    if (assignee) p.set("owner", assignee);
    for (const [k, v] of Object.entries(extra)) p.set(k, v);
    return `/crm/deals?${p}`;
  };

  const now = new Date();
  const months = monthSeries(d.charts.byMonth, from ?? new Date(now.getFullYear(), now.getMonth() - 11, 1), to ?? now);
  const isEmpty = d.leads.total === 0 && d.deals.active + d.deals.won + d.deals.lost === 0 && d.companies === 0;

  const metrics: { label: string; value: string | number; href: string; tone?: "warn" }[] = [
    { label: "Total Leads", value: d.leads.total, href: link("/crm/leads") },
    { label: "New Leads", value: d.leads.newCount, href: link("/crm/leads", { status: "new" }) },
    { label: "Qualified Leads", value: d.leads.qualified, href: link("/crm/leads", { status: "qualified" }) },
    { label: "Companies", value: d.companies, href: "/crm/companies" },
    { label: "Contacts", value: d.contacts, href: "/crm/contacts" },
    { label: "Active Deals", value: d.deals.active, href: dealLink({ state: "open" }) },
    { label: "Won Deals", value: d.deals.won, href: dealLink({ state: "won" }) },
    { label: "Lost Deals", value: d.deals.lost, href: dealLink({ state: "lost" }) },
    { label: "Open Tasks", value: d.tasks.open, href: "/crm/tasks?view=open" },
    { label: "Overdue Tasks", value: d.tasks.overdue, href: "/crm/tasks?view=overdue", tone: d.tasks.overdue ? "warn" : undefined },
    { label: "Follow-ups (7 days)", value: d.followUps, href: "/crm/leads?followup=week" },
    { label: "Pipeline Value", value: fmtMoney(d.deals.pipelineValue, settings.currency) ?? "$0", href: dealLink({ state: "open" }) },
  ];

  return (
    <>
      <PageHeader
        title={`Welcome, ${user.name.split(" ")[0]}`}
        description={can(user.role, "records.view_all") ? "Organization-wide overview from live CRM data." : "Overview of the records assigned to you."}
        actions={
          can(user.role, "records.create") && (
            <LinkButton href="/crm/leads/new" variant="primary">
              <Plus aria-hidden className="size-4" /> New Lead
            </LinkButton>
          )
        }
      />
      {sp1(sp, "denied") && <Alert className="mb-4">You do not have permission to open that page.</Alert>}

      <FilterBar
        filters={[
          { type: "date", name: "from", label: "From" },
          { type: "date", name: "to", label: "To" },
          { type: "select", name: "service", label: "Service", options: maps.services.map((s) => ({ value: s.key, label: s.label })), all: "All services" },
          ...(can(user.role, "records.view_all")
            ? [{ type: "select" as const, name: "assignee", label: "Assigned to", options: maps.team.map((u) => ({ value: u.id, label: u.name })), all: "Everyone" }]
            : []),
        ]}
      />

      {isEmpty && (
        <Alert tone="info" className="mb-4">
          There is no CRM data yet{from || to || service || assignee ? " for these filters" : ""}. Website inquiries appear here automatically,
          and you can add leads manually from the Leads page.
        </Alert>
      )}

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {metrics.map((m) => (
          <li key={m.label}>
            <Link
              href={m.href}
              className={cx(
                "group block h-full rounded-[8px] border bg-white p-4 transition-colors hover:border-blue",
                m.tone === "warn" ? "border-[#f2dcae]" : "border-line",
              )}
            >
              <span className="flex items-center gap-1.5 text-[0.75rem] font-semibold text-muted">
                {m.tone === "warn" && <AlertTriangle aria-hidden className="size-3.5 text-[#8a5300]" />}
                {m.label}
              </span>
              <span className="mt-2 block font-display text-[1.6rem] font-bold leading-none tracking-[-0.02em] text-slate tabular-nums group-hover:text-blue">
                {m.value}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <Card title="Leads by Month" className="xl:col-span-2">
          <ColumnChart data={months.map((m) => ({ label: m.label, value: m.value }))} />
        </Card>
        <Card title="Won and Lost Deals">
          <BarList
            data={[
              { label: "Won", value: d.deals.won, href: dealLink({ state: "won" }), display: `${d.deals.won} · ${fmtMoney(d.deals.wonValue, settings.currency) ?? "$0"}` },
              { label: "Lost", value: d.deals.lost, href: dealLink({ state: "lost" }) },
            ]}
            empty="No deals have been won or lost yet."
          />
        </Card>
        <Card title="Leads by Service Interest">
          <BarList data={d.charts.byService.map((r) => ({ label: r.key ? maps.service[r.key] ?? r.key : "Not specified", value: r.n, href: r.key ? link("/crm/leads", { service: r.key }) : undefined }))} />
        </Card>
        <Card title="Lead Sources">
          <BarList data={d.charts.bySource.map((r) => ({ label: maps.source[r.key] ?? r.key, value: r.n, href: link("/crm/leads", { source: r.key }) }))} />
        </Card>
        <Card title="Deals by Pipeline Stage">
          <BarList
            data={d.charts.byStage.map((r) => ({ label: r.label, value: r.n, href: dealLink({ stage: String(r.stageId) }), display: `${r.n}${r.value ? ` · ${fmtMoney(r.value, settings.currency)}` : ""}` }))}
            empty="No deals yet."
          />
        </Card>
      </div>

      {can(user.role, "reports.team") && (
        <Card title="Team Performance" className="mt-5" bodyClassName="p-0">
          {d.charts.team.length === 0 ? (
            <p className="p-5 text-sm text-muted">No active team members.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-[0.88rem]">
                <caption className="sr-only">Team performance for the selected period</caption>
                <thead className="border-b border-line bg-surface-muted">
                  <tr>
                    {["Team member", "Leads assigned", "Leads converted", "Deals won", "Tasks completed"].map((h, i) => (
                      <th key={h} scope="col" className={cx("px-5 py-2.5 text-[0.72rem] font-semibold uppercase tracking-[0.06em] text-muted", i ? "text-right" : "text-left")}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {d.charts.team.map((t) => (
                    <tr key={t.id}>
                      <th scope="row" className="px-5 py-3 text-left font-semibold">
                        <Link href={`/crm/leads?assignee=${t.id}`} className="hover:text-blue">{t.name}</Link>
                      </th>
                      <td className="px-5 py-3 text-right tabular-nums">{t.leads}</td>
                      <td className="px-5 py-3 text-right tabular-nums">{t.converted}</td>
                      <td className="px-5 py-3 text-right tabular-nums">{t.won}</td>
                      <td className="px-5 py-3 text-right tabular-nums">{t.tasksDone}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      <p className="mt-6 flex items-center gap-2 text-xs text-muted">
        <CalendarClock aria-hidden className="size-3.5" /> Figures are calculated from the CRM database when this page loads. Dates use the {settings.timezone.replace("_", " ")} time zone.
      </p>
    </>
  );
}

import "server-only";
import { and, count, eq, gte, isNull, lte } from "drizzle-orm";
import { getDb } from "@/db";
import { leads, tasks } from "@/db/schema";
import type { SessionUser } from "../auth";
import { can } from "../permissions";
import { labelMaps } from "../lookups";
import { getDashboard, leadWhere, type DashFilters } from "./dashboard";
import { leadStatusLabels } from "../constants";

export type ReportTable = { key: string; title: string; description: string; headers: string[]; rows: (string | number)[][]; chart?: { label: string; value: number }[] };

export async function getReports(user: SessionUser, f: DashFilters, tz: string, currency: string): Promise<ReportTable[]> {
  const db = await getDb();
  const maps = await labelMaps();
  const d = await getDashboard(user, f, tz);
  const money = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);

  const taskScope = can(user.role, "records.view_all") ? undefined : eq(tasks.assignedToId, user.id);
  const [{ done }] = await db
    .select({ done: count() })
    .from(tasks)
    .where(and(taskScope, eq(tasks.status, "completed"), f.from ? gte(tasks.completedAt, f.from) : undefined, f.to ? lte(tasks.completedAt, f.to) : undefined, f.assignee ? eq(tasks.assignedToId, f.assignee) : undefined));

  const byStatus = await db.select({ status: leads.status, n: count() }).from(leads).where(leadWhere(user, f)).groupBy(leads.status);

  const total = d.leads.total;
  const conv = d.leads.converted;
  const closed = d.deals.won + d.deals.lost;

  const reports: ReportTable[] = [
    {
      key: "leads-by-month",
      title: "Total Leads by Month",
      description: "New leads created per month (organization time zone).",
      headers: ["Month", "Leads"],
      rows: d.charts.byMonth.map((r) => [r.month, r.n]),
      chart: d.charts.byMonth.map((r) => ({ label: r.month, value: r.n })),
    },
    {
      key: "leads-by-source",
      title: "Leads by Source",
      description: "Where leads came from.",
      headers: ["Source", "Leads", "Share"],
      rows: d.charts.bySource.map((r) => [maps.source[r.key] ?? r.key, r.n, total ? `${Math.round((r.n / total) * 100)}%` : "0%"]),
      chart: d.charts.bySource.map((r) => ({ label: maps.source[r.key] ?? r.key, value: r.n })),
    },
    {
      key: "leads-by-service",
      title: "Leads by Service",
      description: "Service interest recorded on each lead.",
      headers: ["Service", "Leads", "Share"],
      rows: d.charts.byService.map((r) => [r.key ? maps.service[r.key] ?? r.key : "Not specified", r.n, total ? `${Math.round((r.n / total) * 100)}%` : "0%"]),
      chart: d.charts.byService.map((r) => ({ label: r.key ? maps.service[r.key] ?? r.key : "Not specified", value: r.n })),
    },
    {
      key: "lead-conversion",
      title: "Lead Conversion Rate",
      description: "Share of leads in the period that have been converted, with the current status breakdown.",
      headers: ["Measure", "Value"],
      rows: [
        ["Total leads", total],
        ["Converted leads", conv],
        ["Conversion rate", total ? `${((conv / total) * 100).toFixed(1)}%` : "Not enough data"],
        ...byStatus.map((s) => [`Status: ${leadStatusLabels[s.status]}`, s.n] as (string | number)[]),
      ],
    },
    {
      key: "deals-by-stage",
      title: "Deals by Stage",
      description: "Count and recorded value of deals in each pipeline stage.",
      headers: ["Stage", "Deals", "Recorded value"],
      rows: d.charts.byStage.map((s) => [s.label, s.n, money(Number(s.value || 0))]),
      chart: d.charts.byStage.map((s) => ({ label: s.label, value: s.n })),
    },
    {
      key: "won-lost",
      title: "Won and Lost Deals",
      description: "Closed deals. Win rate counts only deals that reached a Won or Lost stage.",
      headers: ["Measure", "Value"],
      rows: [
        ["Won deals", d.deals.won],
        ["Lost deals", d.deals.lost],
        ["Win rate", closed ? `${((d.deals.won / closed) * 100).toFixed(1)}%` : "No closed deals"],
        ["Value of won deals", money(d.deals.wonValue)],
      ],
    },
    {
      key: "deal-value",
      title: "Total Deal Value",
      description: "Sum of recorded deal values. Deals without a value are not estimated.",
      headers: ["Measure", "Value"],
      rows: [
        ["Open pipeline value", money(d.deals.pipelineValue)],
        ["Won value", money(d.deals.wonValue)],
        ["Open deals", d.deals.active],
      ],
    },
    {
      key: "tasks",
      title: "Tasks Completed and Overdue",
      description: "Completed in the period, and currently overdue open tasks.",
      headers: ["Measure", "Value"],
      rows: [
        ["Tasks completed", done],
        ["Open tasks", d.tasks.open],
        ["Overdue tasks", d.tasks.overdue],
      ],
    },
  ];

  if (can(user.role, "reports.team")) {
    const unassigned = await db.select({ n: count() }).from(leads).where(and(leadWhere(user, { ...f, assignee: undefined }), isNull(leads.assignedToId)));
    reports.push({
      key: "team",
      title: "Team Lead Assignment Summary",
      description: "Leads assigned, converted, deals won, and tasks completed per team member.",
      headers: ["Team member", "Leads assigned", "Leads converted", "Deals won", "Tasks completed"],
      rows: [...d.charts.team.map((t) => [t.name, t.leads, t.converted, t.won, t.tasksDone]), ["Unassigned leads", unassigned[0].n, "", "", ""]],
    });
  }
  return reports;
}

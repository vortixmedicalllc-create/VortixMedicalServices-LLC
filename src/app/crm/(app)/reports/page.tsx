import type { Metadata } from "next";
import { Download } from "lucide-react";
import { requirePagePermission } from "@/server/auth";
import { can } from "@/server/permissions";
import { getSettings, labelMaps } from "@/server/lookups";
import { getReports } from "@/server/queries/reports";
import { FilterBar } from "@/components/crm/FilterBar";
import { BarList } from "@/components/crm/charts";
import { dateRange, qs, sp1, type SP } from "@/components/crm/lists";
import { Card, PageHeader } from "@/components/crm/ui";
import { cx } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Reports" };

export default async function ReportsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await requirePagePermission("reports.view");
  const sp = await searchParams;
  const [settings, maps] = await Promise.all([getSettings(), labelMaps()]);
  const { from, to } = dateRange(sp);
  const service = sp1(sp, "service");
  const assignee = can(user.role, "records.view_all") ? sp1(sp, "assignee") : undefined;
  const reports = await getReports(user, { from, to, service, assignee }, settings.timezone, settings.currency);
  const exportQs = qs(sp, {});

  return (
    <>
      <PageHeader
        title="Reports"
        description={`Calculated from live CRM data${can(user.role, "records.view_all") ? "" : " for records assigned to you"}. Use the date range to focus on a period.`}
      />
      <FilterBar
        filters={[
          { type: "date", name: "from", label: "From" },
          { type: "date", name: "to", label: "To" },
          { type: "select", name: "service", label: "Service", options: maps.services.map((s) => ({ value: s.key, label: s.label })) },
          ...(can(user.role, "records.view_all") ? [{ type: "select" as const, name: "assignee", label: "Assigned to", options: maps.team.map((t) => ({ value: t.id, label: t.name })) }] : []),
        ]}
      />
      <div className="grid gap-5 xl:grid-cols-2">
        {reports.map((r) => (
          <Card
            key={r.key}
            className={cx(r.key === "team" && "xl:col-span-2")}
            title={
              <div>
                <h2 className="text-[0.95rem] font-bold">{r.title}</h2>
                <p className="text-xs text-muted">{r.description}</p>
              </div>
            }
            actions={
              can(user.role, "records.export") ? (
                <a href={`/crm/reports/export${exportQs ? `${exportQs}&` : "?"}report=${r.key}`} className="inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold text-blue hover:underline">
                  <Download aria-hidden className="size-3.5" /> CSV
                </a>
              ) : undefined
            }
          >
            {r.chart && r.chart.some((c) => c.value > 0) && (
              <div className="mb-5">
                <BarList data={r.chart} />
              </div>
            )}
            {r.rows.length === 0 ? (
              <p className="text-sm text-muted">No data for the selected filters.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[0.86rem]">
                  <caption className="sr-only">{r.title}</caption>
                  <thead>
                    <tr className="border-b border-line">
                      {r.headers.map((h, i) => (
                        <th key={h} scope="col" className={cx("py-2 text-[0.7rem] font-semibold uppercase tracking-[0.06em] text-muted", i ? "text-right" : "text-left")}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {r.rows.map((row, i) => (
                      <tr key={i}>
                        {row.map((c, j) =>
                          j === 0 ? (
                            <th key={j} scope="row" className="py-2 text-left font-medium">
                              {c}
                            </th>
                          ) : (
                            <td key={j} className="py-2 text-right tabular-nums">
                              {c}
                            </td>
                          ),
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        ))}
      </div>
    </>
  );
}

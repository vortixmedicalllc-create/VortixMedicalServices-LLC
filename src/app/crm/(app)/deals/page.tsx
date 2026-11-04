import type { Metadata } from "next";
import Link from "next/link";
import { Columns3, Download, Handshake, Plus, Rows3 } from "lucide-react";
import { requireUser } from "@/server/auth";
import { can, canEdit } from "@/server/permissions";
import { fmtDate, fmtMoney, getSettings, labelMaps } from "@/server/lookups";
import { listDeals } from "@/server/queries/records";
import { dealCode } from "@/server/services/leads";
import { FilterBar } from "@/components/crm/FilterBar";
import { DealBoard } from "@/components/crm/DealBoard";
import { Pagination, SortTh, Table, qs, sp1, tdCls, thCls, type SP } from "@/components/crm/lists";
import { Badge, EmptyState, LinkButton, PageHeader } from "@/components/crm/ui";
import { cx } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Deals" };

export default async function DealsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const board = sp1(sp, "view") === "board";
  const [settings, maps] = await Promise.all([getSettings(), labelMaps()]);
  const { rows, total } = await listDeals(user, sp, board);
  const base = "/crm/deals";
  const cur = settings.currency;
  const activeStages = maps.stages.filter((s) => s.isActive);

  return (
    <>
      <PageHeader
        title="Deals"
        description="Business opportunities across the sales pipeline."
        actions={
          <>
            <div className="inline-flex rounded-[5px] ring-1 ring-line" role="group" aria-label="View">
              <Link href={`${base}${qs(sp, { view: undefined, page: undefined })}`} aria-current={!board ? "page" : undefined} className={cx("inline-flex h-10 items-center gap-1.5 rounded-l-[5px] px-3 text-[0.82rem] font-semibold", !board ? "bg-slate text-white" : "bg-white text-slate hover:bg-surface-muted")}>
                <Rows3 aria-hidden className="size-4" /> Table
              </Link>
              <Link href={`${base}${qs(sp, { view: "board", page: undefined })}`} aria-current={board ? "page" : undefined} className={cx("inline-flex h-10 items-center gap-1.5 rounded-r-[5px] px-3 text-[0.82rem] font-semibold", board ? "bg-slate text-white" : "bg-white text-slate hover:bg-surface-muted")}>
                <Columns3 aria-hidden className="size-4" /> Pipeline
              </Link>
            </div>
            {can(user.role, "records.export") && (
              <a href={`/crm/export/deals${qs(sp, { page: undefined, view: undefined })}`} className="inline-flex h-10 items-center gap-2 rounded-[5px] bg-white px-4 font-display text-[0.85rem] font-semibold text-slate ring-1 ring-inset ring-line hover:bg-surface-muted">
                <Download aria-hidden className="size-4" /> Export CSV
              </a>
            )}
            {can(user.role, "records.create") && (
              <LinkButton href="/crm/deals/new" variant="primary">
                <Plus aria-hidden className="size-4" /> New Deal
              </LinkButton>
            )}
          </>
        }
      />
      <FilterBar
        filters={[
          { type: "search", name: "q", label: "Search deals", placeholder: "Search deal or company name" },
          { type: "select", name: "state", label: "State", options: [{ value: "open", label: "Open" }, { value: "won", label: "Won" }, { value: "lost", label: "Lost" }] },
          ...(!board ? [{ type: "select" as const, name: "stage", label: "Stage", options: maps.stages.map((s) => ({ value: String(s.id), label: s.label })) }] : []),
          { type: "select", name: "service", label: "Service", options: maps.services.map((s) => ({ value: s.key, label: s.label })) },
          ...(can(user.role, "records.view_all") ? [{ type: "select" as const, name: "owner", label: "Owner", options: maps.team.map((t) => ({ value: t.id, label: t.name })) }] : []),
          { type: "date", name: "closeFrom", label: "Closing from" },
          { type: "date", name: "closeTo", label: "Closing to" },
          { type: "checkbox", name: "archived", label: "Archived" },
        ]}
      />

      {board ? (
        <DealBoard
          stages={activeStages.map((s) => {
            const inStage = rows.filter((r) => r.d.stageId === s.id);
            const sum = inStage.reduce((a, b) => a + Number(b.d.value || 0), 0);
            return { id: s.id, label: s.label, isWon: s.isWon, isLost: s.isLost, total: `${fmtMoney(sum, cur) ?? "$0"} total` };
          })}
          deals={rows.map((r) => ({
            id: r.d.id,
            name: r.d.name,
            company: r.companyName,
            value: fmtMoney(r.d.value, r.d.currency),
            stageId: r.d.stageId,
            owner: r.d.ownerId ? maps.user[r.d.ownerId] ?? null : null,
            close: fmtDate(r.d.expectedCloseDate, settings.timezone),
            editable: canEdit(user, r.d) && !r.d.archivedAt,
          }))}
        />
      ) : rows.length === 0 ? (
        <div className="rounded-[8px] border border-line bg-white">
          <EmptyState icon={<Handshake className="size-5" />} title="No deals found" text="Deals are created from converted leads, or from this page." />
        </div>
      ) : (
        <>
          <Table>
            <thead className="border-b border-line bg-surface-muted">
              <tr>
                <SortTh label="Deal" col="name" sp={sp} basePath={base} />
                <th scope="col" className={thCls}>Company</th>
                <SortTh label="Stage" col="stage" sp={sp} basePath={base} />
                <SortTh label="Value" col="value" sp={sp} basePath={base} className="text-right" />
                <SortTh label="Expected close" col="close" sp={sp} basePath={base} />
                <th scope="col" className={thCls}>Owner</th>
                <SortTh label="Updated" col="updated" sp={sp} basePath={base} />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map(({ d, companyName, stage }) => (
                <tr key={d.id} className="hover:bg-surface-muted/60">
                  <td className={tdCls}>
                    <Link href={`/crm/deals/${d.id}`} className="font-semibold hover:text-blue">{d.name}</Link>
                    <span className="block text-xs text-muted">{dealCode(d.number)}{d.serviceKey ? ` · ${maps.service[d.serviceKey] ?? d.serviceKey}` : ""}</span>
                  </td>
                  <td className={tdCls}>{companyName && d.companyId ? <Link href={`/crm/companies/${d.companyId}`} className="hover:text-blue">{companyName}</Link> : <span className="text-muted">—</span>}</td>
                  <td className={tdCls}><Badge tone={stage.isWon ? "teal" : stage.isLost ? "red" : "blue"}>{stage.label}</Badge></td>
                  <td className={`${tdCls} text-right tabular-nums`}>{fmtMoney(d.value, d.currency) ?? <span className="text-muted">—</span>}</td>
                  <td className={`${tdCls} whitespace-nowrap`}>{fmtDate(d.expectedCloseDate, settings.timezone) ?? <span className="text-muted">—</span>}</td>
                  <td className={tdCls}>{d.ownerId ? maps.user[d.ownerId] : <span className="text-muted">—</span>}</td>
                  <td className={`${tdCls} whitespace-nowrap text-muted`}>{fmtDate(d.updatedAt, settings.timezone)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
          <Pagination total={total} sp={sp} basePath={base} />
        </>
      )}
      {board && total > rows.length && <p className="mt-3 text-sm text-muted">Showing the first {rows.length} deals. Use filters to narrow the board.</p>}
    </>
  );
}

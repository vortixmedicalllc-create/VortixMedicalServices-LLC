"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Copy, Globe } from "lucide-react";
import { assignLeadsAction } from "@/server/actions/leads";
import { Badge, btn, inputCls, leadStatusTone, priorityTone } from "./ui";
import { useToast } from "./client";
import { cx } from "@/components/ui/primitives";

export type LeadRowView = {
  id: string;
  code: string;
  name: string;
  email: string;
  company: string | null;
  service: string | null;
  source: string;
  status: string;
  statusLabel: string;
  priority: string;
  priorityLabel: string;
  assignee: string | null;
  created: string;
  followUp: string | null;
  followUpOverdue: boolean;
  website: boolean;
  duplicate: boolean;
};

export function LeadsTable({
  rows,
  headers,
  canAssign,
  team,
}: {
  rows: LeadRowView[];
  headers: ReactNode;
  canAssign: boolean;
  team: { value: string; label: string }[];
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [assignee, setAssignee] = useState("");
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const router = useRouter();
  const all = rows.length > 0 && selected.length === rows.length;

  return (
    <>
      {canAssign && selected.length > 0 && (
        <div role="region" aria-label="Bulk actions" className="mb-3 flex flex-wrap items-center gap-3 rounded-[8px] border border-blue/30 bg-tint px-4 py-2.5 text-sm">
          <span className="font-semibold">{selected.length} selected</span>
          <label htmlFor="bulk-assignee" className="sr-only">
            Assign selected leads to
          </label>
          <select id="bulk-assignee" value={assignee} onChange={(e) => setAssignee(e.target.value)} className={cx(inputCls, "h-8 w-auto text-[0.85rem]")}>
            <option value="">Choose assignee</option>
            <option value="__none">Unassigned</option>
            {team.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={!assignee || busy}
            className={btn("primary", "sm")}
            onClick={async () => {
              setBusy(true);
              const r = await assignLeadsAction(selected, assignee === "__none" ? null : assignee);
              setBusy(false);
              toast(r.ok ? "success" : "error", r.ok ? r.message || "Leads updated." : r.error || "Could not assign leads.");
              if (r.ok) {
                setSelected([]);
                setAssignee("");
                router.refresh();
              }
            }}
          >
            Assign
          </button>
          <button type="button" className={btn("ghost", "sm")} onClick={() => setSelected([])}>
            Clear selection
          </button>
        </div>
      )}
      <div className="overflow-x-auto rounded-[8px] border border-line bg-white">
        <table className="w-full min-w-[900px] border-collapse">
          <thead className="border-b border-line bg-surface-muted">
            <tr>
              {canAssign && (
                <th scope="col" className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    aria-label={all ? "Deselect all leads on this page" : "Select all leads on this page"}
                    checked={all}
                    onChange={() => setSelected(all ? [] : rows.map((r) => r.id))}
                    className="size-4 accent-[var(--brand-blue)]"
                  />
                </th>
              )}
              {headers}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r) => (
              <tr key={r.id} className={cx("hover:bg-surface-muted/60", selected.includes(r.id) && "bg-tint/50")}>
                {canAssign && (
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      aria-label={`Select ${r.name}`}
                      checked={selected.includes(r.id)}
                      onChange={() => setSelected((s) => (s.includes(r.id) ? s.filter((x) => x !== r.id) : [...s, r.id]))}
                      className="size-4 accent-[var(--brand-blue)]"
                    />
                  </td>
                )}
                <td className="px-4 py-3 text-[0.88rem]">
                  <Link href={`/crm/leads/${r.id}`} className="font-semibold text-slate hover:text-blue">
                    {r.name}
                  </Link>
                  <span className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
                    {r.code}
                    {r.website && (
                      <span className="inline-flex items-center gap-0.5 text-teal-ink" title="Website inquiry">
                        <Globe aria-hidden className="size-3" /> Website
                      </span>
                    )}
                    {r.duplicate && (
                      <span className="inline-flex items-center gap-0.5 text-[#8a5300]" title="Possible duplicate">
                        <Copy aria-hidden className="size-3" /> Possible duplicate
                      </span>
                    )}
                  </span>
                </td>
                <td className="px-4 py-3 text-[0.88rem]">
                  <span className="block max-w-[200px] truncate">{r.company ?? <span className="text-muted">—</span>}</span>
                  <span className="block max-w-[200px] truncate text-xs text-muted">{r.email}</span>
                </td>
                <td className="px-4 py-3 text-[0.85rem]">{r.service ?? <span className="text-muted">—</span>}</td>
                <td className="px-4 py-3">
                  <Badge tone={leadStatusTone[r.status]}>{r.statusLabel}</Badge>
                </td>
                <td className="px-4 py-3">
                  <Badge tone={priorityTone[r.priority]}>{r.priorityLabel}</Badge>
                </td>
                <td className="px-4 py-3 text-[0.85rem]">{r.assignee ?? <span className="text-muted">Unassigned</span>}</td>
                <td className="px-4 py-3 text-[0.85rem]">
                  {r.followUp ? <span className={r.followUpOverdue ? "font-semibold text-[#a3241a]" : ""}>{r.followUp}{r.followUpOverdue ? " (overdue)" : ""}</span> : <span className="text-muted">—</span>}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-[0.85rem] text-muted">{r.created}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

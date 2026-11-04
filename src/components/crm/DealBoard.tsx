"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { moveDealStageAction } from "@/server/actions/records";
import { useToast } from "./client";
import { cx } from "@/components/ui/primitives";

export type BoardDeal = { id: string; name: string; company: string | null; value: string | null; stageId: number; owner: string | null; close: string | null; editable: boolean };
export type BoardStage = { id: number; label: string; isWon: boolean; isLost: boolean; total: string };

export function DealBoard({ stages, deals }: { stages: BoardStage[]; deals: BoardDeal[] }) {
  const [items, setItems] = useState(deals);
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<number | null>(null);
  const toast = useToast();
  const router = useRouter();

  async function move(id: string, stageId: number) {
    const d = items.find((x) => x.id === id);
    if (!d || d.stageId === stageId) return;
    const prev = d.stageId;
    setItems((xs) => xs.map((x) => (x.id === id ? { ...x, stageId } : x)));
    const r = await moveDealStageAction(id, stageId);
    if (!r.ok) setItems((xs) => xs.map((x) => (x.id === id ? { ...x, stageId: prev } : x)));
    toast(r.ok ? "success" : "error", r.ok ? r.message || "Deal moved." : r.error || "Could not move deal.");
    router.refresh();
  }

  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-4 sm:mx-0 sm:px-0">
      <div className="flex min-w-max gap-3">
        {stages.map((s) => {
          const col = items.filter((d) => d.stageId === s.id);
          return (
            <section
              key={s.id}
              aria-label={`${s.label}, ${col.length} deals`}
              onDragOver={(e) => {
                if (dragging) {
                  e.preventDefault();
                  setOver(s.id);
                }
              }}
              onDragLeave={() => setOver((o) => (o === s.id ? null : o))}
              onDrop={(e) => {
                e.preventDefault();
                setOver(null);
                if (dragging) move(dragging, s.id);
                setDragging(null);
              }}
              className={cx("flex w-[272px] shrink-0 flex-col rounded-[8px] border bg-surface-muted", over === s.id ? "border-blue bg-tint" : "border-line")}
            >
              <header className="border-b border-line px-3 py-2.5">
                <h2 className="flex items-center justify-between text-[0.82rem] font-bold">
                  <span>
                    {s.label}
                    {s.isWon && <span className="ml-1.5 font-normal text-teal-ink">(won)</span>}
                    {s.isLost && <span className="ml-1.5 font-normal text-muted">(lost)</span>}
                  </span>
                  <span className="rounded-full bg-white px-2 text-xs font-semibold text-muted ring-1 ring-line">{col.length}</span>
                </h2>
                <p className="mt-0.5 text-xs text-muted">{s.total}</p>
              </header>
              <ul className="flex min-h-[120px] flex-1 flex-col gap-2 p-2">
                {col.map((d) => (
                  <li
                    key={d.id}
                    draggable={d.editable}
                    onDragStart={(e) => {
                      setDragging(d.id);
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    onDragEnd={() => setDragging(null)}
                    className={cx("rounded-[6px] border border-line bg-white p-3 shadow-[0_1px_0_rgba(19,42,51,0.04)]", d.editable && "cursor-grab active:cursor-grabbing", dragging === d.id && "opacity-50")}
                  >
                    <Link href={`/crm/deals/${d.id}`} className="block text-[0.86rem] font-semibold leading-snug hover:text-blue">
                      {d.name}
                    </Link>
                    {d.company && <p className="mt-0.5 truncate text-xs text-muted">{d.company}</p>}
                    <p className="mt-2 flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate">{d.value ?? "No value"}</span>
                      <span className="text-muted">{d.close ? `Close ${d.close}` : ""}</span>
                    </p>
                    {d.owner && <p className="mt-1 text-[0.7rem] text-muted">{d.owner}</p>}
                    {d.editable && (
                      <>
                        <label htmlFor={`mv-${d.id}`} className="sr-only">
                          Move {d.name} to stage
                        </label>
                        <select
                          id={`mv-${d.id}`}
                          value={d.stageId}
                          onChange={(e) => move(d.id, Number(e.target.value))}
                          className="mt-2 h-7 w-full rounded-[4px] border border-line bg-white px-1.5 text-[0.72rem] text-muted focus:border-blue focus:outline-none"
                        >
                          {stages.map((o) => (
                            <option key={o.id} value={o.id}>
                              Move to: {o.label}
                            </option>
                          ))}
                        </select>
                      </>
                    )}
                  </li>
                ))}
                {col.length === 0 && <li className="grid flex-1 place-items-center rounded-[6px] border border-dashed border-line px-3 py-6 text-center text-xs text-muted">Drop deals here</li>}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}

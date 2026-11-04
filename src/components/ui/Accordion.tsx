"use client";

import { Plus } from "lucide-react";
import { useId, useState } from "react";
import { cx } from "./primitives";

export type FaqItem = { q: string; a: string };

export function Accordion({ items, className }: { items: FaqItem[]; className?: string }) {
  const [open, setOpen] = useState<number | null>(0);
  const baseId = useId();

  return (
    <div className={cx("divide-y divide-line border-y border-line", className)}>
      {items.map((item, i) => {
        const isOpen = open === i;
        const btnId = `${baseId}-btn-${i}`;
        const panelId = `${baseId}-panel-${i}`;
        return (
          <div key={item.q}>
            <h3 className="!font-sans !tracking-normal">
              <button
                id={btnId}
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpen(isOpen ? null : i)}
                className="group flex w-full items-start justify-between gap-6 py-6 text-left"
              >
                <span className="font-display text-[1.05rem] font-semibold leading-snug text-slate transition-colors group-hover:text-blue">
                  {item.q}
                </span>
                <span
                  aria-hidden
                  className={cx(
                    "mt-0.5 grid size-7 shrink-0 place-items-center rounded-full ring-1 ring-line transition-all duration-300",
                    isOpen ? "rotate-45 bg-blue text-white ring-blue" : "text-blue group-hover:ring-blue",
                  )}
                >
                  <Plus className="size-4" />
                </span>
              </button>
            </h3>
            <div
              id={panelId}
              role="region"
              aria-labelledby={btnId}
              className={cx(
                "grid transition-[grid-template-rows] duration-300 ease-out",
                isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
              )}
            >
              <div className="overflow-hidden" inert={!isOpen}>
                <p className="max-w-3xl pb-7 pr-12 leading-relaxed text-muted">{item.a}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

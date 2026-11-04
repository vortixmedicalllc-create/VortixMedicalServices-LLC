"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Loader2, Search, X } from "lucide-react";
import { inputCls, btn } from "./ui";
import { cx } from "@/components/ui/primitives";

export type FilterDef =
  | { type: "search"; name: string; label: string; placeholder?: string }
  | { type: "select"; name: string; label: string; options: { value: string; label: string }[]; all?: string }
  | { type: "date"; name: string; label: string }
  | { type: "checkbox"; name: string; label: string };

/** URL-driven filters: every change updates the query string, and the server re-queries the database. */
export function FilterBar(props: { filters: FilterDef[]; className?: string }) {
  const params = useSearchParams();
  // Remount when the URL changes so uncontrolled inputs reflect the active filters.
  return <FilterBarInner key={params.toString()} {...props} />;
}

function FilterBarInner({ filters, className }: { filters: FilterDef[]; className?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const [q, setQ] = useState(() => {
    const s = filters.find((f) => f.type === "search");
    return s ? params.get(s.name) || "" : "";
  });

  const apply = () => {
    const fd = new FormData(formRef.current!);
    const p = new URLSearchParams();
    for (const k of ["sort", "dir", "view", "tab"]) {
      const v = params.get(k);
      if (v) p.set(k, v);
    }
    for (const [k, v] of fd.entries()) if (typeof v === "string" && v.trim()) p.set(k, v.trim());
    start(() => router.push(`${pathname}${p.toString() ? `?${p}` : ""}`));
  };

  const active = filters.some((f) => params.get(f.name));

  return (
    <form
      ref={formRef}
      role="search"
      aria-label="Filter records"
      onSubmit={(e) => {
        e.preventDefault();
        apply();
      }}
      className={cx("mb-4 flex flex-wrap items-end gap-2.5 rounded-[8px] border border-line bg-white p-3", className)}
    >
      {filters.map((f) => {
        const id = `flt-${f.name}`;
        if (f.type === "search")
          return (
            <div key={f.name} className="relative min-w-[200px] flex-1">
              <label htmlFor={id} className="sr-only">
                {f.label}
              </label>
              <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
              <input id={id} name={f.name} value={q} onChange={(e) => setQ(e.target.value)} placeholder={f.placeholder || f.label} className={cx(inputCls, "pl-9")} />
            </div>
          );
        if (f.type === "select")
          return (
            <div key={f.name} className="min-w-[140px]">
              <label htmlFor={id} className="mb-1 block text-[0.7rem] font-semibold uppercase tracking-[0.06em] text-muted">
                {f.label}
              </label>
              <select id={id} name={f.name} defaultValue={params.get(f.name) || ""} onChange={apply} className={cx(inputCls, "h-9 text-[0.85rem]")}>
                <option value="">{f.all || "All"}</option>
                {f.options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          );
        if (f.type === "date")
          return (
            <div key={f.name}>
              <label htmlFor={id} className="mb-1 block text-[0.7rem] font-semibold uppercase tracking-[0.06em] text-muted">
                {f.label}
              </label>
              <input id={id} type="date" name={f.name} defaultValue={params.get(f.name) || ""} onChange={apply} className={cx(inputCls, "h-9 text-[0.85rem]")} />
            </div>
          );
        return (
          <label key={f.name} className="flex h-9 items-center gap-2 text-[0.85rem] text-slate">
            <input type="checkbox" name={f.name} value="1" defaultChecked={!!params.get(f.name)} onChange={apply} className="size-4 accent-[var(--brand-blue)]" />
            {f.label}
          </label>
        );
      })}
      <div className="flex items-center gap-2">
        <button type="submit" className={btn("secondary", "sm")}>
          {pending ? <Loader2 aria-hidden className="size-4 animate-spin" /> : null}
          Apply
        </button>
        {active && (
          <button
            type="button"
            className={btn("ghost", "sm")}
            onClick={() => {
              setQ("");
              formRef.current?.reset();
              start(() => router.push(pathname));
            }}
          >
            <X aria-hidden className="size-3.5" /> Clear
          </button>
        )}
      </div>
    </form>
  );
}

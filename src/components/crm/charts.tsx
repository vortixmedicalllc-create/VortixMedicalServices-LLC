import Link from "next/link";
import { EmptyState } from "./ui";

/**
 * Single-series charts in the brand blue. Identity is carried by position and
 * text labels (never color alone); every bar shows its value and has a native
 * tooltip. Bars link to the filtered records they summarize.
 */

export type Datum = { label: string; value: number; href?: string; display?: string };

export function BarList({ data, empty = "No data for the selected filters.", unit }: { data: Datum[]; empty?: string; unit?: string }) {
  const max = Math.max(...data.map((d) => d.value), 0);
  if (!data.length || max === 0) return <EmptyState title="Nothing to show yet" text={empty} />;
  return (
    <ul className="space-y-3">
      {data.map((d) => {
        const pct = (d.value / max) * 100;
        const inner = (
          <>
            <span className="flex items-baseline justify-between gap-3 text-[0.84rem]">
              <span className="truncate text-slate">{d.label}</span>
              <span className="shrink-0 font-semibold tabular-nums text-slate">{d.display ?? d.value.toLocaleString("en-US")}{unit ? ` ${unit}` : ""}</span>
            </span>
            <span className="mt-1.5 block h-2 rounded-full bg-surface-muted">
              <span className="block h-2 rounded-full bg-blue transition-[width] duration-500" style={{ width: `${Math.max(pct, 1.5)}%` }} />
            </span>
          </>
        );
        return (
          <li key={d.label} title={`${d.label}: ${d.display ?? d.value}`}>
            {d.href ? (
              <Link href={d.href} className="block rounded-[4px] outline-offset-4 hover:[&_span.bg-blue]:bg-blue-deep">
                {inner}
              </Link>
            ) : (
              inner
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** Vertical columns for a time series (e.g. leads by month). */
export function ColumnChart({ data, empty = "No leads in this period." }: { data: Datum[]; empty?: string }) {
  const max = Math.max(...data.map((d) => d.value), 0);
  if (!data.length || max === 0) return <EmptyState title="Nothing to show yet" text={empty} />;
  const ticks = niceTicks(max);
  const top = ticks[ticks.length - 1];
  return (
    <figure>
      <div className="relative h-[200px] pl-8">
        {ticks.map((t) => (
          <div key={t} className="absolute left-8 right-0 border-t border-dashed border-line" style={{ bottom: `${(t / top) * 100}%` }}>
            <span className="absolute -left-8 -top-2 w-6 text-right text-[0.68rem] tabular-nums text-muted">{t}</span>
          </div>
        ))}
        <div className="relative flex h-full items-end gap-[2px]">
          {data.map((d) => {
            const h = (d.value / top) * 100;
            const bar = (
              <span className="flex h-full w-full flex-col items-center justify-end">
                {d.value > 0 && <span className="mb-1 text-[0.68rem] font-semibold tabular-nums text-slate">{d.value}</span>}
                <span className="block w-full max-w-[34px] rounded-t-[4px] bg-blue group-hover:bg-blue-deep" style={{ height: `${h}%`, minHeight: d.value ? 3 : 0 }} />
              </span>
            );
            return (
              <div key={d.label} className="group flex h-full flex-1 justify-center" title={`${d.label}: ${d.value}`}>
                {d.href ? <Link href={d.href} className="flex h-full w-full justify-center">{bar}</Link> : bar}
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-2 flex gap-[2px] pl-8">
        {data.map((d) => (
          <span key={d.label} className="flex-1 truncate text-center text-[0.66rem] text-muted">
            {d.label}
          </span>
        ))}
      </div>
    </figure>
  );
}

function niceTicks(max: number) {
  const step = max <= 4 ? 1 : max <= 10 ? 2 : Math.pow(10, Math.floor(Math.log10(max))) * (max / Math.pow(10, Math.floor(Math.log10(max))) > 5 ? 2 : 1);
  const out: number[] = [];
  for (let v = step; v < max + step; v += step) out.push(v);
  return out;
}

/** Fill a series of YYYY-MM keys with zeros between from and to. */
export function monthSeries(rows: { month: string; n: number }[], from: Date, to: Date) {
  const out: { key: string; label: string; value: number }[] = [];
  const d = new Date(from.getFullYear(), from.getMonth(), 1);
  const end = new Date(to.getFullYear(), to.getMonth(), 1);
  let guard = 0;
  while (d <= end && guard++ < 36) {
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    out.push({ key, label: d.toLocaleDateString("en-US", { month: "short", ...(d.getMonth() === 0 ? { year: "2-digit" } : {}) }), value: rows.find((r) => r.month === key)?.n ?? 0 });
    d.setMonth(d.getMonth() + 1);
  }
  return out;
}

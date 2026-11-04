import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { cx } from "@/components/ui/primitives";
import { PAGE_SIZE } from "@/server/constants";

export type SP = Record<string, string | string[] | undefined>;
export const sp1 = (sp: SP, k: string) => {
  const v = sp[k];
  return Array.isArray(v) ? v[0] : v;
};

export function qs(sp: SP, patch: Record<string, string | undefined>) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    const val = Array.isArray(v) ? v[0] : v;
    if (val) p.set(k, val);
  }
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined || v === "") p.delete(k);
    else p.set(k, v);
  }
  const s = p.toString();
  return s ? `?${s}` : "";
}

export function pageOf(sp: SP) {
  return Math.max(1, Number(sp1(sp, "page")) || 1);
}

export function SortTh({
  label,
  col,
  sp,
  basePath,
  className,
}: {
  label: string;
  col: string;
  sp: SP;
  basePath: string;
  className?: string;
}) {
  const current = sp1(sp, "sort");
  const dir = sp1(sp, "dir") === "asc" ? "asc" : "desc";
  const active = current === col;
  const nextDir = active && dir === "desc" ? "asc" : "desc";
  const Icon = !active ? ArrowUpDown : dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <th scope="col" aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : undefined} className={cx(thCls, className)}>
      <Link href={`${basePath}${qs(sp, { sort: col, dir: nextDir, page: undefined })}`} className="inline-flex items-center gap-1 hover:text-slate">
        {label}
        <Icon aria-hidden className={cx("size-3.5", active ? "text-blue" : "text-line")} />
      </Link>
    </th>
  );
}

export const thCls = "whitespace-nowrap px-4 py-3 text-left text-[0.72rem] font-semibold uppercase tracking-[0.06em] text-muted";
export const tdCls = "px-4 py-3 align-middle text-[0.88rem]";

export function Table({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cx("overflow-x-auto rounded-[8px] border border-line bg-white", className)}>
      <table className="w-full min-w-[640px] border-collapse">{children}</table>
    </div>
  );
}

export function Pagination({ total, sp, basePath }: { total: number; sp: SP; basePath: string }) {
  const page = pageOf(sp);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(total, page * PAGE_SIZE);
  return (
    <nav aria-label="Pagination" className="mt-4 flex items-center justify-between text-sm text-muted">
      <p>
        {total === 0 ? "No records" : `Showing ${from} to ${to} of ${total}`}
      </p>
      <div className="flex items-center gap-1">
        <PageLink disabled={page <= 1} href={`${basePath}${qs(sp, { page: String(page - 1) })}`} label="Previous page">
          <ChevronLeft className="size-4" />
        </PageLink>
        <span className="px-2">
          Page {page} of {pages}
        </span>
        <PageLink disabled={page >= pages} href={`${basePath}${qs(sp, { page: String(page + 1) })}`} label="Next page">
          <ChevronRight className="size-4" />
        </PageLink>
      </div>
    </nav>
  );
}

function PageLink({ disabled, href, label, children }: { disabled: boolean; href: string; label: string; children: React.ReactNode }) {
  if (disabled)
    return (
      <span aria-disabled className="grid size-8 place-items-center rounded-[5px] text-line ring-1 ring-line">
        {children}
        <span className="sr-only">{label}</span>
      </span>
    );
  return (
    <Link href={href} aria-label={label} className="grid size-8 place-items-center rounded-[5px] bg-white text-slate ring-1 ring-line hover:ring-blue">
      {children}
    </Link>
  );
}

/** Convert "YYYY-MM-DD" range params into dates (inclusive end). */
export function dateRange(sp: SP) {
  const from = sp1(sp, "from");
  const to = sp1(sp, "to");
  return {
    from: from && /^\d{4}-\d{2}-\d{2}$/.test(from) ? new Date(`${from}T00:00:00`) : undefined,
    to: to && /^\d{4}-\d{2}-\d{2}$/.test(to) ? new Date(`${to}T23:59:59.999`) : undefined,
  };
}

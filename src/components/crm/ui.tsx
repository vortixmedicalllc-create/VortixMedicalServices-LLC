import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import { cx } from "@/components/ui/primitives";

/* ---------------- Buttons ---------------- */

export type BtnVariant = "primary" | "secondary" | "ghost" | "danger";
export const btn = (variant: BtnVariant = "secondary", size: "sm" | "md" = "md") =>
  cx(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[5px] font-display font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60",
    size === "sm" ? "h-8 px-3 text-[0.8rem]" : "h-10 px-4 text-[0.85rem]",
    variant === "primary" && "bg-blue text-white hover:bg-blue-deep",
    variant === "secondary" && "bg-white text-slate ring-1 ring-inset ring-line hover:bg-surface-muted hover:ring-[#c3d2da]",
    variant === "ghost" && "text-muted hover:bg-surface-muted hover:text-slate",
    variant === "danger" && "bg-white text-[#b42318] ring-1 ring-inset ring-[#f1c4be] hover:bg-[#fef3f2]",
  );

export function LinkButton({ variant, size, className, ...p }: ComponentProps<typeof Link> & { variant?: BtnVariant; size?: "sm" | "md" }) {
  return <Link {...p} className={cx(btn(variant, size), className)} />;
}

/* ---------------- Form fields ---------------- */

export const inputCls =
  "h-10 w-full rounded-[5px] border border-line bg-white px-3 text-[0.92rem] text-slate placeholder:text-muted/60 hover:border-[#c3d2da] focus:border-blue focus:outline-none focus:ring-2 focus:ring-blue/20 aria-[invalid=true]:border-[#b42318]";

export function Field({
  label,
  name,
  error,
  hint,
  required,
  children,
  className,
}: {
  label: string;
  name: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={`f-${name}`} className="mb-1.5 block text-[0.8rem] font-semibold text-slate">
        {label}
        {required && <span className="ml-0.5 text-[#b42318]" aria-hidden>*</span>}
        {required && <span className="sr-only"> (required)</span>}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-muted">{hint}</p>}
      {error && (
        <p id={`e-${name}`} className="mt-1 text-xs text-[#b42318]">
          {error}
        </p>
      )}
    </div>
  );
}

export function Input({ name, error, className, ...p }: ComponentProps<"input"> & { name: string; error?: string }) {
  return (
    <input
      id={`f-${name}`}
      name={name}
      aria-invalid={!!error || undefined}
      aria-describedby={error ? `e-${name}` : undefined}
      className={cx(inputCls, className)}
      {...p}
    />
  );
}

export function Select({
  name,
  error,
  options,
  placeholder,
  className,
  ...p
}: ComponentProps<"select"> & { name: string; error?: string; options: { value: string; label: string }[]; placeholder?: string }) {
  return (
    <select
      id={`f-${name}`}
      name={name}
      aria-invalid={!!error || undefined}
      aria-describedby={error ? `e-${name}` : undefined}
      className={cx(inputCls, "pr-8", className)}
      {...p}
    >
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function Textarea({ name, error, className, ...p }: ComponentProps<"textarea"> & { name: string; error?: string }) {
  return (
    <textarea
      id={`f-${name}`}
      name={name}
      aria-invalid={!!error || undefined}
      aria-describedby={error ? `e-${name}` : undefined}
      className={cx(inputCls, "h-auto min-h-[96px] py-2.5 leading-relaxed", className)}
      {...p}
    />
  );
}

export function Alert({ tone = "error", children, className }: { tone?: "error" | "success" | "info"; children: ReactNode; className?: string }) {
  const Icon = tone === "error" ? AlertCircle : tone === "success" ? CheckCircle2 : Info;
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cx(
        "flex gap-2.5 rounded-[5px] border p-3 text-[0.88rem] leading-relaxed",
        tone === "error" && "border-[#f1c4be] bg-[#fef3f2] text-[#7a271a]",
        tone === "success" && "border-teal/30 bg-[#effaf8] text-[#0b5f55]",
        tone === "info" && "border-[#c9def0] bg-tint text-slate",
        className,
      )}
    >
      <Icon aria-hidden className="mt-0.5 size-4 shrink-0" />
      <div>{children}</div>
    </div>
  );
}

/* ---------------- Badges (always text + color, never color alone) ---------------- */

const badgeTones = {
  gray: "bg-[#eef2f4] text-[#3d525b] ring-[#d9e2e7]",
  blue: "bg-[#e8f1f9] text-[#08528a] ring-[#c6dcef]",
  teal: "bg-[#e7f6f3] text-[#0b6157] ring-[#bfe5de]",
  amber: "bg-[#fdf4e3] text-[#8a5300] ring-[#f2dcae]",
  red: "bg-[#fdeceb] text-[#a3241a] ring-[#f5c7c2]",
  slate: "bg-slate text-white ring-slate",
} as const;
export type BadgeTone = keyof typeof badgeTones;

export function Badge({ tone = "gray", children, className }: { tone?: BadgeTone; children: ReactNode; className?: string }) {
  return (
    <span className={cx("inline-flex items-center whitespace-nowrap rounded-[4px] px-2 py-0.5 text-[0.72rem] font-semibold ring-1 ring-inset", badgeTones[tone], className)}>
      {children}
    </span>
  );
}

export const leadStatusTone: Record<string, BadgeTone> = {
  new: "blue",
  contacted: "gray",
  qualified: "teal",
  proposal_sent: "amber",
  negotiation: "amber",
  converted: "slate",
  lost: "red",
};
export const priorityTone: Record<string, BadgeTone> = { low: "gray", normal: "blue", high: "amber", urgent: "red" };
export const taskStatusTone: Record<string, BadgeTone> = { todo: "blue", in_progress: "amber", completed: "teal", cancelled: "gray" };

/* ---------------- Layout pieces ---------------- */

export function PageHeader({ title, description, actions, crumbs }: { title: string; description?: ReactNode; actions?: ReactNode; crumbs?: { label: string; href?: string }[] }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {crumbs && (
          <nav aria-label="Breadcrumb" className="mb-1.5 text-xs text-muted">
            {crumbs.map((c, i) => (
              <span key={i}>
                {i > 0 && <span className="mx-1.5 text-line">/</span>}
                {c.href ? <Link href={c.href} className="hover:text-blue">{c.label}</Link> : <span>{c.label}</span>}
              </span>
            ))}
          </nav>
        )}
        <h1 className="truncate text-[1.55rem] font-bold tracking-[-0.02em]">{title}</h1>
        {description && <div className="mt-1 text-[0.92rem] text-muted">{description}</div>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ children, className, title, actions, bodyClassName }: { children: ReactNode; className?: string; title?: ReactNode; actions?: ReactNode; bodyClassName?: string }) {
  return (
    <section className={cx("rounded-[8px] border border-line bg-white", className)}>
      {(title || actions) && (
        <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          {typeof title === "string" ? <h2 className="text-[0.95rem] font-bold">{title}</h2> : title}
          {actions}
        </header>
      )}
      <div className={cx("p-5", bodyClassName)}>{children}</div>
    </section>
  );
}

export function EmptyState({ title, text, action, icon }: { title: string; text?: string; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      {icon && <div className="mb-4 grid size-12 place-items-center rounded-full bg-tint text-blue">{icon}</div>}
      <p className="font-display font-semibold text-slate">{title}</p>
      {text && <p className="mt-1 max-w-sm text-sm text-muted">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function DefinitionList({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
      {items.map(([k, v]) => (
        <div key={k} className="min-w-0">
          <dt className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">{k}</dt>
          <dd className="mt-1 break-words text-[0.92rem] text-slate">{v ?? <span className="text-muted">Not set</span>}</dd>
        </div>
      ))}
    </dl>
  );
}

export const Dash = () => <span className="text-muted">—</span>;

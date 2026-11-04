import Link from "next/link";
import { ArrowRightLeft, Bot, CalendarCheck, Mail, Phone, StickyNote, UserCog, Users } from "lucide-react";
import type { SessionUser } from "@/server/auth";
import { can } from "@/server/permissions";
import { fmtDate } from "@/server/lookups";
import { activityTypeLabels, type ActivityType } from "@/server/constants";
import type { activitiesFor, tasksFor } from "@/server/queries/records";
import type { TaskRow } from "./record-client";
import { EmptyState } from "./ui";

type TaskQ = Awaited<ReturnType<typeof tasksFor>>[number];
type ActQ = Awaited<ReturnType<typeof activitiesFor>>[number];

export function toTaskRows(rows: TaskQ[], tz: string): TaskRow[] {
  const now = Date.now();
  return rows.map(({ t, assigneeName, leadFirst, leadLast, contactFirst, contactLast, companyName, dealName }) => {
    const related = t.dealId
      ? { label: dealName ?? "Deal", href: `/crm/deals/${t.dealId}` }
      : t.leadId
        ? { label: `${leadFirst ?? ""} ${leadLast ?? ""}`.trim() || "Lead", href: `/crm/leads/${t.leadId}` }
        : t.contactId
          ? { label: `${contactFirst ?? ""} ${contactLast ?? ""}`.trim() || "Contact", href: `/crm/contacts/${t.contactId}` }
          : t.companyId
            ? { label: companyName ?? "Company", href: `/crm/companies/${t.companyId}` }
            : null;
    const open = t.status !== "completed" && t.status !== "cancelled";
    const due = t.dueAt?.getTime();
    return {
      id: t.id,
      title: t.title,
      description: t.description,
      assignedToId: t.assignedToId,
      dueAt: t.dueAt?.toISOString() ?? null,
      priority: t.priority,
      status: t.status,
      leadId: t.leadId,
      contactId: t.contactId,
      companyId: t.companyId,
      dealId: t.dealId,
      assigneeName,
      related,
      dueLabel: fmtDate(t.dueAt, tz, true),
      overdue: open && !!due && due < now,
      dueSoon: open && !!due && due >= now && due < now + 24 * 3600_000,
    };
  });
}

export function editableTaskIds(user: SessionUser, rows: TaskRow[] | TaskQ[]) {
  if (user.role === "read_only") return [];
  return rows
    .map((r) => ("t" in r ? r.t : r) as { id: string; assignedToId: string | null; createdById?: string | null })
    .filter((t) => can(user.role, "tasks.manage_any") || t.assignedToId === user.id || t.createdById === user.id)
    .map((t) => t.id);
}

const icons: Record<ActivityType, typeof Phone> = {
  call: Phone,
  email: Mail,
  meeting: Users,
  note: StickyNote,
  follow_up: CalendarCheck,
  status_change: ArrowRightLeft,
  assignment_change: UserCog,
  system: Bot,
};

export function Timeline({ items, tz, showRelated }: { items: ActQ[]; tz: string; showRelated?: boolean }) {
  if (!items.length) return <EmptyState title="No activity yet" text="Calls, meetings, emails, notes, and changes will appear here." />;
  return (
    <ol className="relative">
      {items.map(({ a, authorName, leadFirst, leadLast, contactFirst, contactLast, companyName, dealName }, i) => {
        const Icon = icons[a.type];
        const manual = ["call", "email", "meeting", "note", "follow_up"].includes(a.type);
        const rel = showRelated
          ? a.dealId
            ? { label: dealName, href: `/crm/deals/${a.dealId}` }
            : a.leadId
              ? { label: `${leadFirst ?? ""} ${leadLast ?? ""}`.trim(), href: `/crm/leads/${a.leadId}` }
              : a.contactId
                ? { label: `${contactFirst ?? ""} ${contactLast ?? ""}`.trim(), href: `/crm/contacts/${a.contactId}` }
                : a.companyId
                  ? { label: companyName, href: `/crm/companies/${a.companyId}` }
                  : null
          : null;
        return (
          <li key={a.id} className="relative flex gap-3 pb-5 last:pb-0">
            {i < items.length - 1 && <span aria-hidden className="absolute bottom-0 left-[15px] top-8 w-px bg-line" />}
            <span className={`grid size-8 shrink-0 place-items-center rounded-full ring-1 ${manual ? "bg-tint text-blue ring-[#c6dcef]" : "bg-surface-muted text-muted ring-line"}`}>
              <Icon aria-hidden className="size-4" />
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="text-xs text-muted">
                <span className="font-semibold text-slate">{activityTypeLabels[a.type]}</span>
                {" · "}
                <time dateTime={a.occurredAt.toISOString()}>{fmtDate(a.occurredAt, tz, true)}</time>
                {" · "}
                {authorName ?? (a.createdById ? "Former user" : "System")}
                {rel?.label && (
                  <>
                    {" · "}
                    <Link href={rel.href} className="text-blue hover:underline">
                      {rel.label}
                    </Link>
                  </>
                )}
              </p>
              <p className="mt-1 whitespace-pre-wrap break-words text-[0.9rem] leading-relaxed text-slate">{a.description}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export const personName = (f?: string | null, l?: string | null) => `${f ?? ""} ${l ?? ""}`.trim();

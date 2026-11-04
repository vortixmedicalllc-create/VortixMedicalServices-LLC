import type { Metadata } from "next";
import Link from "next/link";
import { CheckSquare } from "lucide-react";
import { requireUser } from "@/server/auth";
import { can } from "@/server/permissions";
import { getSettings, labelMaps } from "@/server/lookups";
import { listTasks, pickerOptions } from "@/server/queries/records";
import { PRIORITIES, priorityLabels, TASK_STATUSES, taskStatusLabels } from "@/server/constants";
import { FilterBar } from "@/components/crm/FilterBar";
import { TaskButton, TaskList } from "@/components/crm/record-client";
import { editableTaskIds, toTaskRows } from "@/components/crm/record";
import { Pagination, qs, sp1, type SP } from "@/components/crm/lists";
import { Card, EmptyState, PageHeader } from "@/components/crm/ui";
import { cx } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Tasks" };

const VIEWS = [
  ["mine", "My open tasks"],
  ["today", "Due today"],
  ["overdue", "Overdue"],
  ["upcoming", "Next 7 days"],
  ["open", "All open"],
  ["completed", "Completed"],
  ["all", "All"],
] as const;

export default async function TasksPage({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const view = sp1(sp, "view") || "open";
  const [settings, maps, { rows, total }, pick] = await Promise.all([getSettings(), labelMaps(), listTasks(user, { ...sp, view }), pickerOptions(user)]);
  const team = maps.team.filter((t) => t.isActive).map((t) => ({ value: t.id, label: t.name }));
  const canAssign = can(user.role, "records.assign");
  const items = toTaskRows(rows, settings.timezone);

  return (
    <>
      <PageHeader
        title="Tasks"
        description="Follow-ups and to-dos linked to leads, contacts, companies, and deals. Overdue and due-soon tasks also appear in your notifications."
        actions={user.role !== "read_only" ? <TaskButton team={team} currentUserId={user.id} canAssign={canAssign} variant="primary" label="New Task" pickers={pick} /> : undefined}
      />
      <nav aria-label="Task views" className="mb-4 flex gap-1 overflow-x-auto overflow-y-hidden border-b border-line">
        {VIEWS.map(([k, label]) => (
          <Link
            key={k}
            href={`/crm/tasks${qs({}, { view: k })}`}
            aria-current={view === k ? "page" : undefined}
            className={cx("-mb-px whitespace-nowrap border-b-2 px-3 py-2.5 text-[0.85rem] font-semibold", view === k ? "border-blue text-blue" : "border-transparent text-muted hover:text-slate")}
          >
            {label}
          </Link>
        ))}
      </nav>
      <FilterBar
        filters={[
          { type: "search", name: "q", label: "Search tasks", placeholder: "Search task titles" },
          { type: "select", name: "status", label: "Status", options: TASK_STATUSES.map((s) => ({ value: s, label: taskStatusLabels[s] })) },
          { type: "select", name: "priority", label: "Priority", options: PRIORITIES.map((p) => ({ value: p, label: priorityLabels[p] })) },
          ...(can(user.role, "records.view_all") ? [{ type: "select" as const, name: "assignee", label: "Assigned to", options: [{ value: "unassigned", label: "Unassigned" }, ...team] }] : []),
          { type: "date", name: "from", label: "Due from" },
          { type: "date", name: "to", label: "Due to" },
        ]}
      />
      <Card bodyClassName="py-1">
        {items.length ? (
          <TaskList items={items} team={team} currentUserId={user.id} canAssign={canAssign} editableIds={editableTaskIds(user, rows)} pickers={pick} />
        ) : (
          <EmptyState icon={<CheckSquare className="size-5" />} title="No tasks in this view" text={view === "overdue" ? "Nothing is overdue." : "Create a task, or choose another view."} />
        )}
      </Card>
      <Pagination total={total} sp={{ ...sp, view }} basePath="/crm/tasks" />
    </>
  );
}

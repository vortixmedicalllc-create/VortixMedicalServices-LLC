"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, MessageSquarePlus, Phone, Users, Mail, StickyNote } from "lucide-react";
import { logActivityAction, saveTaskAction, setTaskStatusAction } from "@/server/actions/work";
import type { ActionResult } from "@/server/validation";
import { Alert, Badge, Field, Input, Select, Textarea, btn, priorityTone } from "./ui";
import { DateTimeInput, Dialog, SubmitButton, useToast } from "./client";
import { cx } from "@/components/ui/primitives";

export type Ref = { leadId?: string; contactId?: string; companyId?: string; dealId?: string };
type Opt = { value: string; label: string };

function RefInputs({ refs }: { refs: Ref }) {
  return (
    <>
      {Object.entries(refs).map(([k, v]) => (v ? <input key={k} type="hidden" name={k} value={v} /> : null))}
    </>
  );
}


/* ---------------- Log activity ---------------- */

const activityButtons = [
  { type: "call", label: "Log Call", Icon: Phone },
  { type: "meeting", label: "Log Meeting", Icon: Users },
  { type: "email", label: "Log Email", Icon: Mail },
  { type: "note", label: "Add Note", Icon: StickyNote },
] as const;

export function ActivityButtons({ refs, compact }: { refs: Ref; compact?: boolean }) {
  const [type, setType] = useState<string | null>(null);
  return (
    <>
      {activityButtons.map(({ type: t, label, Icon }) => (
        <button key={t} type="button" className={btn("secondary", "sm")} onClick={() => setType(t)}>
          <Icon aria-hidden className="size-3.5" />
          {compact ? <span className="sr-only sm:not-sr-only">{label}</span> : label}
        </button>
      ))}
      {type && <ActivityDialog refs={refs} type={type} onClose={() => setType(null)} />}
    </>
  );
}

function ActivityDialog({ refs, type, onClose }: { refs: Ref; type: string; onClose: () => void }) {
  const [state, action] = useActionState<ActionResult, FormData>(logActivityAction, { ok: false });
  const toast = useToast();
  const router = useRouter();
  useEffect(() => {
    if (state.ok) {
      toast("success", state.message || "Saved.");
      router.refresh();
      onClose();
    }
  }, [state, toast, router, onClose]);
  const title = { call: "Log a call", meeting: "Log a meeting", email: "Log an email", note: "Add a note", follow_up: "Log a follow-up" }[type] || "Log activity";
  return (
    <Dialog open onClose={onClose} title={title}>
      <form action={action} className="space-y-4">
        {state.error && <Alert>{state.error}</Alert>}
        <RefInputs refs={refs} />
        <Field label="Type" name="type" required>
          <Select
            name="type"
            defaultValue={type}
            options={[
              { value: "call", label: "Call" },
              { value: "meeting", label: "Meeting" },
              { value: "email", label: "Email" },
              { value: "note", label: "Note" },
              { value: "follow_up", label: "Follow-up" },
            ]}
          />
        </Field>
        <Field label={type === "note" ? "Note" : "Summary"} name="description" required error={state.fields?.description} hint="Business details only. Do not record patient health information.">
          <Textarea name="description" rows={5} required maxLength={5000} data-autofocus />
        </Field>
        <Field label="Date and time" name="occurredAt" error={state.fields?.occurredAt}>
          <DateTimeInput name="occurredAt" defaultIso={new Date().toISOString()} />
        </Field>
        {type === "email" && (
          <p className="text-xs text-muted">Email sync is not connected. This records the email in the history; it does not send anything.</p>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className={btn("secondary")} onClick={onClose}>
            Cancel
          </button>
          <SubmitButton>Save</SubmitButton>
        </div>
      </form>
    </Dialog>
  );
}

/* ---------------- Task create / edit ---------------- */

export type TaskInit = {
  id: string;
  title: string;
  description: string | null;
  assignedToId: string | null;
  dueAt: string | null;
  priority: string;
  status: string;
  leadId: string | null;
  contactId: string | null;
  companyId: string | null;
  dealId: string | null;
};

export function TaskButton({
  refs,
  team,
  currentUserId,
  canAssign,
  label = "Create Task",
  variant = "secondary",
  pickers,
}: {
  refs?: Ref;
  team: Opt[];
  currentUserId: string;
  canAssign: boolean;
  label?: string;
  variant?: "primary" | "secondary";
  pickers?: { companies: Opt[]; contacts: Opt[]; deals: Opt[] };
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className={btn(variant, variant === "primary" ? "md" : "sm")} onClick={() => setOpen(true)}>
        <CalendarPlus aria-hidden className="size-3.5" /> {label}
      </button>
      {open && <TaskDialog refs={refs} team={team} currentUserId={currentUserId} canAssign={canAssign} pickers={pickers} onClose={() => setOpen(false)} />}
    </>
  );
}

export function TaskDialog({
  refs,
  team,
  currentUserId,
  canAssign,
  task,
  pickers,
  onClose,
}: {
  refs?: Ref;
  team: Opt[];
  currentUserId: string;
  canAssign: boolean;
  task?: TaskInit;
  pickers?: { companies: Opt[]; contacts: Opt[]; deals: Opt[] };
  onClose: () => void;
}) {
  const [state, action] = useActionState<ActionResult, FormData>(saveTaskAction.bind(null, task?.id ?? null), { ok: false });
  const toast = useToast();
  const router = useRouter();
  useEffect(() => {
    if (state.ok) {
      toast("success", state.message || "Saved.");
      router.refresh();
      onClose();
    }
  }, [state, toast, router, onClose]);
  const f = state.fields || {};
  return (
    <Dialog open onClose={onClose} title={task ? "Edit task" : "Create task"} wide>
      <form action={action} className="grid gap-4 sm:grid-cols-2">
        {state.error && <Alert className="sm:col-span-2">{state.error}</Alert>}
        {refs && <RefInputs refs={refs} />}
        {task && !refs && (
          <RefInputs
            refs={
              pickers
                ? { leadId: task.leadId ?? undefined }
                : { leadId: task.leadId ?? undefined, contactId: task.contactId ?? undefined, companyId: task.companyId ?? undefined, dealId: task.dealId ?? undefined }
            }
          />
        )}
        <Field label="Title" name="title" required error={f.title} className="sm:col-span-2">
          <Input name="title" defaultValue={task?.title} required maxLength={200} data-autofocus />
        </Field>
        <Field label="Due" name="dueAt" error={f.dueAt}>
          <DateTimeInput name="dueAt" defaultIso={task?.dueAt} />
        </Field>
        <Field label="Assigned to" name="assignedToId" error={f.assignedToId}>
          <Select name="assignedToId" defaultValue={task?.assignedToId ?? currentUserId} options={canAssign ? team : team.filter((t) => t.value === currentUserId)} />
        </Field>
        <Field label="Priority" name="priority">
          <Select name="priority" defaultValue={task?.priority ?? "normal"} options={[{ value: "low", label: "Low" }, { value: "normal", label: "Normal" }, { value: "high", label: "High" }, { value: "urgent", label: "Urgent" }]} />
        </Field>
        <Field label="Status" name="status">
          <Select name="status" defaultValue={task?.status ?? "todo"} options={[{ value: "todo", label: "To Do" }, { value: "in_progress", label: "In Progress" }, { value: "completed", label: "Completed" }, { value: "cancelled", label: "Cancelled" }]} />
        </Field>
        {pickers && !refs && (
          <>
            <Field label="Related company" name="companyId">
              <Select name="companyId" defaultValue={task?.companyId ?? ""} options={pickers.companies} placeholder="None" />
            </Field>
            <Field label="Related contact" name="contactId">
              <Select name="contactId" defaultValue={task?.contactId ?? ""} options={pickers.contacts} placeholder="None" />
            </Field>
            <Field label="Related deal" name="dealId" className="sm:col-span-2">
              <Select name="dealId" defaultValue={task?.dealId ?? ""} options={pickers.deals} placeholder="None" />
            </Field>
          </>
        )}
        <Field label="Description" name="description" className="sm:col-span-2">
          <Textarea name="description" defaultValue={task?.description ?? ""} rows={3} maxLength={5000} />
        </Field>
        <div className="flex justify-end gap-2 sm:col-span-2">
          <button type="button" className={btn("secondary")} onClick={onClose}>
            Cancel
          </button>
          <SubmitButton>{task ? "Save Task" : "Create Task"}</SubmitButton>
        </div>
      </form>
    </Dialog>
  );
}

/* ---------------- Task rows ---------------- */

export type TaskRow = TaskInit & { assigneeName: string | null; related: { label: string; href: string } | null; dueLabel: string | null; overdue: boolean; dueSoon: boolean };

export function TaskList({
  items,
  team,
  currentUserId,
  canAssign,
  editableIds,
  pickers,
  showRelated = true,
}: {
  items: TaskRow[];
  team: Opt[];
  currentUserId: string;
  canAssign: boolean;
  editableIds: string[];
  pickers?: { companies: Opt[]; contacts: Opt[]; deals: Opt[] };
  showRelated?: boolean;
}) {
  const [editing, setEditing] = useState<TaskInit | null>(null);
  const toast = useToast();
  const router = useRouter();
  const editable = new Set(editableIds);
  const statusLabel: Record<string, string> = { todo: "To Do", in_progress: "In Progress", completed: "Completed", cancelled: "Cancelled" };
  return (
    <>
      <ul className="divide-y divide-line">
        {items.map((t) => {
          const done = t.status === "completed";
          const can = editable.has(t.id);
          return (
            <li key={t.id} className="flex items-start gap-3 py-3">
              <input
                type="checkbox"
                checked={done}
                disabled={!can || t.status === "cancelled"}
                aria-label={done ? `Mark "${t.title}" as not completed` : `Mark "${t.title}" as completed`}
                onChange={async () => {
                  const r = await setTaskStatusAction(t.id, done ? "todo" : "completed");
                  toast(r.ok ? "success" : "error", r.ok ? (done ? "Task reopened." : "Task completed.") : r.error || "Could not update task.");
                  router.refresh();
                }}
                className="mt-1 size-4 shrink-0 accent-[var(--brand-blue)]"
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  {can ? (
                    <button type="button" onClick={() => setEditing(t)} className={cx("text-left text-[0.9rem] font-semibold hover:text-blue", done && "text-muted line-through")}>
                      {t.title}
                    </button>
                  ) : (
                    <span className={cx("text-[0.9rem] font-semibold", done && "text-muted line-through")}>{t.title}</span>
                  )}
                  {t.status !== "todo" && !done && <Badge tone="amber">{statusLabel[t.status]}</Badge>}
                  {t.status === "cancelled" && <Badge>Cancelled</Badge>}
                  {t.priority !== "normal" && <Badge tone={priorityTone[t.priority]}>{t.priority[0].toUpperCase() + t.priority.slice(1)}</Badge>}
                  {t.overdue && !done && <Badge tone="red">Overdue</Badge>}
                  {t.dueSoon && !t.overdue && !done && <Badge tone="amber">Due soon</Badge>}
                </div>
                <p className="mt-0.5 text-xs text-muted">
                  {t.dueLabel ? `Due ${t.dueLabel}` : "No due date"}
                  {t.assigneeName ? ` · ${t.assigneeName}` : " · Unassigned"}
                  {showRelated && t.related && (
                    <>
                      {" · "}
                      <a href={t.related.href} className="text-blue hover:underline">
                        {t.related.label}
                      </a>
                    </>
                  )}
                  {t.dueAt && !done && t.status !== "cancelled" && (
                    <>
                      {" · "}
                      <a href={`/crm/tasks/${t.id}/calendar`} className="text-blue hover:underline" aria-label={`Add "${t.title}" to your calendar`}>
                        Add to calendar
                      </a>
                    </>
                  )}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
      {editing && <TaskDialog task={editing} team={team} currentUserId={currentUserId} canAssign={canAssign} pickers={pickers} onClose={() => setEditing(null)} />}
    </>
  );
}

export function QuickNote({ refs }: { refs: Ref }) {
  const [state, action] = useActionState<ActionResult, FormData>(logActivityAction, { ok: false });
  const [key, setKey] = useState(0);
  const toast = useToast();
  const router = useRouter();
  useEffect(() => {
    if (state.ok) {
      toast("success", "Note added.");
      setKey((k) => k + 1);
      router.refresh();
    }
  }, [state, toast, router]);
  return (
    <form key={key} action={action} className="space-y-2">
      <RefInputs refs={refs} />
      <input type="hidden" name="type" value="note" />
      <label htmlFor="f-quicknote" className="sr-only">
        Add a note
      </label>
      <Textarea name="description" id="f-quicknote" rows={3} placeholder="Add a note about this record. Business details only." maxLength={5000} required />
      {state.error && <p className="text-xs text-[#b42318]">{state.fields?.description || state.error}</p>}
      <div className="flex justify-end">
        <SubmitButton size="sm">
          <MessageSquarePlus aria-hidden className="size-3.5" /> Add Note
        </SubmitButton>
      </div>
    </form>
  );
}

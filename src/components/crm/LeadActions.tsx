"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRightLeft, CalendarClock, UserCog, Repeat2 } from "lucide-react";
import {
  archiveLeadAction,
  assignLeadsAction,
  convertLeadAction,
  dismissDuplicateAction,
  mergeLeadAction,
  setLeadFollowUpAction,
  setLeadStatusAction,
} from "@/server/actions/leads";
import type { ActionResult } from "@/server/validation";
import { Alert, Field, Input, Select, btn, inputCls } from "./ui";
import { ConfirmAction, Dialog, SubmitButton, useToast } from "./client";
import { cx } from "@/components/ui/primitives";

type Opt = { value: string; label: string };

export function LeadStatusSelect({ id, status, statuses, disabled }: { id: string; status: string; statuses: Opt[]; disabled?: boolean }) {
  const toast = useToast();
  const router = useRouter();
  const [value, setValue] = useState(status);
  return (
    <div>
      <label htmlFor="lead-status" className="sr-only">
        Change status
      </label>
      <select
        id="lead-status"
        value={value}
        disabled={disabled}
        onChange={async (e) => {
          const next = e.target.value;
          const prev = value;
          setValue(next);
          const r = await setLeadStatusAction(id, next);
          if (!r.ok) setValue(prev);
          toast(r.ok ? "success" : "error", r.ok ? "Status updated." : r.error || "Could not change status.");
          router.refresh();
        }}
        className={cx(inputCls, "h-8 w-auto pr-8 text-[0.82rem] font-semibold")}
      >
        {statuses.map((s) => (
          <option key={s.value} value={s.value}>
            Status: {s.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function AssignButton({ id, current, team }: { id: string; current: string | null; team: Opt[] }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(current ?? "");
  const toast = useToast();
  const router = useRouter();
  return (
    <>
      <button type="button" className={btn("secondary", "sm")} onClick={() => setOpen(true)}>
        <UserCog aria-hidden className="size-3.5" /> Assign
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Assign lead">
        <Field label="Assigned to" name="assign">
          <Select name="assign" value={value} onChange={(e) => setValue(e.target.value)} options={team} placeholder="Unassigned" />
        </Field>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className={btn("secondary")} onClick={() => setOpen(false)}>
            Cancel
          </button>
          <button
            type="button"
            className={btn("primary")}
            onClick={async () => {
              const r = await assignLeadsAction([id], value || null);
              toast(r.ok ? "success" : "error", r.ok ? "Assignment updated." : r.error || "Could not assign.");
              setOpen(false);
              router.refresh();
            }}
          >
            Save
          </button>
        </div>
      </Dialog>
    </>
  );
}

export function FollowUpButton({ id, current }: { id: string; current: string | null }) {
  const [open, setOpen] = useState(false);
  const toast = useToast();
  const router = useRouter();
  const local = current
    ? (() => {
        const d = new Date(current);
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        return d.toISOString().slice(0, 16);
      })()
    : "";
  const [value, setValue] = useState(local);
  return (
    <>
      <button type="button" className={btn("secondary", "sm")} onClick={() => setOpen(true)}>
        <CalendarClock aria-hidden className="size-3.5" /> Schedule Follow-up
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Schedule follow-up">
        <Field label="Next follow-up" name="followup" hint="Shown on the lead and in the dashboard's upcoming follow-ups. To get a reminder, also create a task.">
          <Input name="followup" type="datetime-local" value={value} onChange={(e) => setValue(e.target.value)} />
        </Field>
        <div className="mt-6 flex justify-between gap-2">
          {current ? (
            <button
              type="button"
              className={btn("ghost")}
              onClick={async () => {
                const r = await setLeadFollowUpAction(id, null);
                toast(r.ok ? "success" : "error", r.ok ? "Follow-up cleared." : r.error || "Could not update.");
                setOpen(false);
                router.refresh();
              }}
            >
              Clear date
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button type="button" className={btn("secondary")} onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button
              type="button"
              disabled={!value}
              className={btn("primary")}
              onClick={async () => {
                const r = await setLeadFollowUpAction(id, new Date(value).toISOString());
                toast(r.ok ? "success" : "error", r.ok ? "Follow-up scheduled." : r.error || "Could not update.");
                setOpen(false);
                router.refresh();
              }}
            >
              Save
            </button>
          </div>
        </div>
      </Dialog>
    </>
  );
}

export function ConvertButton({
  id,
  defaultDealName,
  companies,
  contacts,
  stages,
  matchCompanyId,
  matchContactId,
}: {
  id: string;
  defaultDealName: string;
  companies: Opt[];
  contacts: Opt[];
  stages: Opt[];
  matchCompanyId: string | null;
  matchContactId: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [createDeal, setCreateDeal] = useState(true);
  const [state, action] = useActionState<ActionResult, FormData>(convertLeadAction.bind(null, id), { ok: false });
  return (
    <>
      <button type="button" className={btn("primary", "sm")} onClick={() => setOpen(true)}>
        <ArrowRightLeft aria-hidden className="size-3.5" /> Convert Lead
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Convert lead" wide>
        <form action={action} className="space-y-4">
          {state.error && <Alert>{state.error}</Alert>}
          <p className="text-sm text-muted">
            Conversion links this lead to a company and contact, optionally creates a deal, and carries the lead&apos;s notes,
            activity history, and tasks over. The original lead is kept with the status Converted.
          </p>
          <Field label="Company" name="companyId" hint={matchCompanyId ? "An existing company with this name was found and preselected." : "Leave as is to create a company from the lead's company name, or link an existing one."}>
            <Select name="companyId" defaultValue={matchCompanyId ?? ""} options={companies} placeholder="Create from lead (or match by name)" />
          </Field>
          <Field label="Contact" name="contactId" hint={matchContactId ? "An existing contact with this email was found and preselected." : "A new contact is created from the lead unless you link an existing one."}>
            <Select name="contactId" defaultValue={matchContactId ?? ""} options={contacts} placeholder="Create from lead (or match by email)" />
          </Field>
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input type="checkbox" name="createDeal" value="1" checked={createDeal} onChange={(e) => setCreateDeal(e.target.checked)} className="size-4 accent-[var(--brand-blue)]" />
            Create a deal for this opportunity
          </label>
          {createDeal && (
            <div className="grid gap-4 rounded-[6px] bg-surface-muted p-4 sm:grid-cols-3">
              <Field label="Deal name" name="dealName" className="sm:col-span-3">
                <Input name="dealName" defaultValue={defaultDealName} maxLength={160} />
              </Field>
              <Field label="Deal value" name="dealValue" error={state.fields?.dealValue} hint="Optional">
                <Input name="dealValue" inputMode="decimal" placeholder="Leave blank if unknown" />
              </Field>
              <Field label="Pipeline stage" name="dealStageId" className="sm:col-span-2">
                <Select name="dealStageId" options={stages} />
              </Field>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className={btn("secondary")} onClick={() => setOpen(false)}>
              Cancel
            </button>
            <SubmitButton pendingText="Converting">Convert Lead</SubmitButton>
          </div>
        </form>
      </Dialog>
    </>
  );
}

export function ArchiveLeadButton({ id, archived }: { id: string; archived: boolean }) {
  const router = useRouter();
  return (
    <ConfirmAction
      label={archived ? "Restore" : "Archive"}
      title={archived ? "Restore this lead?" : "Archive this lead?"}
      message={
        archived
          ? "The lead will return to the active leads list."
          : "Archived leads are hidden from lists and reports but keep all history. You can restore the lead later. Nothing is deleted."
      }
      confirmLabel={archived ? "Restore Lead" : "Archive Lead"}
      variant={archived ? "secondary" : "danger"}
      successText={archived ? "Lead restored." : "Lead archived."}
      action={async () => {
        const r = await archiveLeadAction(id, archived);
        router.refresh();
        return r;
      }}
    />
  );
}

export function DuplicateBanner({ id, target, canMerge }: { id: string; target: { id: string; label: string }; canMerge: boolean }) {
  const toast = useToast();
  const router = useRouter();
  return (
    <Alert tone="info" className="mb-4">
      <p>
        <strong>Possible duplicate.</strong> This lead matches{" "}
        <a href={`/crm/leads/${target.id}`} className="font-semibold text-blue underline">
          {target.label}
        </a>{" "}
        by email or company.
      </p>
      {canMerge && (
        <div className="mt-2 flex flex-wrap gap-2">
          <ConfirmAction
            label={
              <>
                <Repeat2 aria-hidden className="size-3.5" /> Merge into {target.label}
              </>
            }
            title="Merge duplicate lead?"
            message={`Notes, activities, and tasks from this lead move to ${target.label}. This lead is then archived and marked as merged. Nothing is deleted.`}
            confirmLabel="Merge Leads"
            action={async () => {
              const r = await mergeLeadAction(id, target.id);
              return r ?? { ok: true };
            }}
            successText="Leads merged."
          />
          <button
            type="button"
            className={btn("ghost", "sm")}
            onClick={async () => {
              const r = await dismissDuplicateAction(id);
              toast(r.ok ? "success" : "error", r.ok ? "Marked as not a duplicate." : r.error || "Could not update.");
              router.refresh();
            }}
          >
            Not a duplicate
          </button>
        </div>
      )}
    </Alert>
  );
}

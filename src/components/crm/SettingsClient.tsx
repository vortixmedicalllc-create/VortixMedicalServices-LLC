"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Plus } from "lucide-react";
import { addLookupAction, changePasswordAction, saveCompanySettingsAction, saveProfileAction, updateLookupAction, type LookupKind } from "@/server/actions/settings";
import type { ActionResult } from "@/server/validation";
import { Alert, Badge, Field, Input, Select, btn, inputCls } from "./ui";
import { SubmitButton, useToast } from "./client";
import { cx } from "@/components/ui/primitives";

type Opt = { value: string; label: string };

function useResultToast(state: ActionResult) {
  const toast = useToast();
  const router = useRouter();
  useEffect(() => {
    if (state.ok) {
      toast("success", state.message || "Saved.");
      router.refresh();
    }
  }, [state, toast, router]);
}

export function CompanySettingsForm({
  initial,
  team,
  timezones,
}: {
  initial: { companyName: string; logoUrl: string; currency: string; timezone: string; assignmentMode: string; assignmentUserId: string | null; roundRobinUserIds: string[] };
  team: Opt[];
  timezones: string[];
}) {
  const [state, action] = useActionState<ActionResult, FormData>(saveCompanySettingsAction, { ok: false });
  const [mode, setMode] = useState(initial.assignmentMode);
  useResultToast(state);
  const f = state.fields || {};
  return (
    <form action={action} className="space-y-5">
      {state.error && <Alert>{state.error}</Alert>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Company name" name="companyName" required error={f.companyName}>
          <Input name="companyName" defaultValue={initial.companyName} required maxLength={120} />
        </Field>
        <Field label="Logo" name="logoUrl" error={f.logoUrl} hint="Path to an image in the public folder. The supplied Vortix logo is used by default.">
          <Input name="logoUrl" defaultValue={initial.logoUrl} />
        </Field>
        <Field label="Default currency" name="currency" error={f.currency} hint="3-letter code, used for new deals and totals.">
          <Input name="currency" defaultValue={initial.currency} maxLength={3} className="uppercase" />
        </Field>
        <Field label="Time zone" name="timezone" error={f.timezone} hint="All CRM dates are displayed in this time zone.">
          <Select name="timezone" defaultValue={initial.timezone} options={timezones.map((t) => ({ value: t, label: t.replace(/_/g, " ") }))} />
        </Field>
      </div>
      <fieldset className="rounded-[6px] border border-line p-4">
        <legend className="px-1 text-sm font-bold">Website lead assignment</legend>
        <p className="mb-3 text-sm text-muted">Decides who receives new leads from the website contact form. Owners and Admins are notified about unassigned website leads.</p>
        <div className="space-y-2 text-sm">
          {[
            ["unassigned", "Leave unassigned in the shared queue"],
            ["user", "Assign to one team member"],
            ["round_robin", "Rotate between selected team members (round robin)"],
          ].map(([v, l]) => (
            <label key={v} className="flex items-center gap-2">
              <input type="radio" name="assignmentMode" value={v} checked={mode === v} onChange={() => setMode(v)} className="size-4 accent-[var(--brand-blue)]" />
              {l}
            </label>
          ))}
        </div>
        {mode === "user" && (
          <Field label="Assign to" name="assignmentUserId" className="mt-4 max-w-sm" error={f.assignmentUserId}>
            <Select name="assignmentUserId" defaultValue={initial.assignmentUserId ?? ""} options={team} placeholder="Choose a team member" />
          </Field>
        )}
        {mode === "round_robin" && (
          <fieldset className="mt-4">
            <legend className="mb-2 text-[0.8rem] font-semibold">Rotate between</legend>
            {f.roundRobinUserIds && <p className="mb-2 text-xs text-[#b42318]">{f.roundRobinUserIds}</p>}
            <div className="grid gap-1.5 sm:grid-cols-2">
              {team.map((t) => (
                <label key={t.value} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="roundRobinUserIds" value={t.value} defaultChecked={initial.roundRobinUserIds.includes(t.value)} className="size-4 accent-[var(--brand-blue)]" />
                  {t.label}
                </label>
              ))}
            </div>
          </fieldset>
        )}
      </fieldset>
      <div className="flex justify-end">
        <SubmitButton>Save Settings</SubmitButton>
      </div>
    </form>
  );
}

export function LookupEditor({
  kind,
  items,
  fixedKeys = [],
  noun,
}: {
  kind: LookupKind;
  items: { id: number; key: string; label: string; isActive: boolean; note?: string }[];
  fixedKeys?: string[];
  noun: string;
}) {
  const [state, action] = useActionState<ActionResult, FormData>(addLookupAction.bind(null, kind), { ok: false });
  const [formKey, setFormKey] = useState(0);
  const [editing, setEditing] = useState<number | null>(null);
  const [label, setLabel] = useState("");
  const toast = useToast();
  const router = useRouter();
  useEffect(() => {
    if (state.ok) {
      toast("success", state.message || "Added.");
      setFormKey((k) => k + 1);
      router.refresh();
    }
  }, [state, toast, router]);

  const run = async (id: number, patch: Parameters<typeof updateLookupAction>[2]) => {
    const r = await updateLookupAction(kind, id, patch);
    if (!r.ok) toast("error", r.error || "Could not update.");
    router.refresh();
  };

  return (
    <div>
      <ul className="divide-y divide-line rounded-[6px] border border-line">
        {items.map((it, i) => (
          <li key={it.id} className="flex flex-wrap items-center gap-2 px-3 py-2">
            <div className="flex flex-col">
              <button type="button" disabled={i === 0} onClick={() => run(it.id, { move: "up" })} aria-label={`Move ${it.label} up`} className="text-muted hover:text-slate disabled:opacity-30">
                <ArrowUp className="size-3.5" />
              </button>
              <button type="button" disabled={i === items.length - 1} onClick={() => run(it.id, { move: "down" })} aria-label={`Move ${it.label} down`} className="text-muted hover:text-slate disabled:opacity-30">
                <ArrowDown className="size-3.5" />
              </button>
            </div>
            {editing === it.id ? (
              <form
                className="flex flex-1 items-center gap-2"
                onSubmit={async (e) => {
                  e.preventDefault();
                  await run(it.id, { label });
                  setEditing(null);
                }}
              >
                <label htmlFor={`lbl-${it.id}`} className="sr-only">
                  Name
                </label>
                <input id={`lbl-${it.id}`} value={label} onChange={(e) => setLabel(e.target.value)} className={cx(inputCls, "h-8")} autoFocus maxLength={60} />
                <button type="submit" className={btn("primary", "sm")}>
                  Save
                </button>
                <button type="button" className={btn("ghost", "sm")} onClick={() => setEditing(null)}>
                  Cancel
                </button>
              </form>
            ) : (
              <>
                <span className={cx("flex-1 text-sm font-medium", !it.isActive && "text-muted line-through")}>
                  {it.label}
                  {it.note && <span className="ml-2 text-xs font-normal text-muted">{it.note}</span>}
                </span>
                {!it.isActive && <Badge>Inactive</Badge>}
                <button
                  type="button"
                  className={btn("ghost", "sm")}
                  onClick={() => {
                    setEditing(it.id);
                    setLabel(it.label);
                  }}
                >
                  Rename
                </button>
                {!fixedKeys.includes(it.key) && (
                  <button type="button" className={btn("ghost", "sm")} onClick={() => run(it.id, { isActive: !it.isActive })}>
                    {it.isActive ? "Deactivate" : "Activate"}
                  </button>
                )}
              </>
            )}
          </li>
        ))}
      </ul>
      <form key={formKey} action={action} className="mt-3 flex gap-2">
        <label htmlFor={`add-${kind}`} className="sr-only">
          New {noun}
        </label>
        <input id={`add-${kind}`} name="label" placeholder={`Add a ${noun}`} maxLength={60} className={cx(inputCls, "h-9")} required />
        <SubmitButton size="sm" variant="secondary">
          <Plus aria-hidden className="size-3.5" /> Add
        </SubmitButton>
      </form>
      {state.error && <p className="mt-2 text-xs text-[#b42318]">{state.error}</p>}
    </div>
  );
}

export function ProfileForm({ initial, emailConfigured }: { initial: { name: string; jobTitle: string | null; prefs: Record<string, boolean | undefined> }; emailConfigured: boolean }) {
  const [state, action] = useActionState<ActionResult, FormData>(saveProfileAction, { ok: false });
  useResultToast(state);
  const p = initial.prefs;
  const pref = (k: string, label: string, hint: string) => (
    <label className="flex items-start gap-3 py-2">
      <input type="checkbox" name={k} defaultChecked={p[k] !== false} className="mt-1 size-4 accent-[var(--brand-blue)]" />
      <span>
        <span className="block text-sm font-semibold">{label}</span>
        <span className="block text-xs text-muted">{hint}</span>
      </span>
    </label>
  );
  return (
    <form action={action} className="space-y-5">
      {state.error && <Alert>{state.error}</Alert>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" name="name" required error={state.fields?.name}>
          <Input name="name" defaultValue={initial.name} required maxLength={100} />
        </Field>
        <Field label="Job title" name="jobTitle">
          <Input name="jobTitle" defaultValue={initial.jobTitle ?? ""} maxLength={100} />
        </Field>
      </div>
      <fieldset>
        <legend className="text-sm font-bold">In-app notifications</legend>
        <div className="mt-1 divide-y divide-line">
          {pref("newLeadAssigned", "New leads and lead assignments", "Website inquiries and leads assigned to you.")}
          {pref("taskAssigned", "Task assignments", "When someone assigns a task to you.")}
          {pref("taskDue", "Due and overdue tasks", "Reminders for your tasks due within 24 hours and overdue tasks.")}
          {pref("dealChanges", "Deal changes", "Stage changes and assignments on deals you own.")}
        </div>
      </fieldset>
      <fieldset>
        <legend className="text-sm font-bold">Email</legend>
        <div className="mt-1">
          {pref("emailAlerts", "Also send these alerts by email", "Each alert you have turned on above is also emailed to you.")}
        </div>
        <p className="mt-1 text-xs text-muted">
          {emailConfigured ? "Email delivery is connected for this CRM." : "Email delivery is not configured for this CRM yet, so no emails are sent. An Owner or Admin can connect it in the hosting settings."}
        </p>
      </fieldset>
      <div className="flex justify-end">
        <SubmitButton>Save Profile</SubmitButton>
      </div>
    </form>
  );
}

export function PasswordForm() {
  const [state, action] = useActionState<ActionResult, FormData>(changePasswordAction, { ok: false });
  const [k, setK] = useState(0);
  const toast = useToast();
  useEffect(() => {
    if (state.ok) {
      toast("success", state.message || "Password changed.");
      setK((x) => x + 1);
    }
  }, [state, toast]);
  const f = state.fields || {};
  return (
    <form key={k} action={action} className="space-y-4">
      {state.error && <Alert>{state.error}</Alert>}
      <Field label="Current password" name="current" required error={f.current}>
        <Input name="current" type="password" autoComplete="current-password" required />
      </Field>
      <Field label="New password" name="next" required error={f.next} hint="At least 12 characters, with letters and a number or symbol.">
        <Input name="next" type="password" autoComplete="new-password" minLength={12} required />
      </Field>
      <Field label="Confirm new password" name="confirm" required error={f.confirm}>
        <Input name="confirm" type="password" autoComplete="new-password" minLength={12} required />
      </Field>
      <div className="flex justify-end">
        <SubmitButton>Change Password</SubmitButton>
      </div>
    </form>
  );
}

"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { LeadFormState } from "@/server/actions/leads";
import { Alert, Field, Input, Select, Textarea, btn } from "./ui";
import { DateTimeInput, SubmitButton } from "./client";

type Opt = { value: string; label: string };

export type LeadInitial = Partial<{
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  companyName: string | null;
  jobTitle: string | null;
  website: string | null;
  industry: string | null;
  serviceKey: string | null;
  sourceKey: string;
  status: string;
  priority: string;
  assignedToId: string | null;
  nextFollowUpAt: string | null;
  lastContactAt: string | null;
  notes: string | null;
}>;

export function LeadForm({
  action,
  initial = {},
  services,
  sources,
  statuses,
  priorities,
  team,
  canAssign,
  currentUserId,
  cancelHref,
  submitLabel,
}: {
  action: (s: LeadFormState, fd: FormData) => Promise<LeadFormState>;
  initial?: LeadInitial;
  services: Opt[];
  sources: Opt[];
  statuses: Opt[];
  priorities: Opt[];
  team: Opt[];
  canAssign: boolean;
  currentUserId: string;
  cancelHref: string;
  submitLabel: string;
}) {
  const [state, formAction] = useActionState<LeadFormState, FormData>(action, { ok: false });
  const f = state.fields || {};
  const v = (k: keyof LeadInitial) => (initial[k] as string | null | undefined) ?? "";
  return (
    <form action={formAction} className="space-y-6" noValidate>
      {state.error && (
        <Alert>
          <p>{state.error}</p>
          {state.duplicate && (
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <Link href={`/crm/leads/${state.duplicate.id}`} target="_blank" className="font-semibold text-blue underline">
                Review {state.duplicate.label}
              </Link>
              <label className="flex items-center gap-2 font-semibold text-slate">
                <input type="checkbox" name="confirmDuplicate" value="1" className="size-4 accent-[var(--brand-blue)]" />
                Create anyway and flag as a possible duplicate
              </label>
            </div>
          )}
        </Alert>
      )}

      <fieldset className="rounded-[8px] border border-line bg-white p-5">
        <legend className="px-1 font-display text-sm font-bold">Contact information</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="First name" name="firstName" required error={f.firstName}>
            <Input name="firstName" defaultValue={v("firstName")} required maxLength={80} error={f.firstName} />
          </Field>
          <Field label="Last name" name="lastName" error={f.lastName}>
            <Input name="lastName" defaultValue={v("lastName")} maxLength={80} />
          </Field>
          <Field label="Business email" name="email" required error={f.email}>
            <Input name="email" type="email" defaultValue={v("email")} required maxLength={160} error={f.email} />
          </Field>
          <Field label="Phone" name="phone" error={f.phone}>
            <Input name="phone" type="tel" defaultValue={v("phone")} maxLength={25} error={f.phone} />
          </Field>
          <Field label="Job title" name="jobTitle" error={f.jobTitle}>
            <Input name="jobTitle" defaultValue={v("jobTitle")} maxLength={120} />
          </Field>
        </div>
      </fieldset>

      <fieldset className="rounded-[8px] border border-line bg-white p-5">
        <legend className="px-1 font-display text-sm font-bold">Company</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Company name" name="companyName" error={f.companyName}>
            <Input name="companyName" defaultValue={v("companyName")} maxLength={160} />
          </Field>
          <Field label="Website" name="website" error={f.website} hint="Optional">
            <Input name="website" defaultValue={v("website")} maxLength={200} error={f.website} placeholder="example.com" />
          </Field>
          <Field label="Industry" name="industry" error={f.industry}>
            <Input name="industry" defaultValue={v("industry")} maxLength={120} placeholder="For example, DME supplier" />
          </Field>
        </div>
      </fieldset>

      <fieldset className="rounded-[8px] border border-line bg-white p-5">
        <legend className="px-1 font-display text-sm font-bold">Qualification and follow-up</legend>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Service interest" name="serviceKey">
            <Select name="serviceKey" defaultValue={v("serviceKey")} options={services} placeholder="Not specified" />
          </Field>
          <Field label="Lead source" name="sourceKey" required>
            <Select name="sourceKey" defaultValue={v("sourceKey") || "manual"} options={sources} />
          </Field>
          <Field label="Status" name="status" error={f.status}>
            <Select name="status" defaultValue={v("status") || "new"} options={statuses} error={f.status} />
          </Field>
          <Field label="Priority" name="priority">
            <Select name="priority" defaultValue={v("priority") || "normal"} options={priorities} />
          </Field>
          <Field label="Assigned to" name="assignedToId" error={f.assignedToId}>
            <Select
              name="assignedToId"
              defaultValue={initial.assignedToId ?? (canAssign ? "" : currentUserId)}
              options={canAssign ? team : team.filter((t) => t.value === currentUserId || t.value === initial.assignedToId)}
              placeholder={canAssign ? "Unassigned" : undefined}
            />
          </Field>
          <Field label="Next follow-up" name="nextFollowUpAt" error={f.nextFollowUpAt}>
            <DateTimeInput name="nextFollowUpAt" defaultIso={initial.nextFollowUpAt} />
          </Field>
          <Field label="Last contact" name="lastContactAt" error={f.lastContactAt}>
            <DateTimeInput name="lastContactAt" defaultIso={initial.lastContactAt} />
          </Field>
        </div>
        <Field label="Notes" name="notes" className="mt-4" error={f.notes} hint="Business context only. Never record patient names, diagnoses, insurance details, or other health information.">
          <Textarea name="notes" defaultValue={v("notes")} rows={4} maxLength={5000} />
        </Field>
      </fieldset>

      <div className="flex justify-end gap-2">
        <Link href={cancelHref} className={btn("secondary")}>
          Cancel
        </Link>
        <SubmitButton>{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}

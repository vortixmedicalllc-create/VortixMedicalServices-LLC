"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import type { ActionResult } from "@/server/validation";
import { archiveRecordAction } from "@/server/actions/records";
import { Alert, Field, Input, Select, Textarea, btn } from "./ui";
import { ConfirmAction, SubmitButton } from "./client";

type Opt = { value: string; label: string };
type DupState = ActionResult & { duplicateId?: string };

function Actions({ cancelHref, label }: { cancelHref: string; label: string }) {
  return (
    <div className="flex justify-end gap-2">
      <Link href={cancelHref} className={btn("secondary")}>
        Cancel
      </Link>
      <SubmitButton>{label}</SubmitButton>
    </div>
  );
}

function DupAlert({ state, base, noun }: { state: DupState; base: string; noun: string }) {
  if (!state.error) return null;
  return (
    <Alert>
      <p>{state.error}</p>
      {state.duplicateId && (
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <Link href={`${base}/${state.duplicateId}`} target="_blank" className="font-semibold text-blue underline">
            Review the existing {noun}
          </Link>
          <label className="flex items-center gap-2 font-semibold text-slate">
            <input type="checkbox" name="confirmDuplicate" value="1" className="size-4 accent-[var(--brand-blue)]" />
            Save anyway
          </label>
        </div>
      )}
    </Alert>
  );
}

const box = "rounded-[8px] border border-line bg-white p-5";

/* ---------------- Contact ---------------- */

export function ContactForm({
  action,
  initial = {},
  companies,
  team,
  types,
  canAssign,
  currentUserId,
  cancelHref,
  submitLabel,
}: {
  action: (s: DupState, fd: FormData) => Promise<DupState>;
  initial?: Record<string, unknown>;
  companies: Opt[];
  team: Opt[];
  types: Opt[];
  canAssign: boolean;
  currentUserId: string;
  cancelHref: string;
  submitLabel: string;
}) {
  const [state, formAction] = useActionState<DupState, FormData>(action, { ok: false });
  const f = state.fields || {};
  const v = (k: string) => (initial[k] == null || initial[k] instanceof Date ? "" : String(initial[k]));
  return (
    <form action={formAction} noValidate className="space-y-5">
      <DupAlert state={state} base="/crm/contacts" noun="contact" />
      <div className={`${box} grid gap-4 sm:grid-cols-2`}>
        <Field label="First name" name="firstName" required error={f.firstName}>
          <Input name="firstName" defaultValue={v("firstName")} required maxLength={80} error={f.firstName} />
        </Field>
        <Field label="Last name" name="lastName" error={f.lastName}>
          <Input name="lastName" defaultValue={v("lastName")} maxLength={80} />
        </Field>
        <Field label="Email" name="email" error={f.email}>
          <Input name="email" type="email" defaultValue={v("email")} maxLength={160} error={f.email} />
        </Field>
        <Field label="Phone" name="phone" error={f.phone}>
          <Input name="phone" type="tel" defaultValue={v("phone")} maxLength={25} error={f.phone} />
        </Field>
        <Field label="Job title" name="jobTitle">
          <Input name="jobTitle" defaultValue={v("jobTitle")} maxLength={120} />
        </Field>
        <Field label="Company" name="companyId">
          <Select name="companyId" defaultValue={v("companyId")} options={companies} placeholder="No company" />
        </Field>
        <Field label="Contact type" name="contactType">
          <Select name="contactType" defaultValue={v("contactType") || "prospect"} options={types} />
        </Field>
        <Field label="Owner" name="ownerId" error={f.ownerId}>
          <Select name="ownerId" defaultValue={v("ownerId") || currentUserId} options={canAssign ? team : team.filter((t) => t.value === currentUserId || t.value === initial.ownerId)} placeholder={canAssign ? "No owner" : undefined} />
        </Field>
        <Field label="Notes" name="notes" className="sm:col-span-2" hint="Business context only. Do not enter patient health information.">
          <Textarea name="notes" defaultValue={v("notes")} rows={4} maxLength={5000} />
        </Field>
      </div>
      <Actions cancelHref={cancelHref} label={submitLabel} />
    </form>
  );
}

/* ---------------- Company ---------------- */

export function CompanyForm({
  action,
  initial = {},
  team,
  types,
  relationships,
  canAssign,
  currentUserId,
  cancelHref,
  submitLabel,
}: {
  action: (s: DupState, fd: FormData) => Promise<DupState>;
  initial?: Record<string, unknown>;
  team: Opt[];
  types: Opt[];
  relationships: Opt[];
  canAssign: boolean;
  currentUserId: string;
  cancelHref: string;
  submitLabel: string;
}) {
  const [state, formAction] = useActionState<DupState, FormData>(action, { ok: false });
  const f = state.fields || {};
  const v = (k: string) => (initial[k] == null || initial[k] instanceof Date ? "" : String(initial[k]));
  return (
    <form action={formAction} noValidate className="space-y-5">
      <DupAlert state={state} base="/crm/companies" noun="company" />
      <div className={`${box} grid gap-4 sm:grid-cols-2`}>
        <Field label="Company name" name="name" required error={f.name} className="sm:col-span-2">
          <Input name="name" defaultValue={v("name")} required maxLength={160} error={f.name} />
        </Field>
        <Field label="Company type" name="companyType">
          <Select name="companyType" defaultValue={v("companyType") || "other"} options={types} />
        </Field>
        <Field label="Relationship status" name="relationshipStatus">
          <Select name="relationshipStatus" defaultValue={v("relationshipStatus") || "prospect"} options={relationships} />
        </Field>
        <Field label="Industry" name="industry">
          <Input name="industry" defaultValue={v("industry")} maxLength={120} />
        </Field>
        <Field label="Website" name="website" error={f.website}>
          <Input name="website" defaultValue={v("website")} maxLength={200} error={f.website} placeholder="example.com" />
        </Field>
        <Field label="Business email" name="email" error={f.email}>
          <Input name="email" type="email" defaultValue={v("email")} maxLength={160} error={f.email} />
        </Field>
        <Field label="Phone" name="phone" error={f.phone}>
          <Input name="phone" type="tel" defaultValue={v("phone")} maxLength={25} error={f.phone} />
        </Field>
        <Field label="Business address" name="address" className="sm:col-span-2" hint="Optional">
          <Input name="address" defaultValue={v("address")} maxLength={200} />
        </Field>
        <Field label="City" name="city">
          <Input name="city" defaultValue={v("city")} maxLength={100} />
        </Field>
        <Field label="State" name="state">
          <Input name="state" defaultValue={v("state")} maxLength={60} />
        </Field>
        <Field label="Country" name="country">
          <Input name="country" defaultValue={v("country") || "United States"} maxLength={80} />
        </Field>
        <Field label="Owner" name="ownerId" error={f.ownerId}>
          <Select name="ownerId" defaultValue={v("ownerId") || currentUserId} options={canAssign ? team : team.filter((t) => t.value === currentUserId || t.value === initial.ownerId)} placeholder={canAssign ? "No owner" : undefined} />
        </Field>
        <Field label="Notes" name="notes" className="sm:col-span-2" hint="Business context only. Do not enter patient health information.">
          <Textarea name="notes" defaultValue={v("notes")} rows={4} maxLength={5000} />
        </Field>
      </div>
      <Actions cancelHref={cancelHref} label={submitLabel} />
    </form>
  );
}

/* ---------------- Deal ---------------- */

export function DealForm({
  action,
  initial = {},
  companies,
  contacts,
  services,
  stages,
  team,
  canAssign,
  currentUserId,
  defaultCurrency,
  cancelHref,
  submitLabel,
}: {
  action: (s: ActionResult, fd: FormData) => Promise<ActionResult>;
  initial?: Record<string, unknown>;
  companies: Opt[];
  contacts: Opt[];
  services: Opt[];
  stages: Opt[];
  team: Opt[];
  canAssign: boolean;
  currentUserId: string;
  defaultCurrency: string;
  cancelHref: string;
  submitLabel: string;
}) {
  const [state, formAction] = useActionState<ActionResult, FormData>(action, { ok: false });
  const f = state.fields || {};
  const v = (k: string) => (initial[k] == null || initial[k] instanceof Date ? "" : String(initial[k]));
  return (
    <form action={formAction} noValidate className="space-y-5">
      {state.error && <Alert>{state.error}</Alert>}
      <div className={`${box} grid gap-4 sm:grid-cols-2`}>
        <Field label="Deal name" name="name" required error={f.name} className="sm:col-span-2">
          <Input name="name" defaultValue={v("name")} required maxLength={160} error={f.name} />
        </Field>
        <Field label="Company" name="companyId">
          <Select name="companyId" defaultValue={v("companyId")} options={companies} placeholder="No company" />
        </Field>
        <Field label="Primary contact" name="primaryContactId">
          <Select name="primaryContactId" defaultValue={v("primaryContactId")} options={contacts} placeholder="No contact" />
        </Field>
        <Field label="Service" name="serviceKey">
          <Select name="serviceKey" defaultValue={v("serviceKey")} options={services} placeholder="Not specified" />
        </Field>
        <Field label="Pipeline stage" name="stageId" required error={f.stageId}>
          <Select name="stageId" defaultValue={v("stageId")} options={stages} error={f.stageId} />
        </Field>
        <Field label="Deal value" name="value" error={f.value} hint="Optional. Leave blank if not yet known.">
          <Input name="value" inputMode="decimal" defaultValue={v("value")} error={f.value} />
        </Field>
        <Field label="Currency" name="currency" error={f.currency}>
          <Input name="currency" defaultValue={v("currency") || defaultCurrency} maxLength={3} className="uppercase" error={f.currency} />
        </Field>
        <Field label="Probability (%)" name="probability" error={f.probability} hint="Optional">
          <Input name="probability" inputMode="numeric" defaultValue={v("probability")} error={f.probability} />
        </Field>
        <Field label="Expected close date" name="expectedCloseDate" error={f.expectedCloseDate}>
          <Input name="expectedCloseDate" type="date" defaultValue={v("expectedCloseDate")} />
        </Field>
        <Field label="Owner" name="ownerId" error={f.ownerId}>
          <Select name="ownerId" defaultValue={v("ownerId") || currentUserId} options={canAssign ? team : team.filter((t) => t.value === currentUserId || t.value === initial.ownerId)} placeholder={canAssign ? "No owner" : undefined} />
        </Field>
        <Field label="Description" name="description" className="sm:col-span-2">
          <Textarea name="description" defaultValue={v("description")} rows={4} maxLength={5000} />
        </Field>
      </div>
      <Actions cancelHref={cancelHref} label={submitLabel} />
    </form>
  );
}

export function ArchiveRecordButton({ kind, id, archived, noun }: { kind: "contact" | "company" | "deal"; id: string; archived: boolean; noun: string }) {
  const router = useRouter();
  return (
    <ConfirmAction
      label={archived ? "Restore" : "Archive"}
      title={archived ? `Restore this ${noun}?` : `Archive this ${noun}?`}
      message={archived ? `The ${noun} will return to active lists.` : `Archived records are hidden from lists and reports but keep their history and links. Related records are not changed. You can restore it later.`}
      confirmLabel={archived ? "Restore" : "Archive"}
      variant={archived ? "secondary" : "danger"}
      successText={archived ? "Restored." : "Archived."}
      action={async () => {
        const r = await archiveRecordAction(kind, id, archived);
        router.refresh();
        return r;
      }}
    />
  );
}

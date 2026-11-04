"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { limits, serviceOptions, validateContact, type ContactPayload, type FieldErrors } from "@/lib/contact";
import { cx } from "@/components/ui/primitives";

type Status = "idle" | "submitting" | "success" | "error";

const empty = {
  fullName: "",
  email: "",
  company: "",
  jobTitle: "",
  phone: "",
  service: "",
  message: "",
  acknowledge: false,
  website: "",
};

const serverMessages: Record<string, string> = {
  save_failed:
    "We could not save your inquiry because of a technical problem, so it was not received. Please try again in a few minutes.",
  rate_limited: "Too many submissions were received from your connection. Please wait a few minutes and try again.",
  rejected: "Your submission could not be processed. Please wait a moment and try again.",
  validation: "Please correct the highlighted fields and try again.",
  network: "We could not reach our server. Please check your connection and try again.",
};

export function ContactForm({ fallbackEmail }: { fallbackEmail?: string | null }) {
  const [values, setValues] = useState(empty);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<Status>("idle");
  const [serverError, setServerError] = useState<string>("");
  const startedAt = useRef<number>(0);
  const summaryRef = useRef<HTMLDivElement>(null);
  const successRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  const set = <K extends keyof typeof empty>(k: K, v: (typeof empty)[K]) => {
    setValues((s) => ({ ...s, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
  };

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const payload: ContactPayload = { ...values, startedAt: startedAt.current };
    const fieldErrors = validateContact(payload);
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length) {
      setStatus("error");
      setServerError(serverMessages.validation);
      requestAnimationFrame(() => summaryRef.current?.focus());
      return;
    }

    setStatus("submitting");
    setServerError("");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; fields?: FieldErrors };
      if (res.ok && data.ok) {
        setStatus("success");
        setValues(empty);
        requestAnimationFrame(() => successRef.current?.focus());
        return;
      }
      if (data.fields) setErrors(data.fields);
      setStatus("error");
      setServerError(serverMessages[data.error || ""] || serverMessages.save_failed);
    } catch {
      setStatus("error");
      setServerError(serverMessages.network);
    }
    requestAnimationFrame(() => summaryRef.current?.focus());
  }

  if (status === "success") {
    return (
      <div ref={successRef} tabIndex={-1} role="status" className="rounded-[6px] border border-teal/40 bg-white p-10 outline-none">
        <CheckCircle2 aria-hidden className="size-10 text-teal" />
        <h2 className="mt-5 text-2xl font-bold">Thank you. Your inquiry has been received.</h2>
        <p className="mt-3 leading-relaxed text-muted">
          A member of our team will review your message and follow up using the email address you provided.
        </p>
        <button
          type="button"
          onClick={() => {
            setStatus("idle");
            startedAt.current = Date.now();
          }}
          className="mt-8 font-display text-sm font-semibold text-blue hover:text-blue-deep"
        >
          Submit another inquiry
        </button>
      </div>
    );
  }

  const errorList = Object.entries(errors).filter(([, v]) => v);

  return (
    <form noValidate onSubmit={onSubmit} aria-describedby="form-note" className="rounded-[6px] border border-line bg-white p-6 sm:p-10">
      <div ref={summaryRef} tabIndex={-1} className="outline-none" aria-live="assertive">
        {status === "error" && serverError && (
          <div role="alert" className="mb-8 flex gap-3 rounded-[4px] border border-[#b42318]/30 bg-[#fef3f2] p-4 text-[0.95rem] text-[#7a271a]">
            <AlertCircle aria-hidden className="mt-0.5 size-5 shrink-0" />
            <div>
              <p className="font-semibold">{serverError}</p>
              {errorList.length > 0 && (
                <ul className="mt-2 list-disc pl-5">
                  {errorList.map(([k, v]) => (
                    <li key={k}>
                      <a href={`#f-${k}`} className="underline underline-offset-2">{v}</a>
                    </li>
                  ))}
                </ul>
              )}
              {!errorList.length && fallbackEmail && (
                <p className="mt-2">
                  You can also email us at{" "}
                  <a className="underline" href={`mailto:${fallbackEmail}`}>{fallbackEmail}</a>.
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <Field id="fullName" label="Full Name" error={errors.fullName} required>
          <input {...inputProps("fullName", errors)} autoComplete="name" maxLength={limits.fullName} value={values.fullName} onChange={(e) => set("fullName", e.target.value)} />
        </Field>
        <Field id="email" label="Business Email" error={errors.email} required>
          <input {...inputProps("email", errors)} type="email" autoComplete="email" maxLength={limits.email} value={values.email} onChange={(e) => set("email", e.target.value)} />
        </Field>
        <Field id="company" label="Company Name" error={errors.company} required>
          <input {...inputProps("company", errors)} autoComplete="organization" maxLength={limits.company} value={values.company} onChange={(e) => set("company", e.target.value)} />
        </Field>
        <Field id="jobTitle" label="Job Title" error={errors.jobTitle} required>
          <input {...inputProps("jobTitle", errors)} autoComplete="organization-title" maxLength={limits.jobTitle} value={values.jobTitle} onChange={(e) => set("jobTitle", e.target.value)} />
        </Field>
        <Field id="phone" label="Phone Number" error={errors.phone} hint="Optional">
          <input {...inputProps("phone", errors)} type="tel" autoComplete="tel" maxLength={limits.phone} value={values.phone} onChange={(e) => set("phone", e.target.value)} />
        </Field>
        <Field id="service" label="Service of Interest" error={errors.service} required>
          <select {...inputProps("service", errors)} value={values.service} onChange={(e) => set("service", e.target.value)}>
            <option value="" disabled>
              Select a service
            </option>
            {serviceOptions.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </Field>
        <div className="sm:col-span-2">
          <Field id="message" label="Message" error={errors.message} required hint="Describe your organization and what you would like help with.">
            <textarea {...inputProps("message", errors)} rows={6} maxLength={limits.message} value={values.message} onChange={(e) => set("message", e.target.value)} />
          </Field>
        </div>
      </div>

      {/* Honeypot: hidden from people and assistive tech, attractive to bots */}
      <div aria-hidden className="absolute left-[-10000px] h-px w-px overflow-hidden">
        <label htmlFor="f-website">Website</label>
        <input id="f-website" tabIndex={-1} autoComplete="off" value={values.website} onChange={(e) => set("website", e.target.value)} />
      </div>

      <div className="mt-7">
        <label htmlFor="f-acknowledge" className="flex cursor-pointer items-start gap-3 text-[0.95rem] leading-relaxed text-muted">
          <input
            id="f-acknowledge"
            type="checkbox"
            checked={values.acknowledge}
            onChange={(e) => set("acknowledge", e.target.checked)}
            aria-invalid={!!errors.acknowledge}
            aria-describedby={errors.acknowledge ? "e-acknowledge" : undefined}
            className="mt-1 size-4 shrink-0 accent-[var(--brand-blue)]"
          />
          <span>
            I understand this form is for business inquiries only, and I will not include patient names, medical records,
            insurance details, or other protected health information. <span className="text-[#b42318]" aria-hidden>*</span>
          </span>
        </label>
        {errors.acknowledge && (
          <p id="e-acknowledge" className="mt-2 pl-7 text-sm text-[#b42318]">{errors.acknowledge}</p>
        )}
      </div>

      <div className="mt-9 flex flex-col-reverse items-start gap-5 border-t border-line pt-7 sm:flex-row sm:items-center sm:justify-between">
        <p id="form-note" className="text-sm text-muted">
          Fields marked <span className="text-[#b42318]">*</span> are required.
        </p>
        <button
          type="submit"
          disabled={status === "submitting"}
          className="inline-flex min-w-[180px] items-center justify-center gap-2 rounded-[4px] bg-blue px-6 py-3.5 font-display text-[0.92rem] font-semibold text-white transition-colors hover:bg-blue-deep disabled:cursor-wait disabled:opacity-70"
        >
          {status === "submitting" ? (
            <>
              <Loader2 aria-hidden className="size-4 animate-spin" /> Submitting
            </>
          ) : (
            "Submit Inquiry"
          )}
        </button>
      </div>
    </form>
  );
}

function inputProps(name: keyof ContactPayload, errors: FieldErrors) {
  const err = errors[name];
  return {
    id: `f-${name}`,
    name,
    "aria-invalid": !!err,
    "aria-describedby": err ? `e-${name}` : undefined,
    className: cx(
      "w-full rounded-[4px] border bg-white px-4 py-3 text-[1rem] text-slate transition-colors placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-blue/25",
      err ? "border-[#b42318] focus:border-[#b42318]" : "border-line hover:border-muted/50 focus:border-blue",
    ),
  };
}

function Field({
  id,
  label,
  error,
  required,
  hint,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={`f-${id}`} className="mb-2 flex items-baseline justify-between gap-3 font-display text-[0.85rem] font-semibold text-slate">
        <span>
          {label} {required && <span className="text-[#b42318]" aria-hidden>*</span>}
          {required && <span className="sr-only">(required)</span>}
        </span>
        {hint && <span className="font-sans text-xs font-normal text-muted">{hint}</span>}
      </label>
      {children}
      {error && (
        <p id={`e-${id}`} className="mt-2 text-sm text-[#b42318]">
          {error}
        </p>
      )}
    </div>
  );
}

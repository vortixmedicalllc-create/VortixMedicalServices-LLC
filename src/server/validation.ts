import { z } from "zod";
import { COMPANY_TYPES, CONTACT_TYPES, LEAD_STATUSES, LOGGABLE_ACTIVITY_TYPES, PRIORITIES, RELATIONSHIP_STATUSES, TASK_STATUSES } from "./constants";

/** Convert FormData into a plain object; empty strings become undefined. */
export function formObject(fd: FormData) {
  const o: Record<string, string | string[] | undefined> = {};
  for (const [k, v] of fd.entries()) {
    if (typeof v !== "string") continue;
    const val = v.trim() === "" ? undefined : v.trim();
    if (k.endsWith("[]")) {
      const key = k.slice(0, -2);
      (o[key] = (o[key] as string[] | undefined) || []).push(v);
    } else o[k] = val;
  }
  return o;
}

export function fieldErrors(err: z.ZodError) {
  const out: Record<string, string> = {};
  for (const i of err.issues) {
    const k = String(i.path[0] ?? "form");
    if (!out[k]) out[k] = i.message;
  }
  return out;
}

const text = (max: number) => z.string().max(max, `Must be ${max} characters or fewer.`);
const optText = (max: number) => text(max).optional();
const email = z.string().email("Enter a valid email address.").max(160);
const optEmail = email.optional();
const phone = z
  .string()
  .regex(/^[+()\d\s.\-x]{7,25}$/i, "Enter a valid phone number.")
  .optional();
const url = z
  .string()
  .max(200)
  .regex(/^(https?:\/\/)?[\w.-]+\.[a-z]{2,}(\/\S*)?$/i, "Enter a valid website address.")
  .optional();
const uuid = z.string().uuid().optional();
const dateTime = z
  .string()
  .optional()
  .refine((v) => !v || !Number.isNaN(Date.parse(v)), "Enter a valid date.")
  .transform((v) => (v ? new Date(v) : undefined));
const dateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date.")
  .optional();

export const leadSchema = z.object({
  firstName: text(80).min(1, "First name is required."),
  lastName: optText(80),
  email,
  phone,
  companyName: optText(160),
  jobTitle: optText(120),
  website: url,
  industry: optText(120),
  serviceKey: optText(60),
  sourceKey: text(60).default("manual"),
  status: z.enum(LEAD_STATUSES).default("new"),
  priority: z.enum(PRIORITIES).default("normal"),
  assignedToId: uuid,
  nextFollowUpAt: dateTime,
  lastContactAt: dateTime,
  notes: optText(5000),
});

export const contactSchema = z.object({
  firstName: text(80).min(1, "First name is required."),
  lastName: optText(80),
  email: optEmail,
  phone,
  jobTitle: optText(120),
  companyId: uuid,
  contactType: z.enum(CONTACT_TYPES).default("prospect"),
  ownerId: uuid,
  notes: optText(5000),
});

export const companySchema = z.object({
  name: text(160).min(2, "Company name is required."),
  website: url,
  email: optEmail,
  phone,
  industry: optText(120),
  companyType: z.enum(COMPANY_TYPES).default("other"),
  address: optText(200),
  city: optText(100),
  state: optText(60),
  country: optText(80),
  ownerId: uuid,
  relationshipStatus: z.enum(RELATIONSHIP_STATUSES).default("prospect"),
  notes: optText(5000),
});

export const dealSchema = z.object({
  name: text(160).min(2, "Deal name is required."),
  companyId: uuid,
  primaryContactId: uuid,
  serviceKey: optText(60),
  value: z
    .string()
    .optional()
    .refine((v) => !v || /^\d{1,12}(\.\d{1,2})?$/.test(v.replace(/,/g, "")), "Enter an amount such as 25000 or 25000.50.")
    .transform((v) => (v ? v.replace(/,/g, "") : undefined)),
  currency: z.string().regex(/^[A-Z]{3}$/, "Use a 3-letter currency code.").default("USD"),
  stageId: z.coerce.number().int().positive("Choose a pipeline stage."),
  probability: z
    .string()
    .optional()
    .refine((v) => !v || (/^\d{1,3}$/.test(v) && Number(v) <= 100), "Enter a number from 0 to 100.")
    .transform((v) => (v ? Number(v) : undefined)),
  expectedCloseDate: dateOnly,
  ownerId: uuid,
  description: optText(5000),
});

export const taskSchema = z.object({
  title: text(200).min(2, "Task title is required."),
  description: optText(5000),
  leadId: uuid,
  contactId: uuid,
  companyId: uuid,
  dealId: uuid,
  assignedToId: uuid,
  dueAt: dateTime,
  priority: z.enum(PRIORITIES).default("normal"),
  status: z.enum(TASK_STATUSES).default("todo"),
});

export const activitySchema = z.object({
  type: z.enum(LOGGABLE_ACTIVITY_TYPES),
  description: text(5000).min(2, "Add a short description."),
  occurredAt: dateTime,
  leadId: uuid,
  contactId: uuid,
  companyId: uuid,
  dealId: uuid,
});

export const normalize = {
  email: (e?: string | null) => (e ? e.trim().toLowerCase() : null),
  company: (n?: string | null) =>
    n
      ? n
          .toLowerCase()
          .replace(/[.,]/g, "")
          .replace(/\b(llc|inc|corp|corporation|co|ltd|pllc|pc|pa)\b/g, "")
          .replace(/\s+/g, " ")
          .trim()
      : null,
};

export type ActionResult = { ok: boolean; error?: string; fields?: Record<string, string>; id?: string; message?: string };

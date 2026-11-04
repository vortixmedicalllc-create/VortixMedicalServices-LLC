/** Shared contact-form schema, used by both the browser form and the API route. */

export const serviceOptions = ["DME Services", "Medical Billing", "AI Services", "Multiple Services", "Other"] as const;

export type ContactPayload = {
  fullName: string;
  email: string;
  company: string;
  jobTitle: string;
  phone: string;
  service: string;
  message: string;
  acknowledge: boolean;
  // spam protection
  website: string; // honeypot, must stay empty
  startedAt: number; // ms timestamp when the form was rendered
};

export type FieldErrors = Partial<Record<keyof ContactPayload, string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^[+()\d\s.-]{7,20}$/;

export const limits = { fullName: 100, email: 160, company: 160, jobTitle: 100, phone: 20, message: 3000 };

export function validateContact(p: Partial<ContactPayload>): FieldErrors {
  const e: FieldErrors = {};
  const s = (v: unknown) => (typeof v === "string" ? v.trim() : "");

  if (s(p.fullName).length < 2) e.fullName = "Please enter your full name.";
  else if (s(p.fullName).length > limits.fullName) e.fullName = "Name is too long.";

  if (!EMAIL_RE.test(s(p.email))) e.email = "Please enter a valid business email address.";
  else if (s(p.email).length > limits.email) e.email = "Email is too long.";

  if (s(p.company).length < 2) e.company = "Please enter your company or organization name.";
  else if (s(p.company).length > limits.company) e.company = "Company name is too long.";

  if (s(p.jobTitle).length < 2) e.jobTitle = "Please enter your job title.";
  else if (s(p.jobTitle).length > limits.jobTitle) e.jobTitle = "Job title is too long.";

  if (s(p.phone) && !PHONE_RE.test(s(p.phone))) e.phone = "Please enter a valid phone number, or leave this blank.";

  if (!serviceOptions.includes(s(p.service) as (typeof serviceOptions)[number])) e.service = "Please choose a service of interest.";

  if (s(p.message).length < 20) e.message = "Please share a few more details (at least 20 characters).";
  else if (s(p.message).length > limits.message) e.message = `Please keep your message under ${limits.message} characters.`;

  if (p.acknowledge !== true) e.acknowledge = "Please confirm that you will not include patient health information.";

  return e;
}

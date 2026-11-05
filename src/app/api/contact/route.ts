import { NextResponse } from "next/server";
import { validateContact, type ContactPayload } from "@/lib/contact";
import { getDb } from "@/db";
import { createLead, leadCode } from "@/server/services/leads";
import { rateLimit } from "@/server/ratelimit";
import { appUrl, emailButton, escapeHtml, isEmailConfigured, sendEmail } from "@/server/email";

/**
 * Public business-inquiry endpoint used by the website contact form.
 *
 * 1. Rate limit, spam checks (honeypot + minimum fill time), server-side validation.
 * 2. Creates a CRM lead (source Website, status New) inside a database transaction,
 *    with duplicate flagging, the configured assignment rule, an activity entry,
 *    an audit log entry, and in-app notifications.
 * 3. Only after the database write succeeds does the visitor see a success message.
 * 4. Emails the assignee (or Owners/Admins) through the notification outbox, and
 *    CONTACT_TO_EMAIL if set, when email is configured. A failed email never undoes the saved lead.
 *
 * Privacy: inquiry contents are never written to server logs. The form is for
 * business inquiries only and does not collect patient information.
 */

export const runtime = "nodejs";

const SERVICE_KEYS: Record<string, string> = {
  "DME Services": "dme",
  "Medical Billing": "medical_billing",
  "Both Services": "multiple",
  Other: "other",
};

/** Strip control characters that have no place in a business inquiry. */
const clean = (v: unknown, max: number) =>
  String(v ?? "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim()
    .slice(0, max);

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (await rateLimit(`contact:${ip}`, 5, 10 * 60_000)) return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });

  let body: Partial<ContactPayload>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_request" }, { status: 400 });
  }

  const elapsed = Date.now() - Number(body.startedAt || 0);
  if ((body.website && body.website.length > 0) || !body.startedAt || elapsed < 3000) {
    return NextResponse.json({ ok: false, error: "rejected" }, { status: 400 });
  }

  const errors = validateContact(body);
  if (Object.keys(errors).length) return NextResponse.json({ ok: false, error: "validation", fields: errors }, { status: 422 });

  const fullName = clean(body.fullName, 100).replace(/\s+/g, " ");
  const [firstName, ...rest] = fullName.split(" ");
  const service = clean(body.service, 40);
  const inquiry = {
    firstName,
    lastName: rest.join(" "),
    email: clean(body.email, 160),
    companyName: clean(body.company, 160),
    jobTitle: clean(body.jobTitle, 100),
    phone: clean(body.phone, 20) || undefined,
    serviceKey: SERVICE_KEYS[service] ?? "other",
    message: clean(body.message, 3000),
  };

  // Save to the CRM. Success is reported only if this succeeds.
  let result: Awaited<ReturnType<typeof createLead>>;
  try {
    const db = await getDb();
    result = await createLead(
      db,
      {
        firstName: inquiry.firstName,
        lastName: inquiry.lastName,
        email: inquiry.email,
        phone: inquiry.phone,
        companyName: inquiry.companyName,
        jobTitle: inquiry.jobTitle,
        serviceKey: inquiry.serviceKey,
        sourceKey: "website",
        status: "new",
        priority: "normal",
        inquiryMessage: inquiry.message,
        isWebsiteInquiry: true,
      },
      null,
    );
  } catch (err) {
    console.error("[contact] could not save inquiry:", err instanceof Error ? err.message : "unknown error");
    return NextResponse.json({ ok: false, error: "save_failed" }, { status: 500 });
  }

  // Team members are emailed through the CRM notification outbox (sent after this response).
  // CONTACT_TO_EMAIL optionally copies every inquiry to a shared inbox as well.
  const shared = (process.env.CONTACT_TO_EMAIL || "").split(",").map((s) => s.trim()).filter(Boolean);
  if (shared.length && isEmailConfigured()) {
    const link = appUrl(`/crm/leads/${result.lead.id}`);
    const html = `<h2 style="margin:0 0 12px;font-size:18px">New website inquiry ${leadCode(result.lead.number)}</h2>
<p><b>${escapeHtml(fullName)}</b>, ${escapeHtml(inquiry.jobTitle)} at ${escapeHtml(inquiry.companyName)}<br>
${escapeHtml(inquiry.email)}${inquiry.phone ? ` · ${escapeHtml(inquiry.phone)}` : ""}<br>Service of interest: ${escapeHtml(service)}</p>
<p style="white-space:pre-wrap">${escapeHtml(inquiry.message)}</p>
${result.duplicate ? '<p style="color:#8a5300">Flagged as a possible duplicate of an existing lead.</p>' : ""}
${emailButton(link, "Open the lead in Vortix CRM")}`;
    try {
      const { after } = await import("next/server");
      after(() => sendEmail({ to: shared, replyTo: inquiry.email, subject: `New website inquiry: ${service} (${inquiry.companyName})`, html }));
    } catch {
      await sendEmail({ to: shared, replyTo: inquiry.email, subject: `New website inquiry: ${service} (${inquiry.companyName})`, html });
    }
  }

  // Optional webhook forwarding (e.g. to another system); failures are logged only.
  if (process.env.CONTACT_WEBHOOK_URL) {
    fetch(process.env.CONTACT_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "business_inquiry", leadId: result.lead.id, ...inquiry, service, submittedAt: new Date().toISOString() }),
    }).catch(() => console.error("[contact] webhook delivery failed"));
  }

  return NextResponse.json({ ok: true });
}

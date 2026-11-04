import { NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { validateContact, type ContactPayload } from "@/lib/contact";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { createLead, leadCode } from "@/server/services/leads";
import { appUrl, escapeHtml, isEmailConfigured, sendEmail } from "@/server/email";

/**
 * Public business-inquiry endpoint used by the website contact form.
 *
 * 1. Rate limit, spam checks (honeypot + minimum fill time), server-side validation.
 * 2. Creates a CRM lead (source Website, status New) inside a database transaction,
 *    with duplicate flagging, the configured assignment rule, an activity entry,
 *    an audit log entry, and in-app notifications.
 * 3. Only after the database write succeeds does the visitor see a success message.
 * 4. Sends an email notification when email delivery is configured (optional; a
 *    failed email never undoes the saved lead).
 *
 * Privacy: inquiry contents are never written to server logs. The form is for
 * business inquiries only and does not collect patient information.
 */

export const runtime = "nodejs";

const hits = new Map<string, { count: number; reset: number }>();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;

function rateLimited(ip: string) {
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || entry.reset < now) {
    hits.set(ip, { count: 1, reset: now + WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_PER_WINDOW;
}

const SERVICE_KEYS: Record<string, string> = {
  "DME Services": "dme",
  "Medical Billing": "medical_billing",
  "AI Services": "ai",
  "Multiple Services": "multiple",
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
  if (rateLimited(ip)) return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });

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

  // Optional email notification (never blocks or reverses the saved lead)
  if (isEmailConfigured()) {
    try {
      const db = await getDb();
      let to: string[] = (process.env.CONTACT_TO_EMAIL || "").split(",").map((s) => s.trim()).filter(Boolean);
      if (result.lead.assignedToId) {
        const [u] = await db.select({ email: users.email }).from(users).where(eq(users.id, result.lead.assignedToId));
        if (u) to.push(u.email);
      }
      if (!to.length) {
        const admins = await db.select({ email: users.email }).from(users).where(and(eq(users.isActive, true), inArray(users.role, ["owner", "admin"])));
        to = admins.map((a) => a.email);
      }
      if (to.length) {
        const link = appUrl(`/crm/leads/${result.lead.id}`);
        await sendEmail({
          to: [...new Set(to)],
          replyTo: inquiry.email,
          subject: `New website inquiry: ${service} (${inquiry.companyName})`,
          html: `<h2 style="font-family:sans-serif;color:#1d3b47">New website inquiry ${leadCode(result.lead.number)}</h2>
<p style="font-family:sans-serif;font-size:14px"><b>${escapeHtml(fullName)}</b>, ${escapeHtml(inquiry.jobTitle)} at ${escapeHtml(inquiry.companyName)}<br>
${escapeHtml(inquiry.email)}${inquiry.phone ? ` · ${escapeHtml(inquiry.phone)}` : ""}<br>Service of interest: ${escapeHtml(service)}</p>
<p style="font-family:sans-serif;font-size:14px;white-space:pre-wrap">${escapeHtml(inquiry.message)}</p>
${result.duplicate ? '<p style="font-family:sans-serif;color:#8a5300">Flagged as a possible duplicate of an existing lead.</p>' : ""}
<p><a href="${link}">Open the lead in Vortix CRM</a></p>`,
        });
      }
    } catch (err) {
      console.error("[contact] notification email failed:", err instanceof Error ? err.message : "unknown error");
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

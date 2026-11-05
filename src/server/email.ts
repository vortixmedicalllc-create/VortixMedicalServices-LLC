/**
 * Outbound email. Two providers are supported, chosen by environment variables:
 *
 *  - Resend (https://resend.com):  RESEND_API_KEY + CONTACT_FROM_EMAIL
 *  - SMTP (Gmail, Outlook/Microsoft 365, Zoho, any mail host):
 *      SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS (+ optional SMTP_SECURE, CONTACT_FROM_EMAIL)
 *
 * When neither is configured, functions return { sent: false } and callers tell
 * the user honestly; nothing ever pretends an email was sent.
 */

export type EmailProvider = "resend" | "smtp" | null;

export function emailProvider(): EmailProvider {
  if (process.env.RESEND_API_KEY && process.env.CONTACT_FROM_EMAIL) return "resend";
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) return "smtp";
  return null;
}

export function isEmailConfigured() {
  return emailProvider() !== null;
}

type SendResult = { sent: true } | { sent: false; reason: string };

export async function sendEmail(opts: { to: string | string[]; subject: string; html: string; replyTo?: string }): Promise<SendResult> {
  const provider = emailProvider();
  if (!provider) return { sent: false, reason: "not_configured" };
  const to = Array.isArray(opts.to) ? opts.to : [opts.to];
  const html = layout(opts.html);
  try {
    if (provider === "resend") {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: process.env.CONTACT_FROM_EMAIL, to, subject: opts.subject, html, reply_to: opts.replyTo }),
      });
      if (!res.ok) {
        console.error("[email] Resend responded", res.status);
        return { sent: false, reason: "provider_error" };
      }
      return { sent: true };
    }

    const { default: nodemailer } = await import("nodemailer");
    const port = Number(process.env.SMTP_PORT || 587);
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    await transport.sendMail({
      from: process.env.CONTACT_FROM_EMAIL || process.env.SMTP_USER,
      to,
      subject: opts.subject,
      html,
      replyTo: opts.replyTo,
    });
    return { sent: true };
  } catch (e) {
    // Never log message contents or credentials, only the failure.
    console.error("[email] send failed:", e instanceof Error ? e.message.slice(0, 200) : "unknown");
    return { sent: false, reason: "send_failed" };
  }
}

export const escapeHtml = (v: string) =>
  v.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Base address for links into the CRM (emails, invites). Prefers APP_URL, then the CRM subdomain. */
export function appUrl(path = "") {
  const base = process.env.APP_URL || (process.env.CRM_HOST ? `https://${process.env.CRM_HOST}` : "") || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  return `${base.replace(/\/$/, "")}${path}`;
}

/** Simple branded wrapper using the logo colors. Inline styles for email clients. */
function layout(body: string) {
  return `<!doctype html><html><body style="margin:0;background:#f5f9fb;font-family:Arial,Helvetica,sans-serif;color:#1d3b47">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f9fb;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #d6e2e8;border-radius:8px">
<tr><td style="height:4px;background:#0a72ba;border-radius:8px 8px 0 0;background-image:linear-gradient(90deg,#0a72ba,#0e8ba7,#12a594)"></td></tr>
<tr><td style="padding:24px 28px 8px;font-size:13px;font-weight:bold;letter-spacing:2px;color:#0c7d70">VORTIX MEDICAL SERVICES</td></tr>
<tr><td style="padding:8px 28px 28px;font-size:15px;line-height:1.6">${body}</td></tr>
</table>
<p style="font-size:12px;color:#4a626c;margin:16px 0 0">This is an automated message from Vortix CRM. Do not reply with patient health information.</p>
</td></tr></table></body></html>`;
}

/** A standard call-to-action button for emails. */
export function emailButton(href: string, label: string) {
  return `<p style="margin:24px 0 8px"><a href="${href}" style="display:inline-block;background:#0a72ba;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 20px;border-radius:5px">${escapeHtml(label)}</a></p>`;
}

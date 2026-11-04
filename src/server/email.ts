/**
 * Outbound email through Resend (https://resend.com), configured by environment
 * variables. When email is not configured, functions return { sent: false } and
 * callers must tell the user honestly; nothing pretends an email was sent.
 */
export function isEmailConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.CONTACT_FROM_EMAIL);
}

export async function sendEmail(opts: { to: string | string[]; subject: string; html: string; replyTo?: string }) {
  if (!isEmailConfigured()) return { sent: false as const, reason: "not_configured" };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.CONTACT_FROM_EMAIL,
        to: Array.isArray(opts.to) ? opts.to : [opts.to],
        subject: opts.subject,
        html: opts.html,
        reply_to: opts.replyTo,
      }),
    });
    if (!res.ok) {
      console.error("[email] provider responded", res.status);
      return { sent: false as const, reason: "provider_error" };
    }
    return { sent: true as const };
  } catch (e) {
    console.error("[email] send failed:", e instanceof Error ? e.message : "unknown");
    return { sent: false as const, reason: "network_error" };
  }
}

export const escapeHtml = (v: string) =>
  v.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function appUrl(path = "") {
  return `${(process.env.APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "")}${path}`;
}

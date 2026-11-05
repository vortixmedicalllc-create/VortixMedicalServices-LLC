import { NextResponse, type NextRequest } from "next/server";

/**
 * 1. Optional CRM subdomain. When CRM_HOST is set (e.g. "crm.example.com"):
 *    - the CRM is served only on CRM_HOST; /crm on the public site redirects there;
 *    - the CRM host serves no public website pages (they redirect to the main site).
 *    When CRM_HOST is not set, the CRM stays at /crm on the same address.
 * 2. Optimistic sign-in gate for CRM pages. Real authorization happens on the server
 *    for every page, action, and export (src/server/auth.ts).
 */
const PUBLIC_CRM = ["/crm/login", "/crm/forgot-password", "/crm/reset-password", "/crm/setup"];
const SHARED_PREFIXES = ["/_next", "/api/", "/images/", "/icon", "/favicon", "/robots.txt"];

function siteOrigin() {
  const raw = process.env.NEXT_PUBLIC_SITE_URL || "";
  try {
    return new URL(raw).origin;
  } catch {
    return null;
  }
}

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const host = (req.headers.get("host") || "").toLowerCase().split(":")[0];
  const crmHost = (process.env.CRM_HOST || "").toLowerCase().trim();
  const isCrmPath = pathname === "/crm" || pathname.startsWith("/crm/");

  if (crmHost) {
    if (host === crmHost) {
      if (pathname === "/") return NextResponse.redirect(new URL("/crm/dashboard", req.url));
      if (!isCrmPath && !SHARED_PREFIXES.some((p) => pathname.startsWith(p))) {
        const origin = siteOrigin();
        if (origin) return NextResponse.redirect(new URL(pathname + search, origin));
      }
    } else if (isCrmPath && host !== "localhost" && host !== "127.0.0.1") {
      return NextResponse.redirect(new URL(pathname + search, `https://${crmHost}`), 308);
    }
  }

  if (!isCrmPath) return NextResponse.next();
  if (PUBLIC_CRM.some((p) => pathname.startsWith(p))) {
    const res = NextResponse.next();
    res.headers.set("X-Robots-Tag", "noindex, nofollow");
    return res;
  }
  if (!req.cookies.get("vx_session")) {
    const url = req.nextUrl.clone();
    url.pathname = "/crm/login";
    url.search = pathname === "/crm" || pathname === "/crm/dashboard" ? "" : `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }
  const res = NextResponse.next();
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  res.headers.set("Cache-Control", "private, no-store");
  return res;
}

export const config = {
  // Run on pages (not static assets) so the CRM host can be separated from the public site.
  matcher: ["/((?!_next/static|_next/image|images/|icon.png|favicon.ico).*)"],
};

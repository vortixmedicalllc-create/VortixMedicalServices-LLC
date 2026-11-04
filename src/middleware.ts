import { NextResponse, type NextRequest } from "next/server";

// Optimistic gate for the CRM. Real authorization happens on the server for
// every page, action, and export (see src/server/auth.ts).
const PUBLIC_CRM = ["/crm/login", "/crm/forgot-password", "/crm/reset-password", "/crm/setup"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC_CRM.some((p) => pathname.startsWith(p))) return NextResponse.next();
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

export const config = { matcher: ["/crm/:path*"] };

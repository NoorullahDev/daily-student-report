/**
 * Protects /admin/* (except /admin/login). Runs on the edge runtime.
 * API routes under /api/admin/* do their own cookie check (they are not
 * matched here), so a missing ADMIN_PASSWORD also blocks the UI safely:
 * with no password configured, no session can ever verify.
 */
import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, verifySessionCookie } from "./lib/admin-auth";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname === "/admin/login" || pathname.startsWith("/admin/login/")) {
    return NextResponse.next();
  }
  const ok = await verifySessionCookie(req.cookies.get(ADMIN_COOKIE)?.value);
  if (ok) return NextResponse.next();
  const url = req.nextUrl.clone();
  url.pathname = "/admin/login";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/admin/:path*"],
};

/** Shared helpers for API routes: JSON errors (never stack traces) and admin checks. */
import { NextResponse } from "next/server";
import { ADMIN_COOKIE, verifySessionCookie } from "./admin-auth";

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

/** 503 when Supabase is not configured — tells the user what to do. */
export function supabaseNotConfigured() {
  return jsonError(
    "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (and SUPABASE_SERVICE_ROLE_KEY for admin actions) in .env.local or in Vercel environment variables. See README.md.",
    503,
  );
}

/** True when the request carries a valid admin session cookie. */
export async function isAdminRequest(req: Request): Promise<boolean> {
  const cookieHeader = req.headers.get("cookie") ?? "";
  const match = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${ADMIN_COOKIE}=`));
  const value = match ? decodeURIComponent(match.slice(ADMIN_COOKIE.length + 1)) : null;
  return verifySessionCookie(value);
}

/** 401 response when the caller is not an admin. */
export function adminRequired() {
  return jsonError("Admin login required.", 401);
}

import { NextResponse, type NextRequest } from "next/server";
import {
  ADMIN_COOKIE,
  checkPassword,
  expectedSessionValue,
  sessionCookieOptions,
} from "@/lib/admin-auth";
import { jsonError } from "@/lib/http";

/** POST /api/admin/login — { password } -> sets the httpOnly admin_session cookie. */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("Request body must be valid JSON.", 400);
  }
  const password = (body as Record<string, unknown>)?.password;
  if (typeof password !== "string" || password === "") {
    return jsonError("Password is required.", 400);
  }
  if (!(await checkPassword(password))) {
    return jsonError("Wrong password.", 401);
  }
  const value = await expectedSessionValue();
  if (!value) return jsonError("Admin password is not configured on the server.", 500);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, value, sessionCookieOptions());
  return res;
}

/**
 * Admin session: a single signed cookie, no database, no JWT library.
 *
 * The cookie value is `v1.<hex>` where hex = HMAC-SHA256(secret, ADMIN_PASSWORD).
 * `secret` is ADMIN_SESSION_SECRET when set, otherwise ADMIN_PASSWORD itself.
 * The cookie is httpOnly, SameSite=Lax, Secure in production, 7-day expiry.
 * Implemented with Web Crypto (`crypto.subtle`) so the same code runs in
 * Node route handlers AND in edge middleware.
 */
export const ADMIN_COOKIE = "admin_session";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function getSecret(): string | null {
  return process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD || null;
}

async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** The cookie value a correct login should produce (null if no password set). */
export async function expectedSessionValue(): Promise<string | null> {
  const password = process.env.ADMIN_PASSWORD;
  const secret = getSecret();
  if (!password || !secret) return null;
  return `v1.${await hmacHex(secret, password)}`;
}

/** True when the submitted password matches ADMIN_PASSWORD. */
export async function checkPassword(candidate: string): Promise<boolean> {
  const password = process.env.ADMIN_PASSWORD;
  const secret = getSecret();
  if (!password || !secret || !candidate) return false;
  // Compare HMACs (fixed length) instead of the raw password strings.
  const a = await hmacHex(secret, candidate);
  const b = await hmacHex(secret, password);
  return a.length === b.length && a === b;
}

/** True when the cookie value matches the expected session value. */
export async function verifySessionCookie(value: string | undefined | null): Promise<boolean> {
  if (!value) return false;
  const expected = await expectedSessionValue();
  return expected !== null && value === expected;
}

/** Cookie attributes shared by login (set) and logout (clear). */
export function sessionCookieOptions(maxAge: number = COOKIE_MAX_AGE) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

/**
 * Server-side Supabase clients (API routes / server components only).
 *
 * - `getServerSupabase()` — anon key, respects RLS (public reads + report upserts).
 * - `getServiceSupabase()` — service-role key, bypasses RLS. ONLY for admin
 *   API routes, and only after the admin cookie has been verified.
 * Both return null when their env vars are missing; routes must answer with a
 * clear 503 "Supabase is not configured" instead of crashing.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export function isServerSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export function isServiceSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

export function getServerSupabase(): SupabaseClient | null {
  if (!isServerSupabaseConfigured()) return null;
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
  );
}

export function getServiceSupabase(): SupabaseClient | null {
  if (!isServiceSupabaseConfigured()) return null;
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

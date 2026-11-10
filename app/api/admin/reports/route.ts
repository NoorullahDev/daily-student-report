import { NextResponse, type NextRequest } from "next/server";
import { getServiceSupabase, isServiceSupabaseConfigured } from "@/lib/supabase/server";
import {
  adminRequired,
  isAdminRequest,
  jsonError,
  supabaseNotConfigured,
} from "@/lib/http";
import { validateReportInput } from "@/lib/validation";

/**
 * Admin report entries API (service-role key, admin cookie required).
 * PUT    /api/admin/reports?id=... — replace one entry's values (validated)
 * DELETE /api/admin/reports?id=... — delete one entry
 * (Creating reports is the public form's job: POST /api/reports.)
 */
export async function PUT(req: NextRequest) {
  if (!(await isAdminRequest(req))) return adminRequired();
  if (!isServiceSupabaseConfigured()) return supabaseNotConfigured();
  const supabase = getServiceSupabase();
  if (!supabase) return supabaseNotConfigured();
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return jsonError("Missing ?id=.", 400);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("Request body must be valid JSON.", 400);
  }
  const result = validateReportInput(body);
  if (!result.ok || !result.data) return jsonError(result.error ?? "Invalid report.", 400);
  const { data, error } = await supabase
    .from("reports")
    .update(result.data)
    .eq("id", id)
    .select()
    .single();
  if (error) return jsonError("Could not update the report.", 500);
  return NextResponse.json({ report: data });
}

export async function DELETE(req: NextRequest) {
  if (!(await isAdminRequest(req))) return adminRequired();
  if (!isServiceSupabaseConfigured()) return supabaseNotConfigured();
  const supabase = getServiceSupabase();
  if (!supabase) return supabaseNotConfigured();
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return jsonError("Missing ?id=.", 400);
  const { error } = await supabase.from("reports").delete().eq("id", id);
  if (error) return jsonError("Could not delete the report.", 500);
  return NextResponse.json({ ok: true });
}

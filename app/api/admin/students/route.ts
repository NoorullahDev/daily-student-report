import { NextResponse, type NextRequest } from "next/server";
import { getServiceSupabase, isServiceSupabaseConfigured } from "@/lib/supabase/server";
import {
  adminRequired,
  isAdminRequest,
  jsonError,
  supabaseNotConfigured,
} from "@/lib/http";
import { validateStudentInput } from "@/lib/validation";

/**
 * Admin roster API (service-role key, admin cookie required).
 * GET    /api/admin/students            — all students incl. inactive, ordered
 * POST   /api/admin/students            — { name, order_no, active? }
 * PUT    /api/admin/students?id=...     — update one student
 * DELETE /api/admin/students?id=...     — remove one student (their reports go too)
 */
export async function GET(req: NextRequest) {
  if (!(await isAdminRequest(req))) return adminRequired();
  if (!isServiceSupabaseConfigured()) return supabaseNotConfigured();
  const supabase = getServiceSupabase();
  if (!supabase) return supabaseNotConfigured();
  const { data, error } = await supabase
    .from("students")
    .select("id, name, order_no, active")
    .order("order_no", { ascending: true });
  if (error) return jsonError("Could not load students.", 500);
  return NextResponse.json({ students: data ?? [] });
}

export async function POST(req: NextRequest) {
  if (!(await isAdminRequest(req))) return adminRequired();
  if (!isServiceSupabaseConfigured()) return supabaseNotConfigured();
  const supabase = getServiceSupabase();
  if (!supabase) return supabaseNotConfigured();
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("Request body must be valid JSON.", 400);
  }
  const result = validateStudentInput(body);
  if (!result.ok || !result.data) return jsonError(result.error ?? "Invalid student.", 400);
  const { data, error } = await supabase
    .from("students")
    .insert(result.data)
    .select()
    .single();
  if (error) {
    // Most likely a duplicate order_no.
    return jsonError("Could not add the student. That order number may already be used.", 500);
  }
  return NextResponse.json({ student: data }, { status: 201 });
}

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
  const result = validateStudentInput(body);
  if (!result.ok || !result.data) return jsonError(result.error ?? "Invalid student.", 400);
  const { data, error } = await supabase
    .from("students")
    .update(result.data)
    .eq("id", id)
    .select()
    .single();
  if (error) return jsonError("Could not update the student.", 500);
  return NextResponse.json({ student: data });
}

export async function DELETE(req: NextRequest) {
  if (!(await isAdminRequest(req))) return adminRequired();
  if (!isServiceSupabaseConfigured()) return supabaseNotConfigured();
  const supabase = getServiceSupabase();
  if (!supabase) return supabaseNotConfigured();
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return jsonError("Missing ?id=.", 400);
  const { error } = await supabase.from("students").delete().eq("id", id);
  if (error) return jsonError("Could not delete the student.", 500);
  return NextResponse.json({ ok: true });
}

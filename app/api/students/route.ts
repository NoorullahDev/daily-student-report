import { NextResponse, type NextRequest } from "next/server";
import { getServerSupabase, isServerSupabaseConfigured } from "@/lib/supabase/server";
import { jsonError, supabaseNotConfigured } from "@/lib/http";

/** GET /api/students — active students, ordered by order_no (public form dropdown). */
export async function GET() {
  if (!isServerSupabaseConfigured()) return supabaseNotConfigured();
  const supabase = getServerSupabase();
  if (!supabase) return supabaseNotConfigured();
  const { data, error } = await supabase
    .from("students")
    .select("id, name, order_no, active")
    .eq("active", true)
    .order("order_no", { ascending: true });
  if (error) return jsonError("Could not load students.", 500);
  return NextResponse.json({ students: data ?? [] });
}

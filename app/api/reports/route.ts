import { NextResponse, type NextRequest } from "next/server";
import { getServerSupabase, isServerSupabaseConfigured } from "@/lib/supabase/server";
import { jsonError, supabaseNotConfigured } from "@/lib/http";
import { validateReportInput } from "@/lib/validation";
import { isValidDateString } from "@/lib/time";

/**
 * GET /api/reports?date=YYYY-MM-DD[&student_id=...] — reports for one day.
 * GET /api/reports?from=YYYY-MM-DD&to=YYYY-MM-DD — reports in a date range
 * (used by the weekly summary). Returns JSON { reports: [...] }.
 */
export async function GET(req: NextRequest) {
  if (!isServerSupabaseConfigured()) return supabaseNotConfigured();
  const supabase = getServerSupabase();
  if (!supabase) return supabaseNotConfigured();

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const studentId = searchParams.get("student_id");

  let query = supabase.from("reports").select("*").order("date", { ascending: true });
  if (date) {
    if (!isValidDateString(date)) return jsonError("date must be YYYY-MM-DD.", 400);
    query = query.eq("date", date);
  } else if (from && to) {
    if (!isValidDateString(from) || !isValidDateString(to)) {
      return jsonError("from and to must be YYYY-MM-DD.", 400);
    }
    query = query.gte("date", from).lte("date", to);
  } else {
    return jsonError("Provide ?date=YYYY-MM-DD or ?from=...&to=....", 400);
  }
  if (studentId) query = query.eq("student_id", studentId);

  const { data, error } = await query;
  if (error) return jsonError("Could not load reports.", 500);
  return NextResponse.json({ reports: data ?? [] });
}

/**
 * POST /api/reports — submit (or resubmit) a daily report.
 * Upserts on the UNIQUE(student_id, date) constraint, so a second submit
 * for the same student and date updates the old row instead of duplicating it.
 */
export async function POST(req: NextRequest) {
  if (!isServerSupabaseConfigured()) return supabaseNotConfigured();
  const supabase = getServerSupabase();
  if (!supabase) return supabaseNotConfigured();

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
    .upsert(result.data, { onConflict: "student_id,date" })
    .select()
    .single();
  if (error) return jsonError("Could not save the report. Please try again.", 500);
  return NextResponse.json({ report: data });
}

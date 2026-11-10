import { NextResponse, type NextRequest } from "next/server";
import {
  getServerSupabase,
  getServiceSupabase,
  isServerSupabaseConfigured,
  isServiceSupabaseConfigured,
} from "@/lib/supabase/server";
import {
  adminRequired,
  isAdminRequest,
  jsonError,
  supabaseNotConfigured,
} from "@/lib/http";
import { DEFAULT_THRESHOLDS, mergeThresholds, type Thresholds } from "@/lib/report-config";

/**
 * Admin thresholds API.
 * GET /api/admin/settings — merged thresholds (stored overrides over defaults)
 * PUT /api/admin/settings — { thresholds: Partial<Thresholds> } saved to
 *                          report_settings row id=1 (upsert).
 * Values are validated against sane ranges before saving.
 */
export async function GET(req: NextRequest) {
  if (!(await isAdminRequest(req))) return adminRequired();
  if (!isServerSupabaseConfigured()) return supabaseNotConfigured();
  const supabase = getServerSupabase();
  if (!supabase) return supabaseNotConfigured();
  const { data, error } = await supabase
    .from("report_settings")
    .select("thresholds")
    .eq("id", 1)
    .maybeSingle();
  if (error) return jsonError("Could not load settings.", 500);
  const thresholds = mergeThresholds((data?.thresholds as Partial<Thresholds> | null) ?? null);
  return NextResponse.json({ thresholds, defaults: DEFAULT_THRESHOLDS });
}

function isValidThresholds(t: unknown): t is Partial<Thresholds> {
  if (!t || typeof t !== "object") return false;
  const o = t as Record<string, Record<string, unknown>>;
  const checkMin = (v: unknown, max: number) =>
    v === undefined || (typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= max);
  const checkLitres = (v: unknown) =>
    v === undefined || (typeof v === "number" && v >= 0 && v <= 20);
  const checkCount = (v: unknown) =>
    v === undefined || (typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= 50);
  return (
    (!o.study || (checkMin(o.study.greenMin, 1440) && checkMin(o.study.yellowMin, 1440))) &&
    (!o.sleep || (checkMin(o.sleep.greenMin, 1440) && checkMin(o.sleep.yellowMin, 1440))) &&
    (!o.fun || (checkMin(o.fun.greenMax, 1440) && checkMin(o.fun.yellowMax, 1440))) &&
    (!o.exercise || (checkMin(o.exercise.greenMin, 1440) && checkMin(o.exercise.yellowMin, 1440))) &&
    (!o.water || (checkLitres(o.water.greenL) && checkLitres(o.water.yellowL))) &&
    (!o.subjects || (checkCount(o.subjects.greenCount) && checkCount(o.subjects.yellowCount)))
  );
}

export async function PUT(req: NextRequest) {
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
  const thresholds = (body as Record<string, unknown>)?.thresholds;
  if (!isValidThresholds(thresholds)) {
    return jsonError("Thresholds are invalid. Use whole minutes (0–1440), litres (0–20) or counts (0–50).", 400);
  }
  // Merge with the stored overrides so a partial save never drops other keys.
  const { data: existing } = await supabase
    .from("report_settings")
    .select("thresholds")
    .eq("id", 1)
    .maybeSingle();
  const merged = mergeThresholds({
    ...((existing?.thresholds as Partial<Thresholds> | null) ?? {}),
    ...(thresholds as Partial<Thresholds>),
  });
  const { error } = await supabase
    .from("report_settings")
    .upsert({ id: 1, thresholds: merged, updated_at: new Date().toISOString() });
  if (error) return jsonError("Could not save settings.", 500);
  return NextResponse.json({ thresholds: merged });
}

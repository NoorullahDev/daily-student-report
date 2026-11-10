/**
 * Server-side validation for report payloads.
 * Rules: no negative values, each time field <= 1440 min (24h),
 * water 0–20 L, subjects count 0–50, text fields capped in length.
 */
import { isValidDateString } from "./time";
import type { ReportInput } from "./types";

const MAX_MIN = 24 * 60; // 1440
const MAX_TEXT = 500;

function isIntInRange(v: unknown, max: number): v is number {
  return typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= max;
}

function isText(v: unknown): v is string {
  return typeof v === "string" && v.length <= MAX_TEXT;
}

export interface ValidationResult {
  ok: boolean;
  error?: string;
  data?: ReportInput;
}

/** Validate an unknown JSON body as a report upsert payload. */
export function validateReportInput(body: unknown): ValidationResult {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Request body must be a JSON object." };
  }
  const b = body as Record<string, unknown>;

  if (typeof b.student_id !== "string" || b.student_id.trim() === "") {
    return { ok: false, error: "student_id is required." };
  }
  if (typeof b.date !== "string" || !isValidDateString(b.date)) {
    return { ok: false, error: "date must be YYYY-MM-DD." };
  }

  const minFields = [
    "school_min",
    "study_min",
    "sleep_min",
    "fun_min",
    "exercise_min",
    "other_min",
    "habit_min",
    "screen_min",
  ] as const;
  for (const f of minFields) {
    if (!isIntInRange(b[f], MAX_MIN)) {
      return { ok: false, error: `${f} must be a whole number of minutes from 0 to 1440.` };
    }
  }
  if (!isIntInRange(b.subjects_count, 50)) {
    return { ok: false, error: "subjects_count must be a whole number from 0 to 50." };
  }
  if (
    typeof b.water_l !== "number" ||
    Number.isNaN(b.water_l) ||
    b.water_l < 0 ||
    b.water_l > 20
  ) {
    return { ok: false, error: "water_l must be a number from 0 to 20 litres." };
  }
  for (const f of ["subjects_text", "fun_text", "other_text", "habit_text"] as const) {
    if (b[f] !== undefined && !isText(b[f])) {
      return { ok: false, error: `${f} must be text of at most ${MAX_TEXT} characters.` };
    }
  }

  return {
    ok: true,
    data: {
      student_id: b.student_id as string,
      date: b.date as string,
      school_min: b.school_min as number,
      study_min: b.study_min as number,
      subjects_count: b.subjects_count as number,
      subjects_text: (b.subjects_text as string | undefined) ?? "",
      sleep_min: b.sleep_min as number,
      fun_text: (b.fun_text as string | undefined) ?? "",
      fun_min: b.fun_min as number,
      exercise_min: b.exercise_min as number,
      water_l: b.water_l as number,
      other_text: (b.other_text as string | undefined) ?? "",
      other_min: b.other_min as number,
      habit_text: (b.habit_text as string | undefined) ?? "",
      habit_min: b.habit_min as number,
      screen_min: b.screen_min as number,
    },
  };
}

/** Validate a student roster payload (admin). */
export function validateStudentInput(body: unknown): {
  ok: boolean;
  error?: string;
  data?: { name: string; order_no: number; active: boolean };
} {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Request body must be a JSON object." };
  }
  const b = body as Record<string, unknown>;
  if (typeof b.name !== "string" || b.name.trim() === "" || b.name.trim().length > 100) {
    return { ok: false, error: "name is required (max 100 characters)." };
  }
  if (typeof b.order_no !== "number" || !Number.isInteger(b.order_no) || b.order_no < 1 || b.order_no > 9999) {
    return { ok: false, error: "order_no must be a whole number from 1 to 9999." };
  }
  if (b.active !== undefined && typeof b.active !== "boolean") {
    return { ok: false, error: "active must be true or false." };
  }
  return {
    ok: true,
    data: {
      name: (b.name as string).trim(),
      order_no: b.order_no as number,
      active: (b.active as boolean | undefined) ?? true,
    },
  };
}

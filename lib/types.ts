/** Shared row shapes for students and daily reports. */

export interface Student {
  id: string;
  name: string;
  order_no: number;
  active: boolean;
  created_at?: string;
}

/** One row of the `reports` table. All times are minutes (water is litres). */
export interface ReportRow {
  id: string;
  student_id: string;
  date: string; // YYYY-MM-DD
  school_min: number;
  study_min: number;
  subjects_count: number;
  subjects_text: string;
  sleep_min: number;
  fun_text: string;
  fun_min: number;
  exercise_min: number;
  water_l: number;
  other_text: string;
  other_min: number;
  habit_text: string;
  habit_min: number;
  screen_min: number;
  created_at?: string;
}

/** Payload a client sends when creating/updating a report. */
export type ReportInput = Omit<ReportRow, "id" | "created_at">;

/** Empty report values (all zeroes / blank text) for a fresh form. */
export function emptyReportInput(student_id: string, date: string): ReportInput {
  return {
    student_id,
    date,
    school_min: 0,
    study_min: 0,
    subjects_count: 0,
    subjects_text: "",
    sleep_min: 0,
    fun_text: "",
    fun_min: 0,
    exercise_min: 0,
    water_l: 0,
    other_text: "",
    other_min: 0,
    habit_text: "",
    habit_min: 0,
    screen_min: 0,
  };
}

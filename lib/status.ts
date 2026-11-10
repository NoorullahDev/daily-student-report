/**
 * Status-colour and 24-hour-total logic.
 * Everything is computed in code from `lib/report-config.ts` — never in the DB.
 */
import type { CSSProperties } from "react";
import {
  COLOURS,
  DAY_MIN,
  DEFAULT_THRESHOLDS,
  TOTAL_TOLERANCE_MIN,
  type Status,
  type Thresholds,
} from "./report-config";
import type { ReportRow } from "./types";

export type { Status };

/** Minutes that count towards the 24-hour day.
 *  Screen time and water are NOT included (screen time overlaps with fun time). */
export function totalMinutes(r: {
  school_min: number;
  study_min: number;
  sleep_min: number;
  fun_min: number;
  exercise_min: number;
  other_min: number;
  habit_min: number;
}): number {
  return (
    r.school_min +
    r.study_min +
    r.sleep_min +
    r.fun_min +
    r.exercise_min +
    r.other_min +
    r.habit_min
  );
}

export type StatusField =
  | "study"
  | "subjects"
  | "sleep"
  | "fun"
  | "exercise"
  | "water";

/** Status for one metric, given its raw value. */
export function statusFor(
  field: StatusField,
  value: number,
  thresholds: Thresholds = DEFAULT_THRESHOLDS,
): Status {
  switch (field) {
    case "study":
      return value >= thresholds.study.greenMin
        ? "green"
        : value >= thresholds.study.yellowMin
          ? "yellow"
          : "red";
    case "subjects":
      return value >= thresholds.subjects.greenCount
        ? "green"
        : value >= thresholds.subjects.yellowCount
          ? "yellow"
          : "red";
    case "sleep":
      return value >= thresholds.sleep.greenMin
        ? "green"
        : value >= thresholds.sleep.yellowMin
          ? "yellow"
          : "red";
    case "fun":
      return value <= thresholds.fun.greenMax
        ? "green"
        : value <= thresholds.fun.yellowMax
          ? "yellow"
          : "red";
    case "exercise":
      // Empty (0) is red by design.
      return value >= thresholds.exercise.greenMin
        ? "green"
        : value >= thresholds.exercise.yellowMin
          ? "yellow"
          : "red";
    case "water":
      return value >= thresholds.water.greenL
        ? "green"
        : value >= thresholds.water.yellowL
          ? "yellow"
          : "red";
  }
}

/** All statuses for one report row. */
export function statusesForReport(
  r: ReportRow,
  thresholds: Thresholds = DEFAULT_THRESHOLDS,
): Record<StatusField, Status> {
  return {
    study: statusFor("study", r.study_min, thresholds),
    subjects: statusFor("subjects", r.subjects_count, thresholds),
    sleep: statusFor("sleep", r.sleep_min, thresholds),
    fun: statusFor("fun", r.fun_min, thresholds),
    exercise: statusFor("exercise", r.exercise_min, thresholds),
    water: statusFor("water", Number(r.water_l), thresholds),
  };
}

export interface TotalCheck {
  totalMin: number;
  /** True when |total - 1440| <= tolerance (5 min). */
  complete: boolean;
  /** Display text, e.g. "24 hrs Complete" or "22 hrs 30m / 1 hrs 30m missing". */
  text: string;
}

/** The 24-hour check for a total (in minutes). */
export function totalCheck(totalMin: number): TotalCheck {
  const diff = totalMin - DAY_MIN;
  if (Math.abs(diff) <= TOTAL_TOLERANCE_MIN) {
    return { totalMin, complete: true, text: "24 hrs Complete" };
  }
  const fmt = (m: number) => {
    const h = Math.floor(m / 60);
    const mm = m % 60;
    return mm === 0 ? `${h} hrs` : `${h} hrs ${mm}m`;
  };
  if (diff < 0) {
    return {
      totalMin,
      complete: false,
      text: `${fmt(totalMin)} / ${fmt(-diff)} missing`,
    };
  }
  return {
    totalMin,
    complete: false,
    text: `${fmt(totalMin)} / over by ${fmt(diff)}`,
  };
}

/** Background/text colours for a status cell (inline-style friendly). */
export function statusStyle(status: Status): CSSProperties {
  if (status === "neutral") return {};
  if (status === "yellow") {
    return { backgroundColor: COLOURS.yellow, color: COLOURS.onYellow };
  }
  return {
    backgroundColor: status === "green" ? COLOURS.green : COLOURS.red,
    color: COLOURS.onColour,
  };
}

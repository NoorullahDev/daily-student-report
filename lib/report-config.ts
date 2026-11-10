/**
 * ONE editable config file for every status-colour rule in the app.
 *
 * All thresholds are in MINUTES (water in LITRES). The admin settings page
 * (/admin/settings) lets the admin override these values at runtime; those
 * overrides are stored in the `report_settings` table and merged OVER these
 * defaults. If Supabase is not configured, the app falls back to this file.
 *
 * Rules (from the spec):
 * - Study:    green >= 7h (420m), yellow 4h–<7h (240–419m), red < 4h
 * - Subjects: green >= 2, yellow 1, red 0
 * - Sleep:    green >= 8h (480m), yellow 6h–<8h (360–479m), red < 6h
 * - Fun:      green <= 2h (120m), yellow > 2h–3h (121–180m), red > 3h
 * - Exercise: green >= 30m, yellow 15–29m, red < 15m (empty = 0 = red)
 * - Water:    green >= 3L, yellow 1.5–<3L, red < 1.5L
 * - School, Other Activities, Habit Development, Phone Screen Time: neutral
 */

export const COLOURS = {
  green: "#22c55e",
  yellow: "#fcd34d",
  red: "#ef4444",
  /** Text colour on green/red cells (white). Yellow cells use dark text. */
  onColour: "#ffffff",
  onYellow: "#1e293b",
  navy: "#0f2040",
} as const;

export type Status = "green" | "yellow" | "red" | "neutral";

/** Thresholds for one metric. `greenMin`/`yellowMin` are "at least this much"
 *  cut-offs; `greenMax`/`yellowMax` are "at most this much" cut-offs. */
export interface Thresholds {
  study: { greenMin: number; yellowMin: number };
  subjects: { greenCount: number; yellowCount: number };
  sleep: { greenMin: number; yellowMin: number };
  fun: { greenMax: number; yellowMax: number };
  exercise: { greenMin: number; yellowMin: number };
  water: { greenL: number; yellowL: number };
}

export const DEFAULT_THRESHOLDS: Thresholds = {
  study: { greenMin: 420, yellowMin: 240 }, // 7h / 4h
  subjects: { greenCount: 2, yellowCount: 1 },
  sleep: { greenMin: 480, yellowMin: 360 }, // 8h / 6h
  fun: { greenMax: 120, yellowMax: 180 }, // 2h / 3h
  exercise: { greenMin: 30, yellowMin: 15 },
  water: { greenL: 3, yellowL: 1.5 },
};

/** Total-24h check tolerance: within this many minutes of 1440 counts as complete. */
export const TOTAL_TOLERANCE_MIN = 5;

/** A full day in minutes. */
export const DAY_MIN = 24 * 60; // 1440

/** Deep-merge stored overrides over the defaults (partial JSON is allowed). */
export function mergeThresholds(overrides: Partial<Thresholds> | null | undefined): Thresholds {
  if (!overrides) return DEFAULT_THRESHOLDS;
  return {
    study: { ...DEFAULT_THRESHOLDS.study, ...(overrides.study ?? {}) },
    subjects: { ...DEFAULT_THRESHOLDS.subjects, ...(overrides.subjects ?? {}) },
    sleep: { ...DEFAULT_THRESHOLDS.sleep, ...(overrides.sleep ?? {}) },
    fun: { ...DEFAULT_THRESHOLDS.fun, ...(overrides.fun ?? {}) },
    exercise: { ...DEFAULT_THRESHOLDS.exercise, ...(overrides.exercise ?? {}) },
    water: { ...DEFAULT_THRESHOLDS.water, ...(overrides.water ?? {}) },
  };
}

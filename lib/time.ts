/** Small date / duration helpers. All dates are plain "YYYY-MM-DD" strings. */

/** Today's date in the browser/server local timezone (not UTC). */
export function todayLocal(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** "YYYY-MM-DD" — strict shape check only. */
export function isValidDateString(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00`);
  return !Number.isNaN(d.getTime()) && toDateString(d) === s;
}

export function toDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Add (or subtract) whole days to a YYYY-MM-DD string. */
export function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + days);
  return toDateString(d);
}

/** Format minutes as "7h 30m", "45m" or "0m". */
export function formatMinutes(min: number): string {
  const m = Math.max(0, Math.round(min));
  if (m === 0) return "0m";
  const h = Math.floor(m / 60);
  const rest = m % 60;
  if (h === 0) return `${rest}m`;
  return rest === 0 ? `${h}h` : `${h}h ${rest}m`;
}

/** Format minutes as "7h 30m" but with "hrs" wording used in the 24h check. */
export function formatHoursLong(min: number): string {
  const m = Math.max(0, Math.round(min));
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest === 0 ? `${h} hrs` : `${h} hrs ${rest}m`;
}

/** Water in litres, e.g. 3 -> "3 L", 2.5 -> "2.5 L". */
export function formatWater(l: number): string {
  const n = Number(l) || 0;
  return `${Number(n.toFixed(2))} L`;
}

/** "2026-11-09" -> "Mon, 9 Nov 2026" (local timezone). */
export function formatDateLong(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

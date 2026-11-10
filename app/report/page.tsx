"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import TimeInput from "@/components/TimeInput";
import SetupNotice from "@/components/SetupNotice";
import { DEFAULT_THRESHOLDS } from "@/lib/report-config";
import { statusesForReport, totalCheck, totalMinutes } from "@/lib/status";
import { isValidDateString, todayLocal } from "@/lib/time";
import { emptyReportInput, type ReportInput, type ReportRow, type Student } from "@/lib/types";

/**
 * Public student form (/report).
 * - Date defaults to today (editable). Student dropdown from the active roster.
 * - Time fields use the Hours + Minutes TimeInput (empty = 0).
 * - Live "Total 24h" updates as the student types.
 * - One entry per student per date: resubmitting upserts the old row, and if
 *   the student already submitted for the chosen date the form preloads it.
 * - If Supabase is not configured, a setup notice is shown instead of crashing.
 */
function ReportForm() {
  const searchParams = useSearchParams();
  const dateParam = searchParams.get("date");

  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [notConfigured, setNotConfigured] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [date, setDate] = useState(() =>
    dateParam && isValidDateString(dateParam) ? dateParam : todayLocal(),
  );
  const [studentId, setStudentId] = useState("");
  const [form, setForm] = useState<ReportInput>(() => emptyReportInput("", todayLocal()));
  const [existingId, setExistingId] = useState<string | null>(null);
  const [loadingEntry, setLoadingEntry] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saved, setSaved] = useState<ReportRow | null>(null);

  // Load the active roster once.
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/students");
        const json = await res.json();
        if (res.status === 503) {
          setNotConfigured(true);
          return;
        }
        if (!res.ok) {
          setLoadError(json.error ?? "Could not load the student list.");
          return;
        }
        setStudents(json.students ?? []);
      } catch {
        setLoadError("Could not load the student list. Check your connection and try again.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Preload the student's existing entry for the chosen date (if any).
  const loadEntry = useCallback(async (sid: string, d: string) => {
    if (!sid || !isValidDateString(d)) {
      setForm((f) => emptyReportInput(sid, d));
      setExistingId(null);
      return;
    }
    setLoadingEntry(true);
    try {
      const res = await fetch(`/api/reports?date=${d}&student_id=${encodeURIComponent(sid)}`);
      const json = await res.json();
      const row: ReportRow | undefined = res.ok ? json.reports?.[0] : undefined;
      if (row) {
        setExistingId(row.id);
        setForm({
          student_id: row.student_id,
          date: row.date,
          school_min: row.school_min,
          study_min: row.study_min,
          subjects_count: row.subjects_count,
          subjects_text: row.subjects_text ?? "",
          sleep_min: row.sleep_min,
          fun_text: row.fun_text ?? "",
          fun_min: row.fun_min,
          exercise_min: row.exercise_min,
          water_l: Number(row.water_l),
          other_text: row.other_text ?? "",
          other_min: row.other_min,
          habit_text: row.habit_text ?? "",
          habit_min: row.habit_min,
          screen_min: row.screen_min,
        });
      } else {
        setExistingId(null);
        setForm(emptyReportInput(sid, d));
      }
    } catch {
      setExistingId(null);
      setForm(emptyReportInput(sid, d));
    } finally {
      setLoadingEntry(false);
    }
  }, []);

  useEffect(() => {
    setSaved(null);
    setSubmitError(null);
    loadEntry(studentId, date);
  }, [studentId, date, loadEntry]);

  const total = useMemo(() => totalMinutes(form), [form]);
  const check = useMemo(() => totalCheck(total), [total]);
  const statuses = useMemo(
    () => (saved ? statusesForReport(saved, DEFAULT_THRESHOLDS) : null),
    [saved],
  );

  const set = <K extends keyof ReportInput>(key: K, value: ReportInput[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    setSaved(null);
    if (!studentId) {
      setSubmitError("Please pick your name first.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, student_id: studentId, date }),
      });
      const json = await res.json();
      if (!res.ok) {
        setSubmitError(json.error ?? "Could not save your report. Please try again.");
        return;
      }
      setSaved(json.report as ReportRow);
      setExistingId(json.report.id);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setSubmitError("Could not save your report. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const inputCls =
    "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-sky-600 focus:outline-none focus:ring-1 focus:ring-sky-600";
  const sectionCls = "rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5";
  const labelCls = "mb-1 block text-sm font-medium text-slate-700";

  if (loading) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-10">
        <p className="text-sm text-slate-600">Loading…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 sm:py-10">
      <div className="rounded-2xl bg-navy px-5 py-6 text-white shadow">
        <h1 className="text-xl font-bold tracking-wide sm:text-2xl">
          DAILY STUDENT HABIT &amp; TIME REPORT
        </h1>
        <p className="mt-1 text-sm text-white/80">
          Fill in how you spent your day. Your hours must add up to 24 hours in total.
        </p>
      </div>

      {notConfigured ? (
        <div className="mt-6">
          <SetupNotice />
        </div>
      ) : (
        <>
          {loadError && (
            <p className="mt-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800">
              {loadError}
            </p>
          )}

          {saved && statuses && (
            <div className="mt-6 rounded-xl border border-green-300 bg-green-50 p-4 shadow-sm">
              <p className="font-semibold text-green-900">
                {existingId ? "Report updated!" : "Report saved!"} Thank you — your report for{" "}
                {saved.date} is in.
              </p>
              <p className="mt-1 text-sm text-green-800">
                Total: <strong>{totalCheck(totalMinutes(saved)).text}</strong>
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium">
                {(
                  [
                    ["Study", statuses.study],
                    ["Subjects", statuses.subjects],
                    ["Sleep", statuses.sleep],
                    ["Fun", statuses.fun],
                    ["Exercise", statuses.exercise],
                    ["Water", statuses.water],
                  ] as const
                ).map(([label, st]) => (
                  <span
                    key={label}
                    className="rounded-full px-2.5 py-1"
                    style={{
                      backgroundColor:
                        st === "green" ? "#22c55e" : st === "yellow" ? "#fcd34d" : "#ef4444",
                      color: st === "yellow" ? "#1e293b" : "#ffffff",
                    }}
                  >
                    {label}: {st}
                  </span>
                ))}
              </div>
              <p className="mt-3 text-sm">
                <Link href="/" className="font-medium text-green-800 underline">
                  Back to home
                </Link>
              </p>
            </div>
          )}

          <form onSubmit={submit} className="mt-6 space-y-4">
            {/* Student + date */}
            <section className={sectionCls}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="student" className={labelCls}>
                    Your name
                  </label>
                  {students.length === 0 ? (
                    <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                      No students yet — ask the admin to add the roster first.
                    </p>
                  ) : (
                    <select
                      id="student"
                      className={inputCls}
                      value={studentId}
                      onChange={(e) => setStudentId(e.target.value)}
                      required
                    >
                      <option value="">— Pick your name —</option>
                      {students.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <div>
                  <label htmlFor="date" className={labelCls}>
                    Date
                  </label>
                  <input
                    id="date"
                    type="date"
                    className={inputCls}
                    value={date}
                    max={todayLocal()}
                    onChange={(e) => {
                      if (isValidDateString(e.target.value)) setDate(e.target.value);
                    }}
                    required
                  />
                </div>
              </div>
              {loadingEntry && (
                <p className="mt-2 text-xs text-slate-500">Checking your earlier report…</p>
              )}
              {existingId && !saved && (
                <p className="mt-2 rounded-md bg-sky-50 px-3 py-2 text-xs text-sky-800">
                  You already submitted for this date — your old answers are loaded below. Change
                  anything and submit again to update them.
                </p>
              )}
            </section>

            {/* Live total — shown before submit, updates as they type */}
            <div
              className={`rounded-xl border p-4 text-center shadow-sm ${
                check.complete
                  ? "border-green-300 bg-green-50 text-green-900"
                  : "border-red-300 bg-red-50 text-red-900"
              }`}
              aria-live="polite"
            >
              <p className="text-xs font-medium uppercase tracking-wide opacity-70">
                Total 24h (live)
              </p>
              <p className="mt-1 text-lg font-bold">
                {check.complete ? "✓ " : ""}
                {check.text}
              </p>
              <p className="mt-1 text-xs opacity-80">
                School + Study + Sleep + Fun + Exercise + Other + Habit. Screen time and water are
                not counted in the total (screen time overlaps with fun time).
              </p>
            </div>

            {/* Times */}
            <section className={sectionCls}>
              <h2 className="mb-3 font-semibold text-slate-900">Your day</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <TimeInput label="School time" id="school" value={form.school_min} onChange={(v) => set("school_min", v)} />
                <TimeInput label="Study at home" id="study" value={form.study_min} onChange={(v) => set("study_min", v)} />
                <TimeInput label="Sleep" id="sleep" value={form.sleep_min} onChange={(v) => set("sleep_min", v)} />
                <TimeInput label="Exercise / Sports" id="exercise" value={form.exercise_min} onChange={(v) => set("exercise_min", v)} />
                <TimeInput label="Phone Screen Time" id="screen" value={form.screen_min} onChange={(v) => set("screen_min", v)} />
                <div>
                  <label htmlFor="water" className={labelCls}>
                    Water (litres)
                  </label>
                  <input
                    id="water"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    max={20}
                    step={0.1}
                    placeholder="0"
                    className={inputCls}
                    value={form.water_l === 0 ? "" : String(form.water_l)}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      set("water_l", Number.isNaN(v) ? 0 : Math.min(20, Math.max(0, v)));
                    }}
                  />
                  <span className="mt-0.5 block text-xs text-slate-500">
                    Aim for 3 litres or more (green).
                  </span>
                </div>
              </div>
            </section>

            {/* Subjects */}
            <section className={sectionCls}>
              <h2 className="mb-3 font-semibold text-slate-900">Subjects</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="subjects_count" className={labelCls}>
                    How many subjects did you study?
                  </label>
                  <input
                    id="subjects_count"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={50}
                    placeholder="0"
                    className={inputCls}
                    value={form.subjects_count === 0 ? "" : String(form.subjects_count)}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      set("subjects_count", Number.isNaN(v) ? 0 : Math.min(50, Math.max(0, v)));
                    }}
                  />
                </div>
                <div>
                  <label htmlFor="subjects_text" className={labelCls}>
                    Subject names
                  </label>
                  <input
                    id="subjects_text"
                    type="text"
                    placeholder="e.g. Maths, English, Physics"
                    className={inputCls}
                    value={form.subjects_text}
                    maxLength={500}
                    onChange={(e) => set("subjects_text", e.target.value)}
                  />
                </div>
              </div>
            </section>

            {/* Fun time */}
            <section className={sectionCls}>
              <h2 className="mb-3 font-semibold text-slate-900">Fun time</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="fun_text" className={labelCls}>
                    What did you do for fun?
                  </label>
                  <input
                    id="fun_text"
                    type="text"
                    placeholder="e.g. Played cricket, watched TV"
                    className={inputCls}
                    value={form.fun_text}
                    maxLength={500}
                    onChange={(e) => set("fun_text", e.target.value)}
                  />
                </div>
                <TimeInput label="Fun time" id="fun" value={form.fun_min} onChange={(v) => set("fun_min", v)} />
              </div>
            </section>

            {/* Other + habit */}
            <section className={sectionCls}>
              <h2 className="mb-3 font-semibold text-slate-900">Other activities &amp; habit development</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="other_text" className={labelCls}>
                    Other activity name
                  </label>
                  <input
                    id="other_text"
                    type="text"
                    placeholder="e.g. Helped at home, tuition"
                    className={inputCls}
                    value={form.other_text}
                    maxLength={500}
                    onChange={(e) => set("other_text", e.target.value)}
                  />
                </div>
                <TimeInput label="Other activities time" id="other" value={form.other_min} onChange={(v) => set("other_min", v)} />
                <div>
                  <label htmlFor="habit_text" className={labelCls}>
                    Habit you worked on
                  </label>
                  <input
                    id="habit_text"
                    type="text"
                    placeholder="e.g. Reading, prayer, early wake-up"
                    className={inputCls}
                    value={form.habit_text}
                    maxLength={500}
                    onChange={(e) => set("habit_text", e.target.value)}
                  />
                </div>
                <TimeInput label="Habit development time" id="habit" value={form.habit_min} onChange={(v) => set("habit_min", v)} />
              </div>
            </section>

            {submitError && (
              <p className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800">
                {submitError}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting || students.length === 0 || !studentId}
              className="w-full rounded-lg bg-navy px-4 py-3 text-base font-semibold text-white hover:bg-[#16305e] disabled:opacity-50"
            >
              {submitting ? "Saving…" : existingId ? "Update my report" : "Submit my report"}
            </button>
            <p className="text-center text-xs text-slate-500">
              One report per student per day — submitting again updates your earlier report.
            </p>
          </form>
        </>
      )}
    </main>
  );
}

/** useSearchParams() needs a Suspense boundary for static prerendering. */
export default function ReportPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-2xl px-4 py-10">
          <p className="text-sm text-slate-600">Loading…</p>
        </main>
      }
    >
      <ReportForm />
    </Suspense>
  );
}

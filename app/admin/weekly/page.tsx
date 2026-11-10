"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AdminNav from "@/components/AdminNav";
import SetupNotice from "@/components/SetupNotice";
import { DEFAULT_THRESHOLDS, type Thresholds } from "@/lib/report-config";
import { statusFor } from "@/lib/status";
import { addDays, formatMinutes, formatWater, isValidDateString, todayLocal } from "@/lib/time";
import type { ReportRow, Student } from "@/lib/types";

/**
 * Weekly summary (/admin/weekly): pick a week-ending date; for the 7 days
 * ending on that date, each student gets one row:
 * - days submitted (out of 7)
 * - average per day: school, study, sleep, fun, exercise, water
 * - counts of green / yellow / red days for Study, Sleep and Exercise.
 *
 * A "green/yellow/red day" means that day's value for that metric falls in
 * that colour by the current thresholds. Days not submitted are excluded
 * from averages and from the colour counts.
 */
export default function WeeklyPage() {
  const [endDate, setEndDate] = useState(todayLocal());
  const [students, setStudents] = useState<Student[]>([]);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [thresholds, setThresholds] = useState<Thresholds>(DEFAULT_THRESHOLDS);
  const [loading, setLoading] = useState(true);
  const [notConfigured, setNotConfigured] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startDate = useMemo(() => addDays(endDate, -6), [endDate]);

  const loadAll = useCallback(async (from: string, to: string) => {
    setLoading(true);
    setError(null);
    try {
      const [studentsRes, reportsRes, settingsRes] = await Promise.all([
        fetch("/api/admin/students"),
        fetch(`/api/reports?from=${from}&to=${to}`),
        fetch("/api/admin/settings"),
      ]);
      if (studentsRes.status === 503 || reportsRes.status === 503) {
        setNotConfigured(true);
        return;
      }
      if (studentsRes.status === 401) {
        window.location.href = "/admin/login";
        return;
      }
      const studentsJson = await studentsRes.json();
      const reportsJson = await reportsRes.json();
      if (!studentsRes.ok) throw new Error(studentsJson.error ?? "Could not load students.");
      if (!reportsRes.ok) throw new Error(reportsJson.error ?? "Could not load reports.");
      setStudents((studentsJson.students ?? []).filter((s: Student) => s.active));
      setReports(reportsJson.reports ?? []);
      if (settingsRes.ok) {
        const s = await settingsRes.json();
        if (s.thresholds) setThresholds(s.thresholds);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load the weekly summary.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isValidDateString(endDate)) loadAll(startDate, endDate);
  }, [endDate, startDate, loadAll]);

  interface StudentWeek {
    student: Student;
    submitted: number;
    avgSchool: number;
    avgStudy: number;
    avgSleep: number;
    avgFun: number;
    avgExercise: number;
    avgWater: number;
    studyCounts: { green: number; yellow: number; red: number };
    sleepCounts: { green: number; yellow: number; red: number };
    exerciseCounts: { green: number; yellow: number; red: number };
  }

  const rows: StudentWeek[] = useMemo(() => {
    const byStudent = new Map<string, ReportRow[]>();
    for (const r of reports) {
      const list = byStudent.get(r.student_id) ?? [];
      list.push(r);
      byStudent.set(r.student_id, list);
    }
    return students.map((student) => {
      const list = byStudent.get(student.id) ?? [];
      const n = list.length;
      const avg = (f: (r: ReportRow) => number) =>
        n === 0 ? 0 : list.reduce((sum, r) => sum + f(r), 0) / n;
      const counts = (field: "study" | "sleep" | "exercise", value: (r: ReportRow) => number) => {
        const c = { green: 0, yellow: 0, red: 0 };
        for (const r of list) {
          // study/sleep/exercise never return "neutral".
          const st = statusFor(field, value(r), thresholds);
          if (st !== "neutral") c[st] += 1;
        }
        return c;
      };
      return {
        student,
        submitted: n,
        avgSchool: avg((r) => r.school_min),
        avgStudy: avg((r) => r.study_min),
        avgSleep: avg((r) => r.sleep_min),
        avgFun: avg((r) => r.fun_min),
        avgExercise: avg((r) => r.exercise_min),
        avgWater: avg((r) => Number(r.water_l)),
        studyCounts: counts("study", (r) => r.study_min),
        sleepCounts: counts("sleep", (r) => r.sleep_min),
        exerciseCounts: counts("exercise", (r) => r.exercise_min),
      };
    });
  }, [students, reports, thresholds]);

  const cell = "border border-slate-300 px-2 py-2 text-center text-xs sm:text-sm align-top";
  const headCell =
    "border border-[#1e3a5f] bg-navy px-2 py-2 text-center text-xs sm:text-sm font-semibold text-white whitespace-nowrap";

  const countBadge = (c: { green: number; yellow: number; red: number }) => (
    <span className="whitespace-nowrap">
      <span className="mr-1 rounded px-1.5 py-0.5 text-xs font-semibold text-white" style={{ backgroundColor: "#22c55e" }}>
        {c.green}G
      </span>
      <span className="mr-1 rounded px-1.5 py-0.5 text-xs font-semibold" style={{ backgroundColor: "#fcd34d", color: "#1e293b" }}>
        {c.yellow}Y
      </span>
      <span className="rounded px-1.5 py-0.5 text-xs font-semibold text-white" style={{ backgroundColor: "#ef4444" }}>
        {c.red}R
      </span>
    </span>
  );

  return (
    <div className="min-h-screen">
      <AdminNav />
      <main className="mx-auto max-w-7xl px-4 py-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Weekly summary</h1>
            <p className="text-sm text-slate-600">
              7 days ending on the date you pick ({startDate} to {endDate}). Averages are per
              submitted day only; days not submitted are excluded. G/Y/R = how many submitted
              days were green / yellow / red for that metric.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="end-date" className="text-sm font-medium text-slate-700">
              Week ending
            </label>
            <input
              id="end-date"
              type="date"
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
              value={endDate}
              onChange={(e) => {
                if (isValidDateString(e.target.value)) setEndDate(e.target.value);
              }}
            />
          </div>
        </div>

        {notConfigured ? (
          <div className="mt-6">
            <SetupNotice />
          </div>
        ) : (
          <>
            {error && (
              <p className="mt-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800">
                {error}
              </p>
            )}
            <div className="mt-4 overflow-x-auto rounded-lg border border-slate-300 bg-white">
              <div className="min-w-[1000px]">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className={headCell}>#</th>
                      <th className={headCell}>Student</th>
                      <th className={headCell}>Days submitted</th>
                      <th className={headCell}>Avg school / day</th>
                      <th className={headCell}>Avg study / day</th>
                      <th className={headCell}>Avg sleep / day</th>
                      <th className={headCell}>Avg fun / day</th>
                      <th className={headCell}>Avg exercise / day</th>
                      <th className={headCell}>Avg water / day</th>
                      <th className={headCell}>Study days (G/Y/R)</th>
                      <th className={headCell}>Sleep days (G/Y/R)</th>
                      <th className={headCell}>Exercise days (G/Y/R)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td className={cell} colSpan={12}>
                          Loading…
                        </td>
                      </tr>
                    ) : rows.length === 0 ? (
                      <tr>
                        <td className={cell} colSpan={12}>
                          No students in the roster yet.
                        </td>
                      </tr>
                    ) : (
                      rows.map((row, i) => (
                        <tr key={row.student.id} className={i % 2 === 1 ? "bg-slate-50" : ""}>
                          <td className={cell}>{row.student.order_no}</td>
                          <td className={`${cell} text-left font-medium whitespace-nowrap`}>
                            {row.student.name}
                          </td>
                          <td className={cell}>
                            {row.submitted} / 7
                          </td>
                          <td className={cell}>{row.submitted ? formatMinutes(row.avgSchool) : "—"}</td>
                          <td className={cell}>{row.submitted ? formatMinutes(row.avgStudy) : "—"}</td>
                          <td className={cell}>{row.submitted ? formatMinutes(row.avgSleep) : "—"}</td>
                          <td className={cell}>{row.submitted ? formatMinutes(row.avgFun) : "—"}</td>
                          <td className={cell}>{row.submitted ? formatMinutes(row.avgExercise) : "—"}</td>
                          <td className={cell}>{row.submitted ? formatWater(row.avgWater) : "—"}</td>
                          <td className={cell}>{countBadge(row.studyCounts)}</td>
                          <td className={cell}>{countBadge(row.sleepCounts)}</td>
                          <td className={cell}>{countBadge(row.exerciseCounts)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

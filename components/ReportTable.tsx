"use client";

import { COLOURS } from "@/lib/report-config";
import { statusesForReport, statusStyle, totalCheck, totalMinutes } from "@/lib/status";
import { formatMinutes, formatWater } from "@/lib/time";
import type { Thresholds } from "@/lib/report-config";
import type { ReportRow, Student } from "@/lib/types";

/**
 * The daily report table — the same layout as the reference image:
 * dark navy header row, title + "Report date: YYYY-MM-DD" above it, and the
 * 13 columns: # | Student | School time | Study at home | Subjects | Sleep |
 * Fun time (what/time) | Exercise/Sports | Water litres | Other Activities |
 * Habit development | Phone Screen Time | Total time 24h check.
 *
 * Students who did not submit still appear as rows with empty cells.
 * Colour-coded cells use lib/status.ts (background = status colour).
 * `id="report-table-wrap"` is the capture target for the PNG export.
 */
export default function ReportTable({
  students,
  reportsByStudent,
  date,
  thresholds,
  onEdit,
  onDelete,
}: {
  students: Student[];
  reportsByStudent: Map<string, ReportRow>;
  date: string;
  thresholds: Thresholds;
  onEdit?: (report: ReportRow) => void;
  onDelete?: (report: ReportRow) => void;
}) {
  const cell = "border border-slate-300 px-2 py-2 text-center text-xs sm:text-sm align-top";
  const headCell =
    "border border-[#1e3a5f] px-2 py-2 text-center text-xs sm:text-sm font-semibold whitespace-nowrap";

  return (
    <div id="report-table-wrap" className="overflow-x-auto rounded-lg border border-slate-300 bg-white">
      <div className="min-w-[1100px]">
        <div className="bg-white px-3 pb-1 pt-3 text-center">
          <h2 className="text-base font-bold tracking-wide text-slate-900 sm:text-lg">
            DAILY STUDENT HABIT &amp; TIME REPORT
          </h2>
          <p className="text-xs text-slate-600 sm:text-sm">Report date: {date}</p>
        </div>
        <table className="w-full border-collapse">
          <thead>
            <tr style={{ backgroundColor: COLOURS.navy, color: "#ffffff" }}>
              <th className={headCell}>#</th>
              <th className={headCell}>Student</th>
              <th className={headCell}>School time</th>
              <th className={headCell}>Study at home</th>
              <th className={headCell}>Subjects</th>
              <th className={headCell}>Sleep</th>
              <th className={headCell}>Fun time (what/time)</th>
              <th className={headCell}>Exercise/Sports</th>
              <th className={headCell}>Water litres</th>
              <th className={headCell}>Other Activities</th>
              <th className={headCell}>Habit development</th>
              <th className={headCell}>Phone Screen Time</th>
              <th className={headCell}>Total time 24h check</th>
              {(onEdit || onDelete) && <th className={headCell}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {students.map((student, i) => {
              const r = reportsByStudent.get(student.id);
              if (!r) {
                return (
                  <tr key={student.id} className={i % 2 === 1 ? "bg-slate-50" : ""}>
                    <td className={cell}>{student.order_no}</td>
                    <td className={`${cell} text-left font-medium whitespace-nowrap`}>{student.name}</td>
                    <td className={cell} colSpan={10}></td>
                    <td className={cell}>
                      <span className="inline-block rounded bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600">
                        Not submitted
                      </span>
                    </td>
                    {(onEdit || onDelete) && <td className={cell}></td>}
                  </tr>
                );
              }
              const s = statusesForReport(r, thresholds);
              const check = totalCheck(totalMinutes(r));
              return (
                <tr key={student.id} className={i % 2 === 1 ? "bg-slate-50" : ""}>
                  <td className={cell}>{student.order_no}</td>
                  <td className={`${cell} text-left font-medium whitespace-nowrap`}>{student.name}</td>
                  <td className={cell}>{formatMinutes(r.school_min)}</td>
                  <td className={cell} style={statusStyle(s.study)}>
                    {formatMinutes(r.study_min)}
                  </td>
                  <td className={cell} style={statusStyle(s.subjects)}>
                    {r.subjects_count > 0 ? (
                      <>
                        <span className="font-semibold">{r.subjects_count}</span>
                        {r.subjects_text ? (
                          <span className="block text-[11px] leading-tight">{r.subjects_text}</span>
                        ) : null}
                      </>
                    ) : (
                      "0"
                    )}
                  </td>
                  <td className={cell} style={statusStyle(s.sleep)}>
                    {formatMinutes(r.sleep_min)}
                  </td>
                  <td className={cell} style={statusStyle(s.fun)}>
                    {r.fun_text ? (
                      <span className="block text-[11px] leading-tight">{r.fun_text}</span>
                    ) : null}
                    {formatMinutes(r.fun_min)}
                  </td>
                  <td className={cell} style={statusStyle(s.exercise)}>
                    {formatMinutes(r.exercise_min)}
                  </td>
                  <td className={cell} style={statusStyle(s.water)}>
                    {formatWater(Number(r.water_l))}
                  </td>
                  <td className={cell}>
                    {r.other_text ? (
                      <span className="block text-[11px] leading-tight">{r.other_text}</span>
                    ) : null}
                    {r.other_min > 0 ? formatMinutes(r.other_min) : "—"}
                  </td>
                  <td className={cell}>
                    {r.habit_text ? (
                      <span className="block text-[11px] leading-tight">{r.habit_text}</span>
                    ) : null}
                    {r.habit_min > 0 ? formatMinutes(r.habit_min) : "—"}
                  </td>
                  <td className={cell}>{formatMinutes(r.screen_min)}</td>
                  <td
                    className={`${cell} whitespace-nowrap font-medium`}
                    style={statusStyle(check.complete ? "green" : "red")}
                  >
                    {check.text}
                  </td>
                  {(onEdit || onDelete) && (
                    <td className={`${cell} whitespace-nowrap`}>
                      {onEdit && (
                        <button
                          type="button"
                          onClick={() => onEdit(r)}
                          className="mr-2 rounded bg-sky-600 px-2 py-1 text-xs font-medium text-white hover:bg-sky-700"
                        >
                          Edit
                        </button>
                      )}
                      {onDelete && (
                        <button
                          type="button"
                          onClick={() => onDelete(r)}
                          className="rounded bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700"
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
            {students.length === 0 && (
              <tr>
                <td className={cell} colSpan={(onEdit || onDelete) ? 14 : 13}>
                  No students in the roster yet. Add students from the roster section below.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

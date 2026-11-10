"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AdminNav from "@/components/AdminNav";
import ExportButtons from "@/components/ExportButtons";
import ReportTable from "@/components/ReportTable";
import SetupNotice from "@/components/SetupNotice";
import TimeInput from "@/components/TimeInput";
import { DEFAULT_THRESHOLDS, type Thresholds } from "@/lib/report-config";
import { isValidDateString, todayLocal } from "@/lib/time";
import type { ReportInput, ReportRow, Student } from "@/lib/types";

/**
 * Admin daily view (/admin): date picker, the colour-coded report table
 * (same layout as the reference image), edit/delete per entry, copy link,
 * exports, and roster management below the table.
 */
export default function AdminPage() {
  const [date, setDate] = useState(todayLocal());
  const [students, setStudents] = useState<Student[]>([]);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [thresholds, setThresholds] = useState<Thresholds>(DEFAULT_THRESHOLDS);
  const [loading, setLoading] = useState(true);
  const [notConfigured, setNotConfigured] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Edit modal state
  const [editing, setEditing] = useState<ReportRow | null>(null);
  const [editForm, setEditForm] = useState<ReportInput | null>(null);
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Roster form state
  const [newName, setNewName] = useState("");
  const [newOrder, setNewOrder] = useState("");
  const [rosterBusy, setRosterBusy] = useState(false);
  const [rosterError, setRosterError] = useState<string | null>(null);
  const [rosterEditId, setRosterEditId] = useState<string | null>(null);
  const [rosterEditName, setRosterEditName] = useState("");
  const [rosterEditOrder, setRosterEditOrder] = useState(0);
  const [rosterEditActive, setRosterEditActive] = useState(true);

  const loadAll = useCallback(async (d: string) => {
    setLoading(true);
    setError(null);
    try {
      const [studentsRes, reportsRes, settingsRes] = await Promise.all([
        fetch("/api/admin/students"),
        fetch(`/api/reports?date=${d}`),
        fetch("/api/admin/settings"),
      ]);
      if (studentsRes.status === 503 || reportsRes.status === 503) {
        setNotConfigured(true);
        return;
      }
      if (studentsRes.status === 401) {
        // Session expired — middleware normally redirects, but handle it here too.
        window.location.href = "/admin/login";
        return;
      }
      const studentsJson = await studentsRes.json();
      const reportsJson = await reportsRes.json();
      if (!studentsRes.ok) throw new Error(studentsJson.error ?? "Could not load students.");
      if (!reportsRes.ok) throw new Error(reportsJson.error ?? "Could not load reports.");
      setStudents(studentsJson.students ?? []);
      setReports(reportsJson.reports ?? []);
      if (settingsRes.ok) {
        const s = await settingsRes.json();
        if (s.thresholds) setThresholds(s.thresholds);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load the report.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isValidDateString(date)) loadAll(date);
  }, [date, loadAll]);

  const activeStudents = useMemo(() => students.filter((s) => s.active), [students]);
  const reportsByStudent = useMemo(
    () => new Map(reports.map((r) => [r.student_id, r])),
    [reports],
  );
  const nextOrder = useMemo(
    () => (students.length ? Math.max(...students.map((s) => s.order_no)) + 1 : 1),
    [students],
  );

  async function copyLink() {
    const url = `${window.location.origin}/report?date=${date}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Clipboard API unavailable (old browser / non-secure context): fall back.
      const ta = document.createElement("textarea");
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  function openEdit(report: ReportRow) {
    setEditing(report);
    setEditForm({
      student_id: report.student_id,
      date: report.date,
      school_min: report.school_min,
      study_min: report.study_min,
      subjects_count: report.subjects_count,
      subjects_text: report.subjects_text ?? "",
      sleep_min: report.sleep_min,
      fun_text: report.fun_text ?? "",
      fun_min: report.fun_min,
      exercise_min: report.exercise_min,
      water_l: Number(report.water_l),
      other_text: report.other_text ?? "",
      other_min: report.other_min,
      habit_text: report.habit_text ?? "",
      habit_min: report.habit_min,
      screen_min: report.screen_min,
    });
    setEditError(null);
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing || !editForm) return;
    setEditBusy(true);
    setEditError(null);
    try {
      const res = await fetch(`/api/admin/reports?id=${editing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      const json = await res.json();
      if (!res.ok) {
        setEditError(json.error ?? "Could not save the changes.");
        return;
      }
      setEditing(null);
      setEditForm(null);
      loadAll(date);
    } catch {
      setEditError("Could not save the changes. Check your connection and try again.");
    } finally {
      setEditBusy(false);
    }
  }

  async function deleteReport(report: ReportRow) {
    const name = students.find((s) => s.id === report.student_id)?.name ?? "this student";
    if (!window.confirm(`Delete ${name}'s report for ${report.date}? This cannot be undone.`)) return;
    const res = await fetch(`/api/admin/reports?id=${report.id}`, { method: "DELETE" });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(json.error ?? "Could not delete the report.");
      return;
    }
    loadAll(date);
  }

  async function addStudent(e: React.FormEvent) {
    e.preventDefault();
    setRosterError(null);
    setRosterBusy(true);
    try {
      const res = await fetch("/api/admin/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          order_no: parseInt(newOrder, 10) || nextOrder,
          active: true,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setRosterError(json.error ?? "Could not add the student.");
        return;
      }
      setNewName("");
      setNewOrder("");
      loadAll(date);
    } catch {
      setRosterError("Could not add the student. Check your connection and try again.");
    } finally {
      setRosterBusy(false);
    }
  }

  async function saveRosterEdit(id: string) {
    setRosterError(null);
    const res = await fetch(`/api/admin/students?id=${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: rosterEditName.trim(),
        order_no: rosterEditOrder,
        active: rosterEditActive,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setRosterError(json.error ?? "Could not update the student.");
      return;
    }
    setRosterEditId(null);
    loadAll(date);
  }

  async function deleteStudent(s: Student) {
    if (
      !window.confirm(
        `Remove ${s.name} from the roster? Their reports will be deleted too. This cannot be undone.`,
      )
    )
      return;
    const res = await fetch(`/api/admin/students?id=${s.id}`, { method: "DELETE" });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setRosterError(json.error ?? "Could not delete the student.");
      return;
    }
    loadAll(date);
  }

  const inputCls =
    "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-sky-600 focus:outline-none focus:ring-1 focus:ring-sky-600";

  return (
    <div className="min-h-screen">
      <AdminNav />
      <main className="mx-auto max-w-7xl px-4 py-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Daily report</h1>
            <p className="text-sm text-slate-600">
              Students who did not submit still appear as rows with empty cells.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="date" className="text-sm font-medium text-slate-700">
              Date
            </label>
            <input
              id="date"
              type="date"
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
              value={date}
              onChange={(e) => {
                if (isValidDateString(e.target.value)) setDate(e.target.value);
              }}
            />
            <button
              type="button"
              onClick={copyLink}
              className="rounded-md bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-700"
            >
              {copied ? "Link copied ✓" : "Copy today's link"}
            </button>
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
            <div className="mt-4">
              <ExportButtons
                students={activeStudents}
                reportsByStudent={reportsByStudent}
                date={date}
                thresholds={thresholds}
              />
            </div>
            <div className="mt-4">
              {loading ? (
                <p className="text-sm text-slate-600">Loading…</p>
              ) : (
                <ReportTable
                  students={activeStudents}
                  reportsByStudent={reportsByStudent}
                  date={date}
                  thresholds={thresholds}
                  onEdit={openEdit}
                  onDelete={deleteReport}
                />
              )}
            </div>

            {/* Roster management */}
            <section className="mt-8 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <h2 className="text-lg font-semibold text-slate-900">Student roster</h2>
              <p className="mt-1 text-sm text-slate-600">
                The order number sets the row order in the table and in the student form dropdown.
                Inactive students are hidden from the table and the form.
              </p>
              {rosterError && (
                <p className="mt-3 rounded-md border border-red-300 bg-red-50 p-2 text-sm text-red-800">
                  {rosterError}
                </p>
              )}
              <form onSubmit={addStudent} className="mt-4 flex flex-wrap items-end gap-2">
                <div className="min-w-[180px] flex-1">
                  <label htmlFor="new-name" className="mb-1 block text-sm font-medium text-slate-700">
                    Student name
                  </label>
                  <input
                    id="new-name"
                    type="text"
                    className={inputCls}
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Ahmed Khan"
                    maxLength={100}
                    required
                  />
                </div>
                <div className="w-28">
                  <label htmlFor="new-order" className="mb-1 block text-sm font-medium text-slate-700">
                    Order no.
                  </label>
                  <input
                    id="new-order"
                    type="number"
                    min={1}
                    max={9999}
                    className={inputCls}
                    value={newOrder}
                    placeholder={String(nextOrder)}
                    onChange={(e) => setNewOrder(e.target.value)}
                  />
                </div>
                <button
                  type="submit"
                  disabled={rosterBusy}
                  className="rounded-md bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-[#16305e] disabled:opacity-50"
                >
                  {rosterBusy ? "Adding…" : "Add student"}
                </button>
              </form>
              <ul className="mt-4 divide-y divide-slate-200">
                {students.map((s) => (
                  <li key={s.id} className="flex flex-wrap items-center gap-2 py-2">
                    {rosterEditId === s.id ? (
                      <>
                        <input
                          type="number"
                          min={1}
                          max={9999}
                          aria-label="Order number"
                          className="w-20 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                          value={rosterEditOrder}
                          onChange={(e) => setRosterEditOrder(parseInt(e.target.value, 10) || 1)}
                        />
                        <input
                          type="text"
                          aria-label="Student name"
                          className="min-w-[160px] flex-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                          value={rosterEditName}
                          maxLength={100}
                          onChange={(e) => setRosterEditName(e.target.value)}
                        />
                        <label className="flex items-center gap-1 text-sm text-slate-700">
                          <input
                            type="checkbox"
                            checked={rosterEditActive}
                            onChange={(e) => setRosterEditActive(e.target.checked)}
                          />
                          Active
                        </label>
                        <button
                          type="button"
                          onClick={() => saveRosterEdit(s.id)}
                          className="rounded bg-sky-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-sky-700"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setRosterEditId(null)}
                          className="rounded bg-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-300"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="w-8 text-sm font-semibold text-slate-500">#{s.order_no}</span>
                        <span className="min-w-[140px] flex-1 text-sm font-medium text-slate-900">
                          {s.name}
                          {!s.active && (
                            <span className="ml-2 rounded bg-slate-200 px-1.5 py-0.5 text-xs text-slate-600">
                              inactive
                            </span>
                          )}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setRosterEditId(s.id);
                            setRosterEditName(s.name);
                            setRosterEditOrder(s.order_no);
                            setRosterEditActive(s.active);
                          }}
                          className="rounded bg-sky-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-sky-700"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteStudent(s)}
                          className="rounded bg-red-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-red-700"
                        >
                          Remove
                        </button>
                      </>
                    )}
                  </li>
                ))}
                {students.length === 0 && (
                  <li className="py-2 text-sm text-slate-600">
                    No students yet — add the first one above, or run supabase/seed.sql.
                  </li>
                )}
              </ul>
            </section>
          </>
        )}
      </main>

      {/* Edit entry modal */}
      {editing && editForm && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Edit report"
        >
          <form
            onSubmit={saveEdit}
            className="my-8 w-full max-w-2xl rounded-xl bg-white p-5 shadow-xl"
          >
            <h2 className="text-lg font-semibold text-slate-900">
              Edit report — {students.find((s) => s.id === editing.student_id)?.name} ({editing.date})
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <TimeInput label="School time" id="edit-school" value={editForm.school_min} onChange={(v) => setEditForm({ ...editForm, school_min: v })} />
              <TimeInput label="Study at home" id="edit-study" value={editForm.study_min} onChange={(v) => setEditForm({ ...editForm, study_min: v })} />
              <TimeInput label="Sleep" id="edit-sleep" value={editForm.sleep_min} onChange={(v) => setEditForm({ ...editForm, sleep_min: v })} />
              <TimeInput label="Exercise / Sports" id="edit-exercise" value={editForm.exercise_min} onChange={(v) => setEditForm({ ...editForm, exercise_min: v })} />
              <TimeInput label="Phone Screen Time" id="edit-screen" value={editForm.screen_min} onChange={(v) => setEditForm({ ...editForm, screen_min: v })} />
              <div>
                <label htmlFor="edit-water" className="mb-1 block text-sm font-medium text-slate-700">
                  Water (litres)
                </label>
                <input
                  id="edit-water"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  max={20}
                  step={0.1}
                  className={inputCls}
                  value={editForm.water_l === 0 ? "" : String(editForm.water_l)}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    setEditForm({ ...editForm, water_l: Number.isNaN(v) ? 0 : Math.min(20, Math.max(0, v)) });
                  }}
                />
              </div>
              <div>
                <label htmlFor="edit-subjects-count" className="mb-1 block text-sm font-medium text-slate-700">
                  Subjects count
                </label>
                <input
                  id="edit-subjects-count"
                  type="number"
                  min={0}
                  max={50}
                  className={inputCls}
                  value={editForm.subjects_count === 0 ? "" : String(editForm.subjects_count)}
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10);
                    setEditForm({ ...editForm, subjects_count: Number.isNaN(v) ? 0 : Math.min(50, Math.max(0, v)) });
                  }}
                />
              </div>
              <div>
                <label htmlFor="edit-subjects-text" className="mb-1 block text-sm font-medium text-slate-700">
                  Subject names
                </label>
                <input
                  id="edit-subjects-text"
                  type="text"
                  className={inputCls}
                  value={editForm.subjects_text}
                  maxLength={500}
                  onChange={(e) => setEditForm({ ...editForm, subjects_text: e.target.value })}
                />
              </div>
              <div>
                <label htmlFor="edit-fun-text" className="mb-1 block text-sm font-medium text-slate-700">
                  Fun time — what did they do?
                </label>
                <input
                  id="edit-fun-text"
                  type="text"
                  className={inputCls}
                  value={editForm.fun_text}
                  maxLength={500}
                  onChange={(e) => setEditForm({ ...editForm, fun_text: e.target.value })}
                />
              </div>
              <TimeInput label="Fun time" id="edit-fun" value={editForm.fun_min} onChange={(v) => setEditForm({ ...editForm, fun_min: v })} />
              <div>
                <label htmlFor="edit-other-text" className="mb-1 block text-sm font-medium text-slate-700">
                  Other activity name
                </label>
                <input
                  id="edit-other-text"
                  type="text"
                  className={inputCls}
                  value={editForm.other_text}
                  maxLength={500}
                  onChange={(e) => setEditForm({ ...editForm, other_text: e.target.value })}
                />
              </div>
              <TimeInput label="Other activities time" id="edit-other" value={editForm.other_min} onChange={(v) => setEditForm({ ...editForm, other_min: v })} />
              <div>
                <label htmlFor="edit-habit-text" className="mb-1 block text-sm font-medium text-slate-700">
                  Habit name
                </label>
                <input
                  id="edit-habit-text"
                  type="text"
                  className={inputCls}
                  value={editForm.habit_text}
                  maxLength={500}
                  onChange={(e) => setEditForm({ ...editForm, habit_text: e.target.value })}
                />
              </div>
              <TimeInput label="Habit development time" id="edit-habit" value={editForm.habit_min} onChange={(v) => setEditForm({ ...editForm, habit_min: v })} />
            </div>
            {editError && (
              <p className="mt-3 rounded-md border border-red-300 bg-red-50 p-2 text-sm text-red-800">
                {editError}
              </p>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditing(null);
                  setEditForm(null);
                }}
                className="rounded-md bg-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={editBusy}
                className="rounded-md bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-[#16305e] disabled:opacity-50"
              >
                {editBusy ? "Saving…" : "Save changes"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

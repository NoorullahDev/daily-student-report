"use client";

import { useState } from "react";
import { COLOURS, type Thresholds } from "@/lib/report-config";
import { statusesForReport, totalCheck, totalMinutes } from "@/lib/status";
import { formatMinutes, formatWater } from "@/lib/time";
import type { ReportRow, Student } from "@/lib/types";

/**
 * Export buttons for the admin table — all client-side, no server storage:
 * - Excel (.xlsx) with the same cell colours
 * - PDF (landscape A4) with the same layout and colours
 * - PNG image of the table (for WhatsApp / mentor)
 *
 * The colour logic is shared with the on-screen table via lib/status.ts.
 */

const HEADERS = [
  "#",
  "Student",
  "School time",
  "Study at home",
  "Subjects",
  "Sleep",
  "Fun time (what/time)",
  "Exercise/Sports",
  "Water litres",
  "Other Activities",
  "Habit development",
  "Phone Screen Time",
  "Total time 24h check",
];

type CellStatus = "green" | "yellow" | "red" | "neutral" | "header";

interface ExportRow {
  values: string[];
  statuses: CellStatus[];
}

function buildRows(
  students: Student[],
  reportsByStudent: Map<string, ReportRow>,
  thresholds: Thresholds,
): ExportRow[] {
  return students.map((student) => {
    const r = reportsByStudent.get(student.id);
    const values: string[] = [String(student.order_no), student.name];
    const statuses: CellStatus[] = ["neutral", "neutral"];
    if (!r) {
      values.push("", "", "", "", "", "", "", "", "", "", "Not submitted");
      statuses.push(
        "neutral", "neutral", "neutral", "neutral", "neutral",
        "neutral", "neutral", "neutral", "neutral", "neutral", "neutral",
      );
      return { values, statuses };
    }
    const s = statusesForReport(r, thresholds);
    const check = totalCheck(totalMinutes(r));
    values.push(
      formatMinutes(r.school_min),
      formatMinutes(r.study_min),
      r.subjects_text ? `${r.subjects_count} — ${r.subjects_text}` : String(r.subjects_count),
      formatMinutes(r.sleep_min),
      r.fun_text ? `${r.fun_text} — ${formatMinutes(r.fun_min)}` : formatMinutes(r.fun_min),
      formatMinutes(r.exercise_min),
      formatWater(Number(r.water_l)),
      r.other_text ? `${r.other_text} — ${formatMinutes(r.other_min)}` : r.other_min > 0 ? formatMinutes(r.other_min) : "",
      r.habit_text ? `${r.habit_text} — ${formatMinutes(r.habit_min)}` : r.habit_min > 0 ? formatMinutes(r.habit_min) : "",
      formatMinutes(r.screen_min),
      check.text,
    );
    statuses.push(
      "neutral", s.study, s.subjects, s.sleep, s.fun, s.exercise, s.water,
      "neutral", "neutral", "neutral", check.complete ? "green" : "red",
    );
    return { values, statuses };
  });
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export default function ExportButtons({
  students,
  reportsByStudent,
  date,
  thresholds,
}: {
  students: Student[];
  reportsByStudent: Map<string, ReportRow>;
  date: string;
  thresholds: Thresholds;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileBase = `daily-student-report-${date}`;

  async function exportExcel() {
    setBusy("excel");
    setError(null);
    try {
      const XLSX = await import("xlsx");
      const rows = buildRows(students, reportsByStudent, thresholds);
      const ws = XLSX.utils.aoa_to_sheet([
        ["DAILY STUDENT HABIT & TIME REPORT"],
        [`Report date: ${date}`],
        HEADERS,
        ...rows.map((r) => r.values),
      ]);
      ws["!cols"] = HEADERS.map((h) => ({ wch: Math.max(10, Math.min(24, h.length + 2)) }));
      ws["!cols"]![1] = { wch: 22 };
      ws["!cols"]![6] = { wch: 26 };
      // Title row: bold, larger.
      const titleCell = ws["A1"];
      if (titleCell) titleCell.s = { font: { bold: true, sz: 14 } };
      // Header row (row 3): dark navy background, white bold text.
      const navy = COLOURS.navy.replace("#", "");
      HEADERS.forEach((_, c) => {
        const addr = XLSX.utils.encode_cell({ r: 2, c });
        const cell = ws[addr];
        if (cell) {
          cell.s = {
            fill: { fgColor: { rgb: navy } },
            font: { bold: true, color: { rgb: "FFFFFF" } },
            alignment: { wrapText: true, vertical: "center", horizontal: "center" },
          };
        }
      });
      // Data rows: status fills.
      rows.forEach((row, ri) => {
        row.statuses.forEach((st, ci) => {
          if (st === "neutral") return;
          const addr = XLSX.utils.encode_cell({ r: 3 + ri, c: ci });
          const cell = ws[addr];
          if (!cell) return;
          const bg =
            st === "green" ? COLOURS.green : st === "yellow" ? COLOURS.yellow : COLOURS.red;
          cell.s = {
            fill: { fgColor: { rgb: bg.replace("#", "") } },
            font: {
              color: { rgb: st === "yellow" ? "1E293B" : "FFFFFF" },
              bold: true,
            },
            alignment: { wrapText: true, vertical: "center" },
          };
        });
      });
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Report");
      XLSX.writeFile(wb, `${fileBase}.xlsx`, { cellStyles: true });
    } catch {
      setError("Excel export failed. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  async function exportPdf() {
    setBusy("pdf");
    setError(null);
    try {
      const { jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;
      const rows = buildRows(students, reportsByStudent, thresholds);
      const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
      doc.setFontSize(14);
      doc.text("DAILY STUDENT HABIT & TIME REPORT", 40, 30);
      doc.setFontSize(10);
      doc.text(`Report date: ${date}`, 40, 46);
      autoTable(doc, {
        startY: 56,
        head: [HEADERS],
        body: rows.map((r) => r.values),
        styles: { fontSize: 7, cellPadding: 3, valign: "middle" },
        headStyles: { fillColor: hexToRgb(COLOURS.navy), textColor: [255, 255, 255], fontStyle: "bold" },
        columnStyles: { 1: { cellWidth: 80 }, 6: { cellWidth: 90 } },
        didParseCell: (data) => {
          if (data.section !== "body") return;
          const st = rows[data.row.index]?.statuses[data.column.index];
          if (!st || st === "neutral") return;
          const bg = hexToRgb(
            st === "green" ? COLOURS.green : st === "yellow" ? COLOURS.yellow : COLOURS.red,
          );
          data.cell.styles.fillColor = bg;
          data.cell.styles.textColor = st === "yellow" ? [30, 41, 59] : [255, 255, 255];
          data.cell.styles.fontStyle = "bold";
        },
      });
      doc.save(`${fileBase}.pdf`);
    } catch {
      setError("PDF export failed. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  async function exportPng() {
    setBusy("png");
    setError(null);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const el = document.getElementById("report-table-wrap");
      if (!el) throw new Error("Table element not found");
      const canvas = await html2canvas(el, { scale: 2, backgroundColor: "#ffffff" });
      const link = document.createElement("a");
      link.download = `${fileBase}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch {
      setError("PNG export failed. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  const btn =
    "rounded-md px-3 py-2 text-sm font-medium text-white disabled:opacity-50";
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" onClick={exportExcel} disabled={busy !== null} className={`${btn} bg-emerald-600 hover:bg-emerald-700`}>
        {busy === "excel" ? "Making Excel…" : "Export Excel (.xlsx)"}
      </button>
      <button type="button" onClick={exportPdf} disabled={busy !== null} className={`${btn} bg-rose-600 hover:bg-rose-700`}>
        {busy === "pdf" ? "Making PDF…" : "Export PDF"}
      </button>
      <button type="button" onClick={exportPng} disabled={busy !== null} className={`${btn} bg-indigo-600 hover:bg-indigo-700`}>
        {busy === "png" ? "Making image…" : "Export PNG image"}
      </button>
      {error && <span className="text-sm text-red-600">{error}</span>}
    </div>
  );
}

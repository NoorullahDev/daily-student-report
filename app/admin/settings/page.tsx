"use client";

import { useEffect, useState } from "react";
import AdminNav from "@/components/AdminNav";
import { DEFAULT_THRESHOLDS, type Thresholds } from "@/lib/report-config";

/**
 * Admin settings (/admin/settings): edit every status threshold in
 * minutes/litres. Saved to report_settings (id=1) via the admin API.
 * The config-file defaults (lib/report-config.ts) are shown beside each field.
 */
export default function SettingsPage() {
  const [thresholds, setThresholds] = useState<Thresholds>(DEFAULT_THRESHOLDS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/admin/settings");
        if (res.status === 401) {
          window.location.href = "/admin/login";
          return;
        }
        const json = await res.json();
        if (!res.ok) {
          setError(json.error ?? "Could not load settings.");
          return;
        }
        setThresholds(json.thresholds ?? DEFAULT_THRESHOLDS);
      } catch {
        setError("Could not load settings. Check your connection and try again.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSavedMsg(null);
    setBusy(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ thresholds }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Could not save settings.");
        return;
      }
      setThresholds(json.thresholds);
      setSavedMsg("Settings saved. The daily table and the student form summary now use these rules.");
    } catch {
      setError("Could not save settings. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function resetToDefaults() {
    setError(null);
    setSavedMsg(null);
    setBusy(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ thresholds: DEFAULT_THRESHOLDS }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Could not reset settings.");
        return;
      }
      setThresholds(DEFAULT_THRESHOLDS);
      setSavedMsg("Reset to the defaults from lib/report-config.ts.");
    } catch {
      setError("Could not reset settings. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  const numCls =
    "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-sky-600 focus:outline-none focus:ring-1 focus:ring-sky-600";

  function field(
    label: string,
    hint: string,
    value: number,
    defaultValue: number,
    unit: string,
    onChange: (v: number) => void,
  ) {
    return (
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            max={unit === "L" ? 20 : 1440}
            step={unit === "L" ? 0.1 : 1}
            className={numCls}
            value={value}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              onChange(Number.isNaN(v) ? 0 : Math.max(0, v));
            }}
          />
          <span className="w-10 shrink-0 text-sm text-slate-500">{unit}</span>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          {hint} (default: {defaultValue} {unit})
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <AdminNav />
      <main className="mx-auto max-w-3xl px-4 py-6">
        <h1 className="text-xl font-bold text-slate-900">Settings — status colour rules</h1>
        <p className="mt-1 text-sm text-slate-600">
          Change when a cell turns green, yellow or red. The rules live in one file,{" "}
          <code className="rounded bg-slate-200 px-1">lib/report-config.ts</code>, and the values
          you save here override that file. The student form uses the file defaults; the admin
          table uses the saved values.
        </p>

        {loading ? (
          <p className="mt-6 text-sm text-slate-600">Loading…</p>
        ) : (
          <form onSubmit={save} className="mt-6 space-y-6">
            {error && (
              <p className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800">
                {error}
              </p>
            )}
            {savedMsg && (
              <p className="rounded-lg border border-green-300 bg-green-50 p-3 text-sm text-green-800">
                {savedMsg}
              </p>
            )}

            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <h2 className="font-semibold text-slate-900">Study at home (minutes)</h2>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                {field("Green from", "Green when study is at least", thresholds.study.greenMin, DEFAULT_THRESHOLDS.study.greenMin, "min", (v) => setThresholds({ ...thresholds, study: { ...thresholds.study, greenMin: Math.round(v) } }))}
                {field("Yellow from", "Yellow when study is at least (but below green)", thresholds.study.yellowMin, DEFAULT_THRESHOLDS.study.yellowMin, "min", (v) => setThresholds({ ...thresholds, study: { ...thresholds.study, yellowMin: Math.round(v) } }))}
              </div>
              <p className="mt-2 text-xs text-slate-500">Below the yellow value is red.</p>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <h2 className="font-semibold text-slate-900">Subjects (count)</h2>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                {field("Green from", "Green when subjects are at least", thresholds.subjects.greenCount, DEFAULT_THRESHOLDS.subjects.greenCount, "count", (v) => setThresholds({ ...thresholds, subjects: { ...thresholds.subjects, greenCount: Math.round(v) } }))}
                {field("Yellow from", "Yellow when subjects are at least (but below green)", thresholds.subjects.yellowCount, DEFAULT_THRESHOLDS.subjects.yellowCount, "count", (v) => setThresholds({ ...thresholds, subjects: { ...thresholds.subjects, yellowCount: Math.round(v) } }))}
              </div>
              <p className="mt-2 text-xs text-slate-500">Below the yellow value is red (0 subjects).</p>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <h2 className="font-semibold text-slate-900">Sleep (minutes)</h2>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                {field("Green from", "Green when sleep is at least", thresholds.sleep.greenMin, DEFAULT_THRESHOLDS.sleep.greenMin, "min", (v) => setThresholds({ ...thresholds, sleep: { ...thresholds.sleep, greenMin: Math.round(v) } }))}
                {field("Yellow from", "Yellow when sleep is at least (but below green)", thresholds.sleep.yellowMin, DEFAULT_THRESHOLDS.sleep.yellowMin, "min", (v) => setThresholds({ ...thresholds, sleep: { ...thresholds.sleep, yellowMin: Math.round(v) } }))}
              </div>
              <p className="mt-2 text-xs text-slate-500">Below the yellow value is red.</p>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <h2 className="font-semibold text-slate-900">Fun time (minutes — lower is better)</h2>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                {field("Green up to", "Green when fun time is at most", thresholds.fun.greenMax, DEFAULT_THRESHOLDS.fun.greenMax, "min", (v) => setThresholds({ ...thresholds, fun: { ...thresholds.fun, greenMax: Math.round(v) } }))}
                {field("Yellow up to", "Yellow when fun time is at most (but above green)", thresholds.fun.yellowMax, DEFAULT_THRESHOLDS.fun.yellowMax, "min", (v) => setThresholds({ ...thresholds, fun: { ...thresholds.fun, yellowMax: Math.round(v) } }))}
              </div>
              <p className="mt-2 text-xs text-slate-500">Above the yellow value is red.</p>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <h2 className="font-semibold text-slate-900">Exercise / Sports (minutes)</h2>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                {field("Green from", "Green when exercise is at least", thresholds.exercise.greenMin, DEFAULT_THRESHOLDS.exercise.greenMin, "min", (v) => setThresholds({ ...thresholds, exercise: { ...thresholds.exercise, greenMin: Math.round(v) } }))}
                {field("Yellow from", "Yellow when exercise is at least (but below green)", thresholds.exercise.yellowMin, DEFAULT_THRESHOLDS.exercise.yellowMin, "min", (v) => setThresholds({ ...thresholds, exercise: { ...thresholds.exercise, yellowMin: Math.round(v) } }))}
              </div>
              <p className="mt-2 text-xs text-slate-500">Below the yellow value is red (empty = 0 = red).</p>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <h2 className="font-semibold text-slate-900">Water (litres)</h2>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                {field("Green from", "Green when water is at least", thresholds.water.greenL, DEFAULT_THRESHOLDS.water.greenL, "L", (v) => setThresholds({ ...thresholds, water: { ...thresholds.water, greenL: v } }))}
                {field("Yellow from", "Yellow when water is at least (but below green)", thresholds.water.yellowL, DEFAULT_THRESHOLDS.water.yellowL, "L", (v) => setThresholds({ ...thresholds, water: { ...thresholds.water, yellowL: v } }))}
              </div>
              <p className="mt-2 text-xs text-slate-500">Below the yellow value is red.</p>
            </section>

            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={busy}
                className="rounded-md bg-navy px-4 py-2.5 text-sm font-medium text-white hover:bg-[#16305e] disabled:opacity-50"
              >
                {busy ? "Saving…" : "Save settings"}
              </button>
              <button
                type="button"
                onClick={resetToDefaults}
                disabled={busy}
                className="rounded-md bg-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-300 disabled:opacity-50"
              >
                Reset to defaults
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";

/**
 * Reusable hours + minutes input. Empty fields count as 0.
 * Props: total minutes + onChange(totalMinutes). Hours 0–24, minutes 0–59.
 */
export default function TimeInput({
  label,
  value,
  onChange,
  id,
}: {
  label: string;
  value: number;
  onChange: (minutes: number) => void;
  id: string;
}) {
  const [hours, setHours] = useState("");
  const [mins, setMins] = useState("");

  // Keep the two boxes in sync when the parent value changes (e.g. preload).
  useEffect(() => {
    const h = Math.floor(value / 60);
    const m = value % 60;
    setHours(h === 0 && value === 0 ? "" : String(h));
    setMins(m === 0 && value === 0 ? "" : String(m));
    // Only sync when the parent value changes externally.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const emit = (hStr: string, mStr: string) => {
    const h = Math.min(24, Math.max(0, parseInt(hStr, 10) || 0));
    const m = Math.min(59, Math.max(0, parseInt(mStr, 10) || 0));
    const total = Math.min(1440, h * 60 + m);
    onChange(total);
  };

  const box =
    "w-full rounded-md border border-slate-300 bg-white px-2 py-2 text-center text-sm focus:border-sky-600 focus:outline-none focus:ring-1 focus:ring-sky-600";

  return (
    <div>
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      <div className="flex items-center gap-2">
        <label className="flex-1">
          <span className="sr-only">{label} — hours</span>
          <input
            id={`${id}-h`}
            type="number"
            inputMode="numeric"
            min={0}
            max={24}
            placeholder="0"
            aria-label={`${label} hours`}
            className={box}
            value={hours}
            onChange={(e) => {
              const v = e.target.value.replace(/[^0-9]/g, "").slice(0, 2);
              setHours(v);
              emit(v, mins);
            }}
          />
          <span className="mt-0.5 block text-center text-xs text-slate-500">hours</span>
        </label>
        <span className="pb-4 text-slate-400">:</span>
        <label className="flex-1">
          <span className="sr-only">{label} — minutes</span>
          <input
            id={`${id}-m`}
            type="number"
            inputMode="numeric"
            min={0}
            max={59}
            placeholder="0"
            aria-label={`${label} minutes`}
            className={box}
            value={mins}
            onChange={(e) => {
              const v = e.target.value.replace(/[^0-9]/g, "").slice(0, 2);
              setMins(v);
              emit(hours, v);
            }}
          />
          <span className="mt-0.5 block text-center text-xs text-slate-500">minutes</span>
        </label>
      </div>
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { setPreference } from "./actions";

type Pref = "want_to_work" | "prefer_off" | null;

export function AvailabilityGrid({
  dates,
  initial,
}: {
  dates: string[];
  initial: Record<string, Pref>;
}) {
  const [prefs, setPrefs] = useState(initial);
  const [isPending, startTransition] = useTransition();

  function cycle(date: string) {
    const current = prefs[date] ?? null;
    const next: Pref =
      current === null ? "want_to_work" : current === "want_to_work" ? "prefer_off" : null;
    setPrefs((p) => ({ ...p, [date]: next }));
    startTransition(() => {
      setPreference(date, next);
    });
  }

  const styleFor = (p: Pref) =>
    p === "want_to_work"
      ? "bg-green-100 border-green-400 text-green-800"
      : p === "prefer_off"
        ? "bg-red-100 border-red-400 text-red-800"
        : "bg-white border-neutral-200 text-neutral-500";

  return (
    <div>
      <div className="grid grid-cols-7 gap-2">
        {dates.map((date) => {
          const d = new Date(date);
          const p = prefs[date] ?? null;
          return (
            <button
              key={date}
              type="button"
              onClick={() => cycle(date)}
              disabled={isPending}
              className={`rounded-lg border px-2 py-3 text-sm text-center ${styleFor(p)}`}
            >
              <div className="text-xs">
                {d.toLocaleDateString("en-GB", { weekday: "short" })}
              </div>
              <div className="font-medium">
                {d.getDate()}/{d.getMonth() + 1}
              </div>
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-4 mt-4 text-xs text-neutral-500">
        <span>
          <span className="inline-block w-3 h-3 rounded bg-green-100 border border-green-400 mr-1" />
          Want to work
        </span>
        <span>
          <span className="inline-block w-3 h-3 rounded bg-red-100 border border-red-400 mr-1" />
          Prefer off
        </span>
        <span>Tap a day to cycle through the options.</span>
      </div>
    </div>
  );
}

"use client";

import { useTransition } from "react";
import { setShift, publishShifts } from "./actions";
import { SHIFT_LABELS, type ShiftType } from "@/lib/hours";

type Employee = { id: string; full_name: string };
type Pref = { employee_id: string; date: string; preference: "want_to_work" | "prefer_off" };
type Shift = { employee_id: string; date: string; published: boolean; shift_type: ShiftType };

const SHIFT_OPTIONS: { value: ShiftType | ""; label: string }[] = [
  { value: "", label: "—" },
  { value: "morning", label: SHIFT_LABELS.morning },
  { value: "evening", label: SHIFT_LABELS.evening },
  { value: "full_day", label: SHIFT_LABELS.full_day },
];

export function ScheduleGrid({
  shopId,
  dates,
  employees,
  preferences,
  shifts,
}: {
  shopId: string;
  dates: string[];
  employees: Employee[];
  preferences: Pref[];
  shifts: Shift[];
}) {
  const [isPending, startTransition] = useTransition();

  const prefMap = new Map(preferences.map((p) => [`${p.employee_id}_${p.date}`, p.preference]));
  const shiftMap = new Map(shifts.map((s) => [`${s.employee_id}_${s.date}`, s]));

  function setCell(employeeId: string, date: string, value: string) {
    const shiftType = value === "" ? null : (value as ShiftType);
    startTransition(() => {
      setShift(shopId, date, employeeId, shiftType);
    });
  }

  if (employees.length === 0) {
    return <p className="text-sm text-neutral-500">No employees assigned to this shop yet.</p>;
  }

  return (
    <div>
      <div className="overflow-x-auto border rounded-lg">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-neutral-100">
              <th className="text-left px-3 py-2">Date</th>
              {employees.map((e) => (
                <th key={e.id} className="text-left px-3 py-2">
                  {e.full_name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dates.map((date) => {
              const d = new Date(date);
              return (
                <tr key={date} className="border-t">
                  <td className="px-3 py-2 whitespace-nowrap">
                    {d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
                  </td>
                  {employees.map((e) => {
                    const pref = prefMap.get(`${e.id}_${date}`);
                    const shift = shiftMap.get(`${e.id}_${date}`);
                    const assigned = Boolean(shift);
                    return (
                      <td key={e.id} className="px-3 py-2">
                        <select
                          disabled={isPending}
                          value={shift?.shift_type ?? ""}
                          onChange={(ev) => setCell(e.id, date, ev.target.value)}
                          className={`w-full rounded px-2 py-1 text-xs border ${
                            assigned
                              ? "bg-neutral-900 text-white border-neutral-900"
                              : pref === "want_to_work"
                                ? "bg-green-50 border-green-300"
                                : pref === "prefer_off"
                                  ? "bg-red-50 border-red-300"
                                  : "bg-white border-neutral-200"
                          }`}
                        >
                          {SHIFT_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value} className="text-black">
                              {opt.value === "" && pref
                                ? pref === "want_to_work"
                                  ? "— (wants to work)"
                                  : "— (prefers off)"
                                : opt.label}
                            </option>
                          ))}
                        </select>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <button
        type="button"
        disabled={isPending}
        onClick={() => startTransition(() => publishShifts(shopId, dates[0], dates[dates.length - 1]))}
        className="mt-4 bg-neutral-900 text-white rounded px-4 py-2 text-sm"
      >
        Publish this schedule to employees
      </button>
    </div>
  );
}

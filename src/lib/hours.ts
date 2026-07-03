export type ShiftType = "morning" | "evening" | "full_day";

export const SHIFT_HOURS: Record<ShiftType, number> = {
  morning: 8,
  evening: 8,
  full_day: 10,
};

export const SHIFT_LABELS: Record<ShiftType, string> = {
  morning: "Morning",
  evening: "Evening",
  full_day: "Full day",
};

export const SHIFT_TIMES: Record<ShiftType, string> = {
  morning: "8:00–16:00",
  evening: "12:00–20:00",
  full_day: "9:00–20:00 (incl. two 30-min breaks)",
};

export const WEEKLY_TARGET_HOURS = 40;
export const MONTHLY_TARGET_HOURS = 160;
export const RECUPERATION_HOURS_PER_DAY = 8;

// Monday of the ISO week containing this date, as YYYY-MM-DD.
export function mondayOf(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

export function monthKeyOf(dateStr: string): string {
  return dateStr.slice(0, 7);
}

type DatedShift = { date: string; shift_type: ShiftType };

export function hoursByWeek(shifts: DatedShift[]): Map<string, number> {
  const byWeek = new Map<string, number>();
  for (const s of shifts) {
    const week = mondayOf(s.date);
    byWeek.set(week, (byWeek.get(week) ?? 0) + SHIFT_HOURS[s.shift_type]);
  }
  return byWeek;
}

export function hoursForWeek(shifts: DatedShift[], weekStart: string): number {
  return shifts
    .filter((s) => mondayOf(s.date) === weekStart)
    .reduce((sum, s) => sum + SHIFT_HOURS[s.shift_type], 0);
}

export function hoursForMonth(shifts: DatedShift[], monthKey: string): number {
  return shifts
    .filter((s) => monthKeyOf(s.date) === monthKey)
    .reduce((sum, s) => sum + SHIFT_HOURS[s.shift_type], 0);
}

// Sum of (week hours - 40) across every week that had scheduled hours,
// counting only weeks that ran over. This accrues indefinitely; taking a
// recuperation day off just spends down the resulting balance.
export function totalOvertimeHours(shifts: DatedShift[]): number {
  let overtime = 0;
  for (const hours of hoursByWeek(shifts).values()) {
    if (hours > WEEKLY_TARGET_HOURS) overtime += hours - WEEKLY_TARGET_HOURS;
  }
  return overtime;
}

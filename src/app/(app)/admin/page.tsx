import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ScheduleGrid } from "./schedule-grid";
import { TimeOffRequests } from "./time-off-requests";
import { SwapRequests } from "./swap-requests";
import { HoursSummary } from "./hours-summary";
import { totalOvertimeHours, type ShiftType } from "@/lib/hours";
import { hoursForWeek, hoursForMonth, mondayOf, monthKeyOf } from "@/lib/hours";

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function toISO(d: Date) {
  return d.toISOString().slice(0, 10);
}

function daysInclusive(start: string, end: string) {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24)) + 1;
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ shop?: string }>;
}) {
  const supabase = await createClient();
  const { shop: shopParam } = await searchParams;

  const { data: shops } = await supabase.from("shops").select("id, name").order("name");
  const activeShop = shops?.find((s) => s.id === shopParam) ?? shops?.[0];

  if (!activeShop) {
    return <p className="text-sm text-neutral-500">No shops set up yet.</p>;
  }

  const { data: employees } = await supabase
    .from("employees")
    .select("id, full_name, annual_holiday_days")
    .eq("shop_id", activeShop.id)
    .order("full_name");

  const nameById = new Map((employees ?? []).map((e) => [e.id, e.full_name]));

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dates = Array.from({ length: 28 }, (_, i) => toISO(addDays(today, i)));
  const employeeIds = (employees ?? []).map((e) => e.id);

  const { data: prefRows } = employeeIds.length
    ? await supabase
        .from("availability_preferences")
        .select("employee_id, date, preference")
        .in("employee_id", employeeIds)
        .gte("date", dates[0])
        .lte("date", dates[dates.length - 1])
    : { data: [] };

  const { data: shiftRows } = await supabase
    .from("shifts")
    .select("employee_id, date, published, shift_type")
    .eq("shop_id", activeShop.id)
    .gte("date", dates[0])
    .lte("date", dates[dates.length - 1])
    .overrideTypes<
      { employee_id: string; date: string; published: boolean; shift_type: ShiftType }[],
      { merge: false }
    >();

  // All-time published shifts (not limited to the visible 4-week window) so
  // weekly/monthly totals and the overtime balance stay accurate regardless
  // of which weeks are currently on screen.
  const { data: allShiftRows } = employeeIds.length
    ? await supabase
        .from("shifts")
        .select("employee_id, date, shift_type")
        .in("employee_id", employeeIds)
        .eq("published", true)
        .overrideTypes<{ employee_id: string; date: string; shift_type: ShiftType }[], { merge: false }>()
    : { data: [] as { employee_id: string; date: string; shift_type: ShiftType }[] };

  const thisWeek = mondayOf(toISO(today));
  const thisMonth = monthKeyOf(toISO(today));

  type RequestRow = {
    id: string;
    employee_id: string;
    start_date: string;
    end_date: string;
    reason: string | null;
    status: string;
    request_type: "holiday" | "recuperation";
  };

  const { data: requestRows } = employeeIds.length
    ? await supabase
        .from("time_off_requests")
        .select("id, employee_id, start_date, end_date, reason, status, request_type")
        .in("employee_id", employeeIds)
        .order("start_date")
        .overrideTypes<RequestRow[], { merge: false }>()
    : { data: [] as RequestRow[] };

  const holidayDaysUsed = new Map<string, number>();
  const recuperationDaysUsed = new Map<string, number>();
  for (const r of requestRows ?? []) {
    if (r.status !== "approved") continue;
    const map = r.request_type === "recuperation" ? recuperationDaysUsed : holidayDaysUsed;
    map.set(r.employee_id, (map.get(r.employee_id) ?? 0) + daysInclusive(r.start_date, r.end_date));
  }

  const hoursRows = (employees ?? []).map((e) => {
    const employeeShifts = (allShiftRows ?? []).filter((s) => s.employee_id === e.id);
    const overtime = totalOvertimeHours(employeeShifts);
    const recuperationUsedHours = (recuperationDaysUsed.get(e.id) ?? 0) * 8;
    return {
      employeeId: e.id,
      name: e.full_name,
      weekHours: hoursForWeek(employeeShifts, thisWeek),
      monthHours: hoursForMonth(employeeShifts, thisMonth),
      recuperationBalance: overtime - recuperationUsedHours,
    };
  });

  const requests = (requestRows ?? []).map((r) => {
    const employee = (employees ?? []).find((e) => e.id === r.employee_id);
    const remaining =
      r.request_type === "recuperation"
        ? hoursRows.find((h) => h.employeeId === r.employee_id)?.recuperationBalance ?? null
        : employee
          ? employee.annual_holiday_days - (holidayDaysUsed.get(r.employee_id) ?? 0)
          : null;
    return {
      id: r.id,
      start_date: r.start_date,
      end_date: r.end_date,
      reason: r.reason,
      status: r.status,
      requestType: r.request_type,
      employeeName: nameById.get(r.employee_id),
      daysRemaining: r.request_type === "holiday" ? remaining : null,
      hoursRemaining: r.request_type === "recuperation" ? remaining : null,
    };
  });

  type SwapRow = {
    id: string;
    requested_by: string;
    accepted_by: string | null;
    shifts: { date: string } | { date: string }[] | null;
  };

  const { data: swapRows } = await supabase
    .from("shift_swap_requests")
    .select("id, requested_by, accepted_by, shifts(date)")
    .eq("shop_id", activeShop.id)
    .eq("status", "accepted")
    .overrideTypes<SwapRow[], { merge: false }>();

  const swaps = (swapRows ?? [])
    .map((s) => {
      const shiftDate = Array.isArray(s.shifts) ? s.shifts[0]?.date : s.shifts?.date;
      return {
        id: s.id,
        date: shiftDate ?? "",
        fromName: nameById.get(s.requested_by) ?? "Unknown",
        toName: s.accepted_by ? nameById.get(s.accepted_by) ?? "Unknown" : "Unknown",
      };
    })
    .filter((s) => s.date);

  return (
    <div className="space-y-8">
      <div className="flex gap-2">
        {(shops ?? []).map((s) => (
          <Link
            key={s.id}
            href={`/admin?shop=${s.id}`}
            className={`px-3 py-1.5 rounded-full text-sm border ${
              s.id === activeShop.id ? "bg-neutral-900 text-white" : "bg-white"
            }`}
          >
            {s.name}
          </Link>
        ))}
      </div>

      <ScheduleGrid
        shopId={activeShop.id}
        dates={dates}
        employees={employees ?? []}
        preferences={prefRows ?? []}
        shifts={shiftRows ?? []}
      />

      <HoursSummary rows={hoursRows} />

      <SwapRequests swaps={swaps} />

      <TimeOffRequests requests={requests} />
    </div>
  );
}

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AvailabilityGrid } from "./availability-grid";
import { TimeOffForm } from "./time-off-form";
import { ShiftSwaps } from "./shift-swaps";
import { cancelTimeOffRequest } from "./actions";
import { totalOvertimeHours, type ShiftType } from "@/lib/hours";

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

const STATUS_STYLE: Record<string, string> = {
  approved: "bg-green-100 text-green-800",
  denied: "bg-red-100 text-red-800",
  pending: "bg-yellow-100 text-yellow-800",
};

const TYPE_LABEL: Record<"holiday" | "recuperation", string> = {
  holiday: "Holiday",
  recuperation: "Recuperation",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: employee } = await supabase
    .from("employees")
    .select("id, shop_id, annual_holiday_days")
    .eq("user_id", user!.id)
    .single();

  if (!employee) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dates = Array.from({ length: 56 }, (_, i) => toISO(addDays(today, i)));

  const { data: prefRows } = await supabase
    .from("availability_preferences")
    .select("date, preference")
    .eq("employee_id", employee.id)
    .gte("date", dates[0])
    .lte("date", dates[dates.length - 1]);

  const initial: Record<string, "want_to_work" | "prefer_off" | null> = {};
  for (const row of prefRows ?? []) initial[row.date] = row.preference;

  const { data: requests } = await supabase
    .from("time_off_requests")
    .select("id, start_date, end_date, reason, status, request_type")
    .eq("employee_id", employee.id)
    .order("start_date", { ascending: false })
    .overrideTypes<
      {
        id: string;
        start_date: string;
        end_date: string;
        reason: string | null;
        status: string;
        request_type: "holiday" | "recuperation";
      }[],
      { merge: false }
    >();

  const holidayDaysUsed = (requests ?? [])
    .filter((r) => r.status === "approved" && r.request_type === "holiday")
    .reduce((sum, r) => sum + daysInclusive(r.start_date, r.end_date), 0);
  const holidayDaysRemaining = employee.annual_holiday_days - holidayDaysUsed;

  const recuperationDaysUsed = (requests ?? [])
    .filter((r) => r.status === "approved" && r.request_type === "recuperation")
    .reduce((sum, r) => sum + daysInclusive(r.start_date, r.end_date), 0);

  // All-time published shifts (not just the upcoming window) so the
  // overtime/recuperation balance reflects everything worked so far.
  const { data: allShifts } = await supabase
    .from("shifts")
    .select("date, shift_type")
    .eq("employee_id", employee.id)
    .eq("published", true)
    .overrideTypes<{ date: string; shift_type: ShiftType }[], { merge: false }>();

  const recuperationBalance = totalOvertimeHours(allShifts ?? []) - recuperationDaysUsed * 8;

  const { data: shifts } = await supabase
    .from("shifts")
    .select("id, date, shift_type")
    .eq("employee_id", employee.id)
    .eq("published", true)
    .gte("date", toISO(today))
    .order("date", { ascending: true })
    .overrideTypes<{ id: string; date: string; shift_type: ShiftType }[], { merge: false }>();

  const { data: shopEmployees } = employee.shop_id
    ? await supabase.from("employees").select("id, full_name").eq("shop_id", employee.shop_id)
    : { data: [] };
  const nameById = new Map((shopEmployees ?? []).map((e) => [e.id, e.full_name]));

  type SwapRow = {
    id: string;
    shift_id: string;
    requested_by: string;
    status: "open" | "accepted" | "approved" | "rejected" | "cancelled";
    shifts: { date: string; shift_type: ShiftType } | { date: string; shift_type: ShiftType }[] | null;
  };

  const { data: swapRows } = employee.shop_id
    ? await supabase
        .from("shift_swap_requests")
        .select("id, shift_id, requested_by, status, shifts(date, shift_type)")
        .eq("shop_id", employee.shop_id)
        .overrideTypes<SwapRow[], { merge: false }>()
    : { data: [] as SwapRow[] };

  const swapByShiftId = new Map((swapRows ?? []).filter((r) => r.requested_by === employee.id).map((r) => [r.shift_id, r]));

  const myShifts = (shifts ?? []).map((s) => {
    const swap = swapByShiftId.get(s.id);
    return {
      id: s.id,
      date: s.date,
      shiftType: s.shift_type,
      swapStatus: swap ? swap.status : null,
      swapRequestId: swap ? swap.id : null,
    };
  });

  const openOffers = (swapRows ?? [])
    .filter((r) => r.status === "open" && r.requested_by !== employee.id)
    .map((r) => {
      const shift = Array.isArray(r.shifts) ? r.shifts[0] : r.shifts;
      return {
        id: r.id,
        date: shift?.date ?? "",
        shiftType: shift?.shift_type ?? ("full_day" as ShiftType),
        requesterName: nameById.get(r.requested_by) ?? "Someone",
      };
    })
    .filter((o) => o.date);

  return (
    <div className="space-y-10">
      <section>
        <h1 className="text-xl font-semibold mb-1">Your availability</h1>
        <p className="text-sm text-neutral-500 mb-4">
          Tap days over the next 8 weeks to say when you&apos;d like to work or prefer to be off.
        </p>
        <AvailabilityGrid dates={dates} initial={initial} />
      </section>

      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold">Your shifts &amp; swaps</h2>
          <Link href="/schedule" className="text-sm underline text-neutral-500">
            View full shop schedule
          </Link>
        </div>
        <ShiftSwaps myShifts={myShifts} openOffers={openOffers} />
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">Time off / holiday requests</h2>
        <p className="text-sm text-neutral-500 mb-3">
          {holidayDaysRemaining} of {employee.annual_holiday_days} holiday days remaining this year.
          {" · "}
          {recuperationBalance}h recuperation balance (~{(recuperationBalance / 8).toFixed(1)} days).
        </p>
        <TimeOffForm />
        <ul className="mt-4 space-y-2 text-sm">
          {(requests ?? []).map((r) => (
            <li
              key={r.id}
              className="flex items-center justify-between border rounded-lg px-3 py-2"
            >
              <span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600 mr-2">
                  {TYPE_LABEL[r.request_type]}
                </span>
                {r.start_date} → {r.end_date} {r.reason ? `— ${r.reason}` : ""}
              </span>
              <span className="flex items-center gap-2">
                <span className={`text-xs px-2 py-1 rounded-full ${STATUS_STYLE[r.status]}`}>
                  {r.status}
                </span>
                {r.status === "pending" && (
                  <form
                    action={async () => {
                      "use server";
                      await cancelTimeOffRequest(r.id);
                    }}
                  >
                    <button type="submit" className="text-xs text-neutral-500 underline">
                      Cancel
                    </button>
                  </form>
                )}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

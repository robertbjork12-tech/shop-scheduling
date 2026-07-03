import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ScheduleGrid } from "./schedule-grid";
import { TimeOffRequests } from "./time-off-requests";

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function toISO(d: Date) {
  return d.toISOString().slice(0, 10);
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
    .select("id, full_name")
    .eq("shop_id", activeShop.id)
    .order("full_name");

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
    .select("employee_id, date, published")
    .eq("shop_id", activeShop.id)
    .gte("date", dates[0])
    .lte("date", dates[dates.length - 1]);

  type RequestRow = {
    id: string;
    employee_id: string;
    start_date: string;
    end_date: string;
    reason: string | null;
    status: string;
    employees: { full_name: string } | { full_name: string }[] | null;
  };

  const { data: requestRows } = employeeIds.length
    ? await supabase
        .from("time_off_requests")
        .select("id, employee_id, start_date, end_date, reason, status, employees(full_name)")
        .in("employee_id", employeeIds)
        .order("start_date")
        .overrideTypes<RequestRow[], { merge: false }>()
    : { data: [] as RequestRow[] };

  const requests = (requestRows ?? []).map((r) => ({
    id: r.id,
    start_date: r.start_date,
    end_date: r.end_date,
    reason: r.reason,
    status: r.status,
    employeeName: Array.isArray(r.employees) ? r.employees[0]?.full_name : r.employees?.full_name,
  }));

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

      <TimeOffRequests requests={requests} />
    </div>
  );
}

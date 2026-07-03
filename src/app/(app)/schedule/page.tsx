import { createClient } from "@/lib/supabase/server";
import { SHIFT_LABELS, type ShiftType } from "@/lib/hours";

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function toISO(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default async function SchedulePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: employee } = await supabase
    .from("employees")
    .select("id, shop_id, shops(name)")
    .eq("user_id", user!.id)
    .single<{
      id: string;
      shop_id: string | null;
      shops: { name: string } | { name: string }[] | null;
    }>();

  if (!employee?.shop_id) {
    return (
      <p className="text-sm text-neutral-500">
        You&apos;re not assigned to a shop, so there&apos;s no shared schedule to show.
      </p>
    );
  }

  const shopName = Array.isArray(employee.shops) ? employee.shops[0]?.name : employee.shops?.name;

  const { data: shopEmployees } = await supabase
    .from("employees")
    .select("id, full_name")
    .eq("shop_id", employee.shop_id)
    .order("full_name");

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dates = Array.from({ length: 28 }, (_, i) => toISO(addDays(today, i)));

  const { data: shiftRows } = await supabase
    .from("shifts")
    .select("employee_id, date, shift_type")
    .eq("shop_id", employee.shop_id)
    .eq("published", true)
    .gte("date", dates[0])
    .lte("date", dates[dates.length - 1])
    .overrideTypes<{ employee_id: string; date: string; shift_type: ShiftType }[], { merge: false }>();

  const shiftMap = new Map((shiftRows ?? []).map((s) => [`${s.employee_id}_${s.date}`, s.shift_type]));

  return (
    <div>
      <h1 className="text-xl font-semibold mb-1">{shopName} schedule</h1>
      <p className="text-sm text-neutral-500 mb-4">Published shifts for the next 4 weeks.</p>

      {(shopEmployees ?? []).length === 0 ? (
        <p className="text-sm text-neutral-500">No one is assigned to this shop yet.</p>
      ) : (
        <div className="overflow-x-auto border rounded-lg">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-neutral-100">
                <th className="text-left px-3 py-2">Date</th>
                {(shopEmployees ?? []).map((e) => (
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
                    {(shopEmployees ?? []).map((e) => {
                      const shiftType = shiftMap.get(`${e.id}_${date}`);
                      return (
                        <td key={e.id} className="px-3 py-2">
                          {shiftType ? (
                            <span className="inline-block rounded px-2 py-1 text-xs bg-neutral-900 text-white whitespace-nowrap">
                              {SHIFT_LABELS[shiftType]}
                            </span>
                          ) : (
                            <span className="text-neutral-300">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

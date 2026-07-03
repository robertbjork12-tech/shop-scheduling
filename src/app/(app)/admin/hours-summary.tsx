import { WEEKLY_TARGET_HOURS, MONTHLY_TARGET_HOURS } from "@/lib/hours";

type Row = {
  employeeId: string;
  name: string;
  weekHours: number;
  monthHours: number;
  recuperationBalance: number;
};

export function HoursSummary({ rows }: { rows: Row[] }) {
  return (
    <section>
      <h2 className="text-lg font-semibold mb-2">Hours &amp; overtime</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-neutral-500">No employees assigned to this shop yet.</p>
      ) : (
        <div className="overflow-x-auto border rounded-lg">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-neutral-100">
                <th className="text-left px-3 py-2">Employee</th>
                <th className="text-left px-3 py-2">This week</th>
                <th className="text-left px-3 py-2">This month</th>
                <th className="text-left px-3 py-2">Recuperation balance</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.employeeId} className="border-t">
                  <td className="px-3 py-2">{r.name}</td>
                  <td className="px-3 py-2">
                    <span className={r.weekHours > WEEKLY_TARGET_HOURS ? "text-red-600 font-medium" : ""}>
                      {r.weekHours}h
                    </span>{" "}
                    <span className="text-neutral-400">/ {WEEKLY_TARGET_HOURS}h</span>
                  </td>
                  <td className="px-3 py-2">
                    <span className={r.monthHours > MONTHLY_TARGET_HOURS ? "text-red-600 font-medium" : ""}>
                      {r.monthHours}h
                    </span>{" "}
                    <span className="text-neutral-400">/ {MONTHLY_TARGET_HOURS}h</span>
                  </td>
                  <td className="px-3 py-2">
                    {r.recuperationBalance}h{" "}
                    <span className="text-neutral-400">(~{(r.recuperationBalance / 8).toFixed(1)} days)</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

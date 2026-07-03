"use client";

import { useTransition } from "react";
import { reviewTimeOffRequest } from "./actions";

type Req = {
  id: string;
  start_date: string;
  end_date: string;
  reason: string | null;
  status: string;
  requestType: "holiday" | "recuperation";
  employeeName: string | undefined;
  daysRemaining: number | null;
  hoursRemaining: number | null;
};

const TYPE_LABEL: Record<Req["requestType"], string> = {
  holiday: "Holiday",
  recuperation: "Recuperation",
};

export function TimeOffRequests({ requests }: { requests: Req[] }) {
  const [isPending, startTransition] = useTransition();
  const pending = requests.filter((r) => r.status === "pending");

  return (
    <section>
      <h2 className="text-lg font-semibold mb-2">Time off requests</h2>
      {pending.length === 0 ? (
        <p className="text-sm text-neutral-500">No pending requests.</p>
      ) : (
        <ul className="space-y-2">
          {pending.map((r) => (
            <li
              key={r.id}
              className="flex items-center justify-between border rounded-lg px-3 py-2 text-sm"
            >
              <span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600 mr-2">
                  {TYPE_LABEL[r.requestType]}
                </span>
                <strong>{r.employeeName}</strong>: {r.start_date} → {r.end_date}{" "}
                {r.reason ? `— ${r.reason}` : ""}
                {r.daysRemaining !== null && (
                  <span className="text-neutral-400"> ({r.daysRemaining} days left)</span>
                )}
                {r.hoursRemaining !== null && (
                  <span className="text-neutral-400"> ({r.hoursRemaining}h balance)</span>
                )}
              </span>
              <span className="flex gap-2">
                <button
                  disabled={isPending}
                  onClick={() => startTransition(() => reviewTimeOffRequest(r.id, "approved"))}
                  className="px-2 py-1 rounded bg-green-600 text-white text-xs"
                >
                  Approve
                </button>
                <button
                  disabled={isPending}
                  onClick={() => startTransition(() => reviewTimeOffRequest(r.id, "denied"))}
                  className="px-2 py-1 rounded bg-red-600 text-white text-xs"
                >
                  Deny
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

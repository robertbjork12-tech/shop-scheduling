"use client";

import { useTransition } from "react";
import { reviewTimeOffRequest } from "./actions";

type Req = {
  id: string;
  start_date: string;
  end_date: string;
  reason: string | null;
  status: string;
  employeeName: string | undefined;
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
                <strong>{r.employeeName}</strong>: {r.start_date} → {r.end_date}{" "}
                {r.reason ? `— ${r.reason}` : ""}
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

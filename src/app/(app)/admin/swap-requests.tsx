"use client";

import { useTransition } from "react";
import { approveSwap, rejectSwap } from "./actions";

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

type Swap = {
  id: string;
  date: string;
  fromName: string;
  toName: string;
};

export function SwapRequests({ swaps }: { swaps: Swap[] }) {
  const [isPending, startTransition] = useTransition();

  return (
    <section>
      <h2 className="text-lg font-semibold mb-2">Shift swaps awaiting approval</h2>
      {swaps.length === 0 ? (
        <p className="text-sm text-neutral-500">No swaps waiting on you.</p>
      ) : (
        <ul className="space-y-2">
          {swaps.map((s) => (
            <li
              key={s.id}
              className="flex items-center justify-between border rounded-lg px-3 py-2 text-sm"
            >
              <span>
                {formatDate(s.date)}: <strong>{s.fromName}</strong> → <strong>{s.toName}</strong>
              </span>
              <span className="flex gap-2">
                <button
                  disabled={isPending}
                  onClick={() => startTransition(() => approveSwap(s.id))}
                  className="px-2 py-1 rounded bg-green-600 text-white text-xs"
                >
                  Approve
                </button>
                <button
                  disabled={isPending}
                  onClick={() => startTransition(() => rejectSwap(s.id))}
                  className="px-2 py-1 rounded bg-red-600 text-white text-xs"
                >
                  Reject
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

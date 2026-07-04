"use client";

import { useState, useTransition } from "react";
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
  const [error, setError] = useState<string | null>(null);

  function run(action: () => Promise<{ error?: string }>) {
    startTransition(async () => {
      const result = await action();
      setError(result?.error ?? null);
    });
  }

  return (
    <section>
      <h2 className="text-lg font-semibold mb-2">Shift swaps awaiting approval</h2>
      {error && (
        <p className="mb-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
          {error}
        </p>
      )}
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
                  onClick={() => run(() => approveSwap(s.id))}
                  className="px-2 py-1 rounded bg-green-600 text-white text-xs"
                >
                  Approve
                </button>
                <button
                  disabled={isPending}
                  onClick={() => run(() => rejectSwap(s.id))}
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

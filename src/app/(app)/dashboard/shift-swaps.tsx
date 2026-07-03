"use client";

import { useTransition } from "react";
import { offerShiftSwap, cancelSwapRequest, acceptSwapRequest } from "./actions";
import { SHIFT_LABELS, SHIFT_TIMES, type ShiftType } from "@/lib/hours";

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function formatShift(date: string, shiftType: ShiftType) {
  return `${formatDate(date)} — ${SHIFT_LABELS[shiftType]} (${SHIFT_TIMES[shiftType]})`;
}

type MyShift = {
  id: string;
  date: string;
  shiftType: ShiftType;
  swapStatus: "open" | "accepted" | "approved" | "rejected" | "cancelled" | null;
  swapRequestId: string | null;
};

type OpenOffer = {
  id: string;
  date: string;
  shiftType: ShiftType;
  requesterName: string;
};

export function ShiftSwaps({
  myShifts,
  openOffers,
}: {
  myShifts: MyShift[];
  openOffers: OpenOffer[];
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium mb-2">Your shifts</h3>
        {myShifts.length === 0 ? (
          <p className="text-sm text-neutral-500">No published shifts yet.</p>
        ) : (
          <ul className="text-sm space-y-1">
            {myShifts.map((s) => (
              <li key={s.id} className="flex items-center justify-between border rounded-lg px-3 py-2">
                <span>{formatShift(s.date, s.shiftType)}</span>
                {s.swapStatus === null ? (
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => startTransition(() => offerShiftSwap(s.id))}
                    className="text-xs text-neutral-500 underline"
                  >
                    Offer swap
                  </button>
                ) : s.swapStatus === "open" ? (
                  <span className="flex items-center gap-2">
                    <span className="text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-800">
                      Offered
                    </span>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() =>
                        s.swapRequestId &&
                        startTransition(() => cancelSwapRequest(s.swapRequestId!))
                      }
                      className="text-xs text-neutral-500 underline"
                    >
                      Cancel
                    </button>
                  </span>
                ) : (
                  <span className="text-xs px-2 py-1 rounded-full bg-neutral-100 text-neutral-600">
                    {s.swapStatus}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h3 className="text-sm font-medium mb-2">Open swap offers from your team</h3>
        {openOffers.length === 0 ? (
          <p className="text-sm text-neutral-500">No open offers right now.</p>
        ) : (
          <ul className="text-sm space-y-1">
            {openOffers.map((o) => (
              <li key={o.id} className="flex items-center justify-between border rounded-lg px-3 py-2">
                <span>
                  {formatShift(o.date, o.shiftType)} — offered by {o.requesterName}
                </span>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => startTransition(() => acceptSwapRequest(o.id))}
                  className="text-xs bg-neutral-900 text-white rounded px-2 py-1"
                >
                  Take this shift
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

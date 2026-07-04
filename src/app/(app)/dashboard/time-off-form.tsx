"use client";

import { useRef, useState } from "react";
import { requestTimeOff } from "./actions";

export function TimeOffForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  return (
    <div>
      {message && (
        <p
          className={`mb-3 text-sm rounded px-3 py-2 border ${
            message.type === "error"
              ? "text-red-700 bg-red-50 border-red-200"
              : "text-green-700 bg-green-50 border-green-200"
          }`}
        >
          {message.text}
        </p>
      )}
      <form
        ref={formRef}
        action={async (formData) => {
          const result = await requestTimeOff(formData);
          if (result.error) {
            setMessage({ type: "error", text: result.error });
          } else {
            setMessage({ type: "success", text: result.success ?? "Request sent." });
            formRef.current?.reset();
          }
        }}
        className="flex flex-wrap items-end gap-3"
      >
        <div>
          <label className="block text-xs text-neutral-500 mb-1">Type</label>
          <select name="request_type" className="border rounded px-2 py-1 text-sm">
            <option value="holiday">Holiday</option>
            <option value="recuperation">Recuperation day</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-neutral-500 mb-1">From</label>
          <input type="date" name="start_date" required className="border rounded px-2 py-1 text-sm" />
        </div>
        <div>
          <label className="block text-xs text-neutral-500 mb-1">To</label>
          <input type="date" name="end_date" required className="border rounded px-2 py-1 text-sm" />
        </div>
        <div className="flex-1 min-w-[160px]">
          <label className="block text-xs text-neutral-500 mb-1">Reason (optional)</label>
          <input type="text" name="reason" className="border rounded px-2 py-1 text-sm w-full" />
        </div>
        <button type="submit" className="bg-neutral-900 text-white rounded px-4 py-2 text-sm">
          Request
        </button>
      </form>
    </div>
  );
}

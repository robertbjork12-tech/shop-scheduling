"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Stage = "checking" | "ready" | "invalid";

export default function WelcomePage() {
  const [stage, setStage] = useState<Stage>("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function checkInvite(): Promise<Stage> {
      const hash = new URLSearchParams(window.location.hash.slice(1));
      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");
      const supabase = createClient();

      if (hash.get("error_code") || hash.get("error")) return "invalid";

      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (error) return "invalid";
        window.history.replaceState(null, "", "/welcome");
        return "ready";
      }

      // No tokens in the address — the invite may already have been opened once.
      const { data } = await supabase.auth.getSession();
      return data.session ? "ready" : "invalid";
    }

    checkInvite().then(setStage);
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("Please choose a password of at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("The two passwords don't match — please type the same one twice.");
      return;
    }

    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setSaving(false);
      setError(
        error.message.toLowerCase().includes("password")
          ? error.message
          : "Couldn't save your password. Please try again.",
      );
      return;
    }
    // Full page load so the server picks up the fresh session.
    window.location.assign("/dashboard");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-sm bg-white border rounded-xl p-6 shadow-sm">
        <h1 className="text-xl font-semibold mb-1">Welcome!</h1>

        {stage === "checking" && (
          <p className="text-sm text-neutral-500">Checking your invite…</p>
        )}

        {stage === "invalid" && (
          <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2 mt-4">
            This invite link is no longer valid — it may have expired or already been used. Ask
            your admin to send you a new invite.
          </p>
        )}

        {stage === "ready" && (
          <>
            <p className="text-sm text-neutral-500 mb-6">
              Choose a password to finish setting up your account.
            </p>

            {error && (
              <p className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
                {error}
              </p>
            )}

            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="block text-xs text-neutral-500 mb-1" htmlFor="password">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-neutral-500 mb-1" htmlFor="confirm">
                  Repeat password
                </label>
                <input
                  id="confirm"
                  type="password"
                  required
                  minLength={6}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={saving}
                className="w-full bg-neutral-900 text-white rounded px-4 py-2 text-sm font-medium disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save password and sign in"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

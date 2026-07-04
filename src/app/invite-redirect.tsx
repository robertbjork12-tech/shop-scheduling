"use client";

import { useEffect } from "react";

// Invite links from Supabase land with the session in the URL hash. Depending
// on the signed-in state they can end up on any page (login, dashboard, the
// site root) — wherever they land, forward them to the welcome page, which
// knows how to finish the sign-up.
export function InviteHashRedirect() {
  useEffect(() => {
    if (window.location.pathname.startsWith("/welcome")) return;
    const hash = window.location.hash;
    if (hash.includes("access_token") || hash.includes("error_code")) {
      window.location.replace(`/welcome${hash}`);
    }
  }, []);
  return null;
}

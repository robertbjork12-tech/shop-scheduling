import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Uses the service-role key: full database + auth admin access, bypassing RLS.
// Never import this from a Client Component.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

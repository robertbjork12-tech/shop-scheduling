import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const [email, fullName, password] = process.argv.slice(2);

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in the environment.");
  process.exit(1);
}

if (!email || !fullName || !password) {
  console.error("Usage: node scripts/create-admin.mjs <email> <full name> <password>");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: created, error } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
});

if (error) {
  console.error("Failed to create user:", error.message);
  process.exit(1);
}

const { error: insertError } = await admin.from("employees").insert({
  user_id: created.user.id,
  full_name: fullName,
  role: "admin",
});

if (insertError) {
  console.error("Failed to create employee row:", insertError.message);
  process.exit(1);
}

console.log(`Admin created: ${email}`);

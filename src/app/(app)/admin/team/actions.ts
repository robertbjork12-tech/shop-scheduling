"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type Message = { type: "error" | "success"; text: string };

const GENERIC_ERROR = "Something went wrong. Please try again.";

function err(text: string): Message {
  return { type: "error", text };
}

function ok(text: string): Message {
  return { type: "success", text };
}

async function checkAdmin(): Promise<
  { ok: false; error: string } | { ok: true; userId: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Your session has expired — please sign in again." };

  const { data: me } = await supabase
    .from("employees")
    .select("role")
    .eq("user_id", user.id)
    .single();
  if (me?.role !== "admin") return { ok: false, error: "Only admins can manage the team." };

  return { ok: true, userId: user.id };
}

function finishWithMessage(message: Message): never {
  if (message.type === "success") revalidatePath("/admin/team");
  redirect(`/admin/team?${message.type}=${encodeURIComponent(message.text)}`);
}

function inviteErrorMessage(error: { code?: string; status?: number; message: string }): string {
  const code = error.code ?? "";
  const msg = error.message.toLowerCase();

  if (
    code === "email_address_invalid" ||
    code === "validation_failed" ||
    msg.includes("invalid format") ||
    msg.includes("is invalid")
  ) {
    return "That email address doesn't look valid — please double-check it and try again.";
  }
  if (code === "email_exists" || msg.includes("already been registered")) {
    return "Someone with that email address already has an account.";
  }
  if (code === "over_email_send_rate_limit" || error.status === 429 || msg.includes("rate limit")) {
    return "Email limit reached — please wait an hour and try again.";
  }
  if (msg.includes("not authorized") || msg.includes("not allowed")) {
    return "Invites can't be emailed to this address yet — the app's email service is still in test mode and needs to be connected to a real email provider.";
  }
  return "The invite couldn't be sent. Please try again.";
}

// Where the invite email's link should send people: the "choose your
// password" page on whichever address this app is being used from.
async function welcomeUrl() {
  const h = await headers();
  const origin = h.get("origin");
  if (origin) return `${origin}/welcome`;
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}/welcome`;
}

async function performInvite(formData: FormData): Promise<Message> {
  const auth = await checkAdmin();
  if (!auth.ok) return err(auth.error);

  const email = ((formData.get("email") as string) ?? "").trim();
  const fullName = ((formData.get("full_name") as string) ?? "").trim();
  const shopId = (formData.get("shop_id") as string) || null;
  const role = (formData.get("role") as string) === "admin" ? "admin" : "staff";
  const annualHolidayDays = Number(formData.get("annual_holiday_days")) || 25;

  if (!fullName) return err("Please enter the employee's name.");
  if (!email || !email.includes("@")) {
    return err("That email address doesn't look valid — please double-check it and try again.");
  }

  const admin = createAdminClient();

  const { data: created, error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: await welcomeUrl(),
  });
  if (error) return err(inviteErrorMessage(error));

  const { error: insertError } = await admin.from("employees").insert({
    user_id: created.user.id,
    full_name: fullName,
    shop_id: shopId,
    role,
    annual_holiday_days: annualHolidayDays,
  });
  if (insertError) {
    // Roll back the invited account so the invite can simply be retried.
    await admin.auth.admin.deleteUser(created.user.id);
    return err(GENERIC_ERROR);
  }

  return ok(`Invite sent to ${email}. They'll get an email to set their password.`);
}

export async function inviteEmployee(formData: FormData) {
  let message: Message;
  try {
    message = await performInvite(formData);
  } catch {
    message = err(GENERIC_ERROR);
  }
  finishWithMessage(message);
}

async function performRemove(employeeId: string): Promise<Message> {
  const auth = await checkAdmin();
  if (!auth.ok) return err(auth.error);

  const admin = createAdminClient();
  const { data: employee } = await admin
    .from("employees")
    .select("user_id, full_name")
    .eq("id", employeeId)
    .single();

  if (!employee) return err("That employee could not be found — the page may be out of date.");
  if (employee.user_id === auth.userId) return err("You can't remove your own account.");

  const { error } = await admin.auth.admin.deleteUser(employee.user_id);
  if (error) return err(`Couldn't remove ${employee.full_name}. Please try again.`);

  return ok(`${employee.full_name} has been removed.`);
}

export async function removeEmployee(employeeId: string) {
  let message: Message;
  try {
    message = await performRemove(employeeId);
  } catch {
    message = err(GENERIC_ERROR);
  }
  finishWithMessage(message);
}

async function performHolidayUpdate(employeeId: string, formData: FormData): Promise<Message> {
  const auth = await checkAdmin();
  if (!auth.ok) return err(auth.error);

  const days = Number(formData.get("annual_holiday_days"));
  if (!Number.isFinite(days) || days < 0) {
    return err("Holiday days must be a number of 0 or more.");
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("employees")
    .update({ annual_holiday_days: days })
    .eq("id", employeeId);
  if (error) return err(GENERIC_ERROR);

  return ok("Holiday allowance updated.");
}

export async function updateHolidayAllowance(employeeId: string, formData: FormData) {
  let message: Message;
  try {
    message = await performHolidayUpdate(employeeId, formData);
  } catch {
    message = err(GENERIC_ERROR);
  }
  finishWithMessage(message);
}

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: me } = await supabase
    .from("employees")
    .select("role")
    .eq("user_id", user.id)
    .single();
  if (me?.role !== "admin") throw new Error("Not authorized");
}

export async function inviteEmployee(formData: FormData) {
  await requireAdmin();

  const email = formData.get("email") as string;
  const fullName = formData.get("full_name") as string;
  const shopId = (formData.get("shop_id") as string) || null;
  const role = (formData.get("role") as string) === "admin" ? "admin" : "staff";
  const annualHolidayDays = Number(formData.get("annual_holiday_days")) || 25;

  const admin = createAdminClient();

  const { data: created, error } = await admin.auth.admin.inviteUserByEmail(email);
  if (error) throw error;

  const { error: insertError } = await admin.from("employees").insert({
    user_id: created.user.id,
    full_name: fullName,
    shop_id: shopId,
    role,
    annual_holiday_days: annualHolidayDays,
  });
  if (insertError) throw insertError;

  revalidatePath("/admin/team");
}

export async function removeEmployee(employeeId: string) {
  await requireAdmin();

  const admin = createAdminClient();
  const { data: employee } = await admin
    .from("employees")
    .select("user_id")
    .eq("id", employeeId)
    .single();

  if (employee) {
    await admin.auth.admin.deleteUser(employee.user_id);
  }

  revalidatePath("/admin/team");
}

export async function updateHolidayAllowance(employeeId: string, formData: FormData) {
  await requireAdmin();

  const days = Number(formData.get("annual_holiday_days"));
  if (!Number.isFinite(days) || days < 0) throw new Error("Invalid number of days");

  const admin = createAdminClient();
  await admin.from("employees").update({ annual_holiday_days: days }).eq("id", employeeId);

  revalidatePath("/admin/team");
}

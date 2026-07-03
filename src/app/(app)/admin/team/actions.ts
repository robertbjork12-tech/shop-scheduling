"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function inviteEmployee(formData: FormData) {
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

  const email = formData.get("email") as string;
  const fullName = formData.get("full_name") as string;
  const shopId = (formData.get("shop_id") as string) || null;
  const role = (formData.get("role") as string) === "admin" ? "admin" : "staff";

  const admin = createAdminClient();

  const { data: created, error } = await admin.auth.admin.inviteUserByEmail(email);
  if (error) throw error;

  const { error: insertError } = await admin.from("employees").insert({
    user_id: created.user.id,
    full_name: fullName,
    shop_id: shopId,
    role,
  });
  if (insertError) throw insertError;

  revalidatePath("/admin/team");
}

export async function removeEmployee(employeeId: string) {
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

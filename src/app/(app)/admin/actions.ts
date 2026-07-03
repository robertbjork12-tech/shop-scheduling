"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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

  return supabase;
}

export async function toggleShift(
  shopId: string,
  date: string,
  employeeId: string,
  assigned: boolean,
) {
  const supabase = await requireAdmin();

  if (assigned) {
    await supabase.from("shifts").upsert(
      { shop_id: shopId, date, employee_id: employeeId },
      { onConflict: "shop_id,date,employee_id" },
    );
  } else {
    await supabase
      .from("shifts")
      .delete()
      .eq("shop_id", shopId)
      .eq("date", date)
      .eq("employee_id", employeeId);
  }

  revalidatePath("/admin");
  revalidatePath("/dashboard");
}

export async function publishShifts(shopId: string, startDate: string, endDate: string) {
  const supabase = await requireAdmin();

  await supabase
    .from("shifts")
    .update({ published: true })
    .eq("shop_id", shopId)
    .gte("date", startDate)
    .lte("date", endDate);

  revalidatePath("/admin");
  revalidatePath("/dashboard");
}

export async function reviewTimeOffRequest(id: string, status: "approved" | "denied") {
  const supabase = await requireAdmin();

  await supabase.from("time_off_requests").update({ status }).eq("id", id);

  revalidatePath("/admin");
  revalidatePath("/dashboard");
}

export async function approveSwap(id: string) {
  const supabase = await requireAdmin();

  const { data: swap } = await supabase
    .from("shift_swap_requests")
    .select("id, shift_id, accepted_by, status")
    .eq("id", id)
    .single();

  if (!swap || swap.status !== "accepted" || !swap.accepted_by) {
    throw new Error("This swap isn't ready to approve");
  }

  await supabase.from("shifts").update({ employee_id: swap.accepted_by }).eq("id", swap.shift_id);
  await supabase.from("shift_swap_requests").update({ status: "approved" }).eq("id", id);

  revalidatePath("/admin");
  revalidatePath("/dashboard");
}

export async function rejectSwap(id: string) {
  const supabase = await requireAdmin();

  await supabase.from("shift_swap_requests").update({ status: "rejected" }).eq("id", id);

  revalidatePath("/admin");
  revalidatePath("/dashboard");
}

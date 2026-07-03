"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type Preference = "want_to_work" | "prefer_off" | null;

async function currentEmployeeId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: employee } = await supabase
    .from("employees")
    .select("id")
    .eq("user_id", user.id)
    .single();
  if (!employee) throw new Error("No employee profile linked to this account");

  return { supabase, employeeId: employee.id };
}

export async function setPreference(date: string, preference: Preference) {
  const { supabase, employeeId } = await currentEmployeeId();

  if (preference === null) {
    await supabase
      .from("availability_preferences")
      .delete()
      .eq("employee_id", employeeId)
      .eq("date", date);
  } else {
    await supabase.from("availability_preferences").upsert(
      { employee_id: employeeId, date, preference },
      { onConflict: "employee_id,date" },
    );
  }

  revalidatePath("/dashboard");
  revalidatePath("/admin");
}

export async function requestTimeOff(formData: FormData) {
  const { supabase, employeeId } = await currentEmployeeId();

  const start_date = formData.get("start_date") as string;
  const end_date = formData.get("end_date") as string;
  const reason = (formData.get("reason") as string) || null;
  const request_type = formData.get("request_type") === "recuperation" ? "recuperation" : "holiday";

  await supabase.from("time_off_requests").insert({
    employee_id: employeeId,
    start_date,
    end_date,
    reason,
    request_type,
  });

  revalidatePath("/dashboard");
  revalidatePath("/admin");
}

export async function cancelTimeOffRequest(id: string) {
  const { supabase, employeeId } = await currentEmployeeId();

  await supabase
    .from("time_off_requests")
    .delete()
    .eq("id", id)
    .eq("employee_id", employeeId)
    .eq("status", "pending");

  revalidatePath("/dashboard");
  revalidatePath("/admin");
}

export async function offerShiftSwap(shiftId: string) {
  const { supabase, employeeId } = await currentEmployeeId();

  const { data: shift } = await supabase
    .from("shifts")
    .select("id, shop_id, employee_id")
    .eq("id", shiftId)
    .single();

  if (!shift || shift.employee_id !== employeeId) {
    throw new Error("You can only offer your own shifts for swap");
  }

  await supabase.from("shift_swap_requests").insert({
    shift_id: shift.id,
    shop_id: shift.shop_id,
    requested_by: employeeId,
  });

  revalidatePath("/dashboard");
  revalidatePath("/admin");
}

export async function cancelSwapRequest(id: string) {
  const { supabase, employeeId } = await currentEmployeeId();

  await supabase
    .from("shift_swap_requests")
    .delete()
    .eq("id", id)
    .eq("requested_by", employeeId)
    .eq("status", "open");

  revalidatePath("/dashboard");
  revalidatePath("/admin");
}

export async function acceptSwapRequest(id: string) {
  const { supabase, employeeId } = await currentEmployeeId();

  const { data: swap } = await supabase
    .from("shift_swap_requests")
    .select("id, requested_by, status")
    .eq("id", id)
    .single();

  if (!swap || swap.status !== "open" || swap.requested_by === employeeId) {
    throw new Error("This swap offer is no longer available");
  }

  await supabase
    .from("shift_swap_requests")
    .update({ accepted_by: employeeId, status: "accepted" })
    .eq("id", id)
    .eq("status", "open");

  revalidatePath("/dashboard");
  revalidatePath("/admin");
}

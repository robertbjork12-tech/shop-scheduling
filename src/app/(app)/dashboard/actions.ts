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

  await supabase.from("time_off_requests").insert({
    employee_id: employeeId,
    start_date,
    end_date,
    reason,
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

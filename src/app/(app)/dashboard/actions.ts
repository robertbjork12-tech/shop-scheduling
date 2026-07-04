"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type Preference = "want_to_work" | "prefer_off" | null;

type ActionResult = { error?: string; success?: string };

type Supabase = Awaited<ReturnType<typeof createClient>>;

const SESSION_ERROR = "Your session has expired — please reload the page and sign in again.";
const GENERIC_ERROR = "Something went wrong. Please try again.";

async function currentEmployee(): Promise<
  { ok: false; error: string } | { ok: true; supabase: Supabase; employeeId: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: SESSION_ERROR };

  const { data: employee } = await supabase
    .from("employees")
    .select("id")
    .eq("user_id", user.id)
    .single();
  if (!employee) return { ok: false, error: "No employee profile is linked to this account." };

  return { ok: true, supabase, employeeId: employee.id };
}

export async function setPreference(date: string, preference: Preference): Promise<ActionResult> {
  try {
    const ctx = await currentEmployee();
    if (!ctx.ok) return { error: ctx.error };
    const { supabase, employeeId } = ctx;

    if (preference === null) {
      const { error } = await supabase
        .from("availability_preferences")
        .delete()
        .eq("employee_id", employeeId)
        .eq("date", date);
      if (error) return { error: "Couldn't save your preference. Please try again." };
    } else {
      const { error } = await supabase.from("availability_preferences").upsert(
        { employee_id: employeeId, date, preference },
        { onConflict: "employee_id,date" },
      );
      if (error) return { error: "Couldn't save your preference. Please try again." };
    }

    revalidatePath("/dashboard");
    revalidatePath("/admin");
    return {};
  } catch {
    return { error: GENERIC_ERROR };
  }
}

export async function requestTimeOff(formData: FormData): Promise<ActionResult> {
  try {
    const ctx = await currentEmployee();
    if (!ctx.ok) return { error: ctx.error };
    const { supabase, employeeId } = ctx;

    const start_date = formData.get("start_date") as string;
    const end_date = formData.get("end_date") as string;
    const reason = (formData.get("reason") as string) || null;
    const request_type =
      formData.get("request_type") === "recuperation" ? "recuperation" : "holiday";

    if (!start_date || !end_date) return { error: "Please choose both a start and an end date." };
    if (end_date < start_date) return { error: "The end date can't be before the start date." };

    const { error } = await supabase.from("time_off_requests").insert({
      employee_id: employeeId,
      start_date,
      end_date,
      reason,
      request_type,
    });
    if (error) return { error: "Couldn't send your request. Please try again." };

    revalidatePath("/dashboard");
    revalidatePath("/admin");
    return { success: "Request sent — your admin will review it." };
  } catch {
    return { error: GENERIC_ERROR };
  }
}

export async function cancelTimeOffRequest(id: string): Promise<ActionResult> {
  try {
    const ctx = await currentEmployee();
    if (!ctx.ok) return { error: ctx.error };
    const { supabase, employeeId } = ctx;

    const { error } = await supabase
      .from("time_off_requests")
      .delete()
      .eq("id", id)
      .eq("employee_id", employeeId)
      .eq("status", "pending");
    if (error) return { error: "Couldn't cancel the request. Please try again." };

    revalidatePath("/dashboard");
    revalidatePath("/admin");
    return {};
  } catch {
    return { error: GENERIC_ERROR };
  }
}

export async function offerShiftSwap(shiftId: string): Promise<ActionResult> {
  try {
    const ctx = await currentEmployee();
    if (!ctx.ok) return { error: ctx.error };
    const { supabase, employeeId } = ctx;

    const { data: shift } = await supabase
      .from("shifts")
      .select("id, shop_id, employee_id")
      .eq("id", shiftId)
      .single();

    if (!shift || shift.employee_id !== employeeId) {
      return { error: "You can only offer your own shifts for swap." };
    }

    const { error } = await supabase.from("shift_swap_requests").insert({
      shift_id: shift.id,
      shop_id: shift.shop_id,
      requested_by: employeeId,
    });
    if (error) return { error: "Couldn't offer this shift for swap. Please try again." };

    revalidatePath("/dashboard");
    revalidatePath("/admin");
    return {};
  } catch {
    return { error: GENERIC_ERROR };
  }
}

export async function cancelSwapRequest(id: string): Promise<ActionResult> {
  try {
    const ctx = await currentEmployee();
    if (!ctx.ok) return { error: ctx.error };
    const { supabase, employeeId } = ctx;

    const { error } = await supabase
      .from("shift_swap_requests")
      .delete()
      .eq("id", id)
      .eq("requested_by", employeeId)
      .eq("status", "open");
    if (error) return { error: "Couldn't cancel the swap offer. Please try again." };

    revalidatePath("/dashboard");
    revalidatePath("/admin");
    return {};
  } catch {
    return { error: GENERIC_ERROR };
  }
}

export async function acceptSwapRequest(id: string): Promise<ActionResult> {
  try {
    const ctx = await currentEmployee();
    if (!ctx.ok) return { error: ctx.error };
    const { supabase, employeeId } = ctx;

    const { data: swap } = await supabase
      .from("shift_swap_requests")
      .select("id, requested_by, status")
      .eq("id", id)
      .single();

    if (!swap || swap.status !== "open" || swap.requested_by === employeeId) {
      return { error: "This swap offer is no longer available." };
    }

    const { error } = await supabase
      .from("shift_swap_requests")
      .update({ accepted_by: employeeId, status: "accepted" })
      .eq("id", id)
      .eq("status", "open");
    if (error) return { error: "Couldn't take this shift. Please try again." };

    revalidatePath("/dashboard");
    revalidatePath("/admin");
    return {};
  } catch {
    return { error: GENERIC_ERROR };
  }
}

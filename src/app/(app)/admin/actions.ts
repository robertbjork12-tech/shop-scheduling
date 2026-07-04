"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ShiftType } from "@/lib/hours";

type ActionResult = { error?: string; success?: string };

type Supabase = Awaited<ReturnType<typeof createClient>>;

const SESSION_ERROR = "Your session has expired — please reload the page and sign in again.";
const GENERIC_ERROR = "Something went wrong. Please try again.";

async function requireAdmin(): Promise<
  { ok: false; error: string } | { ok: true; supabase: Supabase }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: SESSION_ERROR };

  const { data: me } = await supabase
    .from("employees")
    .select("role")
    .eq("user_id", user.id)
    .single();
  if (me?.role !== "admin") return { ok: false, error: "Only admins can do this." };

  return { ok: true, supabase };
}

export async function setShift(
  shopId: string,
  date: string,
  employeeId: string,
  shiftType: ShiftType | null,
): Promise<ActionResult> {
  try {
    const ctx = await requireAdmin();
    if (!ctx.ok) return { error: ctx.error };
    const { supabase } = ctx;

    if (shiftType) {
      const { error } = await supabase.from("shifts").upsert(
        { shop_id: shopId, date, employee_id: employeeId, shift_type: shiftType },
        { onConflict: "shop_id,date,employee_id" },
      );
      if (error) return { error: "Couldn't save that shift. Please try again." };
    } else {
      const { error } = await supabase
        .from("shifts")
        .delete()
        .eq("shop_id", shopId)
        .eq("date", date)
        .eq("employee_id", employeeId);
      if (error) return { error: "Couldn't clear that shift. Please try again." };
    }

    revalidatePath("/admin");
    revalidatePath("/dashboard");
    revalidatePath("/schedule");
    return {};
  } catch {
    return { error: GENERIC_ERROR };
  }
}

export async function publishShifts(
  shopId: string,
  startDate: string,
  endDate: string,
): Promise<ActionResult> {
  try {
    const ctx = await requireAdmin();
    if (!ctx.ok) return { error: ctx.error };
    const { supabase } = ctx;

    const { error } = await supabase
      .from("shifts")
      .update({ published: true })
      .eq("shop_id", shopId)
      .gte("date", startDate)
      .lte("date", endDate);
    if (error) return { error: "Couldn't publish the schedule. Please try again." };

    revalidatePath("/admin");
    revalidatePath("/dashboard");
    revalidatePath("/schedule");
    return { success: "Schedule published — your team can see it now." };
  } catch {
    return { error: GENERIC_ERROR };
  }
}

export async function reviewTimeOffRequest(
  id: string,
  status: "approved" | "denied",
): Promise<ActionResult> {
  try {
    const ctx = await requireAdmin();
    if (!ctx.ok) return { error: ctx.error };
    const { supabase } = ctx;

    const { error } = await supabase.from("time_off_requests").update({ status }).eq("id", id);
    if (error) return { error: "Couldn't update that request. Please try again." };

    revalidatePath("/admin");
    revalidatePath("/dashboard");
    return {};
  } catch {
    return { error: GENERIC_ERROR };
  }
}

export async function approveSwap(id: string): Promise<ActionResult> {
  try {
    const ctx = await requireAdmin();
    if (!ctx.ok) return { error: ctx.error };
    const { supabase } = ctx;

    const { data: swap } = await supabase
      .from("shift_swap_requests")
      .select("id, shift_id, accepted_by, status")
      .eq("id", id)
      .single();

    if (!swap || swap.status !== "accepted" || !swap.accepted_by) {
      return { error: "This swap isn't ready to approve — it may have changed. Try reloading the page." };
    }

    const { error: shiftError } = await supabase
      .from("shifts")
      .update({ employee_id: swap.accepted_by })
      .eq("id", swap.shift_id);
    if (shiftError) return { error: "Couldn't approve the swap. Please try again." };

    const { error: swapError } = await supabase
      .from("shift_swap_requests")
      .update({ status: "approved" })
      .eq("id", id);
    if (swapError) return { error: "Couldn't approve the swap. Please try again." };

    revalidatePath("/admin");
    revalidatePath("/dashboard");
    return {};
  } catch {
    return { error: GENERIC_ERROR };
  }
}

export async function rejectSwap(id: string): Promise<ActionResult> {
  try {
    const ctx = await requireAdmin();
    if (!ctx.ok) return { error: ctx.error };
    const { supabase } = ctx;

    const { error } = await supabase
      .from("shift_swap_requests")
      .update({ status: "rejected" })
      .eq("id", id);
    if (error) return { error: "Couldn't reject the swap. Please try again." };

    revalidatePath("/admin");
    revalidatePath("/dashboard");
    return {};
  } catch {
    return { error: GENERIC_ERROR };
  }
}

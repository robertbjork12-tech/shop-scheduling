import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/login/actions";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: employee } = await supabase
    .from("employees")
    .select("id, full_name, role, shop_id, shops(name)")
    .eq("user_id", user.id)
    .single<{
      id: string;
      full_name: string;
      role: "admin" | "staff";
      shop_id: string | null;
      shops: { name: string } | { name: string }[] | null;
    }>();

  if (!employee) {
    return (
      <div className="max-w-md mx-auto p-8 text-sm">
        <p>
          Your login isn&apos;t linked to an employee profile yet. Ask your
          admin to add you on the Team page.
        </p>
        <form action={logout} className="mt-4">
          <button type="submit" className="underline text-neutral-500">
            Sign out
          </button>
        </form>
      </div>
    );
  }

  const shopName = Array.isArray(employee.shops)
    ? employee.shops[0]?.name
    : employee.shops?.name;

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="border-b bg-white px-6 py-4 flex items-center justify-between">
        <div>
          <p className="font-semibold">{employee.full_name}</p>
          <p className="text-sm text-neutral-500">
            {employee.role === "admin" ? "Admin" : shopName ?? "No shop assigned"}
          </p>
        </div>
        <nav className="flex gap-4 items-center text-sm">
          <Link href="/dashboard">My schedule</Link>
          {employee.role === "admin" && <Link href="/admin">Admin</Link>}
          {employee.role === "admin" && <Link href="/admin/team">Team</Link>}
          <form action={logout}>
            <button type="submit" className="text-neutral-500 underline">
              Sign out
            </button>
          </form>
        </nav>
      </header>
      <main className="max-w-5xl mx-auto p-6">{children}</main>
    </div>
  );
}

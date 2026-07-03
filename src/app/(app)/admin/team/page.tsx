import { createClient } from "@/lib/supabase/server";
import { inviteEmployee, removeEmployee } from "./actions";

export default async function TeamPage() {
  const supabase = await createClient();
  const { data: shops } = await supabase.from("shops").select("id, name").order("name");
  const { data: employees } = await supabase
    .from("employees")
    .select("id, full_name, role, shop_id, shops(name)")
    .order("full_name")
    .overrideTypes<
      {
        id: string;
        full_name: string;
        role: "admin" | "staff";
        shop_id: string | null;
        shops: { name: string } | { name: string }[] | null;
      }[],
      { merge: false }
    >();

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-xl font-semibold mb-4">Team</h1>
        <ul className="space-y-2">
          {(employees ?? []).map((e) => {
            const shopName = Array.isArray(e.shops) ? e.shops[0]?.name : e.shops?.name;
            return (
              <li
                key={e.id}
                className="flex items-center justify-between border rounded-lg px-3 py-2 text-sm"
              >
                <span>
                  {e.full_name} — {e.role}
                </span>
                <span className="flex items-center gap-3 text-neutral-500">
                  {shopName ?? "No shop"}
                  <form action={removeEmployee.bind(null, e.id)}>
                    <button type="submit" className="text-red-600 underline">
                      Remove
                    </button>
                  </form>
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">Invite a new employee</h2>
        <p className="text-sm text-neutral-500 mb-3">
          They&apos;ll get an email invite to set their own password.
        </p>
        <form action={inviteEmployee} className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs text-neutral-500 mb-1">Full name</label>
            <input name="full_name" required className="border rounded px-2 py-1 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-neutral-500 mb-1">Email</label>
            <input name="email" type="email" required className="border rounded px-2 py-1 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-neutral-500 mb-1">Shop</label>
            <select name="shop_id" className="border rounded px-2 py-1 text-sm">
              {(shops ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-neutral-500 mb-1">Role</label>
            <select name="role" className="border rounded px-2 py-1 text-sm">
              <option value="staff">Staff</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <button type="submit" className="bg-neutral-900 text-white rounded px-4 py-2 text-sm">
            Send invite
          </button>
        </form>
      </section>
    </div>
  );
}

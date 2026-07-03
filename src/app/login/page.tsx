import { login } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-sm bg-white border rounded-xl p-6 shadow-sm">
        <h1 className="text-xl font-semibold mb-1">Shop Scheduling</h1>
        <p className="text-sm text-neutral-500 mb-6">Sign in with the login your admin created for you.</p>

        {error && (
          <p className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
            {error}
          </p>
        )}

        <form action={login} className="space-y-4">
          <div>
            <label className="block text-xs text-neutral-500 mb-1" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="w-full border rounded px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-neutral-500 mb-1" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="w-full border rounded px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-neutral-900 text-white rounded px-4 py-2 text-sm font-medium"
          >
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
}

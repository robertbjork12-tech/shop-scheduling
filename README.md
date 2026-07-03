# Shop Scheduling

A small internal app for running the schedule at Airport Shop and City Shop:
employees log in, mark days they'd like to work, and request time off. The
admin (owner) sees both shops, assigns shifts, approves/denies requests, and
publishes the schedule.

Stack: Next.js (App Router) + Supabase (Postgres, Auth, RLS), deployable on
Vercel for free at this scale.

## 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com), create a free account and a
   new project (pick a region close to Switzerland, e.g. Frankfurt).
2. In the project dashboard, open **SQL Editor**, paste the contents of
   [`supabase/schema.sql`](supabase/schema.sql), and run it. This creates the
   tables, security policies, and the two shops ("Airport Shop", "City Shop").
3. Go to **Project Settings → API**. Copy the **Project URL**, the
   **anon public key**, and the **service_role key**.

## 2. Configure environment variables

Copy the example file and fill in the values from step 1:

```bash
cp .env.local.example .env.local
```

`SUPABASE_SERVICE_ROLE_KEY` is only ever used in server-side code (inviting
employees) — never expose it to the browser or commit it.

## 3. Create your own admin login

1. In Supabase: **Authentication → Users → Add user**, create a user with
   your own email and a password (or "send invite" instead).
2. Back in the **SQL Editor**, run (replacing the email):

   ```sql
   insert into employees (user_id, full_name, role)
   select id, 'Your Name', 'admin' from auth.users where email = 'you@example.com';
   ```

3. Run the app locally and sign in:

   ```bash
   npm install
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) and log in.

## 4. Add your employees

As the admin, go to **Team** in the app and invite each employee by email —
they'll get an email to set their own password, and you assign them to a
shop and a role (staff or admin) at invite time.

## 5. Deploy online

1. Push this repo to GitHub.
2. Go to [vercel.com/new](https://vercel.com/new), import the repo.
3. Add the same three environment variables from `.env.local` in the Vercel
   project settings.
4. Deploy. Vercel gives you a `https://your-app.vercel.app` URL — you can
   also attach a custom domain later.

## How it works

- **Employees** (`/dashboard`): tap days over the next 8 weeks to mark
  "want to work" or "prefer off", submit holiday/time-off requests, and see
  their published shifts.
- **Admin** (`/admin`): switch between shops, see each employee's
  preferences and requests laid over a 4-week grid, click cells to assign
  shifts, approve/deny time-off requests, and publish the schedule (which
  makes it visible to employees).
- **Team** (`/admin/team`): invite/remove employee logins and assign them to
  a shop.

Data access is enforced by Postgres Row Level Security (see
`supabase/schema.sql`): employees can only ever read/write their own
availability and requests; only admins can see across employees, assign
shifts, or publish.

-- Run this once in the Supabase SQL editor for a new project.

create extension if not exists "pgcrypto";

do $$ begin
  create type employee_role as enum ('admin', 'staff');
exception when duplicate_object then null; end $$;

do $$ begin
  create type preference_type as enum ('want_to_work', 'prefer_off');
exception when duplicate_object then null; end $$;

do $$ begin
  create type request_status as enum ('pending', 'approved', 'denied');
exception when duplicate_object then null; end $$;

create table if not exists shops (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists employees (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  shop_id uuid references shops(id) on delete set null,
  full_name text not null,
  role employee_role not null default 'staff',
  created_at timestamptz not null default now()
);

create table if not exists availability_preferences (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  date date not null,
  preference preference_type not null,
  created_at timestamptz not null default now(),
  unique (employee_id, date)
);

create table if not exists time_off_requests (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  reason text,
  status request_status not null default 'pending',
  created_at timestamptz not null default now(),
  constraint valid_range check (end_date >= start_date)
);

create table if not exists shifts (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,
  date date not null,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  unique (shop_id, date, employee_id)
);

insert into shops (name) values ('Airport Shop'), ('City Shop')
on conflict (name) do nothing;

-- Security-definer helpers: these bypass RLS internally so policies that
-- call them don't recurse into the same table's own RLS checks.
create or replace function auth_employee_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select id from employees where user_id = auth.uid();
$$;

create or replace function auth_is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from employees where user_id = auth.uid() and role = 'admin'
  );
$$;

create or replace function auth_shop_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select shop_id from employees where user_id = auth.uid();
$$;

alter table shops enable row level security;
alter table employees enable row level security;
alter table availability_preferences enable row level security;
alter table time_off_requests enable row level security;
alter table shifts enable row level security;

create policy "shops readable by employees" on shops
  for select using (auth.uid() is not null);

create policy "shops manageable by admin" on shops
  for all using (auth_is_admin()) with check (auth_is_admin());

create policy "employees read own row" on employees
  for select using (user_id = auth.uid());

create policy "employees read shop colleagues" on employees
  for select using (shop_id is not null and shop_id = auth_shop_id());

create policy "admin full access to employees" on employees
  for all using (auth_is_admin()) with check (auth_is_admin());

create policy "employee manages own preferences" on availability_preferences
  for all
  using (employee_id = auth_employee_id())
  with check (employee_id = auth_employee_id());

create policy "admin reads all preferences" on availability_preferences
  for select using (auth_is_admin());

create policy "employee reads own requests" on time_off_requests
  for select using (employee_id = auth_employee_id());

create policy "employee creates own requests" on time_off_requests
  for insert with check (employee_id = auth_employee_id());

create policy "employee cancels own pending requests" on time_off_requests
  for delete using (employee_id = auth_employee_id() and status = 'pending');

create policy "admin full access to requests" on time_off_requests
  for all using (auth_is_admin()) with check (auth_is_admin());

create policy "employee reads own published shifts" on shifts
  for select using (employee_id = auth_employee_id() and published = true);

create policy "admin full access to shifts" on shifts
  for all using (auth_is_admin()) with check (auth_is_admin());

-- After running this file, create your own login in Supabase Auth
-- (Authentication -> Users -> Add user), then run this once, filling
-- in your email, to make yourself an admin:
--
-- insert into employees (user_id, full_name, role)
-- select id, 'Your Name', 'admin' from auth.users where email = 'you@example.com';

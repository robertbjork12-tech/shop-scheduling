-- Run this once in the Supabase SQL editor on the already-live project to
-- add shift swapping and holiday balances (supabase/schema.sql already
-- includes this for anyone setting the project up fresh from now on).

alter table employees add column if not exists annual_holiday_days integer not null default 25;

do $$ begin
  create type swap_status as enum ('open', 'accepted', 'approved', 'rejected', 'cancelled');
exception when duplicate_object then null; end $$;

create table if not exists shift_swap_requests (
  id uuid primary key default gen_random_uuid(),
  shift_id uuid not null references shifts(id) on delete cascade,
  shop_id uuid not null references shops(id) on delete cascade,
  requested_by uuid not null references employees(id) on delete cascade,
  accepted_by uuid references employees(id) on delete set null,
  status swap_status not null default 'open',
  created_at timestamptz not null default now()
);

alter table shift_swap_requests enable row level security;

create policy "employee reads shop swap requests" on shift_swap_requests
  for select using (
    shop_id = auth_shop_id() or requested_by = auth_employee_id() or accepted_by = auth_employee_id()
  );

create policy "employee creates own swap request" on shift_swap_requests
  for insert with check (requested_by = auth_employee_id() and shop_id = auth_shop_id());

create policy "employee cancels own open request" on shift_swap_requests
  for delete using (requested_by = auth_employee_id() and status = 'open');

create policy "employee accepts open shop request" on shift_swap_requests
  for update using (shop_id = auth_shop_id() and status = 'open')
  with check (shop_id = auth_shop_id());

create policy "admin full access to swap requests" on shift_swap_requests
  for all using (auth_is_admin()) with check (auth_is_admin());

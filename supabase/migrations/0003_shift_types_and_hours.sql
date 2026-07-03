-- Run this once in the Supabase SQL editor on the already-live project to
-- add shift types (morning/evening/full day) and holiday-vs-recuperation
-- time-off requests (supabase/schema.sql already includes this for anyone
-- setting the project up fresh from now on).

do $$ begin
  create type shift_type as enum ('morning', 'evening', 'full_day');
exception when duplicate_object then null; end $$;

do $$ begin
  create type request_type as enum ('holiday', 'recuperation');
exception when duplicate_object then null; end $$;

alter table shifts add column if not exists shift_type shift_type not null default 'full_day';
alter table time_off_requests add column if not exists request_type request_type not null default 'holiday';

-- Widen shift visibility: employees should see the whole shop's published
-- schedule, not just their own shifts.
drop policy if exists "employee reads own published shifts" on shifts;

do $$ begin
  create policy "employee reads shop published shifts" on shifts
    for select using (shop_id = auth_shop_id() and published = true);
exception when duplicate_object then null; end $$;

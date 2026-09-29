-- TIME IS RESPECT — Supabase setup
-- Run this whole file in Supabase > SQL Editor.
-- This stores only anonymous campaign timing data:
-- excuse, estimated time, actual time, timestamp.
-- Do NOT store names, emails, phone numbers, GPS, etc. in this table.

create extension if not exists pgcrypto;

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  excuse text not null check (char_length(excuse) between 1 and 100),
  estimated_minutes numeric not null check (estimated_minutes >= 1 and estimated_minutes <= 360),
  actual_minutes numeric not null check (actual_minutes >= 0.1 and actual_minutes <= 1440),
  created_at timestamptz not null default now()
);

create index if not exists sessions_created_at_idx
  on public.sessions (created_at desc);

create index if not exists sessions_excuse_idx
  on public.sessions (excuse);

alter table public.sessions enable row level security;

drop policy if exists "public can insert sessions" on public.sessions;
create policy "public can insert sessions"
on public.sessions
for insert
to anon, authenticated
with check (true);

drop policy if exists "public can read sessions" on public.sessions;
create policy "public can read sessions"
on public.sessions
for select
to anon, authenticated
using (true);

-- The frontend never needs UPDATE or DELETE permission.
revoke update, delete on public.sessions from anon, authenticated;

-- Dashboard aggregate function.
create or replace function public.get_dashboard_stats()
returns json
language sql
security definer
set search_path = public
as $$
  select json_build_object(
    'people', count(*),
    'total_minutes', coalesce(round(sum(actual_minutes)::numeric, 1), 0),
    'average_minutes', coalesce(round(avg(actual_minutes)::numeric, 1), 0),
    'median_minutes', coalesce(round(percentile_cont(0.5) within group (order by actual_minutes)::numeric, 1), 0),
    'average_gap', coalesce(round(avg(abs(actual_minutes - estimated_minutes))::numeric, 1), 0),
    'excuses',
      coalesce(
        (
          select json_agg(x)
          from (
            select excuse, count(*)::integer as count
            from public.sessions
            group by excuse
            order by count(*) desc, excuse asc
          ) x
        ),
        '[]'::json
      )
  )
  from public.sessions;
$$;

grant execute on function public.get_dashboard_stats() to anon, authenticated;

-- Enable realtime updates for the live dashboard.
do $$
begin
  alter publication supabase_realtime add table public.sessions;
exception
  when duplicate_object then null;
end $$;

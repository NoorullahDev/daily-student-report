-- ============================================================================
-- Daily Student Habit & Time Report — Supabase schema
-- Run this file in the Supabase Dashboard: SQL Editor -> New query -> paste
-- -> Run. Then run supabase/seed.sql.
-- All totals and status colours are computed in app code (lib/status.ts),
-- never in the database.
-- ============================================================================

-- Students roster (managed by the admin).
create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  order_no int not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
-- Roster order: keep order_no unique per active roster position.
create unique index if not exists students_order_no_unique
  on public.students (order_no);

-- One daily report per student. All times are minutes; water is litres.
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  date date not null,
  school_min int not null default 0,
  study_min int not null default 0,
  subjects_count int not null default 0,
  subjects_text text not null default '',
  sleep_min int not null default 0,
  fun_text text not null default '',
  fun_min int not null default 0,
  exercise_min int not null default 0,
  water_l numeric(4, 2) not null default 0,
  other_text text not null default '',
  other_min int not null default 0,
  habit_text text not null default '',
  habit_min int not null default 0,
  screen_min int not null default 0,
  created_at timestamptz not null default now(),
  -- One entry per student per date; a resubmit updates the old row.
  unique (student_id, date),
  -- Guardrails at the DB level too (the app validates first as well).
  constraint reports_minutes_non_negative check (
    school_min >= 0 and study_min >= 0 and sleep_min >= 0 and
    fun_min >= 0 and exercise_min >= 0 and other_min >= 0 and
    habit_min >= 0 and screen_min >= 0
  ),
  constraint reports_minutes_max check (
    school_min <= 1440 and study_min <= 1440 and sleep_min <= 1440 and
    fun_min <= 1440 and exercise_min <= 1440 and other_min <= 1440 and
    habit_min <= 1440 and screen_min <= 1440
  ),
  constraint reports_subjects_count_range check (subjects_count >= 0 and subjects_count <= 50),
  constraint reports_water_range check (water_l >= 0 and water_l <= 20)
);
create index if not exists reports_date_idx on public.reports (date);
create index if not exists reports_student_date_idx on public.reports (student_id, date);

-- Admin-edited threshold overrides (one row, id = 1).
-- `thresholds` is a partial copy of lib/report-config.ts DEFAULT_THRESHOLDS;
-- the app merges it over the defaults, so missing keys keep their defaults.
create table if not exists public.report_settings (
  id int primary key default 1,
  thresholds jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
insert into public.report_settings (id, thresholds)
values (1, '{}'::jsonb)
on conflict (id) do nothing;

-- ============================================================================
-- Row Level Security
-- Public (anon) role: read the active roster, read reports, insert/update
-- their own daily report (upsert by student+date). Anon can NEVER delete.
-- Admin writes (roster, edit/delete entries, settings) go through server
-- API routes that use the service-role key and check the admin cookie first.
-- ============================================================================
alter table public.students enable row level security;
alter table public.reports enable row level security;
alter table public.report_settings enable row level security;

-- Students: anyone can read active students (the public form dropdown).
drop policy if exists "anon read active students" on public.students;
create policy "anon read active students" on public.students
  for select to anon using (active = true);

-- Reports: anyone can read reports (needed for the public form preload and
-- the admin table, which reads through the anon key for GETs).
drop policy if exists "anon read reports" on public.reports;
create policy "anon read reports" on public.reports
  for select to anon using (true);

-- Reports: anyone can insert a report (the public student form).
drop policy if exists "anon insert reports" on public.reports;
create policy "anon insert reports" on public.reports
  for insert to anon with check (true);

-- Reports: anyone can update a report (resubmit updates the same day's row).
drop policy if exists "anon update reports" on public.reports;
create policy "anon update reports" on public.reports
  for update to anon using (true) with check (true);

-- No delete policy for anon on reports: deletes are admin-only via the
-- service-role key in the API route.

-- Settings: readable by anon (the student form uses the defaults anyway;
-- the admin page reads overrides through the admin API). Writes are
-- service-role only — there is intentionally no anon insert/update policy.
drop policy if exists "anon read settings" on public.report_settings;
create policy "anon read settings" on public.report_settings
  for select to anon using (true);

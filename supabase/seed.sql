-- Seed the initial student roster. Safe to run more than once
-- (ON CONFLICT DO NOTHING keeps existing rows untouched).
insert into public.students (name, order_no, active) values
  ('Zara', 1, true),
  ('Syed Hashim Hussain', 2, true)
on conflict (order_no) do nothing;

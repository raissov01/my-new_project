alter table public.profiles
  add column if not exists streak_days integer default 0 not null,
  add column if not exists last_active_date date,
  add column if not exists points integer default 0 not null;

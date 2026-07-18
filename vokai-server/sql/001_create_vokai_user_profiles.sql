create table if not exists public.vokai_user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text not null check (char_length(name) between 1 and 80),
  language text not null check (char_length(language) between 1 and 40),
  free_time text not null check (free_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  daily_minutes smallint not null check (daily_minutes between 10 and 240),
  reminders boolean not null default true,
  current_streak integer not null default 0 check (current_streak >= 0),
  longest_streak integer not null default 0 check (longest_streak >= 0),
  started_at timestamptz not null,
  updated_at timestamptz not null default now()
);

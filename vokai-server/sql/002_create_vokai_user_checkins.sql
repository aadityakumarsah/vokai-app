create table if not exists public.vokai_user_checkins (
  user_id uuid not null references public.vokai_user_profiles(user_id) on delete cascade,
  check_date date not null,
  journey_day smallint not null check (journey_day between 1 and 90),
  learn boolean not null default false,
  build boolean not null default false,
  reflect boolean not null default false,
  day_complete boolean not null default false,
  completed_at timestamptz,
  primary key (user_id, check_date)
);

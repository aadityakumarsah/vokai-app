alter table public.vokai_user_profiles
  add column if not exists coins integer not null default 0 check (coins >= 0),
  add column if not exists points integer not null default 0 check (points >= 0);

create table if not exists public.vokai_checkin_rewards (
  user_id uuid not null references public.vokai_user_profiles(user_id) on delete cascade,
  check_date date not null,
  journey_day smallint not null check (journey_day between 1 and 90),
  coins integer not null check (coins >= 0),
  points integer not null check (points >= 0),
  bonus_label text,
  granted_at timestamptz not null default now(),
  primary key (user_id, check_date)
);

create index if not exists vokai_checkin_rewards_by_user_day
  on public.vokai_checkin_rewards (user_id, journey_day);

alter table public.vokai_checkin_rewards enable row level security;
revoke all privileges on table public.vokai_checkin_rewards from anon;
grant select on table public.vokai_checkin_rewards to authenticated;
grant all privileges on table public.vokai_checkin_rewards to service_role;

drop policy if exists "vokai user reads own checkin rewards" on public.vokai_checkin_rewards;
create policy "vokai user reads own checkin rewards"
  on public.vokai_checkin_rewards for select to authenticated
  using ((select auth.uid()) = user_id);

-- Give existing completed days the same rewards as new completions. The
-- primary key keeps this safe to rerun without awarding a day twice.
insert into public.vokai_checkin_rewards (user_id, check_date, journey_day, coins, points, bonus_label)
select
  checkin.user_id,
  checkin.check_date,
  checkin.journey_day,
  10 + case checkin.journey_day when 2 then 10 when 3 then 20 when 4 then 25 when 10 then 50 when 60 then 200 else 0 end,
  5 + case checkin.journey_day when 2 then 5 when 3 then 10 when 4 then 15 when 10 then 25 when 60 then 100 else 0 end,
  case checkin.journey_day when 2 then 'Day 2 boost' when 3 then 'Day 3 boost' when 4 then 'Day 4 boost' when 10 then 'Day 10 celebration' when 60 then 'Day 60 legend reward' else null end
from public.vokai_user_checkins as checkin
where checkin.day_complete = true
on conflict (user_id, check_date) do nothing;

update public.vokai_user_profiles as profile
set coins = coalesce(rewards.coins, 0),
    points = coalesce(rewards.points, 0)
from (
  select user_id, sum(coins)::integer as coins, sum(points)::integer as points
  from public.vokai_checkin_rewards
  group by user_id
) as rewards
where profile.user_id = rewards.user_id;

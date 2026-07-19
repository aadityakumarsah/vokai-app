-- Dodo Payments is the payment authority. This table stores the VOKAI-side
-- checkout relationship and only becomes premium-active after a verified
-- Dodo webhook updates its status.
create table if not exists public.vokai_premium_prebookings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.vokai_user_profiles(user_id) on delete set null,
  email text not null,
  name text not null,
  plan text not null check (plan in ('weekly', 'monthly', 'yearly')),
  source text not null check (source in ('docs_prebook', 'app_checkout')),
  status text not null default 'checkout_created',
  dodo_checkout_session_id text unique,
  dodo_payment_id text,
  dodo_subscription_id text,
  last_webhook_event_id text,
  last_webhook_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists vokai_premium_prebookings_by_user
  on public.vokai_premium_prebookings (user_id, updated_at desc)
  where user_id is not null;

create index if not exists vokai_premium_prebookings_by_email
  on public.vokai_premium_prebookings (lower(email), created_at desc);

create unique index if not exists vokai_premium_prebookings_unique_payment
  on public.vokai_premium_prebookings (dodo_payment_id)
  where dodo_payment_id is not null;

create table if not exists public.vokai_dodo_webhook_events (
  event_id text primary key,
  event_type text not null,
  payload jsonb not null,
  received_at timestamptz not null default now()
);

alter table public.vokai_premium_prebookings enable row level security;
alter table public.vokai_dodo_webhook_events enable row level security;

revoke all privileges on table public.vokai_premium_prebookings from anon;
grant select on table public.vokai_premium_prebookings to authenticated;
grant all privileges on table public.vokai_premium_prebookings to service_role;

revoke all privileges on table public.vokai_dodo_webhook_events from anon, authenticated;
grant all privileges on table public.vokai_dodo_webhook_events to service_role;

drop policy if exists "vokai user reads own premium checkout" on public.vokai_premium_prebookings;
create policy "vokai user reads own premium checkout"
  on public.vokai_premium_prebookings for select to authenticated
  using ((select auth.uid()) = user_id);

create or replace function public.set_vokai_premium_prebookings_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists vokai_premium_prebookings_set_updated_at on public.vokai_premium_prebookings;
create trigger vokai_premium_prebookings_set_updated_at
before update on public.vokai_premium_prebookings
for each row execute function public.set_vokai_premium_prebookings_updated_at();

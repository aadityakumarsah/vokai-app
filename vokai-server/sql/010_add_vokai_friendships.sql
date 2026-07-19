create table if not exists public.vokai_friendships (
  requester_id uuid not null references public.vokai_user_profiles(user_id) on delete cascade,
  addressee_id uuid not null references public.vokai_user_profiles(user_id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (requester_id, addressee_id),
  constraint vokai_friendships_different_users check (requester_id <> addressee_id)
);

create index if not exists vokai_friendships_incoming_requests
  on public.vokai_friendships (addressee_id, status, created_at desc);

create index if not exists vokai_friendships_outgoing_requests
  on public.vokai_friendships (requester_id, status, created_at desc);

create unique index if not exists vokai_friendships_unique_pair
  on public.vokai_friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));

alter table public.vokai_friendships enable row level security;

revoke all privileges on table public.vokai_friendships from anon;
grant select, insert, update, delete on table public.vokai_friendships to authenticated;
grant all privileges on table public.vokai_friendships to service_role;

drop policy if exists "vokai user reads own friendships" on public.vokai_friendships;
create policy "vokai user reads own friendships"
  on public.vokai_friendships for select to authenticated
  using ((select auth.uid()) in (requester_id, addressee_id));

drop policy if exists "vokai user creates outgoing friendship requests" on public.vokai_friendships;
create policy "vokai user creates outgoing friendship requests"
  on public.vokai_friendships for insert to authenticated
  with check ((select auth.uid()) = requester_id);

drop policy if exists "vokai user updates incoming friendship requests" on public.vokai_friendships;
create policy "vokai user updates incoming friendship requests"
  on public.vokai_friendships for update to authenticated
  using ((select auth.uid()) = addressee_id)
  with check ((select auth.uid()) in (requester_id, addressee_id));

drop policy if exists "vokai user removes own friendships" on public.vokai_friendships;
create policy "vokai user removes own friendships"
  on public.vokai_friendships for delete to authenticated
  using ((select auth.uid()) in (requester_id, addressee_id));

drop trigger if exists vokai_friendships_set_updated_at on public.vokai_friendships;
create trigger vokai_friendships_set_updated_at
before update on public.vokai_friendships
for each row execute function public.set_vokai_profile_updated_at();

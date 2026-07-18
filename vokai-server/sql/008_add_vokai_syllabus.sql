alter table public.vokai_user_profiles
  add column if not exists experience_level text not null default 'beginner';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'vokai_user_profiles_experience_level'
      and conrelid = 'public.vokai_user_profiles'::regclass
  ) then
    alter table public.vokai_user_profiles
      add constraint vokai_user_profiles_experience_level
      check (experience_level in ('beginner', 'intermediate', 'advanced'));
  end if;
end;
$$;

create table if not exists public.vokai_user_syllabi (
  user_id uuid primary key references public.vokai_user_profiles(user_id) on delete cascade,
  language text not null check (char_length(language) between 1 and 80),
  experience_level text not null check (experience_level in ('beginner', 'intermediate', 'advanced')),
  topics jsonb not null default '[]'::jsonb,
  completed_topic_ids jsonb not null default '[]'::jsonb,
  generated_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.vokai_user_syllabi enable row level security;

revoke all privileges on table public.vokai_user_syllabi from anon;
grant select, insert, update, delete on table public.vokai_user_syllabi to authenticated;
grant all privileges on table public.vokai_user_syllabi to service_role;

drop policy if exists "vokai user reads own syllabus" on public.vokai_user_syllabi;
create policy "vokai user reads own syllabus"
  on public.vokai_user_syllabi for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "vokai user creates own syllabus" on public.vokai_user_syllabi;
create policy "vokai user creates own syllabus"
  on public.vokai_user_syllabi for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "vokai user updates own syllabus" on public.vokai_user_syllabi;
create policy "vokai user updates own syllabus"
  on public.vokai_user_syllabi for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "vokai user deletes own syllabus" on public.vokai_user_syllabi;
create policy "vokai user deletes own syllabus"
  on public.vokai_user_syllabi for delete to authenticated
  using ((select auth.uid()) = user_id);

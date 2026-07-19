alter table public.vokai_user_profiles
  add column if not exists user_code bigint;

create or replace function public.generate_vokai_user_code()
returns bigint
language plpgsql
set search_path = public
as $$
declare
  candidate bigint;
begin
  loop
    candidate := floor(1000000000 + random() * 9000000000)::bigint;
    exit when not exists (
      select 1 from public.vokai_user_profiles where user_code = candidate
    );
  end loop;
  return candidate;
end;
$$;

update public.vokai_user_profiles
set user_code = public.generate_vokai_user_code()
where user_code is null;

alter table public.vokai_user_profiles
  alter column user_code set default public.generate_vokai_user_code(),
  alter column user_code set not null;

create unique index if not exists vokai_user_profiles_user_code_key
  on public.vokai_user_profiles (user_code);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'vokai_user_profiles_user_code_ten_digits'
      and conrelid = 'public.vokai_user_profiles'::regclass
  ) then
    alter table public.vokai_user_profiles
      add constraint vokai_user_profiles_user_code_ten_digits
      check (user_code between 1000000000 and 9999999999);
  end if;
end;
$$;

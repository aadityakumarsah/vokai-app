create or replace function public.set_vokai_profile_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists vokai_user_profiles_set_updated_at on public.vokai_user_profiles;
create trigger vokai_user_profiles_set_updated_at
before update on public.vokai_user_profiles
for each row execute function public.set_vokai_profile_updated_at();

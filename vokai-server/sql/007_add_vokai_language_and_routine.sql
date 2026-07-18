alter table public.vokai_user_profiles
  add column if not exists custom_language text,
  add column if not exists busy_schedule jsonb not null default '[]'::jsonb;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'vokai_user_profiles_custom_language_length'
      and conrelid = 'public.vokai_user_profiles'::regclass
  ) then
    alter table public.vokai_user_profiles
      add constraint vokai_user_profiles_custom_language_length
      check (custom_language is null or char_length(custom_language) between 1 and 40);
  end if;
end;
$$;

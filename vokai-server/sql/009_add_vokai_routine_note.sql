alter table public.vokai_user_profiles
  add column if not exists routine_note text not null default ''
  check (char_length(routine_note) <= 2000);

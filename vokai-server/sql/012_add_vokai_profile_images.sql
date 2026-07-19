alter table public.vokai_user_profiles
  add column if not exists profile_image_url text
  check (profile_image_url is null or char_length(profile_image_url) <= 2048);

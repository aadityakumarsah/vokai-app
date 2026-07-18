alter table public.vokai_user_profiles enable row level security;
alter table public.vokai_user_checkins enable row level security;

revoke all privileges on table public.vokai_user_profiles from anon;
revoke all privileges on table public.vokai_user_checkins from anon;

grant select, insert, update, delete on table public.vokai_user_profiles to authenticated;
grant select, insert, update, delete on table public.vokai_user_checkins to authenticated;
grant all privileges on table public.vokai_user_profiles to service_role;
grant all privileges on table public.vokai_user_checkins to service_role;

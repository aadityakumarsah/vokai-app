drop policy if exists "vokai user reads own profile" on public.vokai_user_profiles;
create policy "vokai user reads own profile"
  on public.vokai_user_profiles for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "vokai user creates own profile" on public.vokai_user_profiles;
create policy "vokai user creates own profile"
  on public.vokai_user_profiles for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "vokai user updates own profile" on public.vokai_user_profiles;
create policy "vokai user updates own profile"
  on public.vokai_user_profiles for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "vokai user deletes own profile" on public.vokai_user_profiles;
create policy "vokai user deletes own profile"
  on public.vokai_user_profiles for delete to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "vokai user reads own checkins" on public.vokai_user_checkins;
create policy "vokai user reads own checkins"
  on public.vokai_user_checkins for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "vokai user creates own checkins" on public.vokai_user_checkins;
create policy "vokai user creates own checkins"
  on public.vokai_user_checkins for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "vokai user updates own checkins" on public.vokai_user_checkins;
create policy "vokai user updates own checkins"
  on public.vokai_user_checkins for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "vokai user deletes own checkins" on public.vokai_user_checkins;
create policy "vokai user deletes own checkins"
  on public.vokai_user_checkins for delete to authenticated
  using ((select auth.uid()) = user_id);

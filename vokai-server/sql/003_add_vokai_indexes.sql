create index if not exists vokai_user_checkins_by_user_date
  on public.vokai_user_checkins (user_id, check_date desc);

create index if not exists vokai_user_checkins_completed_by_user_date
  on public.vokai_user_checkins (user_id, check_date desc)
  where day_complete = true;

do $$
declare
  today date := (timezone('utc', now()))::date;
  compensation_days integer := 3;
  compensation_ref text := '2026-05-21';
  compensation_key text := 'daily-ops-outage-compensation:2026-05-21';
  profile_row public.profiles;
  streak_before integer := 0;
  streak_after integer := 0;
  freeze_awards integer := 0;
  milestone_day integer := 0;
begin
  for profile_row in
    select p.*
    from public.profiles p
    where p.last_streak_login_date = today
      and not exists (
        select 1
        from public.profile_xp_events e
        where e.user_id = p.id
          and e.idempotency_key = compensation_key
      )
    for update of p skip locked
  loop
    streak_before := greatest(coalesce(profile_row.login_streak_count, 0), 0);
    streak_after := streak_before + compensation_days;

    select count(*)::integer
    into freeze_awards
    from (
      select unnest(array[5, 14, 30]) as threshold_day
      union all
      select generate_series(60, greatest(streak_after, 60), 30) as threshold_day
    ) thresholds
    where threshold_day > streak_before
      and threshold_day <= streak_after;

    perform set_config('app.allow_profile_streak_update', 'on', true);

    update public.profiles
    set
      login_streak_count = streak_after,
      longest_login_streak_count = greatest(longest_login_streak_count, streak_after),
      daily_checkin_count = greatest(daily_checkin_count, streak_before) + compensation_days,
      streak_freezes = least(3, greatest(0, streak_freezes + freeze_awards))
    where id = profile_row.id;

    perform set_config('app.allow_profile_streak_update', '', true);

    perform public.award_profile_xp_for_user(
      profile_row.id,
      'daily_check_in_compensation',
      compensation_ref,
      jsonb_build_object(
        'days', compensation_days,
        'reason', 'retroactive compensation for users who already claimed before fix',
        'streak_after', streak_after
      )
    );

    for milestone_day in
      select threshold_day
      from unnest(array[3, 7, 14, 21, 30, 60, 100]) as thresholds(threshold_day)
      where threshold_day > streak_before
        and threshold_day <= streak_after
      order by threshold_day
    loop
      perform public.award_profile_xp_for_user(
        profile_row.id,
        'streak_milestone',
        milestone_day::text,
        jsonb_build_object(
          'streak_after', streak_after,
          'reason', 'retroactive compensation for users who already claimed before fix'
        )
      );
    end loop;
  end loop;
end;
$$;

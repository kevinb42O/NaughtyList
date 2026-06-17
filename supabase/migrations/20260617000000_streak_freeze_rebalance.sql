create or replace function public.claim_daily_check_in()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  today date := (timezone('utc', now()))::date;
  compensation_event_key text := 'daily-ops-outage-compensation:2026-05-21';
  current_profile public.profiles;
  updated_profile public.profiles;
  streak_before integer := 0;
  reward_baseline integer := 0;
  legacy_streak integer := 0;
  streak_after integer := 0;
  claimed_before boolean := false;
  used_freeze boolean := false;
  freeze_awards integer := 0;
  freeze_awarded boolean := false;
  milestone_unlocked boolean := false;
  legacy_preserved boolean := false;
  compensation_days integer := 0;
  xp_result jsonb := '{}'::jsonb;
  compensation_xp_result jsonb := '{}'::jsonb;
  milestone_xp_result jsonb := '{}'::jsonb;
  milestone_results jsonb := '[]'::jsonb;
  milestone_day integer;
  milestone_xp_total integer := 0;
begin
  if auth.uid() is null then
    raise exception 'You must be logged in to claim a daily check-in';
  end if;

  perform pg_advisory_xact_lock(hashtext(auth.uid()::text), hashtext('daily-check-in'));

  select * into current_profile
  from public.profiles
  where id = auth.uid()
  for update;

  if current_profile.id is null then
    raise exception 'Profile not found';
  end if;

  legacy_streak := greatest(
    coalesce(current_profile.login_streak_count, 0),
    coalesce(current_profile.longest_login_streak_count, 0),
    coalesce(current_profile.daily_checkin_count, 0)
  );
  streak_before := coalesce(current_profile.login_streak_count, 0);
  claimed_before := current_profile.last_streak_login_date = today;

  if claimed_before then
    return jsonb_build_object(
      'claimed', false,
      'already_claimed', true,
      'streak_before', streak_before,
      'streak_after', streak_before,
      'xp_earned', 0,
      'used_streak_freeze', false,
      'freeze_awarded', false,
      'milestone_unlocked', false,
      'legacy_preserved', false,
      'compensation_applied', false,
      'compensation_days', 0,
      'compensation_message', null,
      'profile', to_jsonb(current_profile)
    );
  end if;

  compensation_days := case
    when exists (
      select 1
      from public.profile_xp_events e
      where e.user_id = auth.uid()
        and e.idempotency_key = compensation_event_key
    ) then 0
    else 3
  end;

  used_freeze := current_profile.last_streak_login_date = today - 2 and current_profile.streak_freezes > 0;
  legacy_preserved := legacy_streak >= 3
    and coalesce(current_profile.last_streak_login_date, date '1900-01-01') < date '2026-05-18'
    and exists (
      select 1
      from public.profile_xp_events e
      where e.user_id = auth.uid()
        and e.activity_key = 'legacy_streak_backfill'
    );

  reward_baseline := case
    when used_freeze or legacy_preserved then greatest(streak_before, legacy_streak)
    else streak_before
  end;

  streak_after := case
    when current_profile.last_streak_login_date = today - 1 then streak_before + 1
    when used_freeze then greatest(streak_before, legacy_streak) + 1
    when legacy_preserved then legacy_streak + 1
    else 1
  end + compensation_days;

  select count(*)::integer into freeze_awards
  from (
    select generate_series(10, greatest(streak_after, 10), 10) as threshold_day
  ) thresholds
  where threshold_day > reward_baseline
    and threshold_day <= streak_after;

  freeze_awarded := freeze_awards > 0;

  perform set_config('app.allow_profile_streak_update', 'on', true);

  update public.profiles
  set
    login_streak_count = streak_after,
    longest_login_streak_count = greatest(longest_login_streak_count, streak_after),
    last_streak_login_date = today,
    daily_checkin_count = greatest(daily_checkin_count, legacy_streak) + 1 + compensation_days,
    streak_freezes = least(3, greatest(0, streak_freezes - case when used_freeze then 1 else 0 end + freeze_awards))
  where id = auth.uid()
  returning * into updated_profile;

  xp_result := public.award_profile_xp_for_user(auth.uid(), 'daily_check_in', today::text, jsonb_build_object('streak_after', streak_after, 'legacy_preserved', legacy_preserved));

  if compensation_days > 0 then
    compensation_xp_result := public.award_profile_xp_for_user(
      auth.uid(),
      'daily_check_in_compensation',
      '2026-05-21',
      jsonb_build_object('days', compensation_days, 'reason', 'daily check-in claim outage', 'streak_after', streak_after)
    );
  end if;

  for milestone_day in
    select threshold_day
    from unnest(array[3, 7, 14, 21, 30, 60, 100]) as thresholds(threshold_day)
    where threshold_day > reward_baseline
      and threshold_day <= streak_after
    order by threshold_day
  loop
    milestone_xp_result := public.award_profile_xp_for_user(auth.uid(), 'streak_milestone', milestone_day::text, jsonb_build_object('streak_after', streak_after));
    milestone_results := milestone_results || jsonb_build_array(milestone_xp_result);
    milestone_xp_total := milestone_xp_total + coalesce((milestone_xp_result->>'xp_earned')::integer, 0);
  end loop;

  milestone_unlocked := jsonb_array_length(milestone_results) > 0;

  select * into updated_profile from public.profiles where id = auth.uid();

  perform set_config('app.allow_profile_streak_update', '', true);

  return jsonb_build_object(
    'claimed', true,
    'already_claimed', false,
    'streak_before', streak_before,
    'streak_after', streak_after,
    'xp_earned', coalesce((xp_result->>'xp_earned')::integer, 0) + coalesce((compensation_xp_result->>'xp_earned')::integer, 0) + milestone_xp_total,
    'used_streak_freeze', used_freeze,
    'freeze_awarded', freeze_awarded,
    'freeze_awards', freeze_awards,
    'milestone_unlocked', milestone_unlocked,
    'legacy_preserved', legacy_preserved,
    'compensation_applied', compensation_days > 0,
    'compensation_days', compensation_days,
    'compensation_message', case
      when compensation_days > 0 then '3 day login bonus applied: +3 login days and +225 XP for the daily claim issue.'
      else null
    end,
    'profile', to_jsonb(updated_profile),
    'xp_result', xp_result,
    'compensation_xp_result', compensation_xp_result,
    'milestone_xp_results', milestone_results
  );
end;
$$;

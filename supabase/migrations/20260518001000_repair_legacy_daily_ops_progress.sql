create or replace function public.legacy_streak_backfill_xp(streak_count integer)
returns integer
language sql
immutable
as $$
  select
    greatest(coalesce(streak_count, 0), 0) * 75
    + case when coalesce(streak_count, 0) >= 3 then 150 else 0 end
    + case when coalesce(streak_count, 0) >= 7 then 150 else 0 end
    + case when coalesce(streak_count, 0) >= 14 then 150 else 0 end
    + case when coalesce(streak_count, 0) >= 21 then 150 else 0 end
    + case when coalesce(streak_count, 0) >= 30 then 150 else 0 end
    + case when coalesce(streak_count, 0) >= 60 then 150 else 0 end
    + case when coalesce(streak_count, 0) >= 100 then 150 else 0 end
$$;

select set_config('app.allow_profile_streak_update', 'on', true);

with legacy_candidates as (
  select
    id,
    greatest(login_streak_count, longest_login_streak_count, daily_checkin_count) as legacy_streak
  from public.profiles
), restored_profiles as (
  update public.profiles
  set
    login_streak_count = legacy_candidates.legacy_streak,
    longest_login_streak_count = greatest(public.profiles.longest_login_streak_count, legacy_candidates.legacy_streak),
    last_streak_login_date = (timezone('utc', now()))::date
  from legacy_candidates
  where public.profiles.id = legacy_candidates.id
    and legacy_candidates.legacy_streak >= 3
    and (
      public.profiles.login_streak_count < legacy_candidates.legacy_streak
      or public.profiles.last_streak_login_date is null
      or public.profiles.last_streak_login_date < (timezone('utc', now()))::date - 1
    )
  returning public.profiles.id, legacy_candidates.legacy_streak
)
insert into public.profile_xp_events (user_id, activity_key, activity_ref, idempotency_key, xp_amount, label, metadata)
select
  id,
  'legacy_streak_restored',
  legacy_streak::text,
  'legacy-streak-restored:20260518',
  0,
  'Legacy streak restored',
  jsonb_build_object('reason', 'post-upgrade streak preservation', 'legacy_streak', legacy_streak)
from restored_profiles
on conflict (user_id, idempotency_key) do nothing;

with profile_targets as (
  select
    id,
    greatest(login_streak_count, longest_login_streak_count, daily_checkin_count) as legacy_streak,
    xp_total,
    public.legacy_streak_backfill_xp(greatest(login_streak_count, longest_login_streak_count, daily_checkin_count)) as target_xp
  from public.profiles
), inserted_backfills as (
  insert into public.profile_xp_events (user_id, activity_key, activity_ref, idempotency_key, xp_amount, label, metadata)
  select
    id,
    'legacy_streak_backfill',
    legacy_streak::text,
    'legacy-streak-backfill:20260518',
    greatest(target_xp - xp_total, 0),
    'Legacy streak XP backfill',
    jsonb_build_object('legacy_streak', legacy_streak, 'target_xp', target_xp)
  from profile_targets
  where legacy_streak >= 1
    and target_xp > xp_total
  on conflict (user_id, idempotency_key) do nothing
  returning user_id, xp_amount
)
update public.profiles p
set
  xp_total = p.xp_total + b.xp_amount,
  level = public.profile_level_for_xp(p.xp_total + b.xp_amount),
  daily_checkin_count = greatest(p.daily_checkin_count, p.login_streak_count, p.longest_login_streak_count)
from inserted_backfills b
where p.id = b.user_id;

update public.profiles
set
  daily_checkin_count = greatest(daily_checkin_count, login_streak_count, longest_login_streak_count),
  level = public.profile_level_for_xp(xp_total)
where daily_checkin_count < greatest(login_streak_count, longest_login_streak_count)
   or level is distinct from public.profile_level_for_xp(xp_total);

select set_config('app.allow_profile_streak_update', '', true);

create or replace function public.claim_daily_check_in()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  today date := (timezone('utc', now()))::date;
  current_profile public.profiles;
  updated_profile public.profiles;
  streak_before integer := 0;
  legacy_streak integer := 0;
  streak_after integer := 0;
  claimed_before boolean := false;
  used_freeze boolean := false;
  freeze_awarded boolean := false;
  milestone_unlocked boolean := false;
  legacy_preserved boolean := false;
  xp_result jsonb := '{}'::jsonb;
  milestone_xp_result jsonb := '{}'::jsonb;
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
      'profile', to_jsonb(current_profile)
    );
  end if;

  used_freeze := current_profile.last_streak_login_date = today - 2 and current_profile.streak_freezes > 0;
  legacy_preserved := legacy_streak >= 3
    and coalesce(current_profile.last_streak_login_date, date '1900-01-01') < date '2026-05-18'
    and exists (
    select 1
    from public.profile_xp_events
    where user_id = auth.uid()
      and activity_key = 'legacy_streak_backfill'
  );

  streak_after := case
    when current_profile.last_streak_login_date = today - 1 then streak_before + 1
    when used_freeze then greatest(streak_before, legacy_streak) + 1
    when legacy_preserved then legacy_streak + 1
    else 1
  end;

  freeze_awarded := streak_after in (5, 14, 30) or (streak_after > 30 and streak_after % 30 = 0);
  milestone_unlocked := streak_after in (3, 7, 14, 21, 30, 60, 100);

  perform set_config('app.allow_profile_streak_update', 'on', true);

  update public.profiles
  set
    login_streak_count = streak_after,
    longest_login_streak_count = greatest(longest_login_streak_count, streak_after),
    last_streak_login_date = today,
    daily_checkin_count = greatest(daily_checkin_count, legacy_streak) + 1,
    streak_freezes = least(3, streak_freezes - case when used_freeze then 1 else 0 end + case when freeze_awarded then 1 else 0 end)
  where id = auth.uid()
  returning * into updated_profile;

  xp_result := public.award_profile_xp_for_user(auth.uid(), 'daily_check_in', today::text, jsonb_build_object('streak_after', streak_after, 'legacy_preserved', legacy_preserved));

  if milestone_unlocked then
    milestone_xp_result := public.award_profile_xp_for_user(auth.uid(), 'streak_milestone', streak_after::text, jsonb_build_object('streak_after', streak_after));
  end if;

  select * into updated_profile from public.profiles where id = auth.uid();

  perform set_config('app.allow_profile_streak_update', '', true);

  return jsonb_build_object(
    'claimed', true,
    'already_claimed', false,
    'streak_before', streak_before,
    'streak_after', streak_after,
    'xp_earned', coalesce((xp_result->>'xp_earned')::integer, 0) + coalesce((milestone_xp_result->>'xp_earned')::integer, 0),
    'used_streak_freeze', used_freeze,
    'freeze_awarded', freeze_awarded,
    'milestone_unlocked', milestone_unlocked,
    'legacy_preserved', legacy_preserved,
    'profile', to_jsonb(updated_profile),
    'xp_result', xp_result,
    'milestone_xp_result', milestone_xp_result
  );
end;
$$;
create or replace function public.award_profile_xp_for_user(
  target_user_id uuid,
  activity_key text,
  activity_ref text default '',
  metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_key text := trim(coalesce(activity_key, ''));
  normalized_ref text := trim(coalesce(activity_ref, ''));
  today date := (timezone('utc', now()))::date;
  xp_amount integer := 0;
  reward_label text := '';
  event_idempotency_key text := '';
  inserted_event public.profile_xp_events;
  updated_profile public.profiles;
begin
  if target_user_id is null then
    raise exception 'Missing target user';
  end if;

  case normalized_key
    when 'daily_check_in' then
      xp_amount := 75;
      reward_label := 'Daily Ops claimed';
      event_idempotency_key := 'daily-check-in:' || today::text;
    when 'daily_check_in_compensation' then
      xp_amount := 225;
      reward_label := 'Daily Ops outage bonus';
      event_idempotency_key := 'daily-ops-outage-compensation:2026-05-21';
    when 'streak_milestone' then
      xp_amount := 150;
      reward_label := 'Streak milestone secured';
      event_idempotency_key := 'streak-milestone:' || normalized_ref;
    when 'profile_bio_added' then
      xp_amount := 120;
      reward_label := 'Bio added';
      event_idempotency_key := 'profile-bio-added';
    when 'profile_saved' then
      xp_amount := 20;
      reward_label := 'Profile maintained';
      event_idempotency_key := 'profile-saved:' || today::text;
    when 'profile_avatar_updated' then
      xp_amount := 35;
      reward_label := 'Avatar updated';
      event_idempotency_key := 'profile-avatar:' || today::text;
    when 'profile_game_account_added' then
      xp_amount := 80;
      reward_label := 'Game account linked';
      event_idempotency_key := 'game-account:' || lower(normalized_ref);
    when 'profile_game_accounts_updated' then
      xp_amount := 35;
      reward_label := 'Accounts maintained';
      event_idempotency_key := 'game-accounts-updated:' || today::text;
    when 'clan_created' then
      xp_amount := 180;
      reward_label := 'Clan created';
      event_idempotency_key := 'clan-created:' || normalized_ref;
    when 'clan_join_requested' then
      xp_amount := 60;
      reward_label := 'Clan request sent';
      event_idempotency_key := 'clan-request:' || normalized_ref;
    when 'clan_joined' then
      xp_amount := 140;
      reward_label := 'Clan joined';
      event_idempotency_key := 'clan-joined:' || normalized_ref;
    when 'clan_invite_sent' then
      xp_amount := 45;
      reward_label := 'Clan invite sent';
      event_idempotency_key := 'clan-invite:' || today::text || ':' || normalized_ref;
    when 'public_message_sent' then
      xp_amount := 15;
      reward_label := 'Public comms sent';
      event_idempotency_key := 'public-message:' || today::text;
    when 'direct_message_sent' then
      xp_amount := 20;
      reward_label := 'Direct comms sent';
      event_idempotency_key := 'direct-message:' || today::text || ':' || normalized_ref;
    when 'clan_message_sent' then
      xp_amount := 20;
      reward_label := 'Clan comms sent';
      event_idempotency_key := 'clan-message:' || today::text || ':' || normalized_ref;
    when 'message_reaction_set' then
      xp_amount := 10;
      reward_label := 'Reaction sent';
      event_idempotency_key := 'message-reaction:' || today::text;
    when 'intel_added' then
      xp_amount := 85;
      reward_label := 'Intel added';
      event_idempotency_key := 'intel-added:' || normalized_ref;
    when 'kill_logged' then
      xp_amount := 35;
      reward_label := 'Kill logged';
      event_idempotency_key := 'kill-logged:' || today::text || ':' || normalized_ref;
    when 'drop_in' then
      xp_amount := 20;
      reward_label := 'Dropped in';
      event_idempotency_key := 'drop-in:' || today::text;
    when 'push_enabled' then
      xp_amount := 100;
      reward_label := 'Phone alerts armed';
      event_idempotency_key := 'push-enabled';
    else
      raise exception 'Unknown XP activity: %', normalized_key;
  end case;

  if xp_amount <= 0 then
    raise exception 'XP activity has no value: %', normalized_key;
  end if;

  insert into public.profile_xp_events (user_id, activity_key, activity_ref, idempotency_key, xp_amount, label, metadata)
  values (target_user_id, normalized_key, normalized_ref, event_idempotency_key, xp_amount, reward_label, coalesce(metadata, '{}'::jsonb))
  on conflict (user_id, idempotency_key) do nothing
  returning * into inserted_event;

  if inserted_event.id is null then
    select * into updated_profile from public.profiles where id = target_user_id;

    return jsonb_build_object(
      'awarded', false,
      'xp_earned', 0,
      'label', reward_label,
      'activity_key', normalized_key,
      'profile', to_jsonb(updated_profile)
    );
  end if;

  update public.profiles
  set
    xp_total = xp_total + xp_amount,
    level = public.profile_level_for_profile(
      xp_total + xp_amount,
      length(trim(coalesce(bio, ''))) > 0,
      jsonb_array_length(coalesce(game_accounts, '[]'::jsonb))
    )
  where id = target_user_id
  returning * into updated_profile;

  return jsonb_build_object(
    'awarded', true,
    'xp_earned', xp_amount,
    'label', reward_label,
    'activity_key', normalized_key,
    'profile', to_jsonb(updated_profile),
    'event', to_jsonb(inserted_event)
  );
end;
$$;


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
    select unnest(array[5, 14, 30]) as threshold_day
    union all
    select generate_series(60, greatest(streak_after, 60), 30) as threshold_day
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
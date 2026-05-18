create or replace function public.profile_level_for_profile(total_xp integer, has_bio boolean, account_count integer)
returns integer
language sql
immutable
as $$
  select case
    when coalesce(has_bio, false) and coalesce(account_count, 0) > 0 then public.profile_level_for_xp(total_xp)
    else least(2, public.profile_level_for_xp(total_xp))
  end
$$;

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
  idempotency_key text := '';
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
      idempotency_key := 'daily-check-in:' || today::text;
    when 'streak_milestone' then
      xp_amount := 150;
      reward_label := 'Streak milestone secured';
      idempotency_key := 'streak-milestone:' || normalized_ref;
    when 'profile_bio_added' then
      xp_amount := 120;
      reward_label := 'Bio added';
      idempotency_key := 'profile-bio-added';
    when 'profile_saved' then
      xp_amount := 20;
      reward_label := 'Profile maintained';
      idempotency_key := 'profile-saved:' || today::text;
    when 'profile_avatar_updated' then
      xp_amount := 35;
      reward_label := 'Avatar updated';
      idempotency_key := 'profile-avatar:' || today::text;
    when 'profile_game_account_added' then
      xp_amount := 80;
      reward_label := 'Game account linked';
      idempotency_key := 'game-account:' || lower(normalized_ref);
    when 'profile_game_accounts_updated' then
      xp_amount := 35;
      reward_label := 'Accounts maintained';
      idempotency_key := 'game-accounts-updated:' || today::text;
    when 'clan_created' then
      xp_amount := 180;
      reward_label := 'Clan created';
      idempotency_key := 'clan-created:' || normalized_ref;
    when 'clan_join_requested' then
      xp_amount := 60;
      reward_label := 'Clan request sent';
      idempotency_key := 'clan-request:' || normalized_ref;
    when 'clan_joined' then
      xp_amount := 140;
      reward_label := 'Clan joined';
      idempotency_key := 'clan-joined:' || normalized_ref;
    when 'clan_invite_sent' then
      xp_amount := 45;
      reward_label := 'Clan invite sent';
      idempotency_key := 'clan-invite:' || today::text || ':' || normalized_ref;
    when 'public_message_sent' then
      xp_amount := 15;
      reward_label := 'Public comms sent';
      idempotency_key := 'public-message:' || today::text;
    when 'direct_message_sent' then
      xp_amount := 20;
      reward_label := 'Direct comms sent';
      idempotency_key := 'direct-message:' || today::text || ':' || normalized_ref;
    when 'clan_message_sent' then
      xp_amount := 20;
      reward_label := 'Clan comms sent';
      idempotency_key := 'clan-message:' || today::text || ':' || normalized_ref;
    when 'message_reaction_set' then
      xp_amount := 10;
      reward_label := 'Reaction sent';
      idempotency_key := 'message-reaction:' || today::text;
    when 'intel_added' then
      xp_amount := 85;
      reward_label := 'Intel added';
      idempotency_key := 'intel-added:' || normalized_ref;
    when 'kill_logged' then
      xp_amount := 35;
      reward_label := 'Kill logged';
      idempotency_key := 'kill-logged:' || today::text || ':' || normalized_ref;
    when 'drop_in' then
      xp_amount := 20;
      reward_label := 'Dropped in';
      idempotency_key := 'drop-in:' || today::text;
    when 'push_enabled' then
      xp_amount := 100;
      reward_label := 'Phone alerts armed';
      idempotency_key := 'push-enabled';
    else
      raise exception 'Unknown XP activity: %', normalized_key;
  end case;

  if xp_amount <= 0 then
    raise exception 'XP activity has no value: %', normalized_key;
  end if;

  insert into public.profile_xp_events (user_id, activity_key, activity_ref, idempotency_key, xp_amount, label, metadata)
  values (target_user_id, normalized_key, normalized_ref, idempotency_key, xp_amount, reward_label, coalesce(metadata, '{}'::jsonb))
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

with event_totals as (
  select user_id, coalesce(sum(xp_amount), 0)::integer as total_xp
  from public.profile_xp_events
  group by user_id
)
update public.profiles p
set
  xp_total = coalesce(event_totals.total_xp, 0),
  level = public.profile_level_for_profile(
    coalesce(event_totals.total_xp, 0),
    length(trim(coalesce(p.bio, ''))) > 0,
    jsonb_array_length(coalesce(p.game_accounts, '[]'::jsonb))
  )
from event_totals
where p.id = event_totals.user_id;

update public.profiles
set
  xp_total = 0,
  level = 1
where not exists (
  select 1
  from public.profile_xp_events e
  where e.user_id = profiles.id
);
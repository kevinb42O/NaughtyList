alter table public.profiles
add column if not exists xp_total integer not null default 0 check (xp_total >= 0),
add column if not exists level integer not null default 1 check (level >= 1),
add column if not exists streak_freezes integer not null default 0 check (streak_freezes >= 0),
add column if not exists daily_checkin_count integer not null default 0 check (daily_checkin_count >= 0);

create table if not exists public.profile_xp_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  activity_key text not null,
  activity_ref text not null default '',
  idempotency_key text not null,
  xp_amount integer not null check (xp_amount >= 0),
  label text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, idempotency_key)
);

create index if not exists profile_xp_events_user_created_at_idx
on public.profile_xp_events (user_id, created_at desc);

alter table public.profile_xp_events enable row level security;

drop policy if exists profile_xp_events_select_own on public.profile_xp_events;
create policy profile_xp_events_select_own
on public.profile_xp_events for select
to authenticated
using (user_id = auth.uid());

create or replace function public.profile_level_for_xp(total_xp integer)
returns integer
language sql
immutable
as $$
  select greatest(1, floor(sqrt(greatest(coalesce(total_xp, 0), 0)::numeric / 125))::integer + 1)
$$;

create or replace function public.profile_xp_for_next_level(current_level integer)
returns integer
language sql
immutable
as $$
  select greatest(1, coalesce(current_level, 1)) * greatest(1, coalesce(current_level, 1)) * 125
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
    level = public.profile_level_for_xp(xp_total + xp_amount)
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

create or replace function public.award_my_profile_xp(activity_key text, activity_ref text default '')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_key text := trim(coalesce(activity_key, ''));
  normalized_ref text := trim(coalesce(activity_ref, ''));
  today date := (timezone('utc', now()))::date;
begin
  if auth.uid() is null then
    raise exception 'You must be logged in to earn XP';
  end if;

  case normalized_key
    when 'profile_saved' then
      null;
    when 'profile_bio_added' then
      if not exists (select 1 from public.profiles where id = auth.uid() and length(trim(coalesce(bio, ''))) > 0) then
        raise exception 'Bio must be set before earning bio XP';
      end if;
    when 'profile_avatar_updated' then
      if not exists (select 1 from public.profiles where id = auth.uid() and coalesce(avatar_icon, 'user') <> 'user') then
        raise exception 'Avatar must be updated before earning avatar XP';
      end if;
    when 'profile_game_account_added' then
      if normalized_ref = '' or not exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and exists (
            select 1
            from jsonb_array_elements(coalesce(p.game_accounts, '[]'::jsonb)) account
            where lower(account->>'id') = lower(normalized_ref)
          )
      ) then
        raise exception 'Game account must be linked before earning account XP';
      end if;
    when 'profile_game_accounts_updated' then
      if not exists (select 1 from public.profiles where id = auth.uid() and jsonb_array_length(coalesce(game_accounts, '[]'::jsonb)) > 0) then
        raise exception 'At least one game account is required before earning account XP';
      end if;
    when 'clan_created' then
      if not exists (select 1 from public.clans where id::text = normalized_ref and created_by = auth.uid()) then
        raise exception 'Clan must exist before earning clan creation XP';
      end if;
    when 'clan_join_requested' then
      if not exists (
        select 1 from public.clan_join_requests
        where clan_id::text = normalized_ref and user_id = auth.uid()
      ) then
        raise exception 'Join request must exist before earning clan request XP';
      end if;
    when 'clan_invite_sent' then
      if not exists (
        select 1 from public.clan_invites
        where clan_id::text = split_part(normalized_ref, ':', 1)
          and invitee_user_id::text = split_part(normalized_ref, ':', 2)
          and invited_by_user_id = auth.uid()
          and (timezone('utc', created_at))::date = today
      ) then
        raise exception 'Invite must exist before earning invite XP';
      end if;
    when 'public_message_sent' then
      if not exists (select 1 from public.public_chat_messages where user_id = auth.uid() and (timezone('utc', created_at))::date = today) then
        raise exception 'Message must exist before earning public comms XP';
      end if;
    when 'direct_message_sent' then
      if not exists (
        select 1 from public.direct_messages
        where sender_id = auth.uid()
          and recipient_id::text = normalized_ref
          and (timezone('utc', created_at))::date = today
      ) then
        raise exception 'Direct message must exist before earning direct comms XP';
      end if;
    when 'clan_message_sent' then
      if not exists (
        select 1 from public.clan_messages
        where user_id = auth.uid()
          and clan_id::text = normalized_ref
          and (timezone('utc', created_at))::date = today
      ) then
        raise exception 'Clan message must exist before earning clan comms XP';
      end if;
    when 'message_reaction_set' then
      if not (
        exists (select 1 from public.public_chat_message_reactions where user_id = auth.uid() and (timezone('utc', created_at))::date = today)
        or exists (select 1 from public.direct_message_reactions where user_id = auth.uid() and (timezone('utc', created_at))::date = today)
        or exists (select 1 from public.clan_message_reactions where user_id = auth.uid() and (timezone('utc', created_at))::date = today)
      ) then
        raise exception 'Reaction must exist before earning reaction XP';
      end if;
    when 'intel_added' then
      if not exists (select 1 from public.players where id::text = normalized_ref and created_by = auth.uid()) then
        raise exception 'Intel must exist before earning intel XP';
      end if;
    when 'drop_in' then
      null;
    when 'push_enabled' then
      if not exists (select 1 from public.push_subscriptions where user_id = auth.uid()) then
        raise exception 'Push subscription must exist before earning alert XP';
      end if;
    else
      raise exception 'Unknown or server-only XP activity: %', normalized_key;
  end case;

  return public.award_profile_xp_for_user(auth.uid(), normalized_key, normalized_ref, '{}'::jsonb);
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
  current_profile public.profiles;
  updated_profile public.profiles;
  streak_before integer := 0;
  streak_after integer := 0;
  claimed_before boolean := false;
  used_freeze boolean := false;
  freeze_awarded boolean := false;
  milestone_unlocked boolean := false;
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
      'profile', to_jsonb(current_profile)
    );
  end if;

  used_freeze := current_profile.last_streak_login_date = today - 2 and current_profile.streak_freezes > 0;

  streak_after := case
    when current_profile.last_streak_login_date = today - 1 then streak_before + 1
    when used_freeze then streak_before + 1
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
    daily_checkin_count = daily_checkin_count + 1,
    streak_freezes = least(3, streak_freezes - case when used_freeze then 1 else 0 end + case when freeze_awarded then 1 else 0 end)
  where id = auth.uid()
  returning * into updated_profile;

  xp_result := public.award_profile_xp_for_user(auth.uid(), 'daily_check_in', today::text, jsonb_build_object('streak_after', streak_after));

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
    'profile', to_jsonb(updated_profile),
    'xp_result', xp_result,
    'milestone_xp_result', milestone_xp_result
  );
end;
$$;

create or replace function public.claim_daily_login_streak()
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  claim_result jsonb;
  updated_profile public.profiles;
begin
  claim_result := public.claim_daily_check_in();
  select * into updated_profile from public.profiles where id = auth.uid();
  return updated_profile;
end;
$$;

create or replace function public.award_clan_membership_xp()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.award_profile_xp_for_user(new.user_id, 'clan_joined', new.clan_id::text, jsonb_build_object('role', new.role));
  return new;
end;
$$;

drop trigger if exists clan_members_award_membership_xp on public.clan_members;
create trigger clan_members_award_membership_xp
after insert on public.clan_members
for each row execute function public.award_clan_membership_xp();

create or replace function public.register_player_kill(target_player_id uuid)
returns table (
  accepted boolean,
  reason text,
  kill_count integer,
  recorded_at timestamptz,
  cooldown_ends_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  recent_kill_at timestamptz;
  inserted_kill public.player_kills;
begin
  if auth.uid() is null then
    raise exception 'You must be logged in to log a kill';
  end if;

  if not exists (
    select 1
    from public.players
    where id = target_player_id
  ) then
    raise exception 'Operator not found';
  end if;

  perform pg_advisory_xact_lock(hashtext(auth.uid()::text), hashtext(target_player_id::text));

  select pk.created_at
  into recent_kill_at
  from public.player_kills pk
  where pk.player_id = target_player_id
    and pk.user_id = auth.uid()
  order by pk.created_at desc
  limit 1;

  if recent_kill_at is not null and recent_kill_at > now() - interval '10 minutes' then
    return query
    select
      false as accepted,
      'Kill already logged for this target. Try again after the cooldown.' as reason,
      (
        select count(*)::integer
        from public.player_kills pk
        where pk.player_id = target_player_id
      ) as kill_count,
      recent_kill_at as recorded_at,
      recent_kill_at + interval '10 minutes' as cooldown_ends_at;
    return;
  end if;

  insert into public.player_kills (player_id, user_id)
  values (target_player_id, auth.uid())
  returning * into inserted_kill;

  perform public.award_profile_xp_for_user(auth.uid(), 'kill_logged', target_player_id::text, jsonb_build_object('recorded_at', inserted_kill.created_at));

  return query
  select
    true as accepted,
    null::text as reason,
    (
      select count(*)::integer
      from public.player_kills pk
      where pk.player_id = target_player_id
    ) as kill_count,
    inserted_kill.created_at as recorded_at,
    inserted_kill.created_at + interval '10 minutes' as cooldown_ends_at;
end;
$$;

revoke execute on function public.award_profile_xp_for_user(uuid, text, text, jsonb) from public, anon, authenticated;
revoke execute on function public.award_clan_membership_xp() from public, anon, authenticated;
revoke execute on function public.award_my_profile_xp(text, text) from public, anon;
revoke execute on function public.claim_daily_check_in() from public, anon;
revoke execute on function public.claim_daily_login_streak() from public, anon;
revoke execute on function public.register_player_kill(uuid) from public, anon;

grant execute on function public.award_my_profile_xp(text, text) to authenticated;
grant execute on function public.claim_daily_check_in() to authenticated;
grant execute on function public.claim_daily_login_streak() to authenticated;
grant execute on function public.register_player_kill(uuid) to authenticated;
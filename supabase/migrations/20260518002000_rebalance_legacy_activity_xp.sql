create or replace function public.profile_level_for_xp(total_xp integer)
returns integer
language sql
immutable
as $$
  select greatest(1, floor(sqrt(greatest(coalesce(total_xp, 0), 0)::numeric / 250))::integer + 1)
$$;

create or replace function public.profile_xp_for_next_level(current_level integer)
returns integer
language sql
immutable
as $$
  select greatest(1, coalesce(current_level, 1)) * greatest(1, coalesce(current_level, 1)) * 250
$$;

insert into public.profile_xp_events (user_id, activity_key, activity_ref, idempotency_key, xp_amount, label, metadata)
select
  id,
  'legacy_profile_bio_added',
  'bio',
  'legacy-profile-bio-added:20260518',
  120,
  'Legacy bio backfill',
  jsonb_build_object('source', 'existing profile bio')
from public.profiles
where length(trim(coalesce(bio, ''))) > 0
on conflict (user_id, idempotency_key) do nothing;

with account_rows as (
  select distinct
    p.id as user_id,
    lower(trim(account->>'id')) as account_id
  from public.profiles p
  cross join lateral jsonb_array_elements(coalesce(p.game_accounts, '[]'::jsonb)) account
  where length(trim(coalesce(account->>'id', ''))) > 0
)
insert into public.profile_xp_events (user_id, activity_key, activity_ref, idempotency_key, xp_amount, label, metadata)
select
  user_id,
  'legacy_game_account_added',
  account_id,
  'legacy-game-account-added:20260518:' || account_id,
  80,
  'Legacy game account backfill',
  jsonb_build_object('account_id', account_id)
from account_rows
on conflict (user_id, idempotency_key) do nothing;

insert into public.profile_xp_events (user_id, activity_key, activity_ref, idempotency_key, xp_amount, label, metadata)
select
  cm.user_id,
  'legacy_clan_joined',
  cm.clan_id::text,
  'legacy-clan-joined:20260518:' || cm.clan_id::text,
  140,
  'Legacy clan membership backfill',
  jsonb_build_object('role', cm.role)
from public.clan_members cm
on conflict (user_id, idempotency_key) do nothing;

insert into public.profile_xp_events (user_id, activity_key, activity_ref, idempotency_key, xp_amount, label, metadata)
select
  c.created_by,
  'legacy_clan_created',
  c.id::text,
  'legacy-clan-created:20260518:' || c.id::text,
  180,
  'Legacy clan creation backfill',
  jsonb_build_object('clan_id', c.id, 'tag', c.tag)
from public.clans c
where c.created_by is not null
on conflict (user_id, idempotency_key) do nothing;

insert into public.profile_xp_events (user_id, activity_key, activity_ref, idempotency_key, xp_amount, label, metadata)
select
  p.created_by,
  'legacy_intel_added',
  p.id::text,
  'legacy-intel-added:20260518:' || p.id::text,
  85,
  'Legacy intel backfill',
  jsonb_build_object('player_id', p.id)
from public.players p
where p.created_by is not null
on conflict (user_id, idempotency_key) do nothing;

with kill_targets as (
  select distinct user_id, player_id
  from public.player_kills
)
insert into public.profile_xp_events (user_id, activity_key, activity_ref, idempotency_key, xp_amount, label, metadata)
select
  user_id,
  'legacy_kill_logged',
  player_id::text,
  'legacy-kill-logged:20260518:' || player_id::text,
  35,
  'Legacy kill log backfill',
  jsonb_build_object('player_id', player_id)
from kill_targets
on conflict (user_id, idempotency_key) do nothing;

insert into public.profile_xp_events (user_id, activity_key, activity_ref, idempotency_key, xp_amount, label, metadata)
select distinct
  user_id,
  'legacy_public_message_sent',
  'public',
  'legacy-public-message-sent:20260518',
  15,
  'Legacy public comms backfill',
  jsonb_build_object('source', 'existing public chat')
from public.public_chat_messages
on conflict (user_id, idempotency_key) do nothing;

with direct_recipients as (
  select distinct sender_id as user_id, recipient_id
  from public.direct_messages
)
insert into public.profile_xp_events (user_id, activity_key, activity_ref, idempotency_key, xp_amount, label, metadata)
select
  user_id,
  'legacy_direct_message_sent',
  recipient_id::text,
  'legacy-direct-message-sent:20260518:' || recipient_id::text,
  20,
  'Legacy direct comms backfill',
  jsonb_build_object('recipient_id', recipient_id)
from direct_recipients
on conflict (user_id, idempotency_key) do nothing;

with clan_message_clans as (
  select distinct user_id, clan_id
  from public.clan_messages
)
insert into public.profile_xp_events (user_id, activity_key, activity_ref, idempotency_key, xp_amount, label, metadata)
select
  user_id,
  'legacy_clan_message_sent',
  clan_id::text,
  'legacy-clan-message-sent:20260518:' || clan_id::text,
  20,
  'Legacy clan comms backfill',
  jsonb_build_object('clan_id', clan_id)
from clan_message_clans
on conflict (user_id, idempotency_key) do nothing;

with reaction_users as (
  select distinct user_id, 'public' as scope from public.public_chat_message_reactions
  union
  select distinct user_id, 'direct' as scope from public.direct_message_reactions
  union
  select distinct user_id, 'clan' as scope from public.clan_message_reactions
)
insert into public.profile_xp_events (user_id, activity_key, activity_ref, idempotency_key, xp_amount, label, metadata)
select
  user_id,
  'legacy_message_reaction_set',
  scope,
  'legacy-message-reaction-set:20260518:' || scope,
  10,
  'Legacy reaction backfill',
  jsonb_build_object('scope', scope)
from reaction_users
on conflict (user_id, idempotency_key) do nothing;

insert into public.profile_xp_events (user_id, activity_key, activity_ref, idempotency_key, xp_amount, label, metadata)
select distinct
  user_id,
  'legacy_push_enabled',
  'push',
  'legacy-push-enabled:20260518',
  100,
  'Legacy phone alerts backfill',
  jsonb_build_object('source', 'existing push subscription')
from public.push_subscriptions
on conflict (user_id, idempotency_key) do nothing;

insert into public.profile_xp_events (user_id, activity_key, activity_ref, idempotency_key, xp_amount, label, metadata)
select
  id,
  'legacy_staff_service',
  role,
  'legacy-staff-service:20260518:' || role,
  case when role = 'admin' then 250 when role = 'moderator' then 150 else 0 end,
  'Legacy staff service backfill',
  jsonb_build_object('role', role)
from public.profiles
where role in ('admin', 'moderator')
on conflict (user_id, idempotency_key) do nothing;

with event_totals as (
  select user_id, coalesce(sum(xp_amount), 0)::integer as total_xp
  from public.profile_xp_events
  group by user_id
)
update public.profiles p
set
  xp_total = coalesce(event_totals.total_xp, 0),
  level = public.profile_level_for_xp(coalesce(event_totals.total_xp, 0))
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
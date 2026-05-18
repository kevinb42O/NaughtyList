alter table public.players
add column if not exists moderation_status text not null default 'unreviewed',
add column if not exists moderation_note text not null default '',
add column if not exists quarantined_at timestamptz,
add column if not exists quarantined_by uuid references public.profiles(id) on delete set null,
add column if not exists quarantine_reason text not null default '';

alter table public.players
drop constraint if exists players_moderation_status_check;

alter table public.players
add constraint players_moderation_status_check check (
  moderation_status in ('unreviewed', 'verified', 'needs_evidence', 'duplicate', 'low_quality', 'cleared')
);

create table if not exists public.public_chat_mutes (
  id uuid primary key default gen_random_uuid(),
  target_user_id uuid not null references public.profiles(id) on delete cascade,
  muted_by uuid references public.profiles(id) on delete set null,
  reason text not null default '',
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  revoked_at timestamptz,
  revoked_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create index if not exists public_chat_mutes_target_active_idx
on public.public_chat_mutes (target_user_id, ends_at desc)
where revoked_at is null;

create table if not exists public.moderation_events (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references public.profiles(id) on delete set null,
  target_user_id uuid references public.profiles(id) on delete set null,
  player_id uuid references public.players(id) on delete set null,
  message_id uuid,
  event_type text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists moderation_events_created_at_idx
on public.moderation_events (created_at desc);

create function public.record_moderation_event(
  event_type text,
  target_user_id uuid default null,
  player_id uuid default null,
  message_id uuid default null,
  details jsonb default '{}'::jsonb
)
returns public.moderation_events
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_event public.moderation_events;
begin
  if not public.is_moderator_or_admin() then
    raise exception 'Only moderators and admins can log moderation events';
  end if;

  insert into public.moderation_events (
    actor_user_id,
    target_user_id,
    player_id,
    message_id,
    event_type,
    details
  )
  values (
    auth.uid(),
    target_user_id,
    player_id,
    message_id,
    event_type,
    coalesce(details, '{}'::jsonb)
  )
  returning * into inserted_event;

  return inserted_event;
end;
$$;

create function public.set_player_moderation_status(
  target_player_id uuid,
  next_status text,
  next_note text default ''
)
returns public.players
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_player public.players;
begin
  if not public.is_moderator_or_admin() then
    raise exception 'Only moderators and admins can update verdicts';
  end if;

  if next_status not in ('unreviewed', 'verified', 'needs_evidence', 'duplicate', 'low_quality', 'cleared') then
    raise exception 'Invalid moderation status';
  end if;

  update public.players
  set
    moderation_status = next_status,
    moderation_note = left(trim(coalesce(next_note, '')), 280),
    moderated_at = now(),
    moderated_by = auth.uid()
  where id = target_player_id
  returning * into updated_player;

  if updated_player.id is null then
    raise exception 'Operator not found';
  end if;

  perform public.record_moderation_event(
    'player_verdict',
    null,
    target_player_id,
    null,
    jsonb_build_object('status', next_status, 'note', left(trim(coalesce(next_note, '')), 280))
  );

  return updated_player;
end;
$$;

create function public.quarantine_player(
  target_player_id uuid,
  reason text default ''
)
returns public.players
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_player public.players;
  cleaned_reason text := left(trim(coalesce(reason, '')), 280);
begin
  if not public.is_moderator_or_admin() then
    raise exception 'Only moderators and admins can quarantine entries';
  end if;

  update public.players
  set
    quarantined_at = now(),
    quarantined_by = auth.uid(),
    quarantine_reason = cleaned_reason,
    moderated_at = now(),
    moderated_by = auth.uid()
  where id = target_player_id
  returning * into updated_player;

  if updated_player.id is null then
    raise exception 'Operator not found';
  end if;

  perform public.record_moderation_event(
    'player_quarantined',
    null,
    target_player_id,
    null,
    jsonb_build_object('reason', cleaned_reason)
  );

  return updated_player;
end;
$$;

create function public.restore_quarantined_player(target_player_id uuid)
returns public.players
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_player public.players;
begin
  if not public.is_moderator_or_admin() then
    raise exception 'Only moderators and admins can restore entries';
  end if;

  update public.players
  set
    quarantined_at = null,
    quarantined_by = null,
    quarantine_reason = '',
    moderation_status = case when moderation_status = 'low_quality' then 'cleared' else moderation_status end,
    moderated_at = now(),
    moderated_by = auth.uid()
  where id = target_player_id
  returning * into updated_player;

  if updated_player.id is null then
    raise exception 'Operator not found';
  end if;

  perform public.record_moderation_event('player_restored', null, target_player_id, null, '{}'::jsonb);

  return updated_player;
end;
$$;

create function public.mute_public_chat_user(
  target_user_id uuid,
  duration_minutes integer,
  reason text default ''
)
returns public.public_chat_mutes
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_mute public.public_chat_mutes;
  resolved_target_user_id uuid := target_user_id;
  target_role text;
  cleaned_reason text := left(trim(coalesce(reason, '')), 280);
  safe_minutes integer := least(greatest(coalesce(duration_minutes, 15), 15), 1440);
begin
  if not public.is_moderator_or_admin() then
    raise exception 'Only moderators and admins can mute public chat';
  end if;

  if resolved_target_user_id = auth.uid() then
    raise exception 'You cannot mute yourself';
  end if;

  select role into target_role from public.profiles where id = resolved_target_user_id;

  if target_role is null then
    raise exception 'Profile not found';
  end if;

  if target_role = 'admin' and not public.is_admin() then
    raise exception 'Moderators cannot mute the admin';
  end if;

  update public.public_chat_mutes
  set revoked_at = now(), revoked_by = auth.uid()
  where public_chat_mutes.target_user_id = resolved_target_user_id
    and revoked_at is null
    and ends_at > now();

  insert into public.public_chat_mutes (target_user_id, muted_by, reason, starts_at, ends_at)
  values (resolved_target_user_id, auth.uid(), cleaned_reason, now(), now() + make_interval(mins => safe_minutes))
  returning * into inserted_mute;

  perform public.record_moderation_event(
    'public_chat_muted',
    resolved_target_user_id,
    null,
    null,
    jsonb_build_object('minutes', safe_minutes, 'reason', cleaned_reason)
  );

  return inserted_mute;
end;
$$;

create function public.clear_public_chat_mute(target_mute_id uuid)
returns public.public_chat_mutes
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_mute public.public_chat_mutes;
begin
  if not public.is_moderator_or_admin() then
    raise exception 'Only moderators and admins can clear public chat mutes';
  end if;

  update public.public_chat_mutes
  set revoked_at = now(), revoked_by = auth.uid()
  where id = target_mute_id
    and revoked_at is null
  returning * into updated_mute;

  if updated_mute.id is null then
    raise exception 'Active mute not found';
  end if;

  perform public.record_moderation_event(
    'public_chat_mute_cleared',
    updated_mute.target_user_id,
    null,
    null,
    jsonb_build_object('muteId', updated_mute.id)
  );

  return updated_mute;
end;
$$;

create function public.delete_public_chat_message(target_message_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_message public.public_chat_messages;
begin
  if not public.is_moderator_or_admin() then
    raise exception 'Only moderators and admins can delete public chat';
  end if;

  select * into target_message
  from public.public_chat_messages
  where id = target_message_id;

  if target_message.id is null then
    raise exception 'Message not found';
  end if;

  delete from public.public_chat_messages
  where id = target_message_id;

  perform public.record_moderation_event(
    'public_chat_deleted',
    target_message.user_id,
    null,
    target_message_id,
    jsonb_build_object('body', left(target_message.body, 160))
  );
end;
$$;

alter table public.public_chat_mutes enable row level security;
alter table public.moderation_events enable row level security;

drop policy if exists "users can read active public chat mutes" on public.public_chat_mutes;
create policy "users can read active public chat mutes"
on public.public_chat_mutes for select
to authenticated
using (target_user_id = auth.uid() or public.is_moderator_or_admin());

drop policy if exists "moderators can read moderation events" on public.moderation_events;
create policy "moderators can read moderation events"
on public.moderation_events for select
to authenticated
using (public.is_moderator_or_admin());

drop policy if exists "moderators can delete players" on public.players;
drop policy if exists "admins can delete players" on public.players;
create policy "admins can delete players"
on public.players for delete
to authenticated
using (public.is_admin());

drop policy if exists "authenticated users can send public chat" on public.public_chat_messages;
create policy "authenticated users can send public chat"
on public.public_chat_messages for insert
to authenticated
with check (
  user_id = auth.uid()
  and not exists (
    select 1
    from public.public_chat_mutes pcm
    where pcm.target_user_id = auth.uid()
      and pcm.revoked_at is null
      and pcm.ends_at > now()
  )
);

drop view if exists public.players_with_scores;

create view public.players_with_scores as
with vote_stats as (
  select
    v.player_id,
    round(avg(v.score))::integer as trust_score,
    count(v.id)::integer as vote_count
  from public.trust_votes v
  group by v.player_id
),
kill_stats as (
  select
    pk.player_id,
    count(pk.id)::integer as kill_count
  from public.player_kills pk
  group by pk.player_id
),
user_kill_state as (
  select
    max(pk.created_at) as my_last_kill_at
  from public.player_kills pk
  where pk.user_id = auth.uid()
)
select
  p.id,
  p.name,
  p.clan,
  p.threat_level,
  p.initial_trust_score,
  coalesce(vs.trust_score, p.initial_trust_score) as trust_score,
  coalesce(vs.vote_count, 0) as vote_count,
  coalesce(ks.kill_count, 0) as kill_count,
  uks.my_last_kill_at,
  case
    when uks.my_last_kill_at is null then null
    else uks.my_last_kill_at + interval '10 minutes'
  end as my_kill_cooldown_ends_at,
  p.tags,
  p.evidence_url,
  p.notes,
  p.created_by,
  p.sort_order,
  p.moderation_status,
  p.moderation_note,
  p.quarantined_at,
  p.quarantined_by,
  p.quarantine_reason,
  p.created_at,
  p.updated_at,
  p.moderated_at,
  p.moderated_by
from public.players p
left join vote_stats vs on vs.player_id = p.id
left join kill_stats ks on ks.player_id = p.id
cross join user_kill_state uks
where p.quarantined_at is null or public.is_moderator_or_admin();

grant select on public.players_with_scores to anon, authenticated;
grant select on public.public_chat_mutes to authenticated;
grant select on public.moderation_events to authenticated;
grant execute on function public.set_player_moderation_status(uuid, text, text) to authenticated;
grant execute on function public.quarantine_player(uuid, text) to authenticated;
grant execute on function public.restore_quarantined_player(uuid) to authenticated;
grant execute on function public.mute_public_chat_user(uuid, integer, text) to authenticated;
grant execute on function public.clear_public_chat_mute(uuid) to authenticated;
grant execute on function public.delete_public_chat_message(uuid) to authenticated;

alter table public.public_chat_mutes replica identity full;
alter table public.moderation_events replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.public_chat_mutes;
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  alter publication supabase_realtime add table public.moderation_events;
exception
  when duplicate_object then null;
end;
$$;
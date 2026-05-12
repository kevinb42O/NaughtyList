create index if not exists player_kills_player_user_created_at_idx
on public.player_kills (player_id, user_id, created_at desc);

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
    count(pk.id)::integer as kill_count,
    max(pk.created_at) filter (where pk.user_id = auth.uid()) as my_last_kill_at
  from public.player_kills pk
  group by pk.player_id
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
  ks.my_last_kill_at,
  case
    when ks.my_last_kill_at is null then null
    else ks.my_last_kill_at + interval '10 minutes'
  end as my_kill_cooldown_ends_at,
  p.tags,
  p.evidence_url,
  p.notes,
  p.created_by,
  p.sort_order,
  p.created_at,
  p.updated_at,
  p.moderated_at,
  p.moderated_by
from public.players p
left join vote_stats vs on vs.player_id = p.id
left join kill_stats ks on ks.player_id = p.id;

grant select on public.players_with_scores to anon, authenticated;
grant execute on function public.register_player_kill(uuid) to authenticated;
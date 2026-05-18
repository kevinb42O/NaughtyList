drop function if exists public.register_player_kill(uuid);

create function public.register_player_kill(target_player_id uuid)
returns table (
  accepted boolean,
  reason text,
  kill_count integer,
  recorded_at timestamptz,
  cooldown_ends_at timestamptz,
  last_kill_user_id uuid,
  last_kill_display_name text,
  last_kill_profile_clan_tag text,
  last_kill_user_total integer,
  last_kill_clan_id uuid,
  last_kill_clan_tag text,
  last_kill_clan_total integer,
  last_kill_at timestamptz
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
    with latest_kill as (
      select
        pk.user_id,
        pk.created_at,
        pr.display_name,
        pr.clan_tag as profile_clan_tag,
        cm.clan_id,
        c.tag as clan_tag
      from public.player_kills pk
      join public.profiles pr on pr.id = pk.user_id
      left join public.clan_members cm on cm.user_id = pk.user_id
      left join public.clans c on c.id = cm.clan_id and c.archived_at is null
      where pk.player_id = target_player_id
      order by pk.created_at desc, pk.id desc
      limit 1
    ),
    kill_totals as (
      select
        (select count(*)::integer from public.player_kills pk where pk.player_id = target_player_id) as target_total,
        (select count(*)::integer from public.player_kills pk where pk.user_id = latest_kill.user_id) as user_total,
        case
          when latest_kill.clan_id is null then null::integer
          else (
            select count(*)::integer
            from public.player_kills pk
            join public.clan_members cm on cm.user_id = pk.user_id
            where cm.clan_id = latest_kill.clan_id
          )
        end as clan_total
      from latest_kill
    )
    select
      false as accepted,
      'Kill already logged for this target. Try again after the cooldown.' as reason,
      coalesce(kt.target_total, 0) as kill_count,
      recent_kill_at as recorded_at,
      recent_kill_at + interval '10 minutes' as cooldown_ends_at,
      lk.user_id as last_kill_user_id,
      lk.display_name as last_kill_display_name,
      lk.profile_clan_tag as last_kill_profile_clan_tag,
      coalesce(kt.user_total, 0) as last_kill_user_total,
      lk.clan_id as last_kill_clan_id,
      lk.clan_tag as last_kill_clan_tag,
      kt.clan_total as last_kill_clan_total,
      lk.created_at as last_kill_at
    from latest_kill lk
    cross join kill_totals kt;
    return;
  end if;

  insert into public.player_kills (player_id, user_id)
  values (target_player_id, auth.uid())
  returning * into inserted_kill;

  return query
  with latest_kill as (
    select
      pk.user_id,
      pk.created_at,
      pr.display_name,
      pr.clan_tag as profile_clan_tag,
      cm.clan_id,
      c.tag as clan_tag
    from public.player_kills pk
    join public.profiles pr on pr.id = pk.user_id
    left join public.clan_members cm on cm.user_id = pk.user_id
    left join public.clans c on c.id = cm.clan_id and c.archived_at is null
    where pk.player_id = target_player_id
    order by pk.created_at desc, pk.id desc
    limit 1
  ),
  kill_totals as (
    select
      (select count(*)::integer from public.player_kills pk where pk.player_id = target_player_id) as target_total,
      (select count(*)::integer from public.player_kills pk where pk.user_id = latest_kill.user_id) as user_total,
      case
        when latest_kill.clan_id is null then null::integer
        else (
          select count(*)::integer
          from public.player_kills pk
          join public.clan_members cm on cm.user_id = pk.user_id
          where cm.clan_id = latest_kill.clan_id
        )
      end as clan_total
    from latest_kill
  )
  select
    true as accepted,
    null::text as reason,
    coalesce(kt.target_total, 0) as kill_count,
    inserted_kill.created_at as recorded_at,
    inserted_kill.created_at + interval '10 minutes' as cooldown_ends_at,
    lk.user_id as last_kill_user_id,
    lk.display_name as last_kill_display_name,
    lk.profile_clan_tag as last_kill_profile_clan_tag,
    coalesce(kt.user_total, 0) as last_kill_user_total,
    lk.clan_id as last_kill_clan_id,
    lk.clan_tag as last_kill_clan_tag,
    kt.clan_total as last_kill_clan_total,
    lk.created_at as last_kill_at
  from latest_kill lk
  cross join kill_totals kt;
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
),
user_kill_totals as (
  select
    pk.user_id,
    count(pk.id)::integer as user_kill_total
  from public.player_kills pk
  group by pk.user_id
),
clan_kill_totals as (
  select
    cm.clan_id,
    count(pk.id)::integer as clan_kill_total
  from public.player_kills pk
  join public.clan_members cm on cm.user_id = pk.user_id
  group by cm.clan_id
),
latest_kills as (
  select distinct on (pk.player_id)
    pk.player_id,
    pk.user_id,
    pk.created_at,
    pr.display_name,
    pr.clan_tag as profile_clan_tag,
    cm.clan_id,
    c.tag as clan_tag
  from public.player_kills pk
  join public.profiles pr on pr.id = pk.user_id
  left join public.clan_members cm on cm.user_id = pk.user_id
  left join public.clans c on c.id = cm.clan_id and c.archived_at is null
  order by pk.player_id, pk.created_at desc, pk.id desc
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
  lk.user_id as last_kill_user_id,
  lk.display_name as last_kill_display_name,
  lk.profile_clan_tag as last_kill_profile_clan_tag,
  coalesce(ukt.user_kill_total, 0) as last_kill_user_total,
  lk.clan_id as last_kill_clan_id,
  lk.clan_tag as last_kill_clan_tag,
  ckt.clan_kill_total as last_kill_clan_total,
  lk.created_at as last_kill_at,
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
left join latest_kills lk on lk.player_id = p.id
left join user_kill_totals ukt on ukt.user_id = lk.user_id
left join clan_kill_totals ckt on ckt.clan_id = lk.clan_id
where p.quarantined_at is null or public.is_moderator_or_admin();

grant select on public.players_with_scores to anon, authenticated;
grant execute on function public.register_player_kill(uuid) to authenticated;
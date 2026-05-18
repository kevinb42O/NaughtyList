create or replace function public.list_player_kill_log(target_player_id uuid)
returns table (
  kill_id uuid,
  player_id uuid,
  user_id uuid,
  display_name text,
  profile_clan_tag text,
  clan_id uuid,
  clan_tag text,
  logged_at timestamptz,
  user_kill_total integer,
  clan_kill_total integer
)
language sql
stable
security definer
set search_path = public
as $$
  with target_player as (
    select p.id
    from public.players p
    where p.id = target_player_id
      and (p.quarantined_at is null or public.is_moderator_or_admin())
  ),
  user_totals as (
    select
      pk.user_id,
      count(pk.id)::integer as user_kill_total
    from public.player_kills pk
    group by pk.user_id
  ),
  clan_totals as (
    select
      cm.clan_id,
      count(pk.id)::integer as clan_kill_total
    from public.player_kills pk
    join public.clan_members cm on cm.user_id = pk.user_id
    group by cm.clan_id
  )
  select
    pk.id as kill_id,
    pk.player_id,
    pk.user_id,
    pr.display_name,
    pr.clan_tag as profile_clan_tag,
    cm.clan_id,
    c.tag as clan_tag,
    pk.created_at as logged_at,
    coalesce(ut.user_kill_total, 0) as user_kill_total,
    ct.clan_kill_total
  from public.player_kills pk
  join target_player tp on tp.id = pk.player_id
  join public.profiles pr on pr.id = pk.user_id
  left join public.clan_members cm on cm.user_id = pk.user_id
  left join public.clans c on c.id = cm.clan_id and c.archived_at is null
  left join user_totals ut on ut.user_id = pk.user_id
  left join clan_totals ct on ct.clan_id = cm.clan_id
  order by pk.created_at desc, pk.id desc;
$$;

grant execute on function public.list_player_kill_log(uuid) to anon, authenticated;
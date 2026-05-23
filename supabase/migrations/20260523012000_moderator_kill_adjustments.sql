create or replace function public.moderator_adjust_player_kills(
  target_player_id uuid,
  kills_to_remove integer default 1
)
returns table (
  requested_count integer,
  removed_count integer,
  remaining_kill_count integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  safe_kills_to_remove integer := greatest(coalesce(kills_to_remove, 0), 0);
  deleted_kill_count integer := 0;
  current_remaining_kill_count integer := 0;
begin
  if not public.is_moderator_or_admin() then
    raise exception 'Only moderators and admins can adjust kills';
  end if;

  if safe_kills_to_remove < 1 then
    raise exception 'You must remove at least one kill';
  end if;

  if not exists (
    select 1
    from public.players p
    where p.id = target_player_id
  ) then
    raise exception 'Operator not found';
  end if;

  with kill_rows_to_delete as (
    select pk.id
    from public.player_kills pk
    where pk.player_id = target_player_id
    order by pk.created_at desc, pk.id desc
    limit safe_kills_to_remove
  ), deleted_kill_rows as (
    delete from public.player_kills pk
    using kill_rows_to_delete kd
    where pk.id = kd.id
    returning pk.id
  )
  select count(*)::integer into deleted_kill_count
  from deleted_kill_rows;

  select count(pk.id)::integer into current_remaining_kill_count
  from public.player_kills pk
  where pk.player_id = target_player_id;

  if deleted_kill_count > 0 then
    update public.players
    set moderated_at = now(), moderated_by = auth.uid()
    where id = target_player_id;

    perform public.record_moderation_event(
      'player_kills_adjusted',
      null,
      target_player_id,
      null,
      jsonb_build_object(
        'requestedCount', safe_kills_to_remove,
        'removedCount', deleted_kill_count,
        'remainingKillCount', current_remaining_kill_count
      )
    );
  end if;

  return query
  select
    safe_kills_to_remove,
    deleted_kill_count,
    current_remaining_kill_count;
end;
$$;

revoke all on function public.moderator_adjust_player_kills(uuid, integer) from public, anon;
grant execute on function public.moderator_adjust_player_kills(uuid, integer) to authenticated;
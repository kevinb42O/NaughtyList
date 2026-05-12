create or replace function public.remove_clan_member(
  target_clan_id uuid,
  target_user_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_role text;
  target_role text;
begin
  select role into target_role
  from public.clan_members
  where clan_id = target_clan_id
    and user_id = target_user_id;

  if target_role is null then
    raise exception 'Clan member not found';
  end if;

  if target_role = 'owner' then
    raise exception 'Transfer ownership before removing the owner';
  end if;

  if not public.is_admin() then
    select role into actor_role
    from public.clan_members
    where clan_id = target_clan_id
      and user_id = auth.uid();

    if actor_role not in ('owner', 'officer') then
      raise exception 'Only clan officers or admins can remove members';
    end if;

    if actor_role = 'officer' and target_role = 'officer' then
      raise exception 'Officers cannot remove other officers';
    end if;
  end if;

  delete from public.clan_members
  where clan_id = target_clan_id
    and user_id = target_user_id;

  perform public.record_clan_event(
    target_clan_id,
    'member-removed',
    target_user_id,
    '{}'::jsonb
  );

  return true;
end;
$$;

grant execute on function public.remove_clan_member(uuid, uuid) to authenticated;
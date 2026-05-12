-- Expand clan_members role to include recruit, veteran, sergeant
-- Drop the existing inline check constraint (auto-named clan_members_role_check)
alter table public.clan_members
  drop constraint clan_members_role_check;

alter table public.clan_members
  add constraint clan_members_role_check
    check (role in ('owner', 'officer', 'veteran', 'sergeant', 'member', 'recruit'));

-- Replace update_clan_member_role to allow the new roles
create or replace function public.update_clan_member_role(
  target_clan_id uuid,
  target_user_id uuid,
  next_role text
)
returns public.clan_members
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_membership public.clan_members;
begin
  if next_role not in ('recruit', 'member', 'veteran', 'sergeant', 'officer') then
    raise exception 'Invalid clan role: %', next_role;
  end if;

  if not (public.is_admin() or public.is_clan_owner(target_clan_id)) then
    raise exception 'Only clan owners or admins can change clan roles';
  end if;

  if exists (
    select 1
    from public.clan_members
    where clan_id = target_clan_id
      and user_id = target_user_id
      and role = 'owner'
  ) then
    raise exception 'Use ownership transfer to change the owner role';
  end if;

  update public.clan_members
  set role = next_role
  where clan_id = target_clan_id
    and user_id = target_user_id
  returning * into updated_membership;

  if updated_membership.user_id is null then
    raise exception 'Clan member not found';
  end if;

  perform public.record_clan_event(
    target_clan_id,
    'role-updated',
    target_user_id,
    jsonb_build_object('role', next_role)
  );

  return updated_membership;
end;
$$;

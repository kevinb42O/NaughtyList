alter table public.profiles
drop constraint if exists profiles_supporter_tier_check;

alter table public.profiles
add constraint profiles_supporter_tier_check check (supporter_tier in ('none', 'supporter', 'backer', 'founder', 'colonel'));

create or replace function public.supporter_tier_for_amount(amount_cents integer)
returns text
language sql
immutable
as $$
  select case
    when coalesce(amount_cents, 0) >= 5000 then 'colonel'
    when coalesce(amount_cents, 0) >= 2500 then 'founder'
    when coalesce(amount_cents, 0) >= 1000 then 'backer'
    when coalesce(amount_cents, 0) > 0 then 'supporter'
    else 'none'
  end
$$;

create or replace function public.supporter_frame_for_tier(tier text)
returns text
language sql
immutable
as $$
  select case tier
    when 'colonel' then 'ruby'
    when 'founder' then 'gold'
    when 'backer' then 'cyan'
    when 'supporter' then 'emerald'
    else null
  end
$$;

create or replace function public.admin_grant_supporter_badge(
  p_target_profile_id uuid,
  p_tier text default 'supporter',
  p_display_name text default null,
  p_wall_visible boolean default false
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_profile public.profiles;
begin
  if not public.is_admin() then
    raise exception 'Only admins can grant supporter badges';
  end if;

  if p_tier not in ('supporter', 'backer', 'founder', 'colonel') then
    raise exception 'Supporter tier must be supporter, backer, founder, or colonel';
  end if;

  update public.profiles
  set
    supporter_tier = p_tier,
    supporter_since = coalesce(profiles.supporter_since, now()),
    supporter_active_until = null,
    supporter_badge_enabled = true,
    supporter_badge_visible = true,
    supporter_wall_visible = coalesce(p_wall_visible, profiles.supporter_wall_visible),
    supporter_display_name = coalesce(nullif(left(trim(coalesce(p_display_name, '')), 64), ''), profiles.supporter_display_name),
    supporter_profile_frame = public.supporter_frame_for_tier(p_tier),
    supporter_chat_flair = p_tier
  where profiles.id = p_target_profile_id
  returning * into updated_profile;

  if updated_profile.id is null then
    raise exception 'Profile not found';
  end if;

  return updated_profile;
end;
$$;

grant execute on function public.admin_grant_supporter_badge(uuid, text, text, boolean) to authenticated;

do $$
declare
  donor_profile_id uuid;
begin
  for donor_profile_id in
    select distinct profile_id
    from public.donations
    where profile_id is not null
      and status = 'confirmed'
  loop
    perform public.recalculate_profile_supporter_reward(donor_profile_id);
  end loop;
end;
$$;

alter table public.clan_members
drop constraint if exists clan_members_role_check;

alter table public.clan_members
add constraint clan_members_role_check
check (role in ('owner', 'officer', 'colonel', 'veteran', 'sergeant', 'member', 'recruit'));

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
  if next_role not in ('recruit', 'member', 'veteran', 'sergeant', 'colonel', 'officer') then
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

grant execute on function public.update_clan_member_role(uuid, uuid, text) to authenticated;

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

    if actor_role = 'officer' and target_role in ('officer', 'colonel') then
      raise exception 'Officers cannot remove senior clan ranks';
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
alter table public.clans
add column badge_icon text not null default 'shield';

alter table public.clans
add constraint clans_badge_icon_check
check (
  badge_icon in (
    'skull',
    'shield',
    'crosshair',
    'radar',
    'radio',
    'swords',
    'target',
    'flame',
    'zap',
    'eye',
    'ghost',
    'bomb',
    'rat',
    'bug',
    'siren',
    'lock',
    'fingerprint',
    'scan-face',
    'binoculars',
    'badge-alert'
  )
);

drop function public.list_clan_directory();

create function public.list_clan_directory()
returns table (
  id uuid,
  name text,
  tag text,
  description text,
  badge_icon text,
  created_by uuid,
  created_at timestamptz,
  updated_at timestamptz,
  member_count bigint,
  is_member boolean,
  has_pending_request boolean,
  has_pending_invite boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.id,
    c.name,
    c.tag,
    c.description,
    c.badge_icon,
    c.created_by,
    c.created_at,
    c.updated_at,
    count(cm.user_id)::bigint as member_count,
    exists (
      select 1
      from public.clan_members my_membership
      where my_membership.clan_id = c.id
        and my_membership.user_id = auth.uid()
    ) as is_member,
    exists (
      select 1
      from public.clan_join_requests cjr
      where cjr.clan_id = c.id
        and cjr.user_id = auth.uid()
        and cjr.status = 'pending'
    ) as has_pending_request,
    exists (
      select 1
      from public.clan_invites ci
      where ci.clan_id = c.id
        and ci.invitee_user_id = auth.uid()
        and ci.status = 'pending'
    ) as has_pending_invite
  from public.clans c
  left join public.clan_members cm on cm.clan_id = c.id
  where c.archived_at is null
  group by c.id;
$$;

drop function public.update_clan(uuid, text, text, text);

create function public.update_clan(
  target_clan_id uuid,
  clan_name text,
  clan_tag text,
  clan_description text default '',
  clan_badge_icon text default null
)
returns public.clans
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_clan public.clans;
begin
  if not (public.is_admin() or public.is_clan_owner(target_clan_id)) then
    raise exception 'Only clan owners or admins can update the clan';
  end if;

  update public.clans
  set name = trim(clan_name),
      tag = upper(trim(clan_tag)),
      description = trim(coalesce(clan_description, '')),
      badge_icon = coalesce(nullif(trim(clan_badge_icon), ''), badge_icon)
  where id = target_clan_id
    and archived_at is null
  returning * into updated_clan;

  if updated_clan.id is null then
    raise exception 'Clan not found';
  end if;

  perform public.sync_profile_clan_tags_for_clan(updated_clan.id);

  perform public.record_clan_event(
    target_clan_id,
    'clan-updated',
    null,
    jsonb_build_object(
      'name', updated_clan.name,
      'tag', updated_clan.tag,
      'badge_icon', updated_clan.badge_icon
    )
  );

  return updated_clan;
end;
$$;

grant execute on function public.list_clan_directory() to authenticated;
grant execute on function public.list_clan_directory() to anon;
grant execute on function public.update_clan(uuid, text, text, text, text) to authenticated;
create table public.clans (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 3 and 40),
  tag text not null check (char_length(trim(tag)) between 2 and 16),
  description text not null default '' check (char_length(trim(description)) <= 280),
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create unique index clans_active_name_lower_key
on public.clans (lower(trim(name)))
where archived_at is null;

create unique index clans_active_tag_lower_key
on public.clans (lower(trim(tag)))
where archived_at is null;

create table public.clan_members (
  clan_id uuid not null references public.clans(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'officer', 'member')),
  joined_at timestamptz not null default now(),
  added_by uuid references public.profiles(id) on delete set null,
  primary key (clan_id, user_id),
  unique (user_id)
);

create unique index clan_members_one_owner_per_clan
on public.clan_members (clan_id)
where role = 'owner';

create table public.clan_join_requests (
  id uuid primary key default gen_random_uuid(),
  clan_id uuid not null references public.clans(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  message text not null default '' check (char_length(trim(message)) <= 280),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  responded_by uuid references public.profiles(id) on delete set null
);

create unique index clan_join_requests_one_pending_per_clan_user
on public.clan_join_requests (clan_id, user_id)
where status = 'pending';

create index clan_join_requests_user_status_idx
on public.clan_join_requests (user_id, status, created_at desc);

create table public.clan_invites (
  id uuid primary key default gen_random_uuid(),
  clan_id uuid not null references public.clans(id) on delete cascade,
  invitee_user_id uuid not null references public.profiles(id) on delete cascade,
  invited_by_user_id uuid not null references public.profiles(id) on delete cascade,
  message text not null default '' check (char_length(trim(message)) <= 280),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'revoked')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  responded_by uuid references public.profiles(id) on delete set null
);

create unique index clan_invites_one_pending_per_clan_user
on public.clan_invites (clan_id, invitee_user_id)
where status = 'pending';

create index clan_invites_user_status_idx
on public.clan_invites (invitee_user_id, status, created_at desc);

create table public.clan_messages (
  id uuid primary key default gen_random_uuid(),
  clan_id uuid not null references public.clans(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 1000),
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  deleted_by uuid references public.profiles(id) on delete set null
);

create index clan_messages_clan_created_at_idx
on public.clan_messages (clan_id, created_at asc);

create table public.clan_audit_events (
  id uuid primary key default gen_random_uuid(),
  clan_id uuid not null references public.clans(id) on delete cascade,
  actor_user_id uuid references public.profiles(id) on delete set null,
  target_user_id uuid references public.profiles(id) on delete set null,
  event_type text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index clan_audit_events_clan_created_at_idx
on public.clan_audit_events (clan_id, created_at desc);

create trigger clans_touch_updated_at
before update on public.clans
for each row execute function public.touch_updated_at();

create function public.is_clan_member(target_clan_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.clan_members
    where clan_id = target_clan_id
      and user_id = auth.uid()
  )
$$;

create function public.is_clan_officer(target_clan_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.clan_members
    where clan_id = target_clan_id
      and user_id = auth.uid()
      and role in ('owner', 'officer')
  )
$$;

create function public.is_clan_owner(target_clan_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.clan_members
    where clan_id = target_clan_id
      and user_id = auth.uid()
      and role = 'owner'
  )
$$;

create function public.can_view_clan(target_clan_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin() or public.is_clan_member(target_clan_id)
$$;

create function public.can_manage_clan(target_clan_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin() or public.is_clan_officer(target_clan_id)
$$;

create function public.record_clan_event(
  target_clan_id uuid,
  next_event_type text,
  next_target_user_id uuid default null,
  next_details jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.clan_audit_events (clan_id, actor_user_id, target_user_id, event_type, details)
  values (
    target_clan_id,
    auth.uid(),
    next_target_user_id,
    next_event_type,
    coalesce(next_details, '{}'::jsonb)
  );
end;
$$;

create function public.sync_profile_clan_tag_for_user(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  next_tag text;
begin
  select c.tag
  into next_tag
  from public.clan_members cm
  join public.clans c on c.id = cm.clan_id
  where cm.user_id = target_user_id
    and c.archived_at is null
  limit 1;

  update public.profiles
  set clan_tag = coalesce(next_tag, '')
  where id = target_user_id;
end;
$$;

create function public.sync_profile_clan_tags_for_clan(target_clan_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles p
  set clan_tag = c.tag
  from public.clan_members cm
  join public.clans c on c.id = cm.clan_id
  where cm.clan_id = target_clan_id
    and cm.user_id = p.id
    and c.archived_at is null;
end;
$$;

create function public.sync_profile_clan_tag_from_membership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.sync_profile_clan_tag_for_user(old.user_id);
    return null;
  end if;

  perform public.sync_profile_clan_tag_for_user(new.user_id);

  if tg_op = 'UPDATE' and old.user_id is distinct from new.user_id then
    perform public.sync_profile_clan_tag_for_user(old.user_id);
  end if;

  return null;
end;
$$;

create trigger clan_members_sync_profile_clan_tag
after insert or update or delete on public.clan_members
for each row execute function public.sync_profile_clan_tag_from_membership();

create function public.list_clan_directory()
returns table (
  id uuid,
  name text,
  tag text,
  description text,
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

create function public.create_clan(
  clan_name text,
  clan_tag text,
  clan_description text default ''
)
returns public.clans
language plpgsql
security definer
set search_path = public
as $$
declare
  created_clan public.clans;
begin
  if auth.uid() is null then
    raise exception 'You must be logged in to create a clan';
  end if;

  if exists (
    select 1 from public.clan_members where user_id = auth.uid()
  ) then
    raise exception 'Leave your current clan before creating a new one';
  end if;

  insert into public.clans (name, tag, description, created_by)
  values (trim(clan_name), upper(trim(clan_tag)), trim(coalesce(clan_description, '')), auth.uid())
  returning * into created_clan;

  insert into public.clan_members (clan_id, user_id, role, added_by)
  values (created_clan.id, auth.uid(), 'owner', auth.uid());

  update public.clan_join_requests
  set status = 'cancelled', responded_at = now(), responded_by = auth.uid()
  where user_id = auth.uid()
    and status = 'pending';

  update public.clan_invites
  set status = 'declined', responded_at = now(), responded_by = auth.uid()
  where invitee_user_id = auth.uid()
    and status = 'pending';

  perform public.record_clan_event(
    created_clan.id,
    'clan-created',
    auth.uid(),
    jsonb_build_object('name', created_clan.name, 'tag', created_clan.tag)
  );

  return created_clan;
end;
$$;

create function public.request_clan_join(
  target_clan_id uuid,
  request_message text default ''
)
returns public.clan_join_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  next_request public.clan_join_requests;
begin
  if auth.uid() is null then
    raise exception 'You must be logged in to request a clan invite';
  end if;

  if exists (
    select 1 from public.clan_members where user_id = auth.uid()
  ) then
    raise exception 'Leave your current clan before requesting another one';
  end if;

  if not exists (
    select 1 from public.clans where id = target_clan_id and archived_at is null
  ) then
    raise exception 'Clan not found';
  end if;

  if exists (
    select 1 from public.clan_invites
    where clan_id = target_clan_id
      and invitee_user_id = auth.uid()
      and status = 'pending'
  ) then
    raise exception 'You already have a pending invite to this clan';
  end if;

  insert into public.clan_join_requests (clan_id, user_id, message)
  values (target_clan_id, auth.uid(), trim(coalesce(request_message, '')))
  returning * into next_request;

  perform public.record_clan_event(
    target_clan_id,
    'join-requested',
    auth.uid(),
    jsonb_build_object('message', next_request.message)
  );

  return next_request;
end;
$$;

create function public.cancel_clan_join_request(target_request_id uuid)
returns public.clan_join_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_request public.clan_join_requests;
begin
  update public.clan_join_requests
  set status = 'cancelled', responded_at = now(), responded_by = auth.uid()
  where id = target_request_id
    and user_id = auth.uid()
    and status = 'pending'
  returning * into updated_request;

  if updated_request.id is null then
    raise exception 'Join request not found';
  end if;

  perform public.record_clan_event(
    updated_request.clan_id,
    'join-request-cancelled',
    updated_request.user_id,
    '{}'::jsonb
  );

  return updated_request;
end;
$$;

create function public.approve_clan_join_request(target_request_id uuid)
returns public.clan_members
language plpgsql
security definer
set search_path = public
as $$
declare
  pending_request public.clan_join_requests;
  created_membership public.clan_members;
begin
  select *
  into pending_request
  from public.clan_join_requests
  where id = target_request_id
    and status = 'pending';

  if pending_request.id is null then
    raise exception 'Join request not found';
  end if;

  if not (public.is_admin() or public.is_clan_officer(pending_request.clan_id)) then
    raise exception 'Only clan officers or admins can approve join requests';
  end if;

  if exists (
    select 1 from public.clan_members where user_id = pending_request.user_id
  ) then
    raise exception 'This user is already in a clan';
  end if;

  insert into public.clan_members (clan_id, user_id, role, added_by)
  values (pending_request.clan_id, pending_request.user_id, 'member', auth.uid())
  returning * into created_membership;

  update public.clan_join_requests
  set status = 'approved', responded_at = now(), responded_by = auth.uid()
  where id = target_request_id;

  update public.clan_join_requests
  set status = 'cancelled', responded_at = now(), responded_by = auth.uid()
  where user_id = pending_request.user_id
    and id <> target_request_id
    and status = 'pending';

  update public.clan_invites
  set status = 'revoked', responded_at = now(), responded_by = auth.uid()
  where invitee_user_id = pending_request.user_id
    and status = 'pending';

  perform public.record_clan_event(
    pending_request.clan_id,
    'join-request-approved',
    pending_request.user_id,
    '{}'::jsonb
  );

  return created_membership;
end;
$$;

create function public.reject_clan_join_request(target_request_id uuid)
returns public.clan_join_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_request public.clan_join_requests;
begin
  update public.clan_join_requests
  set status = 'rejected', responded_at = now(), responded_by = auth.uid()
  where id = target_request_id
    and status = 'pending'
    and (public.is_admin() or public.is_clan_officer(clan_id))
  returning * into updated_request;

  if updated_request.id is null then
    raise exception 'Join request not found';
  end if;

  perform public.record_clan_event(
    updated_request.clan_id,
    'join-request-rejected',
    updated_request.user_id,
    '{}'::jsonb
  );

  return updated_request;
end;
$$;

create function public.invite_clan_member(
  target_clan_id uuid,
  target_user_id uuid,
  invite_message text default ''
)
returns public.clan_invites
language plpgsql
security definer
set search_path = public
as $$
declare
  created_invite public.clan_invites;
begin
  if auth.uid() is null then
    raise exception 'You must be logged in to invite clan members';
  end if;

  if not (public.is_admin() or public.is_clan_officer(target_clan_id)) then
    raise exception 'Only clan officers or admins can invite members';
  end if;

  if exists (
    select 1 from public.clan_members where user_id = target_user_id
  ) then
    raise exception 'This user is already in a clan';
  end if;

  if exists (
    select 1 from public.clan_join_requests
    where clan_id = target_clan_id
      and user_id = target_user_id
      and status = 'pending'
  ) then
    raise exception 'This user already has a pending request for this clan';
  end if;

  insert into public.clan_invites (clan_id, invitee_user_id, invited_by_user_id, message)
  values (target_clan_id, target_user_id, auth.uid(), trim(coalesce(invite_message, '')))
  returning * into created_invite;

  perform public.record_clan_event(
    target_clan_id,
    'member-invited',
    target_user_id,
    jsonb_build_object('message', created_invite.message)
  );

  return created_invite;
end;
$$;

create function public.accept_clan_invite(target_invite_id uuid)
returns public.clan_members
language plpgsql
security definer
set search_path = public
as $$
declare
  pending_invite public.clan_invites;
  created_membership public.clan_members;
begin
  select *
  into pending_invite
  from public.clan_invites
  where id = target_invite_id
    and invitee_user_id = auth.uid()
    and status = 'pending';

  if pending_invite.id is null then
    raise exception 'Invite not found';
  end if;

  if exists (
    select 1 from public.clan_members where user_id = auth.uid()
  ) then
    raise exception 'Leave your current clan before accepting another invite';
  end if;

  if not exists (
    select 1 from public.clans where id = pending_invite.clan_id and archived_at is null
  ) then
    raise exception 'Clan not found';
  end if;

  insert into public.clan_members (clan_id, user_id, role, added_by)
  values (pending_invite.clan_id, auth.uid(), 'member', pending_invite.invited_by_user_id)
  returning * into created_membership;

  update public.clan_invites
  set status = 'accepted', responded_at = now(), responded_by = auth.uid()
  where id = target_invite_id;

  update public.clan_invites
  set status = 'declined', responded_at = now(), responded_by = auth.uid()
  where invitee_user_id = auth.uid()
    and id <> target_invite_id
    and status = 'pending';

  update public.clan_join_requests
  set status = 'cancelled', responded_at = now(), responded_by = auth.uid()
  where user_id = auth.uid()
    and status = 'pending';

  perform public.record_clan_event(
    pending_invite.clan_id,
    'invite-accepted',
    auth.uid(),
    '{}'::jsonb
  );

  return created_membership;
end;
$$;

create function public.decline_clan_invite(target_invite_id uuid)
returns public.clan_invites
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_invite public.clan_invites;
begin
  update public.clan_invites
  set status = 'declined', responded_at = now(), responded_by = auth.uid()
  where id = target_invite_id
    and invitee_user_id = auth.uid()
    and status = 'pending'
  returning * into updated_invite;

  if updated_invite.id is null then
    raise exception 'Invite not found';
  end if;

  perform public.record_clan_event(
    updated_invite.clan_id,
    'invite-declined',
    auth.uid(),
    '{}'::jsonb
  );

  return updated_invite;
end;
$$;

create function public.remove_clan_member(
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

    if actor_role = 'officer' and target_role <> 'member' then
      raise exception 'Officers can only remove members';
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

create function public.leave_clan(target_clan_id uuid default null)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  current_membership public.clan_members;
begin
  select *
  into current_membership
  from public.clan_members
  where user_id = auth.uid()
    and (target_clan_id is null or clan_id = target_clan_id);

  if current_membership.user_id is null then
    raise exception 'You are not in a clan';
  end if;

  if current_membership.role = 'owner' then
    raise exception 'Transfer ownership before leaving the clan';
  end if;

  delete from public.clan_members
  where clan_id = current_membership.clan_id
    and user_id = auth.uid();

  perform public.record_clan_event(
    current_membership.clan_id,
    'member-left',
    auth.uid(),
    '{}'::jsonb
  );

  return true;
end;
$$;

create function public.update_clan_member_role(
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
  if next_role not in ('member', 'officer') then
    raise exception 'Invalid clan role';
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

create function public.transfer_clan_ownership(
  target_clan_id uuid,
  target_user_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not (public.is_admin() or public.is_clan_owner(target_clan_id)) then
    raise exception 'Only clan owners or admins can transfer ownership';
  end if;

  if not exists (
    select 1
    from public.clan_members
    where clan_id = target_clan_id
      and user_id = target_user_id
  ) then
    raise exception 'Target member not found';
  end if;

  update public.clan_members
  set role = 'officer'
  where clan_id = target_clan_id
    and role = 'owner';

  update public.clan_members
  set role = 'owner'
  where clan_id = target_clan_id
    and user_id = target_user_id;

  perform public.record_clan_event(
    target_clan_id,
    'ownership-transferred',
    target_user_id,
    '{}'::jsonb
  );

  return true;
end;
$$;

create function public.update_clan(
  target_clan_id uuid,
  clan_name text,
  clan_tag text,
  clan_description text default ''
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
      description = trim(coalesce(clan_description, ''))
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
    jsonb_build_object('name', updated_clan.name, 'tag', updated_clan.tag)
  );

  return updated_clan;
end;
$$;

create function public.archive_clan(target_clan_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  archived_clan public.clans;
begin
  if not (public.is_admin() or public.is_clan_owner(target_clan_id)) then
    raise exception 'Only clan owners or admins can archive the clan';
  end if;

  update public.clans
  set archived_at = now()
  where id = target_clan_id
    and archived_at is null
  returning * into archived_clan;

  if archived_clan.id is null then
    raise exception 'Clan not found';
  end if;

  perform public.record_clan_event(
    target_clan_id,
    'clan-archived',
    null,
    '{}'::jsonb
  );

  update public.clan_join_requests
  set status = 'cancelled', responded_at = now(), responded_by = auth.uid()
  where clan_id = target_clan_id
    and status = 'pending';

  update public.clan_invites
  set status = 'revoked', responded_at = now(), responded_by = auth.uid()
  where clan_id = target_clan_id
    and status = 'pending';

  delete from public.clan_members
  where clan_id = target_clan_id;

  return true;
end;
$$;

create function public.delete_clan_message(target_message_id uuid)
returns public.clan_messages
language plpgsql
security definer
set search_path = public
as $$
declare
  current_message public.clan_messages;
  updated_message public.clan_messages;
begin
  select *
  into current_message
  from public.clan_messages
  where id = target_message_id;

  if current_message.id is null then
    raise exception 'Clan message not found';
  end if;

  if current_message.deleted_at is not null then
    return current_message;
  end if;

  if not (
    public.is_admin()
    or current_message.user_id = auth.uid()
    or public.is_clan_officer(current_message.clan_id)
  ) then
    raise exception 'You cannot delete this clan message';
  end if;

  update public.clan_messages
  set deleted_at = now(),
      deleted_by = auth.uid()
  where id = target_message_id
  returning * into updated_message;

  perform public.record_clan_event(
    current_message.clan_id,
    'message-deleted',
    current_message.user_id,
    jsonb_build_object('message_id', current_message.id)
  );

  return updated_message;
end;
$$;

alter table public.clans enable row level security;
alter table public.clan_members enable row level security;
alter table public.clan_join_requests enable row level security;
alter table public.clan_invites enable row level security;
alter table public.clan_messages enable row level security;
alter table public.clan_audit_events enable row level security;

create policy "authenticated users can read active clans"
on public.clans for select
to authenticated
using (archived_at is null or public.is_admin());

create policy "members and admins can read clan rosters"
on public.clan_members for select
to authenticated
using (public.is_admin() or user_id = auth.uid() or public.is_clan_member(clan_id));

create policy "members and admins can read join requests"
on public.clan_join_requests for select
to authenticated
using (public.is_admin() or user_id = auth.uid() or public.is_clan_officer(clan_id));

create policy "members and admins can read clan invites"
on public.clan_invites for select
to authenticated
using (public.is_admin() or invitee_user_id = auth.uid() or public.is_clan_officer(clan_id));

create policy "members and admins can read clan messages"
on public.clan_messages for select
to authenticated
using (public.can_view_clan(clan_id));

create policy "members can send clan messages"
on public.clan_messages for insert
to authenticated
with check (user_id = auth.uid() and public.is_clan_member(clan_id));

create policy "members and admins can read clan audit events"
on public.clan_audit_events for select
to authenticated
using (public.can_view_clan(clan_id));

grant select on public.clans to authenticated;
grant select on public.clan_members to authenticated;
grant select on public.clan_join_requests to authenticated;
grant select on public.clan_invites to authenticated;
grant select, insert on public.clan_messages to authenticated;
grant select on public.clan_audit_events to authenticated;

grant execute on function public.list_clan_directory() to authenticated;
grant execute on function public.create_clan(text, text, text) to authenticated;
grant execute on function public.request_clan_join(uuid, text) to authenticated;
grant execute on function public.cancel_clan_join_request(uuid) to authenticated;
grant execute on function public.approve_clan_join_request(uuid) to authenticated;
grant execute on function public.reject_clan_join_request(uuid) to authenticated;
grant execute on function public.invite_clan_member(uuid, uuid, text) to authenticated;
grant execute on function public.accept_clan_invite(uuid) to authenticated;
grant execute on function public.decline_clan_invite(uuid) to authenticated;
grant execute on function public.remove_clan_member(uuid, uuid) to authenticated;
grant execute on function public.leave_clan(uuid) to authenticated;
grant execute on function public.update_clan_member_role(uuid, uuid, text) to authenticated;
grant execute on function public.transfer_clan_ownership(uuid, uuid) to authenticated;
grant execute on function public.update_clan(uuid, text, text, text) to authenticated;
grant execute on function public.archive_clan(uuid) to authenticated;
grant execute on function public.delete_clan_message(uuid) to authenticated;

alter table public.clans replica identity full;
alter table public.clan_members replica identity full;
alter table public.clan_join_requests replica identity full;
alter table public.clan_invites replica identity full;
alter table public.clan_messages replica identity full;
alter table public.clan_audit_events replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.clans;
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  alter publication supabase_realtime add table public.clan_members;
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  alter publication supabase_realtime add table public.clan_join_requests;
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  alter publication supabase_realtime add table public.clan_invites;
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  alter publication supabase_realtime add table public.clan_messages;
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  alter publication supabase_realtime add table public.clan_audit_events;
exception
  when duplicate_object then null;
end;
$$;
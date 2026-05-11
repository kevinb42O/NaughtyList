create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role text not null default 'user' check (role in ('user', 'moderator', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.players (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  clan text not null default '',
  threat_level text not null default 'caution' check (threat_level in ('hostile', 'caution', 'friendly')),
  initial_trust_score integer not null default 50 check (initial_trust_score between 0 and 100),
  tags text[] not null default '{}',
  evidence_url text not null default '',
  notes text not null default '',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  moderated_at timestamptz,
  moderated_by uuid references public.profiles(id) on delete set null
);

create table public.trust_votes (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  score integer not null check (score between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (player_id, user_id)
);

create view public.players_with_scores as
select
  p.id,
  p.name,
  p.clan,
  p.threat_level,
  p.initial_trust_score,
  coalesce(round(avg(v.score))::integer, p.initial_trust_score) as trust_score,
  count(v.id)::integer as vote_count,
  p.tags,
  p.evidence_url,
  p.notes,
  p.created_by,
  p.created_at,
  p.updated_at,
  p.moderated_at,
  p.moderated_by
from public.players p
left join public.trust_votes v on v.player_id = p.id
group by p.id;

create function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch_updated_at
before update on public.profiles
for each row execute function public.touch_updated_at();

create trigger players_touch_updated_at
before update on public.players
for each row execute function public.touch_updated_at();

create trigger trust_votes_touch_updated_at
before update on public.trust_votes
for each row execute function public.touch_updated_at();

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    'user'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role from public.profiles where id = auth.uid()), 'anonymous')
$$;

create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_role() = 'admin'
$$;

create function public.is_moderator_or_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_role() in ('moderator', 'admin')
$$;

create function public.prevent_second_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role = 'admin' and exists (
    select 1 from public.profiles
    where role = 'admin' and id <> new.id
  ) then
    raise exception 'Only one admin is allowed';
  end if;

  if tg_op = 'UPDATE' and old.role = 'admin' and new.role <> 'admin' then
    raise exception 'The only admin cannot be demoted';
  end if;

  return new;
end;
$$;

create trigger profiles_prevent_second_admin
before insert or update on public.profiles
for each row execute function public.prevent_second_admin();

create function public.set_profile_role(target_user_id uuid, next_role text)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_profile public.profiles;
begin
  if not public.is_admin() then
    raise exception 'Only admins can change roles';
  end if;

  if next_role not in ('user', 'moderator', 'admin') then
    raise exception 'Invalid role';
  end if;

  update public.profiles
  set role = next_role
  where id = target_user_id
  returning * into updated_profile;

  if updated_profile.id is null then
    raise exception 'Profile not found';
  end if;

  return updated_profile;
end;
$$;

alter table public.profiles enable row level security;
alter table public.players enable row level security;
alter table public.trust_votes enable row level security;

create policy "profiles are public readable"
on public.profiles for select
using (true);

create policy "users can update own display name"
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid() and role = (select role from public.profiles where id = auth.uid()));

create policy "players are public readable"
on public.players for select
using (true);

create policy "authenticated users can create players"
on public.players for insert
to authenticated
with check (created_by = auth.uid());

create policy "owners can update own players"
on public.players for update
to authenticated
using (created_by = auth.uid())
with check (created_by = auth.uid());

create policy "moderators can update players"
on public.players for update
to authenticated
using (public.is_moderator_or_admin())
with check (public.is_moderator_or_admin());

create policy "moderators can delete players"
on public.players for delete
to authenticated
using (public.is_moderator_or_admin());

create policy "trust votes are public readable"
on public.trust_votes for select
using (true);

create policy "authenticated users can vote"
on public.trust_votes for insert
to authenticated
with check (user_id = auth.uid());

create policy "authenticated users can update own votes"
on public.trust_votes for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "users can delete own votes"
on public.trust_votes for delete
to authenticated
using (user_id = auth.uid());

create policy "moderators can delete votes"
on public.trust_votes for delete
to authenticated
using (public.is_moderator_or_admin());

grant usage on schema public to anon, authenticated;
grant select on public.profiles to anon, authenticated;
grant select on public.players to anon, authenticated;
grant select on public.trust_votes to anon, authenticated;
grant select on public.players_with_scores to anon, authenticated;
grant insert, update on public.players to authenticated;
grant delete on public.players to authenticated;
grant insert, update, delete on public.trust_votes to authenticated;
grant execute on function public.set_profile_role(uuid, text) to authenticated;

alter table public.profiles
add column if not exists clan_tag text not null default '',
add column if not exists activision_ids text[] not null default '{}',
add column if not exists last_seen timestamptz;

create table public.public_chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 500),
  created_at timestamptz not null default now()
);

create table public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 1000),
  read_at timestamptz,
  created_at timestamptz not null default now(),
  check (sender_id <> recipient_id)
);

alter table public.public_chat_messages enable row level security;
alter table public.direct_messages enable row level security;

create policy "authenticated users can read public chat"
on public.public_chat_messages for select
to authenticated
using (true);

create policy "authenticated users can send public chat"
on public.public_chat_messages for insert
to authenticated
with check (user_id = auth.uid());

create policy "moderators can delete public chat"
on public.public_chat_messages for delete
to authenticated
using (public.is_moderator_or_admin());

create policy "users can read own direct messages"
on public.direct_messages for select
to authenticated
using (sender_id = auth.uid() or recipient_id = auth.uid());

create policy "users can send direct messages"
on public.direct_messages for insert
to authenticated
with check (sender_id = auth.uid());

create policy "users can update received direct messages"
on public.direct_messages for update
to authenticated
using (recipient_id = auth.uid())
with check (recipient_id = auth.uid());

create policy "users can delete own direct messages"
on public.direct_messages for delete
to authenticated
using (sender_id = auth.uid() or recipient_id = auth.uid() or public.is_moderator_or_admin());

grant select, insert on public.public_chat_messages to authenticated;
grant delete on public.public_chat_messages to authenticated;
grant select, insert, update, delete on public.direct_messages to authenticated;

alter table public.profiles replica identity full;
alter table public.public_chat_messages replica identity full;
alter table public.direct_messages replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.profiles;
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  alter publication supabase_realtime add table public.public_chat_messages;
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  alter publication supabase_realtime add table public.direct_messages;
exception
  when duplicate_object then null;
end;
$$;

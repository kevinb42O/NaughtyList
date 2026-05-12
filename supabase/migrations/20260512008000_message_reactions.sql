create table public.public_chat_message_reactions (
  message_id uuid not null references public.public_chat_messages(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  reaction text not null check (reaction in ('middle_finger', 'heart', 'rofl', 'sad_tear', 'xd')),
  created_at timestamptz not null default now(),
  primary key (message_id, user_id)
);

create table public.direct_message_reactions (
  message_id uuid not null references public.direct_messages(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  reaction text not null check (reaction in ('middle_finger', 'heart', 'rofl', 'sad_tear', 'xd')),
  created_at timestamptz not null default now(),
  primary key (message_id, user_id)
);

create table public.clan_message_reactions (
  message_id uuid not null references public.clan_messages(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  reaction text not null check (reaction in ('middle_finger', 'heart', 'rofl', 'sad_tear', 'xd')),
  created_at timestamptz not null default now(),
  primary key (message_id, user_id)
);

alter table public.public_chat_message_reactions enable row level security;
alter table public.direct_message_reactions enable row level security;
alter table public.clan_message_reactions enable row level security;

create policy "authenticated users can read public chat reactions"
on public.public_chat_message_reactions for select
to authenticated
using (exists (
  select 1 from public.public_chat_messages pcm where pcm.id = message_id
));

create policy "users can react to public chat"
on public.public_chat_message_reactions for insert
to authenticated
with check (user_id = auth.uid() and exists (
  select 1 from public.public_chat_messages pcm where pcm.id = message_id
));

create policy "users can update own public chat reactions"
on public.public_chat_message_reactions for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "users can delete own public chat reactions"
on public.public_chat_message_reactions for delete
to authenticated
using (user_id = auth.uid());

create policy "participants can read direct message reactions"
on public.direct_message_reactions for select
to authenticated
using (exists (
  select 1
  from public.direct_messages dm
  where dm.id = message_id
    and (dm.sender_id = auth.uid() or dm.recipient_id = auth.uid())
));

create policy "participants can react to direct messages"
on public.direct_message_reactions for insert
to authenticated
with check (user_id = auth.uid() and exists (
  select 1
  from public.direct_messages dm
  where dm.id = message_id
    and (dm.sender_id = auth.uid() or dm.recipient_id = auth.uid())
));

create policy "users can update own direct message reactions"
on public.direct_message_reactions for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "users can delete own direct message reactions"
on public.direct_message_reactions for delete
to authenticated
using (user_id = auth.uid());

create policy "clan viewers can read clan message reactions"
on public.clan_message_reactions for select
to authenticated
using (exists (
  select 1
  from public.clan_messages cm
  where cm.id = message_id
    and public.can_view_clan(cm.clan_id)
));

create policy "clan viewers can react to clan messages"
on public.clan_message_reactions for insert
to authenticated
with check (user_id = auth.uid() and exists (
  select 1
  from public.clan_messages cm
  where cm.id = message_id
    and public.can_view_clan(cm.clan_id)
));

create policy "users can update own clan message reactions"
on public.clan_message_reactions for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "users can delete own clan message reactions"
on public.clan_message_reactions for delete
to authenticated
using (user_id = auth.uid());

grant select, insert, update, delete on public.public_chat_message_reactions to authenticated;
grant select, insert, update, delete on public.direct_message_reactions to authenticated;
grant select, insert, update, delete on public.clan_message_reactions to authenticated;

alter table public.public_chat_message_reactions replica identity full;
alter table public.direct_message_reactions replica identity full;
alter table public.clan_message_reactions replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.public_chat_message_reactions;
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  alter publication supabase_realtime add table public.direct_message_reactions;
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  alter publication supabase_realtime add table public.clan_message_reactions;
exception
  when duplicate_object then null;
end;
$$;
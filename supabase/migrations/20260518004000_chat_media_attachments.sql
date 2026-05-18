alter table public.public_chat_messages
add column if not exists media_url text,
add column if not exists media_type text;

alter table public.direct_messages
add column if not exists media_url text,
add column if not exists media_type text;

alter table public.clan_messages
add column if not exists media_url text,
add column if not exists media_type text;

alter table public.public_chat_messages
drop constraint if exists public_chat_messages_body_check;

alter table public.direct_messages
drop constraint if exists direct_messages_body_check;

alter table public.clan_messages
drop constraint if exists clan_messages_body_check;

alter table public.public_chat_messages
drop constraint if exists public_chat_messages_body_media_check;

alter table public.direct_messages
drop constraint if exists direct_messages_body_media_check;

alter table public.clan_messages
drop constraint if exists clan_messages_body_media_check;

alter table public.public_chat_messages
add constraint public_chat_messages_body_media_check check (
  (
    media_url is null
    and media_type is null
    and char_length(trim(body)) between 1 and 500
  )
  or (
    media_url is not null
    and media_type in ('image', 'gif')
    and media_url ~ '^https://'
    and char_length(media_url) <= 2048
    and char_length(trim(body)) <= 500
  )
);

alter table public.direct_messages
add constraint direct_messages_body_media_check check (
  (
    media_url is null
    and media_type is null
    and char_length(trim(body)) between 1 and 1000
  )
  or (
    media_url is not null
    and media_type in ('image', 'gif')
    and media_url ~ '^https://'
    and char_length(media_url) <= 2048
    and char_length(trim(body)) <= 1000
  )
);

alter table public.clan_messages
add constraint clan_messages_body_media_check check (
  (
    media_url is null
    and media_type is null
    and char_length(trim(body)) between 1 and 1000
  )
  or (
    media_url is not null
    and media_type in ('image', 'gif')
    and media_url ~ '^https://'
    and char_length(media_url) <= 2048
    and char_length(trim(body)) <= 1000
  )
);

create table if not exists public.media_upload_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  object_key text not null,
  content_type text not null,
  file_size integer not null check (file_size > 0),
  created_at timestamptz not null default now()
);

create index if not exists media_upload_events_user_created_at_idx
on public.media_upload_events (user_id, created_at desc);

alter table public.media_upload_events enable row level security;

drop policy if exists "users can read own media upload events" on public.media_upload_events;

create policy "users can read own media upload events"
on public.media_upload_events for select
to authenticated
using (user_id = auth.uid());

grant select on public.media_upload_events to authenticated;
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
    and media_type in ('image', 'gif', 'audio')
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
    and media_type in ('image', 'gif', 'audio')
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
    and media_type in ('image', 'gif', 'audio')
    and media_url ~ '^https://'
    and char_length(media_url) <= 2048
    and char_length(trim(body)) <= 1000
  )
);

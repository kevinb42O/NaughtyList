alter table public.profiles
add column if not exists avatar_image_url text;

alter table public.profiles
drop constraint if exists profiles_avatar_image_url_check;

alter table public.profiles
add constraint profiles_avatar_image_url_check
check (
  avatar_image_url is null
  or (
    avatar_image_url ~ '^https://'
    and char_length(avatar_image_url) <= 2048
  )
);
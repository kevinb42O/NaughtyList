alter table public.profiles
add column if not exists banner_image_url text;

alter table public.profiles
drop constraint if exists profiles_banner_image_url_check;

alter table public.profiles
add constraint profiles_banner_image_url_check
check (
  banner_image_url is null
  or (
    banner_image_url ~ '^https://'
    and char_length(banner_image_url) <= 2048
  )
);
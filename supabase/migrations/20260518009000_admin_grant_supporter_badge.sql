create or replace function public.admin_grant_supporter_badge(
  target_profile_id uuid,
  tier text default 'supporter',
  display_name text default null,
  wall_visible boolean default false
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

  if tier not in ('supporter', 'backer', 'founder') then
    raise exception 'Supporter tier must be supporter, backer, or founder';
  end if;

  update public.profiles
  set
    supporter_tier = tier,
    supporter_since = coalesce(supporter_since, now()),
    supporter_active_until = null,
    supporter_badge_enabled = true,
    supporter_badge_visible = true,
    supporter_wall_visible = coalesce(wall_visible, supporter_wall_visible),
    supporter_display_name = coalesce(nullif(left(trim(coalesce(display_name, '')), 64), ''), supporter_display_name),
    supporter_profile_frame = public.supporter_frame_for_tier(tier),
    supporter_chat_flair = tier
  where id = target_profile_id
  returning * into updated_profile;

  if updated_profile.id is null then
    raise exception 'Profile not found';
  end if;

  return updated_profile;
end;
$$;

grant execute on function public.admin_grant_supporter_badge(uuid, text, text, boolean) to authenticated;

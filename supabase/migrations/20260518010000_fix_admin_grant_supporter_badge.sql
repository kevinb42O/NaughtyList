drop function if exists public.admin_grant_supporter_badge(uuid, text, text, boolean);

create or replace function public.admin_grant_supporter_badge(
  p_target_profile_id uuid,
  p_tier text default 'supporter',
  p_display_name text default null,
  p_wall_visible boolean default false
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

  if p_tier not in ('supporter', 'backer', 'founder') then
    raise exception 'Supporter tier must be supporter, backer, or founder';
  end if;

  update public.profiles
  set
    supporter_tier = p_tier,
    supporter_since = coalesce(profiles.supporter_since, now()),
    supporter_active_until = null,
    supporter_badge_enabled = true,
    supporter_badge_visible = true,
    supporter_wall_visible = coalesce(p_wall_visible, profiles.supporter_wall_visible),
    supporter_display_name = coalesce(nullif(left(trim(coalesce(p_display_name, '')), 64), ''), profiles.supporter_display_name),
    supporter_profile_frame = public.supporter_frame_for_tier(p_tier),
    supporter_chat_flair = p_tier
  where profiles.id = p_target_profile_id
  returning * into updated_profile;

  if updated_profile.id is null then
    raise exception 'Profile not found';
  end if;

  return updated_profile;
end;
$$;

grant execute on function public.admin_grant_supporter_badge(uuid, text, text, boolean) to authenticated;
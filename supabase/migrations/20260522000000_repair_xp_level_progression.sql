create or replace function public.profile_level_for_profile(total_xp integer, has_bio boolean, account_count integer)
returns integer
language sql
immutable
as $$
  select public.profile_level_for_xp(total_xp)
$$;

create or replace function public.sync_profile_progression_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  ledger_xp integer := 0;
begin
  select coalesce(sum(xp_amount), 0)::integer
  into ledger_xp
  from public.profile_xp_events
  where user_id = new.id;

  new.xp_total = ledger_xp;
  new.level = public.profile_level_for_xp(ledger_xp);

  return new;
end;
$$;

drop trigger if exists profiles_sync_progression_fields on public.profiles;

create trigger profiles_sync_progression_fields
before insert or update of xp_total, level on public.profiles
for each row execute function public.sync_profile_progression_fields();

create or replace function public.protect_profile_streak_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if current_setting('app.allow_profile_streak_update', true) = 'on' then
    return new;
  end if;

  if public.is_admin() then
    return new;
  end if;

  if old.login_streak_count is distinct from new.login_streak_count
    or old.longest_login_streak_count is distinct from new.longest_login_streak_count
    or old.last_streak_login_date is distinct from new.last_streak_login_date
    or old.streak_freezes is distinct from new.streak_freezes
    or old.daily_checkin_count is distinct from new.daily_checkin_count then
    new.login_streak_count = old.login_streak_count;
    new.longest_login_streak_count = old.longest_login_streak_count;
    new.last_streak_login_date = old.last_streak_login_date;
    new.streak_freezes = old.streak_freezes;
    new.daily_checkin_count = old.daily_checkin_count;
  end if;

  return new;
end;
$$;

with event_totals as (
  select
    p.id as user_id,
    coalesce(sum(e.xp_amount), 0)::integer as total_xp
  from public.profiles p
  left join public.profile_xp_events e on e.user_id = p.id
  group by p.id
)
update public.profiles p
set
  xp_total = event_totals.total_xp,
  level = public.profile_level_for_xp(event_totals.total_xp)
from event_totals
where p.id = event_totals.user_id
  and (
    p.xp_total is distinct from event_totals.total_xp
    or p.level is distinct from public.profile_level_for_xp(event_totals.total_xp)
  );
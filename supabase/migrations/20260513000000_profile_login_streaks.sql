alter table public.profiles
add column if not exists login_streak_count integer not null default 0 check (login_streak_count >= 0),
add column if not exists longest_login_streak_count integer not null default 0 check (longest_login_streak_count >= 0),
add column if not exists last_streak_login_date date;

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
    or old.last_streak_login_date is distinct from new.last_streak_login_date then
    new.login_streak_count = old.login_streak_count;
    new.longest_login_streak_count = old.longest_login_streak_count;
    new.last_streak_login_date = old.last_streak_login_date;
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_protect_streak_fields on public.profiles;

create trigger profiles_protect_streak_fields
before update on public.profiles
for each row execute function public.protect_profile_streak_fields();

create or replace function public.claim_daily_login_streak()
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  today date := (timezone('utc', now()))::date;
  updated_profile public.profiles;
begin
  if auth.uid() is null then
    raise exception 'You must be logged in to claim a daily streak';
  end if;

  perform set_config('app.allow_profile_streak_update', 'on', true);

  update public.profiles
  set
    login_streak_count = case
      when last_streak_login_date = today then login_streak_count
      when last_streak_login_date = today - 1 then login_streak_count + 1
      else 1
    end,
    longest_login_streak_count = greatest(
      longest_login_streak_count,
      case
        when last_streak_login_date = today then login_streak_count
        when last_streak_login_date = today - 1 then login_streak_count + 1
        else 1
      end
    ),
    last_streak_login_date = today
  where id = auth.uid()
  returning * into updated_profile;

  perform set_config('app.allow_profile_streak_update', '', true);

  if updated_profile.id is null then
    raise exception 'Profile not found';
  end if;

  return updated_profile;
end;
$$;

grant execute on function public.claim_daily_login_streak() to authenticated;

alter table public.profiles
add column if not exists supporter_tier text not null default 'none',
add column if not exists supporter_lifetime_amount_cents integer not null default 0,
add column if not exists supporter_since timestamptz,
add column if not exists supporter_active_until timestamptz,
add column if not exists supporter_badge_enabled boolean not null default false,
add column if not exists supporter_badge_visible boolean not null default true,
add column if not exists supporter_wall_visible boolean not null default false,
add column if not exists supporter_display_name text,
add column if not exists supporter_profile_frame text,
add column if not exists supporter_chat_flair text;

alter table public.profiles
drop constraint if exists profiles_supporter_tier_check;

alter table public.profiles
add constraint profiles_supporter_tier_check check (supporter_tier in ('none', 'supporter', 'backer', 'founder'));

create table if not exists public.donations (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete set null,
  provider text not null default 'manual' check (provider in ('stripe', 'bank_transfer', 'manual', 'kofi')),
  provider_payment_id text,
  amount_cents integer not null check (amount_cents > 0),
  currency text not null default 'eur',
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'refunded', 'cancelled')),
  donor_name text,
  donor_email text,
  donor_message text not null default '',
  is_public boolean not null default false,
  confirmed_at timestamptz,
  confirmed_by uuid references public.profiles(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists donations_provider_payment_id_unique
on public.donations (provider, provider_payment_id)
where provider_payment_id is not null;

create index if not exists donations_profile_created_at_idx
on public.donations (profile_id, created_at desc);

create trigger donations_touch_updated_at
before update on public.donations
for each row execute function public.touch_updated_at();

create or replace function public.supporter_tier_for_amount(amount_cents integer)
returns text
language sql
immutable
as $$
  select case
    when coalesce(amount_cents, 0) >= 2500 then 'founder'
    when coalesce(amount_cents, 0) >= 1000 then 'backer'
    when coalesce(amount_cents, 0) >= 300 then 'supporter'
    else 'none'
  end
$$;

create or replace function public.supporter_frame_for_tier(tier text)
returns text
language sql
immutable
as $$
  select case tier
    when 'founder' then 'gold'
    when 'backer' then 'cyan'
    when 'supporter' then 'emerald'
    else null
  end
$$;

create or replace function public.recalculate_profile_supporter_reward(target_profile_id uuid)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  total_cents integer;
  first_confirmed_at timestamptz;
  next_tier text;
  updated_profile public.profiles;
begin
  if target_profile_id is null then
    raise exception 'Profile id is required';
  end if;

  select
    coalesce(sum(amount_cents), 0)::integer,
    min(confirmed_at)
  into total_cents, first_confirmed_at
  from public.donations
  where profile_id = target_profile_id
    and status = 'confirmed';

  next_tier := public.supporter_tier_for_amount(total_cents);

  update public.profiles
  set
    supporter_tier = next_tier,
    supporter_lifetime_amount_cents = total_cents,
    supporter_since = case when next_tier = 'none' then null else coalesce(supporter_since, first_confirmed_at, now()) end,
    supporter_active_until = null,
    supporter_badge_enabled = next_tier <> 'none',
    supporter_profile_frame = public.supporter_frame_for_tier(next_tier),
    supporter_chat_flair = case when next_tier = 'none' then null else next_tier end
  where id = target_profile_id
  returning * into updated_profile;

  if updated_profile.id is null then
    raise exception 'Profile not found';
  end if;

  return updated_profile;
end;
$$;

create or replace function public.admin_record_donation(
  target_profile_id uuid,
  amount_cents integer,
  provider text default 'manual',
  reference text default '',
  donor_message text default '',
  is_public boolean default false
)
returns public.donations
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_donation public.donations;
  target_profile public.profiles;
begin
  if not public.is_admin() then
    raise exception 'Only admins can record donations';
  end if;

  if amount_cents < 100 then
    raise exception 'Donation amount is too low';
  end if;

  if provider not in ('bank_transfer', 'manual', 'kofi') then
    raise exception 'Manual admin records can only use bank_transfer, manual, or kofi providers';
  end if;

  select * into target_profile from public.profiles where id = target_profile_id;
  if target_profile.id is null then
    raise exception 'Profile not found';
  end if;

  insert into public.donations (
    profile_id,
    provider,
    provider_payment_id,
    amount_cents,
    currency,
    status,
    donor_name,
    donor_message,
    is_public,
    confirmed_at,
    confirmed_by,
    metadata
  )
  values (
    target_profile_id,
    provider,
    nullif(left(trim(coalesce(reference, '')), 160), ''),
    amount_cents,
    'eur',
    'confirmed',
    target_profile.display_name,
    left(trim(coalesce(donor_message, '')), 140),
    coalesce(is_public, false),
    now(),
    auth.uid(),
    jsonb_build_object('source', 'admin_manual')
  )
  returning * into inserted_donation;

  perform public.recalculate_profile_supporter_reward(target_profile_id);

  return inserted_donation;
end;
$$;

create or replace function public.update_supporter_preferences(
  badge_visible boolean,
  wall_visible boolean,
  display_name text default null
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_profile public.profiles;
begin
  if auth.uid() is null then
    raise exception 'You must be logged in';
  end if;

  update public.profiles
  set
    supporter_badge_visible = coalesce(badge_visible, supporter_badge_visible),
    supporter_wall_visible = coalesce(wall_visible, supporter_wall_visible),
    supporter_display_name = nullif(left(trim(coalesce(display_name, '')), 64), '')
  where id = auth.uid()
  returning * into updated_profile;

  return updated_profile;
end;
$$;

create or replace view public.supporter_wall as
select
  p.id as profile_id,
  coalesce(nullif(p.supporter_display_name, ''), p.display_name, 'Anonymous Operator') as display_name,
  p.supporter_tier,
  p.supporter_since,
  coalesce(
    (
      select d.donor_message
      from public.donations d
      where d.profile_id = p.id
        and d.status = 'confirmed'
        and d.is_public = true
        and nullif(d.donor_message, '') is not null
      order by d.confirmed_at desc nulls last, d.created_at desc
      limit 1
    ),
    ''
  ) as message
from public.profiles p
where p.supporter_wall_visible = true
  and p.supporter_badge_enabled = true
  and p.supporter_tier <> 'none';

alter table public.donations enable row level security;

create policy "donations admins can read all"
on public.donations for select
to authenticated
using (public.is_admin());

create policy "donations users can read own"
on public.donations for select
to authenticated
using (profile_id = auth.uid());

grant select on public.donations to authenticated;
grant select on public.supporter_wall to anon, authenticated;
grant execute on function public.recalculate_profile_supporter_reward(uuid) to service_role;
grant execute on function public.admin_record_donation(uuid, integer, text, text, text, boolean) to authenticated;
grant execute on function public.update_supporter_preferences(boolean, boolean, text) to authenticated;

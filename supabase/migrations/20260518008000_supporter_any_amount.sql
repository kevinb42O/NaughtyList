create or replace function public.supporter_tier_for_amount(amount_cents integer)
returns text
language sql
immutable
as $$
  select case
    when coalesce(amount_cents, 0) >= 2500 then 'founder'
    when coalesce(amount_cents, 0) >= 1000 then 'backer'
    when coalesce(amount_cents, 0) > 0 then 'supporter'
    else 'none'
  end
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

  if amount_cents <= 0 then
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

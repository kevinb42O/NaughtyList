create function public.claim_admin_role()
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  claimed_profile public.profiles;
begin
  if auth.uid() is null then
    raise exception 'You must be logged in to claim admin';
  end if;

  if exists (select 1 from public.profiles where role = 'admin') then
    raise exception 'Admin role has already been claimed';
  end if;

  update public.profiles
  set role = 'admin'
  where id = auth.uid()
  returning * into claimed_profile;

  if claimed_profile.id is null then
    insert into public.profiles (id, role)
    values (auth.uid(), 'admin')
    returning * into claimed_profile;
  end if;

  return claimed_profile;
end;
$$;

grant execute on function public.claim_admin_role() to authenticated;

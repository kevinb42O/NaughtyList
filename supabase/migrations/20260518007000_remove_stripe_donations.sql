alter table public.donations
drop constraint if exists donations_provider_check;

alter table public.donations
add constraint donations_provider_check check (provider in ('bank_transfer', 'manual', 'kofi'));

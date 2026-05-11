create table public.push_notification_events (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid references auth.users(id) on delete set null,
  title text not null check (char_length(title) between 1 and 120),
  body text not null check (char_length(body) between 1 and 400),
  target_url text not null default '/',
  sent_count integer not null default 0,
  failed_count integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.push_notification_events enable row level security;

create policy "Admins can read push notification history"
  on public.push_notification_events
  for select
  using (public.is_admin());

create or replace function public.push_notification_summary()
returns table(subscribed_users bigint, active_subscriptions bigint, sent_notifications bigint)
language sql
security definer
set search_path = public
as $$
  select
    (select count(distinct user_id) from public.push_subscriptions) as subscribed_users,
    (select count(*) from public.push_subscriptions) as active_subscriptions,
    (select coalesce(sum(sent_count), 0) from public.push_notification_events) as sent_notifications
  where public.is_admin();
$$;

revoke all on function public.push_notification_summary() from public;
grant execute on function public.push_notification_summary() to authenticated;

create or replace function public.push_notification_recent_events(limit_count integer default 8)
returns table(
  id uuid,
  sender_id uuid,
  title text,
  body text,
  target_url text,
  sent_count integer,
  failed_count integer,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    event.id,
    event.sender_id,
    event.title,
    event.body,
    event.target_url,
    event.sent_count,
    event.failed_count,
    event.created_at
  from public.push_notification_events event
  where public.is_admin()
  order by event.created_at desc
  limit greatest(1, least(limit_count, 25));
$$;

revoke all on function public.push_notification_recent_events(integer) from public;
grant execute on function public.push_notification_recent_events(integer) to authenticated;
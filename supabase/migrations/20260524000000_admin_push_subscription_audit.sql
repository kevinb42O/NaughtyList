create or replace function public.admin_push_subscription_audit()
returns table(
  user_id uuid,
  device_count bigint,
  first_enabled_at timestamptz,
  latest_enabled_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    subscription.user_id,
    count(*)::bigint as device_count,
    min(subscription.created_at) as first_enabled_at,
    max(subscription.created_at) as latest_enabled_at
  from public.push_subscriptions subscription
  where public.is_admin()
  group by subscription.user_id
  order by max(subscription.created_at) desc, subscription.user_id
$$;

revoke all on function public.admin_push_subscription_audit() from public;
grant execute on function public.admin_push_subscription_audit() to authenticated;
create index if not exists public_chat_messages_created_at_idx
on public.public_chat_messages (created_at asc);

create or replace function public.prune_public_chat_messages(
  older_than_days integer default 3,
  clear_all boolean default false
)
returns table(deleted_count integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_days integer := greatest(coalesce(older_than_days, 3), 1);
  cutoff_at timestamptz := now() - make_interval(days => normalized_days);
  removed_count integer := 0;
begin
  if not public.is_moderator_or_admin() then
    raise exception 'Only moderators and admins can prune public chat';
  end if;

  if clear_all and not public.is_admin() then
    raise exception 'Only admins can clear all public chat';
  end if;

  if clear_all then
    delete from public.public_chat_messages;
  else
    delete from public.public_chat_messages
    where created_at < cutoff_at;
  end if;

  get diagnostics removed_count = row_count;

  perform public.record_moderation_event(
    case when clear_all then 'public_chat_cleared' else 'public_chat_pruned' end,
    null,
    null,
    null,
    jsonb_build_object(
      'deletedCount', removed_count,
      'olderThanDays', case when clear_all then null else normalized_days end,
      'cutoffAt', case when clear_all then null else cutoff_at end
    )
  );

  return query select removed_count;
end;
$$;

revoke all on function public.prune_public_chat_messages(integer, boolean) from public, anon;
grant execute on function public.prune_public_chat_messages(integer, boolean) to authenticated;

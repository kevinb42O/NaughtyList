create or replace function public.delete_own_direct_message_media(target_message_id uuid)
returns public.direct_messages
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_message public.direct_messages;
begin
  update public.direct_messages
  set
    body = case
      when char_length(trim(body)) = 0 then '[image removed]'
      else body
    end,
    media_url = null,
    media_type = null
  where id = target_message_id
    and sender_id = auth.uid()
    and media_url is not null
    and media_type in ('image', 'gif')
  returning * into updated_message;

  if updated_message.id is null then
    raise exception 'Only the sender can delete this DM picture';
  end if;

  return updated_message;
end;
$$;

revoke all on function public.delete_own_direct_message_media(uuid) from public, anon;
grant execute on function public.delete_own_direct_message_media(uuid) to authenticated;
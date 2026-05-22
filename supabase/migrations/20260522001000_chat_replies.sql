alter table public.public_chat_messages
add column if not exists reply_to_message_id uuid references public.public_chat_messages(id) on delete set null;

alter table public.direct_messages
add column if not exists reply_to_message_id uuid references public.direct_messages(id) on delete set null;

create index if not exists public_chat_messages_reply_to_message_id_idx
on public.public_chat_messages(reply_to_message_id);

create index if not exists direct_messages_reply_to_message_id_idx
on public.direct_messages(reply_to_message_id);

drop policy if exists "authenticated users can send public chat" on public.public_chat_messages;
create policy "authenticated users can send public chat"
on public.public_chat_messages for insert
to authenticated
with check (
  user_id = auth.uid()
  and (
    reply_to_message_id is null
    or exists (
      select 1
      from public.public_chat_messages parent
      where parent.id = public_chat_messages.reply_to_message_id
    )
  )
  and not exists (
    select 1
    from public.public_chat_mutes pcm
    where pcm.target_user_id = auth.uid()
      and pcm.revoked_at is null
      and pcm.ends_at > now()
  )
);

drop policy if exists "users can send direct messages" on public.direct_messages;
create policy "users can send direct messages"
on public.direct_messages for insert
to authenticated
with check (
  sender_id = auth.uid()
  and sender_id <> recipient_id
  and (
    reply_to_message_id is null
    or exists (
      select 1
      from public.direct_messages parent
      where parent.id = direct_messages.reply_to_message_id
        and (
          (parent.sender_id = direct_messages.sender_id and parent.recipient_id = direct_messages.recipient_id)
          or (parent.sender_id = direct_messages.recipient_id and parent.recipient_id = direct_messages.sender_id)
        )
    )
  )
);

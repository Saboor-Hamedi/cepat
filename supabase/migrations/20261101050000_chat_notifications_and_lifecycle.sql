-- 1. Auto-close conversation when booking completes or is cancelled/declined
create or replace function public.close_conversation_on_booking_end()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.status in ('completed', 'cancelled', 'declined') then
    update public.conversations
    set status = 'closed', closed_at = coalesce(closed_at, now())
    where booking_id = new.id and status <> 'closed';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_close_conversation on public.bookings;
create trigger trg_close_conversation
  after update of status on public.bookings
  for each row execute function public.close_conversation_on_booking_end();

-- 2. Trigger notification for recipient when a new message is sent
create or replace function public.notify_message_recipient()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_conv record;
  v_recipient_id uuid;
  v_sender_name text;
  v_preview text;
begin
  select * into v_conv from public.conversations where id = new.conversation_id;
  if not found then
    return new;
  end if;

  -- Recipient is the other participant
  if new.sender_user_id = v_conv.customer_user_id then
    v_recipient_id := v_conv.technician_user_id;
  else
    v_recipient_id := v_conv.customer_user_id;
  end if;

  if v_recipient_id is null then
    return new;
  end if;

  -- Fetch sender's name from profiles
  select coalesce(display_name, 'Pengguna') into v_sender_name
  from public.profiles
  where id = new.sender_user_id;

  v_preview := case
    when new.kind = 'image' then '📷 Mengirim foto'
    when new.kind = 'system' then coalesce(new.body, 'Pemberitahuan sistem')
    else substring(coalesce(new.body, '') from 1 for 100)
  end;

  insert into public.notifications (
    user_id,
    type,
    title,
    body,
    data,
    dedupe_key
  ) values (
    v_recipient_id,
    'message',
    coalesce(v_sender_name, 'Pesan Baru'),
    v_preview,
    jsonb_build_object(
      'event', 'chat_message',
      'booking_id', v_conv.booking_id,
      'conversation_id', new.conversation_id,
      'message_id', new.id,
      'sender_id', new.sender_user_id,
      'sender_name', v_sender_name,
      'target_route', format('/booking/%s', v_conv.booking_id)
    ),
    format('msg:%s', new.id)
  )
  on conflict (user_id, dedupe_key) where dedupe_key is not null do nothing;

  return new;
end;
$$;

drop trigger if exists trg_notify_message_recipient on public.messages;
create trigger trg_notify_message_recipient
  after insert on public.messages
  for each row execute function public.notify_message_recipient();

-- 3. Add in_app_push_enabled to profiles
alter table public.profiles
add column if not exists in_app_push_enabled boolean not null default true;

notify pgrst, 'reload schema';

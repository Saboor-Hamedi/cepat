begin;

create or replace function public.send_booking_message(
  p_booking_id uuid,
  p_body text,
  p_client_message_id text
)
returns table (
  message_id uuid,
  booking_id uuid,
  sender_user_id uuid,
  sender_role text,
  sender_name text,
  body text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
#variable_conflict use_column
declare
  v_user_id uuid := auth.uid();
  v_booking public.bookings%rowtype;
  v_conversation_id uuid;
  v_conversation_status text;
  v_message public.messages%rowtype;
  v_sender_role text;
  v_sender_name text;
  v_recent_count integer;
begin
  if v_user_id is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;
  if p_body is null or char_length(btrim(p_body)) not between 1 and 1000 then
    raise exception 'invalid_message_length' using errcode = '22023';
  end if;
  if p_client_message_id is null or char_length(p_client_message_id) not between 1 and 120 then
    raise exception 'invalid_client_message_id' using errcode = '22023';
  end if;

  select b.* into v_booking
  from public.bookings b
  where b.id = p_booking_id
    and v_user_id in (b.customer_user_id, b.technician_user_id);
  if not found then
    raise exception 'booking_not_found_or_forbidden' using errcode = '42501';
  end if;
  if v_booking.status in ('cancelled', 'declined') then
    raise exception 'chat_not_available' using errcode = '55000';
  end if;
  if btrim(p_body) ~* '(https?://|www\.|wa\.me|t\.me|bit\.ly|tinyurl\.com|linktr\.ee|[[:alnum:]._%+-]+@[[:alnum:].-]+\.[[:alpha:]]{2,}|(\+?62|08)[[:space:].-]?[0-9]{3,4}[[:space:].-]?[0-9]{3,4}[[:space:].-]?[0-9]{3,5})' then
    raise exception 'contact_sharing_blocked' using errcode = '22023';
  end if;

  v_sender_role := case
    when v_user_id = v_booking.customer_user_id then 'customer'
    else 'technician'
  end;
  select coalesce(p.display_name, 'Cepat')
  into v_sender_name
  from public.profiles p
  where p.id = v_user_id;
  v_sender_name := coalesce(v_sender_name, 'Cepat');

  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text, 0));
  select m.* into v_message
  from public.messages m
  join public.conversations c on c.id = m.conversation_id
  where m.sender_user_id = v_user_id
    and m.client_message_id = p_client_message_id
    and c.booking_id = p_booking_id;
  if found then
    return query select
      v_message.id,
      p_booking_id,
      v_user_id,
      v_sender_role,
      v_sender_name,
      v_message.body,
      v_message.created_at;
    return;
  end if;

  select c.id, c.status
  into v_conversation_id, v_conversation_status
  from public.conversations c
  where c.booking_id = p_booking_id;
  if not found then
    insert into public.conversations (booking_id, customer_user_id, technician_user_id)
    values (p_booking_id, v_booking.customer_user_id, v_booking.technician_user_id)
    on conflict (booking_id) do nothing;
    select c.id, c.status
    into v_conversation_id, v_conversation_status
    from public.conversations c
    where c.booking_id = p_booking_id;
  end if;
  if v_conversation_status <> 'open' then
    raise exception 'conversation_closed' using errcode = '55000';
  end if;

  select count(*) into v_recent_count
  from public.messages m
  where m.sender_user_id = v_user_id
    and m.created_at > now() - interval '1 minute';
  if v_recent_count >= 20 then
    raise exception 'message_rate_limited' using errcode = '53300';
  end if;

  insert into public.messages (
    conversation_id, sender_user_id, kind, body, client_message_id
  )
  values (
    v_conversation_id, v_user_id, 'text', btrim(p_body), p_client_message_id
  )
  on conflict (sender_user_id, client_message_id) do nothing
  returning * into v_message;
  if not found then
    select m.* into v_message
    from public.messages m
    join public.conversations c on c.id = m.conversation_id
    where m.sender_user_id = v_user_id
      and m.client_message_id = p_client_message_id
      and c.booking_id = p_booking_id;
    if not found then
      raise exception 'client_message_id_conflict' using errcode = '23505';
    end if;
  end if;

  return query select
    v_message.id,
    p_booking_id,
    v_user_id,
    v_sender_role,
    v_sender_name,
    v_message.body,
    v_message.created_at;
end;
$$;

notify pgrst, 'reload schema';

commit;

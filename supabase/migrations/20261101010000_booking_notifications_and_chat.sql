begin;

alter table public.notifications
  add column if not exists dedupe_key text;

alter table public.bookings
  add column if not exists service_area_name_snapshot text not null default '';

alter table public.messages
  add column if not exists client_message_id text;

create unique index if not exists messages_sender_client_message_id_idx
  on public.messages (sender_user_id, client_message_id);

update public.bookings b
set service_area_name_snapshot = sa.name
from public.service_areas sa
where b.service_area_id = sa.id
  and b.service_area_name_snapshot = '';

create unique index if not exists notifications_user_dedupe_idx
  on public.notifications (user_id, dedupe_key) where dedupe_key is not null;

drop trigger if exists notifications_updated_at on public.notifications;

create or replace function public.notify_booking_participants()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.conversations (booking_id, customer_user_id, technician_user_id)
    values (new.id, new.customer_user_id, new.technician_user_id)
    on conflict (booking_id) do nothing;

    insert into public.notifications (user_id, type, title, body, data, dedupe_key)
    values (
      new.technician_user_id,
      'booking',
      'New booking request',
      format('A customer requested %s.', new.service_name_snapshot),
      jsonb_build_object(
        'event', 'booking_requested',
        'booking_id', new.id,
        'service_name', new.service_name_snapshot
      ),
      format('booking:%s:requested', new.id)
    )
    on conflict (user_id, dedupe_key) where dedupe_key is not null do nothing;
  elsif old.status is distinct from new.status then
    if old.status = 'requested' and new.status = 'confirmed' then
      insert into public.notifications (user_id, type, title, body, data, dedupe_key)
      values (
        new.customer_user_id,
        'booking',
        'Booking accepted',
        format('The technician accepted %s.', new.service_name_snapshot),
        jsonb_build_object(
          'event', 'booking_accepted',
          'booking_id', new.id,
          'service_name', new.service_name_snapshot
        ),
        format('booking:%s:accepted', new.id)
      )
      on conflict (user_id, dedupe_key) where dedupe_key is not null do nothing;
    elsif old.status = 'alternative_proposed' and new.status = 'confirmed' then
      insert into public.notifications (user_id, type, title, body, data, dedupe_key)
      values (
        new.technician_user_id,
        'booking',
        'Schedule confirmed',
        format('The customer accepted the proposed schedule for %s.', new.service_name_snapshot),
        jsonb_build_object(
          'event', 'booking_schedule_confirmed',
          'booking_id', new.id,
          'service_name', new.service_name_snapshot
        ),
        format('booking:%s:schedule-confirmed', new.id)
      )
      on conflict (user_id, dedupe_key) where dedupe_key is not null do nothing;
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.validate_booking_status_transition()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
  v_allowed boolean := false;
begin
  if old.status is not distinct from new.status then
    return new;
  end if;

  if public.is_admin() then
    return new;
  end if;

  if old.status = 'requested' then
    v_allowed :=
      (v_actor = old.technician_user_id and new.status in ('confirmed', 'declined', 'alternative_proposed'))
      or (v_actor in (old.customer_user_id, old.technician_user_id) and new.status = 'cancelled');
  elsif old.status = 'alternative_proposed' then
    v_allowed :=
      (v_actor = old.customer_user_id and new.status in ('confirmed', 'declined', 'cancelled'))
      or (v_actor = old.technician_user_id and new.status in ('declined', 'cancelled'));
  elsif old.status = 'confirmed' then
    v_allowed :=
      (v_actor = old.technician_user_id and new.status in ('in_progress', 'completed'))
      or (v_actor in (old.customer_user_id, old.technician_user_id) and new.status = 'cancelled');
  elsif old.status = 'in_progress' then
    v_allowed :=
      (v_actor = old.technician_user_id and new.status = 'completed')
      or (v_actor in (old.customer_user_id, old.technician_user_id) and new.status = 'cancelled');
  end if;

  if not v_allowed then
    raise exception 'invalid_booking_status_transition'
      using errcode = '42501';
  end if;

  if new.status = 'confirmed' then
    new.accepted_at := coalesce(new.accepted_at, now());
  elsif new.status = 'in_progress' then
    new.started_at := coalesce(new.started_at, now());
  elsif new.status = 'completed' then
    new.completed_at := coalesce(new.completed_at, now());
  elsif new.status = 'cancelled' then
    new.cancelled_at := coalesce(new.cancelled_at, now());
    new.cancelled_by := coalesce(new.cancelled_by, v_actor);
  end if;

  return new;
end;
$$;

drop trigger if exists bookings_validate_status_transition on public.bookings;
create trigger bookings_validate_status_transition
before update of status on public.bookings
for each row execute function public.validate_booking_status_transition();

drop trigger if exists bookings_notify_participants on public.bookings;
create trigger bookings_notify_participants
after insert or update of status on public.bookings
for each row execute function public.notify_booking_participants();

insert into public.conversations (booking_id, customer_user_id, technician_user_id)
select b.id, b.customer_user_id, b.technician_user_id
from public.bookings b
on conflict (booking_id) do nothing;

insert into public.notifications (user_id, type, title, body, data, dedupe_key)
select
  b.technician_user_id,
  'booking',
  'New booking request',
  format('A customer requested %s.', b.service_name_snapshot),
  jsonb_build_object(
    'event', 'booking_requested',
    'booking_id', b.id,
    'service_name', b.service_name_snapshot
  ),
  format('booking:%s:requested', b.id)
from public.bookings b
where b.status in ('requested', 'alternative_proposed')
on conflict (user_id, dedupe_key) where dedupe_key is not null do nothing;

drop policy if exists "bookings_insert_customer" on public.bookings;
create policy "bookings_insert_customer" on public.bookings
for insert to authenticated with check (
  customer_user_id = auth.uid()
  and public.has_role('customer')
  and public.is_active_user(auth.uid())
  and public.is_active_user(technician_user_id)
  and (
    technician_service_id is null
    or exists (
      select 1
      from public.technician_services ts
      where ts.id = bookings.technician_service_id
        and ts.technician_user_id = bookings.technician_user_id
        and ts.is_active
    )
  )
);

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

create or replace function public.load_booking_messages(p_booking_id uuid)
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
begin
  if auth.uid() is null or not exists (
    select 1
    from public.bookings b
    where b.id = p_booking_id
      and auth.uid() in (b.customer_user_id, b.technician_user_id)
  ) then
    raise exception 'booking_not_found_or_forbidden' using errcode = '42501';
  end if;

  return query
  select
    m.id,
    b.id,
    m.sender_user_id,
    case
      when m.sender_user_id = b.customer_user_id then 'customer'
      else 'technician'
    end,
    coalesce(p.display_name, 'Cepat'),
    m.body,
    m.created_at
  from public.bookings b
  join public.conversations c on c.booking_id = b.id
  join public.messages m on m.conversation_id = c.id
  left join public.profiles p on p.id = m.sender_user_id
  where b.id = p_booking_id
  order by m.created_at asc, m.id asc;
end;
$$;

revoke all on function public.send_booking_message(uuid, text, text) from public, anon;
revoke all on function public.load_booking_messages(uuid) from public, anon;
grant execute on function public.send_booking_message(uuid, text, text) to authenticated;
grant execute on function public.load_booking_messages(uuid) to authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'notifications'
    ) then
      execute 'alter publication supabase_realtime add table public.notifications';
    end if;
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'messages'
    ) then
      execute 'alter publication supabase_realtime add table public.messages';
    end if;
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'bookings'
    ) then
      execute 'alter publication supabase_realtime add table public.bookings';
    end if;
  end if;
end;
$$;

notify pgrst, 'reload schema';

commit;

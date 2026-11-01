begin;

alter table public.bookings
  add column if not exists work_completed_at timestamptz;

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
      (v_actor = old.technician_user_id and new.status = 'in_progress')
      or (v_actor in (old.customer_user_id, old.technician_user_id) and new.status = 'cancelled');
  elsif old.status = 'in_progress' then
    v_allowed :=
      (v_actor = old.customer_user_id
        and new.status = 'completed'
        and old.work_completed_at is not null)
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

create or replace function public.validate_booking_work_completion_submission()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.work_completed_at is not distinct from old.work_completed_at then
    return new;
  end if;

  if old.work_completed_at is not null
    or new.work_completed_at is null
    or auth.uid() is distinct from old.technician_user_id
    or old.status <> 'in_progress' then
    raise exception 'invalid_work_completion_submission'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists bookings_validate_work_completion_submission
  on public.bookings;
create trigger bookings_validate_work_completion_submission
before update of work_completed_at on public.bookings
for each row execute function public.validate_booking_work_completion_submission();

create or replace function public.submit_booking_work_for_acceptance(
  p_booking_id uuid
)
returns timestamptz
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_booking public.bookings%rowtype;
begin
  if v_user_id is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  select b.* into v_booking
  from public.bookings b
  where b.id = p_booking_id
    and b.technician_user_id = v_user_id
  for update;
  if not found then
    raise exception 'booking_not_found_or_forbidden' using errcode = '42501';
  end if;
  if v_booking.status <> 'in_progress' then
    raise exception 'booking_not_in_progress' using errcode = '55000';
  end if;

  update public.bookings
  set work_completed_at = coalesce(work_completed_at, now())
  where id = p_booking_id
  returning work_completed_at into v_booking.work_completed_at;

  insert into public.notifications (
    user_id, type, title, body, data, dedupe_key
  )
  values (
    v_booking.customer_user_id,
    'booking',
    'Work ready for confirmation',
    format('The technician marked %s as complete. Please review and confirm.', v_booking.service_name_snapshot),
    jsonb_build_object(
      'event', 'booking_work_completed',
      'booking_id', v_booking.id,
      'service_name', v_booking.service_name_snapshot
    ),
    format('booking:%s:work-completed', v_booking.id)
  )
  on conflict (user_id, dedupe_key) where dedupe_key is not null do nothing;

  return v_booking.work_completed_at;
end;
$$;

revoke all on function public.submit_booking_work_for_acceptance(uuid)
  from public, anon;
grant execute on function public.submit_booking_work_for_acceptance(uuid)
  to authenticated;

notify pgrst, 'reload schema';

commit;
-- ============================================================================
-- Migration: Fix Booking Review Rating Columns, Safe Triggers & Notification Deletes
-- ============================================================================

-- 1. Ensure review_rating and review_comment exist on public.bookings
alter table public.bookings
  add column if not exists review_rating smallint check (review_rating is null or review_rating between 1 and 5),
  add column if not exists review_comment text check (review_comment is null or char_length(review_comment) <= 3000);

-- 2. Clean up any broad triggers on public.bookings that fired on all status updates
drop trigger if exists trg_validate_booking_review on public.bookings;
drop trigger if exists bookings_validate_review_submission on public.bookings;

-- 3. Replace validation function to safely check reviews only when submitted
create or replace function public.validate_booking_review_submission()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
begin
  -- If neither review_rating nor review_comment changed, allow the update immediately
  if old.review_rating is not distinct from new.review_rating
     and old.review_comment is not distinct from new.review_comment then
    return new;
  end if;

  -- Reviews are only allowed on completed bookings
  if new.status <> 'completed' then
    raise exception 'Feedback can only be submitted or edited after the booking is completed' using errcode = '42501';
  end if;

  -- Only the customer of this completed booking can review
  if v_actor is not null then
    if v_actor is distinct from old.customer_user_id or old.customer_user_id = old.technician_user_id then
      raise exception 'Only the customer who completed this task with the technician can submit or edit feedback' using errcode = '42501';
    end if;
  end if;

  -- Prevent invalid rating numbers
  if new.review_rating is null or new.review_rating not between 1 and 5 then
    raise exception 'Rating must be between 1 and 5' using errcode = '22023';
  end if;

  return new;
end;
$$;

-- 4. Re-create the trigger restricted STRICTLY to updates of review_rating and review_comment
create trigger trg_validate_booking_review
  before update of review_rating, review_comment on public.bookings
  for each row execute function public.validate_booking_review_submission();

-- 5. Fix notifications table DELETE permissions & RLS policy
alter table public.notifications enable row level security;

grant select, update, delete on public.notifications to authenticated;
grant select, update, delete on public.notifications to service_role;

drop policy if exists "notifications_delete_owner_admin" on public.notifications;
create policy "notifications_delete_owner_admin" on public.notifications
  for delete to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- 6. Add post engagement columns to technician_posts if not present
alter table public.technician_posts
  add column if not exists like_count integer not null default 0 check (like_count >= 0),
  add column if not exists view_count integer not null default 0 check (view_count >= 0),
  add column if not exists share_count integer not null default 0 check (share_count >= 0);

-- 7. Notify PostgREST to reload its schema cache
notify pgrst, 'reload schema';

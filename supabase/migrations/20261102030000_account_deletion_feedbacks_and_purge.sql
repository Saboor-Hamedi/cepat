-- Migration: Account Deletion Feedbacks and Comprehensive Data Purge
-- Captures user churn feedback for admin insights and ensures 100% cascade purge of all user records.

-- 1. Create account_deletion_feedbacks table for admin visibility
create table if not exists public.account_deletion_feedbacks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid, -- Unconstrained so this audit record survives after auth.users purge
  user_email text,
  user_display_name text,
  user_role text,
  reason_category text not null,
  feedback_notes text,
  deleted_at timestamptz not null default now()
);

create index if not exists idx_account_deletion_feedbacks_date
  on public.account_deletion_feedbacks (deleted_at desc);

alter table public.account_deletion_feedbacks enable row level security;

-- Only authenticated admins can view account deletion feedback
create policy "admin_read_deletion_feedbacks"
  on public.account_deletion_feedbacks
  for select
  to authenticated
  using (public.is_admin());

-- Allow authenticated users to insert their feedback upon deleting their own account
create policy "user_insert_deletion_feedbacks"
  on public.account_deletion_feedbacks
  for insert
  to authenticated
  with check (auth.uid() = user_id or user_id is null);

-- 2. Create or replace delete_my_account with complete, fail-safe cascade deletion
create or replace function public.delete_my_account(
  p_reason text default null,
  p_feedback text default null
)
returns void
language plpgsql
security definer
set search_path = public, auth, storage
as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_name text;
  v_role text;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  -- 1. Capture snapshot for admin feedback before deleting records
  select u.email into v_email
  from auth.users u
  where u.id = v_uid;

  select p.display_name into v_name
  from public.profiles p
  where p.id = v_uid;

  select r.role::text into v_role
  from public.user_roles r
  where r.user_id = v_uid
  order by (r.role = 'technician') desc
  limit 1;

  insert into public.account_deletion_feedbacks (
    user_id,
    user_email,
    user_display_name,
    user_role,
    reason_category,
    feedback_notes,
    deleted_at
  ) values (
    v_uid,
    v_email,
    coalesce(v_name, 'Deleted User'),
    coalesce(v_role, 'customer'),
    coalesce(p_reason, 'No reason provided'),
    p_feedback,
    now()
  );

  -- 2. Report evidence and reports (clean up both sides of disputes)
  delete from public.report_evidence
  where uploaded_by = v_uid
     or report_id in (select id from public.reports where reporter_user_id = v_uid or reported_user_id = v_uid);

  delete from public.reports
  where reporter_user_id = v_uid
     or reported_user_id = v_uid
     or assigned_to = v_uid
     or resolved_by = v_uid;

  -- 3. Admin actions involving user
  delete from public.admin_actions
  where admin_user_id = v_uid
     or target_user_id = v_uid;

  -- 4. Reviews written by, for, or attached to bookings of user
  delete from public.reviews
  where customer_user_id = v_uid
     or technician_user_id = v_uid
     or booking_id in (select id from public.bookings where customer_user_id = v_uid or technician_user_id = v_uid);

  -- 5. Messages and conversations
  delete from public.messages
  where sender_user_id = v_uid
     or conversation_id in (
       select id from public.conversations
       where customer_user_id = v_uid
          or technician_user_id = v_uid
          or booking_id in (select id from public.bookings where customer_user_id = v_uid or technician_user_id = v_uid)
     );

  delete from public.conversations
  where customer_user_id = v_uid
     or technician_user_id = v_uid
     or booking_id in (select id from public.bookings where customer_user_id = v_uid or technician_user_id = v_uid);

  -- 6. Booking status history and bookings
  delete from public.booking_status_history
  where changed_by = v_uid
     or booking_id in (select id from public.bookings where customer_user_id = v_uid or technician_user_id = v_uid);

  delete from public.bookings
  where customer_user_id = v_uid
     or technician_user_id = v_uid
     or cancelled_by = v_uid;

  -- 7. Technician posts and feed content
  delete from public.technician_posts
  where technician_id = v_uid;

  -- 8. Technician portfolio, exceptions, availability, services, areas, locations
  delete from public.technician_portfolio_items
  where technician_user_id = v_uid;

  delete from public.technician_availability_exceptions
  where technician_user_id = v_uid;

  delete from public.technician_availability
  where technician_user_id = v_uid;

  delete from public.technician_service_areas
  where technician_user_id = v_uid;

  delete from public.technician_services
  where technician_user_id = v_uid;

  delete from public.technician_locations
  where technician_user_id = v_uid;

  -- 9. Technician profiles and applications
  delete from public.technician_profiles
  where user_id = v_uid;

  delete from public.technician_applications
  where technician_user_id = v_uid
     or reviewed_by = v_uid;

  -- 10. User notifications
  delete from public.notifications
  where user_id = v_uid;

  -- 11. Storage objects (files, images, avatars, posts)
  delete from storage.objects
  where owner = v_uid
     or (storage.foldername(name))[1] = v_uid::text
     or name like v_uid::text || '/%';

  -- 12. User roles, profile and account status
  delete from public.user_roles
  where user_id = v_uid or granted_by = v_uid;

  delete from public.private_profiles
  where user_id = v_uid;

  delete from public.profiles
  where id = v_uid;

  delete from public.user_account_status
  where user_id = v_uid;

  -- 13. Permanently delete auth user record
  delete from auth.users
  where id = v_uid;
end;
$$;

grant execute on function public.delete_my_account(text, text) to authenticated;

notify pgrst, 'reload schema';

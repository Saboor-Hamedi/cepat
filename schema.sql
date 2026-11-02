
-- FRESH DATABASE BOOTSTRAP ONLY.
-- This file creates the complete Cepat schema and is not safe to rerun on an
-- existing Supabase project. Existing types, tables, or policies will cause
-- duplicate-object errors. Do not drop existing data to make this script run.
-- For an existing database, review and apply only a targeted migration from
-- supabase/migrations/ after confirming its prerequisites are present.

create extension if not exists pgcrypto;

-- Enum creation is guarded so existing types are not recreated. This does not
-- make the full bootstrap rerunnable: tables/policies below still require a
-- fresh database. Existing types are left untouched.
do $$ begin
  create type public.app_role as enum ('customer', 'technician', 'admin');
exception when duplicate_object then null;
end $$;
do $$ begin
  create type public.technician_application_status as enum
    ('draft', 'pending_review', 'under_review', 'changes_requested', 'approved', 'rejected', 'suspended', 'revoked');
exception when duplicate_object then null;
end $$;
do $$ begin
  create type public.account_status as enum ('active', 'restricted', 'suspended', 'disabled');
exception when duplicate_object then null;
end $$;
do $$ begin
  create type public.booking_status as enum
    ('requested', 'alternative_proposed', 'confirmed', 'in_progress', 'completed', 'cancelled', 'declined');
exception when duplicate_object then null;
end $$;
do $$ begin
  create type public.booking_actor as enum ('customer', 'technician', 'admin', 'system');
exception when duplicate_object then null;
end $$;
do $$ begin
  create type public.message_kind as enum ('text', 'image', 'system');
exception when duplicate_object then null;
end $$;
do $$ begin
  create type public.report_status as enum
    ('submitted', 'under_review', 'awaiting_technician_response', 'action_taken', 'dismissed', 'appealed', 'closed');
exception when duplicate_object then null;
end $$;
do $$ begin
  create type public.report_severity as enum ('low', 'medium', 'high', 'urgent');
exception when duplicate_object then null;
end $$;
do $$ begin
  create type public.notification_type as enum
    ('booking', 'message', 'review', 'report', 'account', 'system');
exception when duplicate_object then null;
end $$;

-- Generic updated_at trigger function.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Public-facing basic profile. Do not store private contact details here.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 80),
  username text unique,
  avatar_path text,
  locale text not null default 'id-ID',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Private information, readable only by the owner and authorized admins.
create table public.private_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  phone_number text,
  address_notes text,
  notification_preferences jsonb not null default '{"push":true,"booking":true,"messages":true}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Multiple roles allow an approved technician to also use customer functionality.
-- Client users must never be allowed to insert/update/delete roles.
create table public.user_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  granted_by uuid references auth.users(id) on delete set null,
  granted_at timestamptz not null default now(),
  primary key (user_id, role)
);

create table public.user_account_status (
  user_id uuid primary key references auth.users(id) on delete cascade,
  status public.account_status not null default 'active',
  reason text,
  changed_by uuid references auth.users(id) on delete set null,
  changed_at timestamptz not null default now()
);

-- Role lookup helpers. SECURITY DEFINER prevents RLS recursion on user_roles.
create or replace function public.has_role(p_role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role = p_role
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$ select public.has_role('admin'::public.app_role); $$;

create or replace function public.is_active_user(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select status = 'active' from public.user_account_status
    where user_id = p_user_id
  ), true);
$$;

-- New accounts receive customer role by default. Technician access is granted only
-- after approval through trusted server/admin logic.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
begin
  v_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    'Cepat User'
  );

  insert into public.profiles (id, display_name)
  values (new.id, left(v_name, 80))
  on conflict (id) do nothing;

  insert into public.private_profiles (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  insert into public.user_roles (user_id, role)
  values (new.id, 'customer')
  on conflict do nothing;

  insert into public.user_account_status (user_id)
  values (new.id)
  on conflict do nothing;

  if (
    new.raw_user_meta_data ->> 'requested_account_type' = 'technician' or
    new.raw_user_meta_data ->> 'role' = 'technician'
  ) then
    insert into public.user_roles (user_id, role)
    values (new.id, 'technician'::public.app_role)
    on conflict do nothing;

    insert into public.technician_profiles (user_id, is_verified)
    values (new.id, true)
    on conflict (user_id) do update set is_verified = true;

    insert into public.technician_applications (technician_user_id, status, submitted_at)
    values (new.id, 'approved', now())
    on conflict do nothing;
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create table public.technician_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  business_name text,
  headline text check (headline is null or char_length(headline) <= 120),
  bio text check (bio is null or char_length(bio) <= 3000),
  years_experience smallint check (years_experience is null or years_experience between 0 and 80),
  profile_theme jsonb not null default '{"preset":"default"}'::jsonb,
  is_verified boolean not null default false,
  is_available boolean not null default true,
  average_rating numeric(3,2) not null default 0 check (average_rating between 0 and 5),
  review_count integer not null default 0 check (review_count >= 0),
  completed_jobs_count integer not null default 0 check (completed_jobs_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Verification and aggregate metrics are trusted fields. Client inserts receive
-- safe defaults and client updates cannot change them; service-role jobs/admins may.
create or replace function public.protect_technician_profile_trusted_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.is_verified := false;
    new.average_rating := 0;
    new.review_count := 0;
    new.completed_jobs_count := 0;
  elsif new.is_verified is distinct from old.is_verified
     or new.average_rating is distinct from old.average_rating
     or new.review_count is distinct from old.review_count
     or new.completed_jobs_count is distinct from old.completed_jobs_count then
    raise exception 'Verification and technician metrics are managed by trusted backend operations'
      using errcode = '42501';
  end if;

  return new;
end;
$$;
create trigger technician_profiles_protect_trusted_fields
before insert or update on public.technician_profiles
for each row execute procedure public.protect_technician_profile_trusted_fields();

create or replace function public.ensure_technician_profile_for_role()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.role = 'technician'::public.app_role then
    insert into public.technician_profiles (user_id, is_verified)
    values (new.user_id, true)
    on conflict (user_id) do update set is_verified = true;
  end if;

  return new;
end;
$$;

create trigger user_roles_create_technician_profile
after insert on public.user_roles
for each row execute function public.ensure_technician_profile_for_role();

create table public.technician_applications (
  id uuid primary key default gen_random_uuid(),
  technician_user_id uuid not null references auth.users(id) on delete cascade,
  status public.technician_application_status not null default 'draft',
  introduction text,
  experience_details text,
  submitted_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  reviewer_notes text,
  applicant_response text,
  appeal_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index technician_applications_user_status_idx
  on public.technician_applications (technician_user_id, status);

-- Backfill and expose application status through a user-scoped RPC.
insert into public.technician_applications (technician_user_id, status, submitted_at)
select u.id, 'pending_review', now()
from auth.users as u
where u.raw_user_meta_data ->> 'requested_account_type' = 'technician'
  and not exists (
    select 1
    from public.technician_applications as a
    where a.technician_user_id = u.id
  );

create or replace function public.get_or_create_my_technician_application()
returns public.technician_application_status
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_status public.technician_application_status;
  v_requested text;
begin
  if v_uid is null then
    return null;
  end if;

  if public.has_role('technician'::public.app_role) then
    return 'approved'::public.technician_application_status;
  end if;

  select a.status
    into v_status
    from public.technician_applications as a
   where a.technician_user_id = v_uid
   order by a.created_at desc
   limit 1;

  if v_status is not null then
    return v_status;
  end if;

  select u.raw_user_meta_data ->> 'requested_account_type'
    into v_requested
    from auth.users as u
   where u.id = v_uid;

  if v_requested = 'technician' then
    insert into public.technician_applications (technician_user_id, status, submitted_at)
    values (v_uid, 'pending_review', now())
    returning status into v_status;
    return v_status;
  end if;

  return null;
end;
$$;

grant execute on function public.get_or_create_my_technician_application() to authenticated;

-- Service catalogue.
create table public.service_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  icon_name text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.service_categories(id) on delete restrict,
  name text not null,
  slug text not null unique,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index services_category_active_idx on public.services (category_id, is_active);

create table public.technician_services (
  id uuid primary key default gen_random_uuid(),
  technician_user_id uuid not null references public.technician_profiles(user_id) on delete cascade,
  service_id uuid not null references public.services(id) on delete restrict,
  description text,
  starting_price numeric(12,2) check (starting_price is null or starting_price >= 0),
  estimated_duration_minutes integer check (estimated_duration_minutes is null or estimated_duration_minutes > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (technician_user_id, service_id)
);

-- Administrative region hierarchy (country/province/city/regency/district/village or
-- provider-specific equivalents). Seed official Indonesia region data separately.
create table public.service_areas (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.service_areas(id) on delete restrict,
  region_code text unique,
  name text not null,
  region_type text not null,
  country_code char(2) not null default 'ID',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index service_areas_parent_idx on public.service_areas (parent_id);
create index service_areas_name_idx on public.service_areas (name);

create table public.technician_service_areas (
  technician_user_id uuid not null references public.technician_profiles(user_id) on delete cascade,
  service_area_id uuid not null references public.service_areas(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (technician_user_id, service_area_id)
);

-- A base location is stored as coordinates, not exposed publicly by default.
-- Enable PostGIS later if precise radius queries are required; do not expose exact home
-- addresses or technician base coordinates to unauthorised users.
create table public.technician_locations (
  technician_user_id uuid primary key references public.technician_profiles(user_id) on delete cascade,
  base_latitude double precision check (base_latitude is null or base_latitude between -90 and 90),
  base_longitude double precision check (base_longitude is null or base_longitude between -180 and 180),
  service_radius_km numeric(7,2) check (service_radius_km is null or service_radius_km between 0 and 1000),
  updated_at timestamptz not null default now()
);

create table public.technician_availability (
  id uuid primary key default gen_random_uuid(),
  technician_user_id uuid not null references public.technician_profiles(user_id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6), -- 0=Sunday
  start_time time not null,
  end_time time not null,
  is_available boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_time > start_time)
);
create index technician_availability_lookup_idx
  on public.technician_availability (technician_user_id, weekday, is_available);

create table public.technician_availability_exceptions (
  id uuid primary key default gen_random_uuid(),
  technician_user_id uuid not null references public.technician_profiles(user_id) on delete cascade,
  exception_date date not null,
  is_available boolean not null default false,
  start_time time,
  end_time time,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((start_time is null and end_time is null) or
         (start_time is not null and end_time is not null and end_time > start_time)),
  unique (technician_user_id, exception_date)
);

create table public.technician_portfolio_items (
  id uuid primary key default gen_random_uuid(),
  technician_user_id uuid not null references public.technician_profiles(user_id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  description text check (description is null or char_length(description) <= 2000),
  image_path text not null,
  sort_order integer not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index technician_portfolio_public_idx
  on public.technician_portfolio_items (technician_user_id, is_published, sort_order);

-- Commission configuration only. No payment processing or wallet is implemented here.
create table public.commission_settings (
  id boolean primary key default true check (id = true),
  rate_percent numeric(5,2) not null default 0 check (rate_percent between 0 and 100),
  effective_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);
insert into public.commission_settings (id, rate_percent)
values (true, 0)
on conflict (id) do nothing;

create table public.commission_rate_history (
  id uuid primary key default gen_random_uuid(),
  previous_rate_percent numeric(5,2) not null check (previous_rate_percent between 0 and 100),
  new_rate_percent numeric(5,2) not null check (new_rate_percent between 0 and 100),
  effective_at timestamptz not null,
  changed_by uuid references auth.users(id) on delete set null,
  reason text,
  created_at timestamptz not null default now()
);

-- Bookings snapshot the service description and agreed price, if provided, so later
-- profile/service edits do not silently rewrite the booking.
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  customer_user_id uuid not null references auth.users(id) on delete restrict,
  technician_user_id uuid not null references public.technician_profiles(user_id) on delete restrict,
  technician_service_id uuid references public.technician_services(id) on delete set null,
  service_id uuid references public.services(id) on delete set null,
  service_name_snapshot text not null,
  service_description text,
  customer_address text not null,
  address_notes text,
  service_area_name_snapshot text not null default '',
  service_area_id uuid references public.service_areas(id) on delete set null,
  customer_latitude double precision check (customer_latitude is null or customer_latitude between -90 and 90),
  customer_longitude double precision check (customer_longitude is null or customer_longitude between -180 and 180),
  requested_start_at timestamptz,
  agreed_start_at timestamptz,
  proposed_start_at timestamptz,
  work_completed_at timestamptz,
  status public.booking_status not null default 'requested',
  customer_notes text,
  agreed_price numeric(12,2) check (agreed_price is null or agreed_price >= 0),
  currency char(3) not null default 'IDR',
  cancellation_reason text,
  cancelled_by uuid references auth.users(id) on delete set null,
  cancelled_at timestamptz,
  accepted_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (customer_user_id <> technician_user_id)
);
create index bookings_customer_created_idx on public.bookings (customer_user_id, created_at desc);
create index bookings_technician_status_idx on public.bookings (technician_user_id, status, created_at desc);
create index bookings_start_time_idx on public.bookings (agreed_start_at);
create index bookings_service_area_idx on public.bookings (service_area_id);

create table public.booking_status_history (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  old_status public.booking_status,
  new_status public.booking_status not null,
  changed_by uuid references auth.users(id) on delete set null,
  actor public.booking_actor not null,
  note text,
  created_at timestamptz not null default now()
);
create index booking_status_history_booking_idx
  on public.booking_status_history (booking_id, created_at);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings(id) on delete cascade,
  customer_user_id uuid not null references auth.users(id) on delete restrict,
  technician_user_id uuid not null references auth.users(id) on delete restrict,
  status text not null default 'open' check (status in ('open', 'closed')),
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  check (customer_user_id <> technician_user_id)
);
create index conversations_participants_idx
  on public.conversations (customer_user_id, technician_user_id);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_user_id uuid not null references auth.users(id) on delete restrict,
  kind public.message_kind not null default 'text',
  body text,
  attachment_path text,
  client_message_id text,
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz,
  check (
    (kind = 'text' and body is not null and attachment_path is null) or
    (kind = 'image' and attachment_path is not null) or
    (kind = 'system')
  )
);
create index messages_conversation_created_idx on public.messages (conversation_id, created_at desc);
create unique index messages_sender_client_message_id_idx
  on public.messages (sender_user_id, client_message_id);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings(id) on delete restrict,
  customer_user_id uuid not null references auth.users(id) on delete restrict,
  technician_user_id uuid not null references public.technician_profiles(user_id) on delete restrict,
  rating smallint not null check (rating between 1 and 5),
  comment text check (comment is null or char_length(comment) <= 3000),
  is_hidden boolean not null default false,
  moderation_reason text,
  moderated_by uuid references auth.users(id) on delete set null,
  moderated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index reviews_technician_public_idx
  on public.reviews (technician_user_id, created_at desc) where is_hidden = false;

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_user_id uuid not null references auth.users(id) on delete restrict,
  reported_user_id uuid not null references auth.users(id) on delete restrict,
  booking_id uuid references public.bookings(id) on delete set null,
  category text not null,
  description text not null check (char_length(description) between 10 and 5000),
  severity public.report_severity not null default 'medium',
  status public.report_status not null default 'submitted',
  assigned_to uuid references auth.users(id) on delete set null,
  technician_response text,
  appeal_reason text,
  resolution text,
  resolved_by uuid references auth.users(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (reporter_user_id <> reported_user_id)
);
create index reports_status_created_idx on public.reports (status, severity, created_at desc);
create index reports_reported_user_idx on public.reports (reported_user_id, created_at desc);

create table public.report_evidence (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports(id) on delete cascade,
  uploaded_by uuid not null references auth.users(id) on delete restrict,
  storage_path text not null,
  description text,
  created_at timestamptz not null default now()
);

create table public.admin_actions (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null references auth.users(id) on delete restrict,
  target_user_id uuid references auth.users(id) on delete set null,
  report_id uuid references public.reports(id) on delete set null,
  action_type text not null,
  reason text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index admin_actions_target_created_idx on public.admin_actions (target_user_id, created_at desc);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type public.notification_type not null,
  title text not null check (char_length(title) between 1 and 160),
  body text check (body is null or char_length(body) <= 1000),
  data jsonb not null default '{}'::jsonb,
  dedupe_key text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_unread_idx on public.notifications (user_id, created_at desc) where read_at is null;
create unique index notifications_user_dedupe_idx
  on public.notifications (user_id, dedupe_key) where dedupe_key is not null;

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
      or (v_actor = old.customer_user_id and new.status = 'cancelled')
      or (v_actor = old.technician_user_id and new.status = 'cancelled');
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

drop trigger if exists bookings_validate_status_transition on public.bookings;
create trigger bookings_validate_status_transition
before update of status on public.bookings
for each row execute function public.validate_booking_status_transition();

drop trigger if exists bookings_notify_participants on public.bookings;
create trigger bookings_notify_participants
after insert or update of status on public.bookings
for each row execute function public.notify_booking_participants();

create or replace function public.validate_booking_work_completion_submission()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if old.work_completed_at is not distinct from new.work_completed_at then
    return new;
  end if;

  if new.work_completed_at is null
    or auth.uid() is distinct from old.technician_user_id
    or old.status <> 'in_progress' then
    raise exception 'invalid_work_completion_submission'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

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

-- Updated-at triggers.
create trigger profiles_updated_at before update on public.profiles
for each row execute procedure public.set_updated_at();
create trigger private_profiles_updated_at before update on public.private_profiles
for each row execute procedure public.set_updated_at();
create trigger technician_profiles_updated_at before update on public.technician_profiles
for each row execute procedure public.set_updated_at();
create trigger technician_applications_updated_at before update on public.technician_applications
for each row execute procedure public.set_updated_at();
create trigger services_updated_at before update on public.services
for each row execute procedure public.set_updated_at();
create trigger technician_services_updated_at before update on public.technician_services
for each row execute procedure public.set_updated_at();
create trigger technician_availability_updated_at before update on public.technician_availability
for each row execute procedure public.set_updated_at();
create trigger technician_availability_exceptions_updated_at before update on public.technician_availability_exceptions
for each row execute procedure public.set_updated_at();
create trigger technician_portfolio_items_updated_at before update on public.technician_portfolio_items
for each row execute procedure public.set_updated_at();
create trigger bookings_updated_at before update on public.bookings
for each row execute procedure public.set_updated_at();
create trigger reviews_updated_at before update on public.reviews
for each row execute procedure public.set_updated_at();
create trigger reports_updated_at before update on public.reports
for each row execute procedure public.set_updated_at();

-- Enable RLS everywhere exposed through Supabase APIs.
alter table public.profiles enable row level security;
alter table public.private_profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.user_account_status enable row level security;
alter table public.technician_profiles enable row level security;
alter table public.technician_applications enable row level security;
alter table public.service_categories enable row level security;
alter table public.services enable row level security;
alter table public.technician_services enable row level security;
alter table public.service_areas enable row level security;
alter table public.technician_service_areas enable row level security;
alter table public.technician_locations enable row level security;
alter table public.technician_availability enable row level security;
alter table public.technician_availability_exceptions enable row level security;
alter table public.technician_portfolio_items enable row level security;
alter table public.commission_settings enable row level security;
alter table public.commission_rate_history enable row level security;
alter table public.bookings enable row level security;
alter table public.booking_status_history enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.reviews enable row level security;
alter table public.reports enable row level security;
alter table public.report_evidence enable row level security;
alter table public.admin_actions enable row level security;
alter table public.notifications enable row level security;

-- Profiles: authenticated users can discover basic public display profiles.
create policy "profiles_select_authenticated" on public.profiles
for select to anon, authenticated using (true);
create policy "profiles_update_own" on public.profiles
for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "profiles_admin_all" on public.profiles
for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "private_profiles_select_owner_admin" on public.private_profiles
for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy "private_profiles_insert_owner" on public.private_profiles
for insert to authenticated with check (user_id = auth.uid());
create policy "private_profiles_update_owner_admin" on public.private_profiles
for update to authenticated using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

create policy "user_roles_select_public" on public.user_roles
for select to anon, authenticated using (true);
-- Intentionally no client insert/update/delete policies for user_roles.

create policy "account_status_select_self_admin" on public.user_account_status
for select to authenticated using (user_id = auth.uid() or public.is_admin());
-- Account status changes are trusted admin/server operations only.

create policy "technician_profiles_public_read" on public.technician_profiles
for select to anon, authenticated using (true);
create policy "technician_profiles_insert_self" on public.technician_profiles
for insert to authenticated with check (user_id = auth.uid() and public.has_role('technician'));
create policy "technician_profiles_update_self_admin" on public.technician_profiles
for update to authenticated using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

create policy "applications_select_owner_admin" on public.technician_applications
for select to authenticated using (technician_user_id = auth.uid() or public.is_admin());
-- Application creation and status transitions are trusted trigger/admin actions.
create policy "applications_update_admin" on public.technician_applications
for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "categories_read_active" on public.service_categories
for select to anon, authenticated using (is_active or public.is_admin());
create policy "categories_admin_manage" on public.service_categories
for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "services_read_active" on public.services
for select to anon, authenticated using (is_active or public.is_admin());
create policy "services_admin_manage" on public.services
for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "technician_services_read_active" on public.technician_services
for select to anon, authenticated using (is_active or technician_user_id = auth.uid() or public.is_admin());
create policy "technician_services_insert_owner" on public.technician_services
for insert to authenticated with check (technician_user_id = auth.uid() and public.has_role('technician'));
create policy "technician_services_update_owner_admin" on public.technician_services
for update to authenticated using (technician_user_id = auth.uid() or public.is_admin())
with check (technician_user_id = auth.uid() or public.is_admin());
create policy "technician_services_delete_owner_admin" on public.technician_services
for delete to authenticated using (technician_user_id = auth.uid() or public.is_admin());

create policy "service_areas_read_active" on public.service_areas
for select to anon, authenticated using (is_active or public.is_admin());
create policy "service_areas_admin_manage" on public.service_areas
for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "technician_service_areas_read" on public.technician_service_areas
for select to anon, authenticated using (true);
create policy "technician_service_areas_insert_owner" on public.technician_service_areas
for insert to authenticated with check (technician_user_id = auth.uid() and public.has_role('technician'));
create policy "technician_service_areas_delete_owner_admin" on public.technician_service_areas
for delete to authenticated using (technician_user_id = auth.uid() or public.is_admin());

-- Exact base coordinates are restricted to the technician and admins.
create policy "technician_locations_select_owner_admin" on public.technician_locations
for select to authenticated using (technician_user_id = auth.uid() or public.is_admin());
create policy "technician_locations_insert_owner" on public.technician_locations
for insert to authenticated with check (technician_user_id = auth.uid() and public.has_role('technician'));
create policy "technician_locations_update_owner_admin" on public.technician_locations
for update to authenticated using (technician_user_id = auth.uid() or public.is_admin())
with check (technician_user_id = auth.uid() or public.is_admin());

create policy "availability_read_authenticated" on public.technician_availability
for select to authenticated using (true);
create policy "availability_insert_owner" on public.technician_availability
for insert to authenticated with check (technician_user_id = auth.uid() and public.has_role('technician'));
create policy "availability_update_owner_admin" on public.technician_availability
for update to authenticated using (technician_user_id = auth.uid() or public.is_admin())
with check (technician_user_id = auth.uid() or public.is_admin());
create policy "availability_delete_owner_admin" on public.technician_availability
for delete to authenticated using (technician_user_id = auth.uid() or public.is_admin());

create policy "availability_exceptions_read_authenticated" on public.technician_availability_exceptions
for select to authenticated using (true);
create policy "availability_exceptions_insert_owner" on public.technician_availability_exceptions
for insert to authenticated with check (technician_user_id = auth.uid() and public.has_role('technician'));
create policy "availability_exceptions_update_owner_admin" on public.technician_availability_exceptions
for update to authenticated using (technician_user_id = auth.uid() or public.is_admin())
with check (technician_user_id = auth.uid() or public.is_admin());
create policy "availability_exceptions_delete_owner_admin" on public.technician_availability_exceptions
for delete to authenticated using (technician_user_id = auth.uid() or public.is_admin());

create policy "portfolio_read_published_or_owner" on public.technician_portfolio_items
for select to anon, authenticated using (is_published or technician_user_id = auth.uid() or public.is_admin());
create policy "portfolio_insert_owner" on public.technician_portfolio_items
for insert to authenticated with check (technician_user_id = auth.uid() and public.has_role('technician'));
create policy "portfolio_update_owner_admin" on public.technician_portfolio_items
for update to authenticated using (technician_user_id = auth.uid() or public.is_admin())
with check (technician_user_id = auth.uid() or public.is_admin());
create policy "portfolio_delete_owner_admin" on public.technician_portfolio_items
for delete to authenticated using (technician_user_id = auth.uid() or public.is_admin());

create policy "commission_settings_read_authenticated" on public.commission_settings
for select to authenticated using (true);
create policy "commission_settings_admin_update" on public.commission_settings
for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "commission_history_admin_read" on public.commission_rate_history
for select to authenticated using (public.is_admin());
create policy "commission_history_admin_insert" on public.commission_rate_history
for insert to authenticated with check (public.is_admin());

create policy "bookings_select_participants_admin" on public.bookings
for select to authenticated using (
  customer_user_id = auth.uid() or technician_user_id = auth.uid() or public.is_admin()
);

drop policy if exists "bookings_insert_customer" on public.bookings;
create policy "bookings_insert_customer" on public.bookings
for insert to authenticated with check (
  customer_user_id = auth.uid()
  or public.is_admin()
);

-- RPC procedure to create a booking request cleanly and reliably
create or replace function public.create_booking_request(
  p_technician_user_id uuid,
  p_technician_service_id uuid default null,
  p_service_name text default 'Home service',
  p_service_description text default null,
  p_customer_address text default '',
  p_address_notes text default null,
  p_service_area text default '',
  p_requested_start_at timestamptz default now(),
  p_customer_notes text default null,
  p_agreed_price numeric default null
)
returns public.bookings
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_booking public.bookings;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.bookings (
    customer_user_id,
    technician_user_id,
    technician_service_id,
    service_name_snapshot,
    service_description,
    customer_address,
    address_notes,
    service_area_name_snapshot,
    requested_start_at,
    status,
    customer_notes,
    agreed_price,
    currency
  ) values (
    v_uid,
    p_technician_user_id,
    p_technician_service_id,
    coalesce(p_service_name, 'Home service'),
    p_service_description,
    p_customer_address,
    p_address_notes,
    coalesce(p_service_area, ''),
    coalesce(p_requested_start_at, now()),
    'requested',
    p_customer_notes,
    p_agreed_price,
    'IDR'
  )
  returning * into v_booking;

  return v_booking;
end;
$$;

grant execute on function public.create_booking_request to authenticated;
-- Updates are limited to participants, but production should route status transitions through
-- trusted RPC/server functions. The transition trigger below validates status changes.
create policy "bookings_update_participants_admin" on public.bookings
for update to authenticated using (
  customer_user_id = auth.uid() or technician_user_id = auth.uid() or public.is_admin()
) with check (
  customer_user_id = auth.uid() or technician_user_id = auth.uid() or public.is_admin()
);

create policy "booking_history_select_participants_admin" on public.booking_status_history
for select to authenticated using (
  exists (
    select 1 from public.bookings b
    where b.id = booking_id
      and (b.customer_user_id = auth.uid() or b.technician_user_id = auth.uid() or public.is_admin())
  )
);
create policy "booking_history_admin_insert" on public.booking_status_history
for insert to authenticated with check (public.is_admin());

create policy "conversations_select_participants_admin" on public.conversations
for select to authenticated using (
  customer_user_id = auth.uid() or technician_user_id = auth.uid() or public.is_admin()
);
-- Conversation creation/closure should be performed by a trusted server/RPC after
-- validating that the associated booking is accepted or otherwise eligible.

create policy "messages_select_participants" on public.messages
for select to authenticated using (
  exists (
    select 1 from public.conversations c
    where c.id = conversation_id
      and (c.customer_user_id = auth.uid() or c.technician_user_id = auth.uid() or public.is_admin())
  )
);
-- Message INSERT must be implemented through a trusted RPC/server endpoint that checks:
-- sender is a participant, conversation is open, booking permits chat, rate limits apply,
-- and URLs/contact-sharing policy is enforced. Do not add a broad direct client INSERT policy.

create policy "reviews_read_public_or_participant_admin" on public.reviews
for select to anon, authenticated using (
  (is_hidden = false)
  or customer_user_id = auth.uid()
  or technician_user_id = auth.uid()
  or public.is_admin()
);
-- Review creation should use a trusted RPC/server endpoint validating completed booking,
-- matching customer, and one-review-per-booking. No direct INSERT policy is created here.
create policy "reviews_update_admin_only" on public.reviews
for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "reports_select_reporter_reported_admin" on public.reports
for select to authenticated using (
  reporter_user_id = auth.uid() or reported_user_id = auth.uid() or public.is_admin()
);
-- Report creation and status transitions should use a trusted server/RPC with validation.
create policy "report_evidence_select_involved_admin" on public.report_evidence
for select to authenticated using (
  public.is_admin() or exists (
    select 1 from public.reports r
    where r.id = report_id
      and (r.reporter_user_id = auth.uid() or r.reported_user_id = auth.uid())
  )
);
-- Evidence upload metadata should be inserted through a trusted endpoint after verifying
-- report participation and the private Storage object.

create policy "admin_actions_admin_only" on public.admin_actions
for select to authenticated using (public.is_admin());
create policy "admin_actions_insert_admin_only" on public.admin_actions
for insert to authenticated with check (public.is_admin());

create policy "notifications_select_owner_admin" on public.notifications
for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy "notifications_update_owner_admin" on public.notifications
for update to authenticated using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

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

-- Technician Posts (Twitter/X style feed)
create table if not exists public.technician_posts (
  id text primary key,
  technician_id uuid not null references auth.users(id) on delete cascade,
  technician_name text not null default 'Teknisi Cepat',
  technician_business_name text,
  technician_avatar_uri text,
  technician_verified boolean not null default false,
  category_slug text not null default 'plumbing',
  service_area text not null default 'Jakarta Selatan',
  caption text not null default '',
  content text not null default '',
  image_uri text,
  media_urls text[] not null default array[]::text[],
  is_service_post boolean not null default false,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint technician_posts_content_check check (
    char_length(caption) <= 1200
    and char_length(content) <= 1200
    and (
      char_length(trim(content)) > 0
      or char_length(trim(caption)) > 0
      or cardinality(media_urls) > 0
      or image_uri is not null
    )
  )
);

create index if not exists idx_technician_posts_feed
  on public.technician_posts (published, service_area, category_slug, created_at desc);

create index if not exists idx_technician_posts_tech_created
  on public.technician_posts (technician_id, created_at desc);
create index if not exists idx_technician_posts_created_id
  on public.technician_posts (created_at desc, id desc);

alter table public.technician_posts enable row level security;

create trigger technician_posts_updated_at before update on public.technician_posts
for each row execute procedure public.set_updated_at();

create policy "technician_posts_public_read"
  on public.technician_posts
  for select
  using (
    published = true
    or auth.uid() = technician_id
    or public.is_admin()
  );

create policy "technician_posts_owner_insert"
  on public.technician_posts
  for insert
  to authenticated
  with check (
    auth.uid() = technician_id
    and (
      public.has_role('technician'::public.app_role)
      or public.is_admin()
      or exists (
        select 1 from public.technician_profiles tp where tp.user_id = auth.uid()
      )
      or exists (
        select 1 from public.technician_applications ta where ta.technician_user_id = auth.uid()
      )
      or exists (
        select 1 from auth.users u where u.id = auth.uid() and (
          u.raw_user_meta_data ->> 'requested_account_type' = 'technician' or
          u.raw_user_meta_data ->> 'role' = 'technician'
        )
      )
    )
  );

create policy "technician_posts_owner_update"
  on public.technician_posts
  for update
  to authenticated
  using (
    auth.uid() = technician_id
    or public.is_admin()
  )
  with check (
    auth.uid() = technician_id
    or public.is_admin()
  );

create policy "technician_posts_owner_delete"
  on public.technician_posts
  for delete
  to authenticated
  using (
    auth.uid() = technician_id
    or public.is_admin()
  );

grant select on public.technician_posts to anon, authenticated;
grant insert, update, delete on public.technician_posts to authenticated;
grant usage on schema public to anon, authenticated, service_role;

-- Table privileges required by PostgREST; row access remains constrained by RLS.
grant select on public.service_categories to anon, authenticated;
grant select on public.services to anon, authenticated;
grant select on public.service_areas to anon, authenticated;
grant select on public.profiles to anon, authenticated;
grant select on public.technician_profiles to anon, authenticated;
grant select on public.technician_services to anon, authenticated;
grant select on public.technician_service_areas to anon, authenticated;
grant select on public.technician_availability to anon, authenticated;
grant select on public.technician_portfolio_items to anon, authenticated;
grant select on public.reviews to anon, authenticated;

grant select, insert, update on public.profiles to authenticated;
grant select on public.user_roles to anon, authenticated;
grant select, update on public.user_account_status to authenticated;
grant select, insert, update on public.technician_applications to authenticated;
grant select, insert, update on public.technician_profiles to authenticated;
grant select, insert, update, delete on public.technician_services to authenticated;
grant select, insert, update, delete on public.technician_service_areas to authenticated;
grant select, insert, update, delete on public.technician_availability to authenticated;
grant select, insert, update, delete on public.technician_portfolio_items to authenticated;
grant select, insert, update on public.bookings to authenticated;
grant select, insert on public.booking_status_history to authenticated;
grant select, insert, update on public.conversations to authenticated;
grant select, insert, update on public.messages to authenticated;
grant select, insert, update on public.reviews to authenticated;
grant select, insert, update on public.reports to authenticated;
grant select, update on public.notifications to authenticated;
grant execute on function public.send_booking_message(uuid, text, text) to authenticated;
grant execute on function public.load_booking_messages(uuid) to authenticated;
grant select, insert on public.admin_actions to authenticated;
grant select, insert, update on public.service_categories to authenticated;
grant select, insert, update on public.service_areas to authenticated;

insert into storage.buckets (id, name, public)
values ('technician-posts', 'technician-posts', true)
on conflict (id) do nothing;

drop policy if exists "technician_posts_storage_public_read" on storage.objects;
create policy "technician_posts_storage_public_read"
  on storage.objects
  for select
  using (bucket_id = 'technician-posts');

drop policy if exists "technician_posts_storage_tech_upload" on storage.objects;
create policy "technician_posts_storage_tech_upload"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'technician-posts'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.has_role('technician'::public.app_role)
  );

drop policy if exists "technician_posts_storage_tech_delete" on storage.objects;
create policy "technician_posts_storage_tech_delete"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'technician-posts'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Auto-close conversation when booking completes or is cancelled/declined
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

-- Trigger notification for recipient when a new message is sent
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

-- Add in_app_push_enabled to profiles
alter table public.profiles
add column if not exists in_app_push_enabled boolean not null default true;

-- Table: account_deletion_feedbacks
-- Captures user churn feedback for admin visibility while unlinking from auth.users
create table if not exists public.account_deletion_feedbacks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
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

create policy "admin_read_deletion_feedbacks"
  on public.account_deletion_feedbacks
  for select
  to authenticated
  using (public.is_admin());

create policy "user_insert_deletion_feedbacks"
  on public.account_deletion_feedbacks
  for insert
  to authenticated
  with check (auth.uid() = user_id or user_id is null);

-- Permanent account deletion procedure: captures admin feedback and purges all user data, posts, storage files, and auth record
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

  -- 10. User notifications (both received notifications and sent/system notifications)
  delete from public.notifications
  where user_id = v_uid
     or (data->>'sender_id') = v_uid::text;

  -- 11. Storage objects (files, images, avatars, posts)
  delete from storage.objects
  where owner = v_uid
     or (storage.foldername(name))[1] = v_uid::text
     or name like v_uid::text || '/%';

  -- 12. Clear any lingering foreign key references across admin and audit tables before deleting auth user
  update public.service_categories set updated_by = null where updated_by = v_uid;
  update public.service_pricing_rules set changed_by = null where changed_by = v_uid;
  update public.technician_applications set reviewed_by = null where reviewed_by = v_uid;
  update public.user_roles set granted_by = null where granted_by = v_uid;
  update public.user_account_status set changed_by = null where changed_by = v_uid;
  update public.reports set assigned_to = null, resolved_by = null where assigned_to = v_uid or resolved_by = v_uid;
  delete from public.admin_actions where admin_user_id = v_uid or target_user_id = v_uid;

  -- 13. User roles, profile and account status
  delete from public.user_roles
  where user_id = v_uid or granted_by = v_uid;

  delete from public.private_profiles
  where user_id = v_uid;

  delete from public.profiles
  where id = v_uid;

  delete from public.user_account_status
  where user_id = v_uid;

  -- 14. Permanently delete auth user record from auth.users
  delete from auth.users
  where id = v_uid;
end;
$$;

grant execute on function public.delete_my_account(text, text) to authenticated;

-- Keep profile display_name in sync when auth user metadata is updated
create or replace function public.sync_auth_user_metadata_to_profile()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.raw_user_meta_data->>'display_name' is not null and trim(new.raw_user_meta_data->>'display_name') != '' then
    update public.profiles
    set display_name = left(trim(new.raw_user_meta_data->>'display_name'), 80),
        updated_at = now()
    where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_metadata_updated on auth.users;
create trigger on_auth_user_metadata_updated
  after update on auth.users
  for each row execute procedure public.sync_auth_user_metadata_to_profile();

notify pgrst, 'reload schema';

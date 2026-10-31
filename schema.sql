
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

  -- A technician selection creates only a pending application. It never grants
  -- the technician role; approval remains an administrator action.
  if new.raw_user_meta_data ->> 'requested_account_type' = 'technician' then
    insert into public.technician_applications (technician_user_id, status, submitted_at)
    values (new.id, 'pending_review', now());
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
  service_area_id uuid references public.service_areas(id) on delete set null,
  customer_latitude double precision check (customer_latitude is null or customer_latitude between -90 and 90),
  customer_longitude double precision check (customer_longitude is null or customer_longitude between -180 and 180),
  requested_start_at timestamptz,
  agreed_start_at timestamptz,
  proposed_start_at timestamptz,
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
  ),
  unique (sender_user_id, client_message_id)
);
create index messages_conversation_created_idx on public.messages (conversation_id, created_at desc);

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
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_unread_idx on public.notifications (user_id, created_at desc) where read_at is null;

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
create trigger notifications_updated_at before update on public.notifications
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

create policy "user_roles_select_self_admin" on public.user_roles
for select to authenticated using (user_id = auth.uid() or public.is_admin());
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
create policy "bookings_insert_customer" on public.bookings
for insert to authenticated with check (
  customer_user_id = auth.uid()
  and public.has_role('customer')
  and public.is_active_user(auth.uid())
  and public.is_active_user(technician_user_id)
);
-- Updates are limited to participants, but production should route status transitions through
-- trusted RPC/server functions. These policies alone do not validate every transition.
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
grant select on public.user_roles to authenticated;
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

notify pgrst, 'reload schema';

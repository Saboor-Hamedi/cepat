-- Migration: 20261107000000_platform_tax_and_service_pricing.sql
-- Enables technicians to specify service prices on posts and profiles,
-- creates the global platform tax/fee settings table for admin configuration,
-- and tracks financial fee breakdowns (customer payment, platform tax, technician payout) on bookings.

begin;

-- 1. Add service_price to technician_posts
alter table public.technician_posts
  add column if not exists service_price numeric(12,2) not null default 0 check (service_price >= 0);

create index if not exists idx_technician_posts_service_price
  on public.technician_posts (service_price);

-- 2. Add starting_price to technician_profiles (fallback / default base rate)
alter table public.technician_profiles
  add column if not exists starting_price numeric(12,2) not null default 0 check (starting_price >= 0);

-- 3. Create global platform_settings table
create table if not exists public.platform_settings (
  id text primary key default 'default',
  platform_fee_type text not null default 'percentage' check (platform_fee_type in ('percentage', 'fixed')),
  platform_fee_rate numeric(6,2) not null default 10.00 check (platform_fee_rate >= 0 and platform_fee_rate <= 100),
  platform_fee_fixed numeric(12,2) not null default 10000.00 check (platform_fee_fixed >= 0),
  minimum_fee numeric(12,2) not null default 5000.00 check (minimum_fee >= 0),
  tax_name text not null default 'Biaya Platform & Layanan',
  description text default 'Pajak dan komisi resmi platform Cepat untuk setiap transaksi pesanan teknisi.',
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

-- Seed default configuration if empty
insert into public.platform_settings (
  id,
  platform_fee_type,
  platform_fee_rate,
  platform_fee_fixed,
  minimum_fee,
  tax_name,
  description
) values (
  'default',
  'percentage',
  10.00,
  10000.00,
  5000.00,
  'Biaya Platform & Layanan',
  'Pajak dan komisi resmi platform Cepat untuk setiap transaksi pesanan teknisi.'
)
on conflict (id) do nothing;

-- Enable RLS on platform_settings
alter table public.platform_settings enable row level security;

-- Drop old policies if they exist
drop policy if exists "platform_settings_read_all" on public.platform_settings;
drop policy if exists "platform_settings_admin_write" on public.platform_settings;

-- Allow everyone (authenticated and anon) to read platform settings
create policy "platform_settings_read_all"
  on public.platform_settings
  for select
  using (true);

-- Allow admins to insert/update/delete platform settings
create policy "platform_settings_admin_write"
  on public.platform_settings
  for all
  using (public.is_admin())
  with check (public.is_admin());

grant select on public.platform_settings to anon, authenticated;
grant all on public.platform_settings to service_role;
grant select, update, insert on public.platform_settings to authenticated;

-- 4. Add fee and financial breakdown columns to bookings
alter table public.bookings
  add column if not exists service_price numeric(12,2) default 0 check (service_price is null or service_price >= 0),
  add column if not exists platform_fee numeric(12,2) default 0 check (platform_fee is null or platform_fee >= 0),
  add column if not exists technician_payout numeric(12,2) default 0 check (technician_payout is null or technician_payout >= 0),
  add column if not exists total_amount numeric(12,2) default 0 check (total_amount is null or total_amount >= 0),
  add column if not exists post_id text references public.technician_posts(id) on delete set null;

create index if not exists idx_bookings_post_id
  on public.bookings (post_id);

-- 5. Helper function to compute fees dynamically for any service price
create or replace function public.calculate_booking_financials(
  p_price numeric
)
returns table (
  service_price numeric,
  platform_fee numeric,
  technician_payout numeric,
  total_amount numeric
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_settings public.platform_settings%rowtype;
  v_fee numeric;
begin
  select * into v_settings from public.platform_settings where id = 'default' limit 1;
  if not found then
    v_fee := round(coalesce(p_price, 0) * 0.10, 2);
  else
    if v_settings.platform_fee_type = 'percentage' then
      v_fee := greatest(v_settings.minimum_fee, round((coalesce(p_price, 0) * v_settings.platform_fee_rate) / 100.0, 2));
    else
      v_fee := greatest(v_settings.minimum_fee, v_settings.platform_fee_fixed);
    end if;
  end if;

  if coalesce(p_price, 0) > 0 and v_fee > p_price then
    v_fee := p_price;
  end if;

  return query select
    coalesce(p_price, 0) as service_price,
    coalesce(v_fee, 0) as platform_fee,
    greatest(0::numeric, coalesce(p_price, 0) - coalesce(v_fee, 0)) as technician_payout,
    coalesce(p_price, 0) as total_amount;
end;
$$;

-- 6. Trigger to automatically compute platform_fee, technician_payout, and total_amount on bookings
create or replace function public.sync_booking_financial_breakdown()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_calc record;
  v_base_price numeric;
begin
  v_base_price := coalesce(new.service_price, new.agreed_price, 0);
  if v_base_price > 0 then
    select * into v_calc from public.calculate_booking_financials(v_base_price);
    if new.service_price is null or new.service_price = 0 then
      new.service_price := v_calc.service_price;
    end if;
    if new.platform_fee is null or new.platform_fee = 0 then
      new.platform_fee := v_calc.platform_fee;
    end if;
    if new.technician_payout is null or new.technician_payout = 0 then
      new.technician_payout := v_calc.technician_payout;
    end if;
    if new.total_amount is null or new.total_amount = 0 then
      new.total_amount := v_calc.total_amount;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sync_booking_financial_breakdown on public.bookings;
create trigger trg_sync_booking_financial_breakdown
  before insert or update of service_price, agreed_price
  on public.bookings
  for each row
  execute function public.sync_booking_financial_breakdown();

notify pgrst, 'reload schema';

commit;

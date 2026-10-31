-- Public discovery is limited to marketplace-facing profile and catalogue data.
-- Private profiles, exact locations, bookings, conversations, messages, reports,
-- and administrative records remain unavailable to the anon role.

drop policy if exists "profiles_select_authenticated" on public.profiles;
create policy "profiles_select_authenticated" on public.profiles
for select to anon, authenticated using (true);

drop policy if exists "technician_profiles_public_read" on public.technician_profiles;
create policy "technician_profiles_public_read" on public.technician_profiles
for select to anon, authenticated using (true);

drop policy if exists "categories_read_active" on public.service_categories;
create policy "categories_read_active" on public.service_categories
for select to anon, authenticated using (is_active or public.is_admin());

drop policy if exists "services_read_active" on public.services;
create policy "services_read_active" on public.services
for select to anon, authenticated using (is_active or public.is_admin());

drop policy if exists "technician_services_read_active" on public.technician_services;
create policy "technician_services_read_active" on public.technician_services
for select to anon, authenticated using (
  is_active or technician_user_id = auth.uid() or public.is_admin()
);

drop policy if exists "service_areas_read_active" on public.service_areas;
create policy "service_areas_read_active" on public.service_areas
for select to anon, authenticated using (is_active or public.is_admin());

drop policy if exists "technician_service_areas_read" on public.technician_service_areas;
create policy "technician_service_areas_read" on public.technician_service_areas
for select to anon, authenticated using (true);

drop policy if exists "portfolio_read_published_or_owner" on public.technician_portfolio_items;
create policy "portfolio_read_published_or_owner" on public.technician_portfolio_items
for select to anon, authenticated using (
  is_published or technician_user_id = auth.uid() or public.is_admin()
);

drop policy if exists "reviews_read_public_or_participant_admin" on public.reviews;
create policy "reviews_read_public_or_participant_admin" on public.reviews
for select to anon, authenticated using (
  (is_hidden = false)
  or customer_user_id = auth.uid()
  or technician_user_id = auth.uid()
  or public.is_admin()
);

-- The profile row is publicly readable, so clients must not be able to forge
-- verification or marketplace aggregates through the owner update policy.
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

drop trigger if exists technician_profiles_protect_trusted_fields on public.technician_profiles;
create trigger technician_profiles_protect_trusted_fields
before insert or update on public.technician_profiles
for each row execute procedure public.protect_technician_profile_trusted_fields();

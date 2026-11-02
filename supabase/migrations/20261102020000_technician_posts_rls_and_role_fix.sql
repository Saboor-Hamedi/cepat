-- Migration: Fix technician posts RLS policy and auto-grant technician role for newly registered technician accounts
begin;

-- 1. Update public.handle_new_user() trigger to automatically grant technician role and create technician_profiles
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
  v_is_tech boolean := false;
begin
  v_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    'Cepat User'
  );

  v_is_tech := (
    new.raw_user_meta_data ->> 'requested_account_type' = 'technician' or
    new.raw_user_meta_data ->> 'role' = 'technician'
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

  if v_is_tech then
    insert into public.user_roles (user_id, role)
    values (new.id, 'technician'::public.app_role)
    on conflict do nothing;

    insert into public.technician_profiles (user_id)
    values (new.id)
    on conflict (user_id) do nothing;

    insert into public.technician_applications (technician_user_id, status, submitted_at)
    values (new.id, 'approved', now())
    on conflict do nothing;
  end if;

  insert into public.user_account_status (user_id)
  values (new.id)
  on conflict do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- 2. Backfill existing technician users missing the technician role in public.user_roles
insert into public.user_roles (user_id, role)
select id, 'technician'::public.app_role
from auth.users
where (
  raw_user_meta_data ->> 'requested_account_type' = 'technician' or
  raw_user_meta_data ->> 'role' = 'technician' or
  id in (select technician_user_id from public.technician_applications) or
  id in (select user_id from public.technician_profiles)
)
on conflict do nothing;

-- Ensure technician_profiles exists for all technicians
insert into public.technician_profiles (user_id)
select user_id
from public.user_roles
where role = 'technician'::public.app_role
on conflict (user_id) do nothing;

-- 3. Robust technician_posts RLS policies
alter table public.technician_posts enable row level security;

drop policy if exists "technician_posts_owner_insert" on public.technician_posts;
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

drop policy if exists "technician_posts_owner_update" on public.technician_posts;
create policy "technician_posts_owner_update"
  on public.technician_posts
  for update
  to authenticated
  using (auth.uid() = technician_id or public.is_admin())
  with check (auth.uid() = technician_id or public.is_admin());

drop policy if exists "technician_posts_owner_delete" on public.technician_posts;
create policy "technician_posts_owner_delete"
  on public.technician_posts
  for delete
  to authenticated
  using (auth.uid() = technician_id or public.is_admin());

-- 4. Storage upload policy for technician-posts bucket
insert into storage.buckets (id, name, public)
values ('technician-posts', 'technician-posts', true)
on conflict (id) do update set public = true;

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
  );

drop policy if exists "technician_posts_storage_tech_delete" on storage.objects;
create policy "technician_posts_storage_tech_delete"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'technician-posts'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_admin()
    )
  );

-- 5. Allow public reading of user roles so visitors can view technician/admin roles and verified status
drop policy if exists "user_roles_select_self_admin" on public.user_roles;
drop policy if exists "user_roles_select_public" on public.user_roles;
create policy "user_roles_select_public" on public.user_roles
  for select to anon, authenticated using (true);

-- Ensure registered technicians have is_verified set
update public.technician_profiles set is_verified = true where is_verified = false;

-- 6. Permanent account deletion function
create or replace function public.delete_my_account(p_reason text default null)
returns void
language plpgsql
security definer
set search_path = public, auth, storage
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  -- 1. Delete technician posts
  delete from public.technician_posts where technician_id = v_uid;

  -- 2. Delete portfolio items
  delete from public.technician_portfolio_items where technician_user_id = v_uid;

  -- 3. Delete technician availability & services
  delete from public.technician_availability where technician_user_id = v_uid;
  delete from public.technician_service_areas where technician_user_id = v_uid;
  delete from public.technician_services where technician_user_id = v_uid;
  delete from public.technician_locations where technician_user_id = v_uid;

  -- 4. Delete technician profile and application
  delete from public.technician_profiles where user_id = v_uid;
  delete from public.technician_applications where technician_user_id = v_uid;

  -- 5. Delete reviews written by or for the user
  delete from public.reviews where customer_user_id = v_uid or technician_user_id = v_uid;

  -- 6. Delete bookings and status history
  delete from public.booking_status_history where booking_id in (
    select id from public.bookings where customer_user_id = v_uid or technician_user_id = v_uid
  );
  delete from public.bookings where customer_user_id = v_uid or technician_user_id = v_uid;

  -- 7. Delete messages and conversations
  delete from public.messages where conversation_id in (
    select id from public.conversations where customer_user_id = v_uid or technician_user_id = v_uid
  );
  delete from public.conversations where customer_user_id = v_uid or technician_user_id = v_uid;

  -- 8. Delete reports and evidence
  delete from public.dispute_evidence where uploaded_by = v_uid;
  delete from public.reports where reporter_user_id = v_uid or reported_user_id = v_uid;

  -- 9. Delete notifications
  delete from public.notifications where user_id = v_uid;

  -- 10. Delete uploaded files and images from storage
  delete from storage.objects where bucket_id = 'technician-posts' and (
    (storage.foldername(name))[1] = v_uid::text or owner = v_uid
  );
  delete from storage.objects where bucket_id = 'avatars' and (
    (storage.foldername(name))[1] = v_uid::text or owner = v_uid
  );
  delete from storage.objects where owner = v_uid;

  -- 11. Delete roles and profile tables
  delete from public.user_roles where user_id = v_uid;
  delete from public.private_profiles where user_id = v_uid;
  delete from public.profiles where id = v_uid;
  delete from public.user_account_status where user_id = v_uid;

  -- 12. Delete user account from auth.users
  delete from auth.users where id = v_uid;
end;
$$;

grant execute on function public.delete_my_account(text) to authenticated;

notify pgrst, 'reload schema';

commit;

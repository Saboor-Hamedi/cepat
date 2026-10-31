-- Create technician applications in the trusted auth trigger. A submitted
-- account type is only an application request; user_roles still grants only
-- customer at signup and only an admin can approve a technician.
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

  if new.raw_user_meta_data ->> 'requested_account_type' = 'technician' then
    insert into public.technician_applications (technician_user_id, status, submitted_at)
    values (new.id, 'pending_review', now());
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Backfill applicants created before this migration without changing any roles.
insert into public.technician_applications (technician_user_id, status, submitted_at)
select u.id, 'pending_review', now()
from auth.users as u
where u.raw_user_meta_data ->> 'requested_account_type' = 'technician'
  and not exists (
    select 1 from public.technician_applications as a
    where a.technician_user_id = u.id
  );

-- Clients cannot create applications with a chosen status or edit workflow
-- fields. The auth trigger creates rows; administrator logic manages reviews.
drop policy if exists "applications_insert_owner" on public.technician_applications;
drop policy if exists "applications_update_owner_draft_admin" on public.technician_applications;
drop policy if exists "applications_update_admin" on public.technician_applications;
create policy "applications_update_admin" on public.technician_applications
for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- Migration: Fix technician posts RLS policy permission denied for table users
-- Replaces direct auth.users subquery in RLS policy with a SECURITY DEFINER function

begin;

-- 1. Create a security definer function to check if the caller can insert a post
create or replace function public.can_create_technician_post(p_technician_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_uid uuid := auth.uid();
  v_meta jsonb;
begin
  if v_uid is null then
    return false;
  end if;

  -- Allow if admin
  if public.is_admin() then
    return true;
  end if;

  -- User must be creating a post for themselves
  if v_uid <> p_technician_id then
    return false;
  end if;

  -- 1. Check user_roles table
  if exists (
    select 1 from public.user_roles where user_id = v_uid and role in ('technician'::public.app_role, 'admin'::public.app_role)
  ) then
    return true;
  end if;

  -- 2. Check technician_profiles or applications
  if exists (
    select 1 from public.technician_profiles where user_id = v_uid
  ) or exists (
    select 1 from public.technician_applications where technician_user_id = v_uid
  ) then
    return true;
  end if;

  -- 3. Check auth.users metadata safely via security definer
  select raw_user_meta_data into v_meta from auth.users where id = v_uid;
  if v_meta is not null and (
    v_meta ->> 'requested_account_type' = 'technician' or
    v_meta ->> 'role' = 'technician' or
    v_meta ->> 'role' = 'admin'
  ) then
    -- Auto-insert into user_roles and technician_profiles so future checks are instant
    insert into public.user_roles (user_id, role)
    values (v_uid, 'technician'::public.app_role)
    on conflict do nothing;

    insert into public.technician_profiles (user_id)
    values (v_uid)
    on conflict (user_id) do nothing;

    return true;
  end if;

  return false;
end;
$$;

grant execute on function public.can_create_technician_post(uuid) to authenticated, anon;

-- 2. Re-create the insert policy without any direct auth.users query in the policy expression
drop policy if exists "technician_posts_owner_insert" on public.technician_posts;
create policy "technician_posts_owner_insert"
  on public.technician_posts
  for insert
  to authenticated
  with check (
    public.can_create_technician_post(technician_id)
  );

-- Ensure authenticated role has insert/update/delete/select permissions on technician_posts
grant select, insert, update, delete on public.technician_posts to authenticated;
grant select on public.technician_posts to anon;

commit;

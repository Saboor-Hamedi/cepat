-- Production Launch Hardening Migration: 20261102010000_production_launch_hardening.sql

-- 1. Profiles: Username Column & Index
alter table public.profiles add column if not exists username text;
do $$ begin
  create unique index if not exists idx_profiles_username on public.profiles (lower(username)) where username is not null;
exception when others then null;
end $$;

-- 2. Verify Table Row-Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.private_profiles enable row level security;
alter table public.bookings enable row level security;
alter table public.technician_posts enable row level security;
do $$ begin
  if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'reviews') then
    alter table public.reviews enable row level security;
  end if;
end $$;

-- 3. Profiles RLS Policies
drop policy if exists "profiles_public_read" on public.profiles;
create policy "profiles_public_read" on public.profiles
  for select using (true);

drop policy if exists "profiles_owner_upsert" on public.profiles;
create policy "profiles_owner_upsert" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- 4. Private Profiles RLS Policies (Only user themselves or admin)
drop policy if exists "private_profiles_owner_read" on public.private_profiles;
create policy "private_profiles_owner_read" on public.private_profiles
  for select using (auth.uid() = user_id or auth.jwt()->>'role' = 'service_role');

drop policy if exists "private_profiles_owner_upsert" on public.private_profiles;
create policy "private_profiles_owner_upsert" on public.private_profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 5. Storage Buckets (Avatars, Portfolio, Posts)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('portfolio', 'portfolio', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('technician-posts', 'technician-posts', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do update set
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

-- 6. Storage Bucket RLS Policies
drop policy if exists "public_read_avatars" on storage.objects;
create policy "public_read_avatars" on storage.objects
  for select using (bucket_id in ('avatars', 'portfolio', 'technician-posts'));

drop policy if exists "auth_upload_avatars" on storage.objects;
create policy "auth_upload_avatars" on storage.objects
  for insert with check (
    bucket_id in ('avatars', 'portfolio', 'technician-posts')
    and auth.role() = 'authenticated'
  );

drop policy if exists "auth_modify_own_storage" on storage.objects;
create policy "auth_modify_own_storage" on storage.objects
  for update using (
    bucket_id in ('avatars', 'portfolio', 'technician-posts')
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "auth_delete_own_storage" on storage.objects;
create policy "auth_delete_own_storage" on storage.objects
  for delete using (
    bucket_id in ('avatars', 'portfolio', 'technician-posts')
    and auth.uid()::text = (storage.foldername(name))[1]
  );

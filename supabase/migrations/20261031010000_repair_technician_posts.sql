-- Repair and expose the technician post table for projects where the earlier
-- migration was missing or stopped before creating the table.

begin;

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
  updated_at timestamptz not null default now()
);

alter table public.technician_posts
  alter column id type text using id::text,
  add column if not exists technician_id uuid references auth.users(id) on delete cascade,
  add column if not exists technician_name text not null default 'Teknisi Cepat',
  add column if not exists technician_business_name text,
  add column if not exists technician_avatar_uri text,
  add column if not exists technician_verified boolean not null default false,
  add column if not exists category_slug text not null default 'plumbing',
  add column if not exists service_area text not null default 'Jakarta Selatan',
  add column if not exists caption text not null default '',
  add column if not exists content text,
  add column if not exists image_uri text,
  add column if not exists media_urls text[] not null default array[]::text[],
  add column if not exists is_service_post boolean not null default false,
  add column if not exists published boolean not null default true,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

update public.technician_posts
set content = coalesce(content, caption, ''),
    caption = coalesce(caption, content, ''),
    media_urls = coalesce(media_urls, array[]::text[]);

alter table public.technician_posts
  alter column caption set default '',
  alter column caption set not null,
  alter column content set default '',
  alter column content set not null,
  alter column media_urls set default array[]::text[],
  alter column media_urls set not null;

alter table public.technician_posts
  drop constraint if exists technician_posts_caption_check,
  drop constraint if exists technician_posts_content_check,
  add constraint technician_posts_content_check check (
    char_length(caption) <= 1200
    and char_length(content) <= 1200
    and (
      char_length(trim(caption)) > 0
      or char_length(trim(content)) > 0
      or cardinality(media_urls) > 0
      or image_uri is not null
    )
  );

create index if not exists idx_technician_posts_feed
  on public.technician_posts (published, service_area, category_slug, created_at desc);
create index if not exists idx_technician_posts_owner
  on public.technician_posts (technician_id, created_at desc);
create index if not exists idx_technician_posts_created_id
  on public.technician_posts (created_at desc, id desc);

alter table public.technician_posts enable row level security;

drop policy if exists "technician_posts_public_read" on public.technician_posts;
create policy "technician_posts_public_read"
  on public.technician_posts
  for select
  to anon, authenticated
  using (
    published = true
    or auth.uid() = technician_id
    or public.is_admin()
  );

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

grant usage on schema public to anon, authenticated;
grant select on public.technician_posts to anon, authenticated;
grant insert, update, delete on public.technician_posts to authenticated;

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

commit;

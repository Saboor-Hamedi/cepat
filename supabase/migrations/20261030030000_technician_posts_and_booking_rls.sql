-- CEPAT: Technician Social Posts & Strict RLS Enforcement (quick.md)

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
      char_length(trim(caption)) > 0
      or char_length(trim(content)) > 0
      or cardinality(media_urls) > 0
      or image_uri is not null
    )
  )
);

create index if not exists idx_technician_posts_feed
  on public.technician_posts (published, service_area, category_slug, created_at desc);

create index if not exists idx_technician_posts_owner
  on public.technician_posts (technician_id, created_at desc);
create index if not exists idx_technician_posts_created_id
  on public.technician_posts (created_at desc, id desc);

alter table public.technician_posts enable row level security;

-- Public visitors and customers can only read published posts from active, approved technicians
drop policy if exists "technician_posts_public_read" on public.technician_posts;
create policy "technician_posts_public_read"
  on public.technician_posts
  for select
  using (
    published = true
    or auth.uid() = technician_id
    or public.is_admin()
  );

-- Only the authenticated technician owner (or admin) can create, update, or delete their own posts
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
  using (
    auth.uid() = technician_id
    or public.is_admin()
  )
  with check (
    auth.uid() = technician_id
    or public.is_admin()
  );

drop policy if exists "technician_posts_owner_delete" on public.technician_posts;
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

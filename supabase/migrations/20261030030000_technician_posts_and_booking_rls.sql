-- CEPAT: Technician Social Posts & Strict RLS Enforcement (quick.md)

create table if not exists public.technician_posts (
  id text primary key,
  technician_id uuid not null references auth.users(id) on delete cascade,
  technician_name text not null,
  technician_business_name text,
  technician_avatar_uri text,
  technician_verified boolean not null default false,
  category_slug text not null default 'plumbing',
  service_area text not null default 'Jakarta Selatan',
  caption text not null check (char_length(trim(caption)) > 0 and char_length(caption) <= 1200),
  image_uri text,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_technician_posts_feed
  on public.technician_posts (published, service_area, category_slug, created_at desc);

create index if not exists idx_technician_posts_owner
  on public.technician_posts (technician_id, created_at desc);

alter table public.technician_posts enable row level security;

-- Public visitors and customers can only read published posts from active, approved technicians
drop policy if exists "technician_posts_public_read" on public.technician_posts;
create policy "technician_posts_public_read"
  on public.technician_posts
  for select
  using (
    published = true
    or auth.uid() = technician_id
    or public.has_role(auth.uid(), 'admin')
  );

-- Only the authenticated technician owner (or admin) can create, update, or delete their own posts
drop policy if exists "technician_posts_owner_insert" on public.technician_posts;
create policy "technician_posts_owner_insert"
  on public.technician_posts
  for insert
  to authenticated
  with check (
    auth.uid() = technician_id
    and public.has_role(auth.uid(), 'technician')
  );

drop policy if exists "technician_posts_owner_update" on public.technician_posts;
create policy "technician_posts_owner_update"
  on public.technician_posts
  for update
  to authenticated
  using (
    auth.uid() = technician_id
    or public.has_role(auth.uid(), 'admin')
  )
  with check (
    auth.uid() = technician_id
    or public.has_role(auth.uid(), 'admin')
  );

drop policy if exists "technician_posts_owner_delete" on public.technician_posts;
create policy "technician_posts_owner_delete"
  on public.technician_posts
  for delete
  to authenticated
  using (
    auth.uid() = technician_id
    or public.has_role(auth.uid(), 'admin')
  );

grant select on public.technician_posts to anon, authenticated;
grant insert, update, delete on public.technician_posts to authenticated;

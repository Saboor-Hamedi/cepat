-- Migration: Technician Posts multi-image support, content column, and storage bucket (quick.md)

alter table public.technician_posts
  add column if not exists content text,
  add column if not exists media_urls text[] default array[]::text[];

-- Keep content and caption in sync
update public.technician_posts
set content = caption
where content is null and caption is not null;

update public.technician_posts
set caption = content
where caption is null and content is not null;

create index if not exists idx_technician_posts_tech_created
  on public.technician_posts (technician_id, created_at desc);

-- Storage bucket for technician post images
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

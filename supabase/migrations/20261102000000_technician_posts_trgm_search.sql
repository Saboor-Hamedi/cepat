-- Migration: Add pg_trgm extension and GIN trigram indexes for high performance post search
begin;

-- 1. Enable pg_trgm extension
create extension if not exists pg_trgm;

-- 2. Add individual GIN trigram indexes on searchable columns
-- PostgreSQL combines these with BitmapOr for fast multi-field ILIKE queries
create index if not exists idx_posts_caption_trgm
  on public.technician_posts
  using gin (caption gin_trgm_ops);

create index if not exists idx_posts_tech_name_trgm
  on public.technician_posts
  using gin (technician_name gin_trgm_ops);

create index if not exists idx_posts_business_name_trgm
  on public.technician_posts
  using gin (technician_business_name gin_trgm_ops)
  where technician_business_name is not null;

create index if not exists idx_posts_service_area_trgm
  on public.technician_posts
  using gin (service_area gin_trgm_ops);

create index if not exists idx_posts_category_slug_trgm
  on public.technician_posts
  using gin (category_slug gin_trgm_ops);

-- 3. Expression index with coalesce to safely handle nulls
create index if not exists idx_posts_search_composite_trgm
  on public.technician_posts
  using gin ((
    coalesce(caption, '') || ' ' ||
    coalesce(content, '') || ' ' ||
    coalesce(technician_name, '') || ' ' ||
    coalesce(technician_business_name, '') || ' ' ||
    coalesce(service_area, '')
  ) gin_trgm_ops);

commit;

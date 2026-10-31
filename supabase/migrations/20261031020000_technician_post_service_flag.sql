-- Let authors explicitly mark posts that offer a bookable service.
-- Existing posts remain informational unless the author opts them in.

begin;

alter table public.technician_posts
  add column if not exists is_service_post boolean not null default false;

notify pgrst, 'reload schema';

commit;

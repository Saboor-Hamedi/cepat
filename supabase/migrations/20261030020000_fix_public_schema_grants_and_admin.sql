-- Fix "permission denied for schema public" by ensuring PostgREST roles have
-- USAGE on schema public and appropriate table-level privileges (enforced by RLS).

begin;

grant usage on schema public to anon, authenticated, service_role;

grant select on public.service_categories to anon, authenticated;
grant select on public.services to anon, authenticated;
grant select on public.service_areas to anon, authenticated;
grant select on public.profiles to anon, authenticated;
grant select on public.technician_profiles to anon, authenticated;
grant select on public.technician_services to anon, authenticated;
grant select on public.technician_service_areas to anon, authenticated;
grant select on public.technician_availability to anon, authenticated;
grant select on public.portfolio_items to anon, authenticated;
grant select on public.reviews to anon, authenticated;

grant select, insert, update on public.profiles to authenticated;
grant select on public.user_roles to authenticated;
grant select, update on public.user_account_status to authenticated;
grant select, insert, update on public.technician_applications to authenticated;
grant select, insert, update on public.technician_profiles to authenticated;
grant select, insert, update, delete on public.technician_services to authenticated;
grant select, insert, update, delete on public.technician_service_areas to authenticated;
grant select, insert, update, delete on public.technician_availability to authenticated;
grant select, insert, update, delete on public.portfolio_items to authenticated;
grant select, insert, update on public.bookings to authenticated;
grant select, insert on public.booking_status_history to authenticated;
grant select, insert, update on public.conversations to authenticated;
grant select, insert, update on public.messages to authenticated;
grant select, insert, update on public.reviews to authenticated;
grant select, insert, update on public.reports to authenticated;
grant select, update on public.notifications to authenticated;
grant select, insert on public.audit_logs to authenticated;
grant select, insert, update on public.service_categories to authenticated;
grant select, insert, update on public.service_areas to authenticated;

commit;

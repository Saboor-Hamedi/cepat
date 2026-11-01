begin;

create or replace function public.ensure_technician_profile_for_role()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.role = 'technician'::public.app_role then
    insert into public.technician_profiles (user_id)
    values (new.user_id)
    on conflict (user_id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists user_roles_create_technician_profile on public.user_roles;
create trigger user_roles_create_technician_profile
after insert on public.user_roles
for each row execute function public.ensure_technician_profile_for_role();

insert into public.technician_profiles (user_id)
select roles.user_id
from public.user_roles roles
where roles.role = 'technician'::public.app_role
on conflict (user_id) do nothing;

notify pgrst, 'reload schema';

commit;

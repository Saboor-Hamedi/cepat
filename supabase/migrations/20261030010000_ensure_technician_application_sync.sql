-- Ensure every user who requested a technician account has a corresponding
-- technician_applications record, and provide a safe owner-scoped helper function
-- so authenticated technician applicants can retrieve their application status
-- even if their account was created before the trigger migration was applied.

insert into public.technician_applications (technician_user_id, status, submitted_at)
select u.id, 'pending_review', now()
from auth.users as u
where u.raw_user_meta_data ->> 'requested_account_type' = 'technician'
  and not exists (
    select 1 from public.technician_applications as a
    where a.technician_user_id = u.id
  );

create or replace function public.get_or_create_my_technician_application()
returns public.technician_application_status
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_status public.technician_application_status;
  v_requested text;
begin
  if v_uid is null then
    return null;
  end if;

  if public.has_role('technician'::public.app_role) then
    return 'approved'::public.technician_application_status;
  end if;

  select a.status
    into v_status
    from public.technician_applications as a
   where a.technician_user_id = v_uid
   order by a.created_at desc
   limit 1;

  if v_status is not null then
    return v_status;
  end if;

  select u.raw_user_meta_data ->> 'requested_account_type'
    into v_requested
    from auth.users as u
   where u.id = v_uid;

  if v_requested = 'technician' then
    insert into public.technician_applications (technician_user_id, status, submitted_at)
    values (v_uid, 'pending_review', now())
    returning status into v_status;
    return v_status;
  end if;

  return null;
end;
$$;

grant execute on function public.get_or_create_my_technician_application() to authenticated;

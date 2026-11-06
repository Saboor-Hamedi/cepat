-- Allow users to delete their own notifications.
-- Previously the notifications table only granted SELECT/UPDATE to clients,
-- so client-side deletes were silently ignored and the notification
-- reappeared on the next refresh.

drop policy if exists "notifications_delete_owner_admin" on public.notifications;
create policy "notifications_delete_owner_admin" on public.notifications
for delete to authenticated using (user_id = auth.uid() or public.is_admin());

grant delete on public.notifications to authenticated;

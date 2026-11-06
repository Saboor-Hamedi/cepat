-- ============================================================================
-- Migration: Post Likes, Views, Shares, and Customer-Only Review Edit
-- ============================================================================

-- 1. Add engagement counters to technician_posts
alter table public.technician_posts
  add column if not exists like_count integer not null default 0 check (like_count >= 0),
  add column if not exists view_count integer not null default 0 check (view_count >= 0),
  add column if not exists share_count integer not null default 0 check (share_count >= 0);

-- 2. Technician Post Likes table (any authenticated user can like/unlike any post)
create table if not exists public.technician_post_likes (
  post_id text not null references public.technician_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create index if not exists idx_technician_post_likes_post
  on public.technician_post_likes (post_id);
create index if not exists idx_technician_post_likes_user
  on public.technician_post_likes (user_id, created_at desc);

alter table public.technician_post_likes enable row level security;

drop policy if exists "technician_post_likes_public_read" on public.technician_post_likes;
create policy "technician_post_likes_public_read"
  on public.technician_post_likes
  for select
  to anon, authenticated
  using (true);

drop policy if exists "technician_post_likes_user_insert" on public.technician_post_likes;
create policy "technician_post_likes_user_insert"
  on public.technician_post_likes
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "technician_post_likes_user_delete" on public.technician_post_likes;
create policy "technician_post_likes_user_delete"
  on public.technician_post_likes
  for delete
  to authenticated
  using (auth.uid() = user_id);

grant select on public.technician_post_likes to anon, authenticated;
grant insert, delete on public.technician_post_likes to authenticated;

-- Trigger to keep technician_posts.like_count in sync automatically
create or replace function public.sync_technician_post_like_count()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_post_id text;
begin
  v_post_id := coalesce(new.post_id, old.post_id);
  update public.technician_posts
  set like_count = (
    select count(*)::integer
    from public.technician_post_likes
    where post_id = v_post_id
  )
  where id = v_post_id;
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_sync_technician_post_like_count on public.technician_post_likes;
create trigger trg_sync_technician_post_like_count
  after insert or delete on public.technician_post_likes
  for each row execute function public.sync_technician_post_like_count();

-- RPC: Toggle like on a post for any logged-in user
create or replace function public.toggle_post_like(
  p_post_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_liked boolean;
  v_count integer;
begin
  if v_uid is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  if p_post_id is null or char_length(trim(p_post_id)) = 0 then
    raise exception 'invalid_post_id' using errcode = '22023';
  end if;

  if exists (
    select 1 from public.technician_post_likes
    where post_id = p_post_id and user_id = v_uid
  ) then
    delete from public.technician_post_likes
    where post_id = p_post_id and user_id = v_uid;
    v_liked := false;
  else
    insert into public.technician_post_likes (post_id, user_id)
    values (p_post_id, v_uid)
    on conflict (post_id, user_id) do nothing;
    v_liked := true;
  end if;

  select coalesce(like_count, 0) into v_count
  from public.technician_posts
  where id = p_post_id;

  return jsonb_build_object(
    'post_id', p_post_id,
    'liked', v_liked,
    'like_count', coalesce(v_count, 0)
  );
end;
$$;

revoke all on function public.toggle_post_like(text) from public, anon;
grant execute on function public.toggle_post_like(text) to authenticated;

-- 3. Technician Post Views table & RPC
create table if not exists public.technician_post_views (
  id uuid primary key default gen_random_uuid(),
  post_id text not null references public.technician_posts(id) on delete cascade,
  viewer_user_id uuid references auth.users(id) on delete cascade,
  viewer_fingerprint text not null,
  created_at timestamptz not null default now(),
  unique (post_id, viewer_fingerprint)
);

create index if not exists idx_technician_post_views_post
  on public.technician_post_views (post_id);

alter table public.technician_post_views enable row level security;

drop policy if exists "technician_post_views_public_read" on public.technician_post_views;
create policy "technician_post_views_public_read"
  on public.technician_post_views
  for select
  to anon, authenticated
  using (true);

grant select on public.technician_post_views to anon, authenticated;

create or replace function public.record_post_view(
  p_post_id text,
  p_viewer_key text default null
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_fingerprint text;
  v_inserted integer := 0;
  v_count integer := 0;
begin
  if p_post_id is null or char_length(trim(p_post_id)) = 0 then
    return 0;
  end if;

  v_fingerprint := coalesce(
    v_uid::text,
    nullif(left(trim(coalesce(p_viewer_key, '')), 120), ''),
    'anon'
  );

  insert into public.technician_post_views (post_id, viewer_user_id, viewer_fingerprint)
  values (p_post_id, v_uid, v_fingerprint)
  on conflict (post_id, viewer_fingerprint) do nothing;

  get diagnostics v_inserted = row_count;

  if v_inserted > 0 then
    update public.technician_posts
    set view_count = coalesce(view_count, 0) + 1
    where id = p_post_id
    returning view_count into v_count;
  else
    select coalesce(view_count, 0) into v_count
    from public.technician_posts
    where id = p_post_id;
  end if;

  return coalesce(v_count, 0);
end;
$$;

grant execute on function public.record_post_view(text, text) to anon, authenticated;

-- 4. Increment Post Share Count RPC
create or replace function public.increment_post_share_count(
  p_post_id text
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_count integer := 0;
begin
  if p_post_id is null or char_length(trim(p_post_id)) = 0 then
    return 0;
  end if;

  update public.technician_posts
  set share_count = coalesce(share_count, 0) + 1
  where id = p_post_id
  returning share_count into v_count;

  return coalesce(v_count, 0);
end;
$$;

grant execute on function public.increment_post_share_count(text) to anon, authenticated;

-- 5. Strict Customer-Only Review Submission & Edit Enforcement
-- Only the customer who completed the booking with that technician can submit or edit feedback.
-- Admins, the technician, or other users who did not complete that booking cannot submit or edit.
create or replace function public.validate_booking_review_submission()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
begin
  if old.review_rating is not distinct from new.review_rating
     and old.review_comment is not distinct from new.review_comment then
    return new;
  end if;

  -- Must be a completed booking
  if new.status <> 'completed' then
    raise exception 'booking_not_completed' using errcode = '42501';
  end if;

  -- Strictly only the customer of this completed booking can submit or edit feedback
  if v_actor is null
     or v_actor is distinct from old.customer_user_id
     or old.customer_user_id = old.technician_user_id then
    raise exception 'only_completed_booking_customer_can_review' using errcode = '42501';
  end if;

  -- Prevent clearing a rating once submitted
  if new.review_rating is null or new.review_rating not between 1 and 5 then
    raise exception 'invalid_rating' using errcode = '22023';
  end if;

  return new;
end;
$$;

drop trigger if exists bookings_validate_review_submission on public.bookings;
create trigger bookings_validate_review_submission
  before update of review_rating, review_comment on public.bookings
  for each row execute function public.validate_booking_review_submission();

create or replace function public.submit_or_update_booking_review(
  p_booking_id uuid,
  p_rating smallint,
  p_comment text default null
)
returns public.bookings
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_booking public.bookings%rowtype;
  v_clean_comment text := nullif(left(btrim(coalesce(p_comment, '')), 3000), '');
begin
  if v_uid is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  if p_rating is null or p_rating not between 1 and 5 then
    raise exception 'invalid_rating' using errcode = '22023';
  end if;

  select * into v_booking
  from public.bookings
  where id = p_booking_id
  for update;

  if not found then
    raise exception 'booking_not_found' using errcode = '42501';
  end if;

  if v_booking.status <> 'completed' then
    raise exception 'booking_not_completed' using errcode = '55000';
  end if;

  -- Strictly enforce: only the customer who completed this booking with the technician can submit or edit
  if v_booking.customer_user_id is distinct from v_uid
     or v_booking.customer_user_id = v_booking.technician_user_id then
    raise exception 'only_completed_booking_customer_can_review' using errcode = '42501';
  end if;

  update public.bookings
  set review_rating = p_rating,
      review_comment = v_clean_comment,
      updated_at = now()
  where id = p_booking_id
  returning * into v_booking;

  insert into public.reviews (
    booking_id,
    customer_user_id,
    technician_user_id,
    rating,
    comment
  ) values (
    v_booking.id,
    v_booking.customer_user_id,
    v_booking.technician_user_id,
    p_rating,
    v_clean_comment
  )
  on conflict (booking_id) do update
  set rating = excluded.rating,
      comment = excluded.comment,
      updated_at = now();

  -- Recalculate technician aggregate rating and review count
  update public.technician_profiles tp
  set average_rating = coalesce((
        select round(avg(r.rating)::numeric, 2)
        from public.reviews r
        where r.technician_user_id = v_booking.technician_user_id
          and r.is_hidden = false
      ), p_rating),
      review_count = (
        select count(*)::integer
        from public.reviews r
        where r.technician_user_id = v_booking.technician_user_id
          and r.is_hidden = false
      )
  where tp.user_id = v_booking.technician_user_id;

  return v_booking;
end;
$$;

revoke all on function public.submit_or_update_booking_review(uuid, smallint, text) from public, anon;
grant execute on function public.submit_or_update_booking_review(uuid, smallint, text) to authenticated;

notify pgrst, 'reload schema';

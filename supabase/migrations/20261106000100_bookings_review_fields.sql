-- Persist the customer's post-completion review on the booking row.
-- The app reads/writes these columns to gate "one review per booking";
-- previously they did not exist, so the submitted review was lost on reload
-- and customers could submit repeatedly.

alter table public.bookings
  add column if not exists review_rating smallint check (review_rating is null or review_rating between 1 and 5),
  add column if not exists review_comment text check (review_comment is null or char_length(review_comment) <= 3000);

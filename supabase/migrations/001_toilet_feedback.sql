create extension if not exists pgcrypto;

create table if not exists public.toilet_ratings (
  id uuid primary key default gen_random_uuid(),
  toilet_id text not null,
  rating smallint not null,
  comment text,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  review_note text
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'toilet_ratings_rating_range'
      and conrelid = 'public.toilet_ratings'::regclass
  ) then
    alter table public.toilet_ratings
      add constraint toilet_ratings_rating_range check (rating between 1 and 5);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'toilet_ratings_status_check'
      and conrelid = 'public.toilet_ratings'::regclass
  ) then
    alter table public.toilet_ratings
      add constraint toilet_ratings_status_check check (status in ('pending', 'approved', 'rejected'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'toilet_ratings_comment_length'
      and conrelid = 'public.toilet_ratings'::regclass
  ) then
    alter table public.toilet_ratings
      add constraint toilet_ratings_comment_length check (comment is null or char_length(comment) <= 500);
  end if;
end $$;

create index if not exists toilet_ratings_toilet_created_idx
  on public.toilet_ratings (toilet_id, created_at desc);

create index if not exists toilet_ratings_pending_created_idx
  on public.toilet_ratings (created_at desc)
  where status = 'pending';

create index if not exists toilet_ratings_approved_toilet_created_idx
  on public.toilet_ratings (toilet_id, created_at desc)
  where status = 'approved';

create or replace view public.toilet_rating_summaries
with (security_invoker = true)
as
select
  toilet_id,
  count(*)::integer as rating_count,
  round(avg(rating)::numeric, 2) as average_rating
from public.toilet_ratings
where status = 'approved'
group by toilet_id;

alter table public.toilet_ratings enable row level security;

drop policy if exists "Public can read approved toilet feedback" on public.toilet_ratings;
create policy "Public can read approved toilet feedback"
  on public.toilet_ratings
  for select
  to anon, authenticated
  using (status = 'approved');

drop policy if exists "Public can submit pending toilet feedback" on public.toilet_ratings;
create policy "Public can submit pending toilet feedback"
  on public.toilet_ratings
  for insert
  to anon, authenticated
  with check (
    status = 'pending'
    and rating between 1 and 5
    and (comment is null or char_length(comment) <= 500)
    and reviewed_at is null
    and review_note is null
  );

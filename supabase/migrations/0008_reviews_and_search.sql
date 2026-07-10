-- HouseParty M4: two-way reviews with rating rollups, account deletion,
-- and full-text search inside nearby_events.

-- ---------------------------------------------------------------------------
-- reviews: one per booking per direction. Guests review hosts; hosts review
-- guests. Only for accepted bookings whose event has ended.
-- ---------------------------------------------------------------------------
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.booking_requests (id) on delete cascade,
  event_id uuid not null references public.events (id) on delete cascade,
  reviewer_id uuid not null references public.profiles (id) on delete cascade,
  reviewee_id uuid not null references public.profiles (id) on delete cascade,
  direction text not null check (direction in ('guest_to_host', 'host_to_guest')),
  rating int not null check (rating between 1 and 5),
  comment text check (comment is null or char_length(comment) <= 1000),
  created_at timestamptz not null default now(),
  unique (booking_id, direction)
);

create index reviews_reviewee_id_idx on public.reviews (reviewee_id, direction, created_at desc);
create index reviews_reviewer_id_idx on public.reviews (reviewer_id, created_at desc);

alter table public.reviews enable row level security;

create policy "reviews are readable"
  on public.reviews for select
  to authenticated
  using (true);
-- Writes only through submit_review below.

-- Keep profiles.{host,guest}_rating_{avg,count} in sync.
create function public.refresh_rating_rollup()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_reviewee uuid := coalesce(new.reviewee_id, old.reviewee_id);
  v_direction text := coalesce(new.direction, old.direction);
begin
  if v_direction = 'guest_to_host' then
    update public.profiles p set
      host_rating_avg = coalesce((select round(avg(rating)::numeric, 2) from public.reviews
        where reviewee_id = v_reviewee and direction = 'guest_to_host'), 0),
      host_rating_count = (select count(*) from public.reviews
        where reviewee_id = v_reviewee and direction = 'guest_to_host')
    where p.id = v_reviewee;
  else
    update public.profiles p set
      guest_rating_avg = coalesce((select round(avg(rating)::numeric, 2) from public.reviews
        where reviewee_id = v_reviewee and direction = 'host_to_guest'), 0),
      guest_rating_count = (select count(*) from public.reviews
        where reviewee_id = v_reviewee and direction = 'host_to_guest')
    where p.id = v_reviewee;
  end if;
  return null;
end;
$$;

create trigger refresh_rating_rollup_after_change
  after insert or update or delete on public.reviews
  for each row execute function public.refresh_rating_rollup();

-- Guest or host submits their side's review for an accepted, ended booking.
create function public.submit_review(
  p_booking_id uuid,
  p_rating int,
  p_comment text default null
)
returns public.reviews
language plpgsql
security definer set search_path = public
as $$
declare
  v_booking public.booking_requests;
  v_event public.events;
  v_row public.reviews;
  v_direction text;
  v_reviewee uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_booking from public.booking_requests where id = p_booking_id;
  if not found then
    raise exception 'Booking not found';
  end if;
  if v_booking.status <> 'accepted' then
    raise exception 'Reviews are only for accepted bookings';
  end if;

  select * into v_event from public.events where id = v_booking.event_id;
  if v_event.end_at > now() then
    raise exception 'You can review after the event ends';
  end if;

  if auth.uid() = v_booking.guest_id then
    v_direction := 'guest_to_host';
    v_reviewee := v_booking.host_id;
  elsif auth.uid() = v_booking.host_id then
    v_direction := 'host_to_guest';
    v_reviewee := v_booking.guest_id;
  else
    raise exception 'You were not part of this booking';
  end if;

  insert into public.reviews (booking_id, event_id, reviewer_id, reviewee_id, direction, rating, comment)
  values (p_booking_id, v_booking.event_id, auth.uid(), v_reviewee, v_direction, p_rating, nullif(trim(p_comment), ''))
  returning * into v_row;
  return v_row;
exception
  when unique_violation then
    raise exception 'You already reviewed this booking';
end;
$$;

-- ---------------------------------------------------------------------------
-- Account deletion (App Store 5.1.1(v)): removes the auth user; profiles,
-- events, bookings, reviews and tokens cascade.
-- ---------------------------------------------------------------------------
create function public.delete_my_account()
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

-- ---------------------------------------------------------------------------
-- nearby_events + optional full-text search (title/description/city via the
-- generated search_vector). With a query, results rank by relevance first.
-- ---------------------------------------------------------------------------
drop function public.nearby_events(double precision, double precision, double precision, text, numeric, timestamptz);

create function public.nearby_events(
  p_lat double precision,
  p_lng double precision,
  p_radius_meters double precision default 25000,
  p_category text default null,
  p_max_price numeric default null,
  p_start_after timestamptz default null,
  p_search text default null
)
returns table (
  id uuid,
  host_id uuid,
  title text,
  category text,
  city text,
  capacity int,
  current_rsvp_count int,
  price_per_person numeric,
  currency text,
  start_at timestamptz,
  end_at timestamptz,
  lat double precision,
  lng double precision,
  distance_meters double precision,
  cover_photo_path text
)
language sql
stable
set search_path = public
as $$
  select
    e.id, e.host_id, e.title, e.category, e.city, e.capacity,
    e.current_rsvp_count, e.price_per_person, e.currency, e.start_at, e.end_at,
    e.lat, e.lng,
    st_distance(e.location, st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography) as distance_meters,
    (
      select ep.storage_path from public.event_photos ep
      where ep.event_id = e.id
      order by ep.position
      limit 1
    ) as cover_photo_path
  from public.events e
  where e.status = 'published'
    and e.end_at >= coalesce(p_start_after, now())
    and st_dwithin(
      e.location,
      st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography,
      p_radius_meters
    )
    and (p_category is null or e.category = p_category)
    and (p_max_price is null or e.price_per_person <= p_max_price)
    and (p_search is null or e.search_vector @@ websearch_to_tsquery('english', p_search))
  order by
    case when p_search is null then 0
         else -ts_rank(e.search_vector, websearch_to_tsquery('english', p_search)) end,
    distance_meters
  limit 200
$$;

-- HouseParty M2: events, event photos, geo-search RPC, event-photos bucket.

-- ---------------------------------------------------------------------------
-- events
-- ---------------------------------------------------------------------------
create table public.events (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 3 and 80),
  description text not null check (char_length(description) between 10 and 2000),
  category text not null check (category in (
    'house_party', 'rooftop', 'pool_party', 'dinner_party', 'game_night',
    'music', 'outdoor', 'other'
  )),
  tags text[] not null default '{}',
  location geography(point, 4326) not null,
  -- Generated lat/lng so clients never parse WKB; writes go through the
  -- location column (WKT 'SRID=4326;POINT(lng lat)' from the client).
  lat double precision generated always as (st_y(location::geometry)) stored,
  lng double precision generated always as (st_x(location::geometry)) stored,
  address text not null,
  city text not null,
  capacity int not null check (capacity between 1 and 500),
  price_per_person numeric(10, 2) not null default 0 check (price_per_person >= 0),
  currency text not null default 'USD' check (char_length(currency) = 3),
  start_at timestamptz not null,
  end_at timestamptz not null,
  age_restriction int check (age_restriction between 16 and 99),
  house_rules text check (house_rules is null or char_length(house_rules) <= 1000),
  cancellation_policy text not null default 'flexible'
    check (cancellation_policy in ('flexible', 'moderate', 'strict')),
  status text not null default 'published'
    check (status in ('draft', 'published', 'cancelled', 'completed')),
  -- Maintained by booking triggers starting in M3; kept at 0 until then.
  current_rsvp_count int not null default 0 check (current_rsvp_count >= 0),
  search_vector tsvector generated always as (
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, '') || ' ' || coalesce(city, ''))
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_at > start_at)
);

create index events_location_idx on public.events using gist (location);
create index events_search_idx on public.events using gin (search_vector);
create index events_host_id_idx on public.events (host_id);
create index events_start_at_idx on public.events (start_at) where status = 'published';

create trigger set_events_updated_at
  before update on public.events
  for each row execute function extensions.moddatetime('updated_at');

alter table public.events enable row level security;

create policy "published events are readable"
  on public.events for select
  to authenticated
  using (status = 'published' or host_id = auth.uid());

create policy "verified users create their own events"
  on public.events for insert
  to authenticated
  with check (host_id = auth.uid() and public.is_verified(auth.uid()));

create policy "hosts update their own events"
  on public.events for update
  to authenticated
  using (host_id = auth.uid());

create policy "hosts delete their own events"
  on public.events for delete
  to authenticated
  using (host_id = auth.uid());

-- ---------------------------------------------------------------------------
-- event_photos
-- ---------------------------------------------------------------------------
create table public.event_photos (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  storage_path text not null,
  position int not null default 0,
  created_at timestamptz not null default now()
);

create index event_photos_event_id_idx on public.event_photos (event_id, position);

alter table public.event_photos enable row level security;

create policy "photos of readable events are readable"
  on public.event_photos for select
  to authenticated
  using (
    exists (
      select 1 from public.events e
      where e.id = event_id and (e.status = 'published' or e.host_id = auth.uid())
    )
  );

create policy "hosts manage their own event photos"
  on public.event_photos for insert
  to authenticated
  with check (
    exists (select 1 from public.events e where e.id = event_id and e.host_id = auth.uid())
  );

create policy "hosts delete their own event photos"
  on public.event_photos for delete
  to authenticated
  using (
    exists (select 1 from public.events e where e.id = event_id and e.host_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- nearby_events: powers both the Map and (M4) Explore. SECURITY INVOKER so
-- events RLS applies; the function only ever surfaces published rows anyway.
-- ---------------------------------------------------------------------------
create function public.nearby_events(
  p_lat double precision,
  p_lng double precision,
  p_radius_meters double precision default 25000,
  p_category text default null,
  p_max_price numeric default null,
  p_start_after timestamptz default null
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
  order by distance_meters
  limit 200
$$;

-- ---------------------------------------------------------------------------
-- event-photos bucket: public read, owner write.
-- Path convention: {user_id}/{event_id}/{uuid}.jpg
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('event-photos', 'event-photos', true)
on conflict (id) do nothing;

create policy "anyone can view event photos"
  on storage.objects for select
  to public
  using (bucket_id = 'event-photos');

create policy "verified users upload their own event photos"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'event-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.is_verified(auth.uid())
  );

create policy "users delete their own event photos"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'event-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

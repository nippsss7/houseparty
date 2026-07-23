-- HouseParty M5: user blocking, content reporting (App Store UGC moderation
-- requirement), and creation-rate limits.

-- ---------------------------------------------------------------------------
-- user_blocks: one-directional. Blocking hides the blocked user's events
-- from you and prevents booking requests between you in either direction.
-- ---------------------------------------------------------------------------
create table public.user_blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

alter table public.user_blocks enable row level security;

create policy "users manage their own blocks"
  on public.user_blocks for all
  to authenticated
  using (blocker_id = auth.uid())
  with check (blocker_id = auth.uid());

-- ---------------------------------------------------------------------------
-- reports: users flag an event or another user for review. Status is
-- advanced by admins only.
-- ---------------------------------------------------------------------------
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  reported_user_id uuid references public.profiles (id) on delete cascade,
  reported_event_id uuid references public.events (id) on delete cascade,
  reason text not null check (reason in (
    'spam', 'inappropriate_content', 'harassment', 'safety_concern', 'fake_listing', 'other'
  )),
  details text check (details is null or char_length(details) <= 1000),
  status text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  check (reported_user_id is not null or reported_event_id is not null)
);

create index reports_status_idx on public.reports (status, created_at);

alter table public.reports enable row level security;

create policy "users see their own reports"
  on public.reports for select
  to authenticated
  using (reporter_id = auth.uid() or public.is_admin(auth.uid()));

create policy "users file reports"
  on public.reports for insert
  to authenticated
  with check (reporter_id = auth.uid());

create policy "admins update report status"
  on public.reports for update
  to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- ---------------------------------------------------------------------------
-- Rate limits: cheap trigger-based guards, no extra infra needed for v1.
-- ---------------------------------------------------------------------------
create function public.enforce_event_creation_rate_limit()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if (select count(*) from public.events
      where host_id = new.host_id and created_at > now() - interval '1 day') >= 5 then
    raise exception 'You can create up to 5 events per day. Try again tomorrow.';
  end if;
  return new;
end;
$$;

create trigger enforce_event_creation_rate_limit_trigger
  before insert on public.events
  for each row execute function public.enforce_event_creation_rate_limit();

-- ---------------------------------------------------------------------------
-- request_to_join: add booking rate limit + block-awareness on top of the
-- existing capacity/verification checks (from migration 0006).
-- ---------------------------------------------------------------------------
create or replace function public.request_to_join(
  p_event_id uuid,
  p_party_size int,
  p_message text default null
)
returns public.booking_requests
language plpgsql
security definer set search_path = public
as $$
declare
  v_event public.events;
  v_row public.booking_requests;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  if not public.is_verified(auth.uid()) then
    raise exception 'Only verified users can request to join events';
  end if;

  if (select count(*) from public.booking_requests
      where guest_id = auth.uid() and created_at > now() - interval '1 hour') >= 15 then
    raise exception 'Too many requests — please try again in a bit.';
  end if;

  select * into v_event from public.events where id = p_event_id and status = 'published';
  if not found then
    raise exception 'Event not found';
  end if;
  if v_event.host_id = auth.uid() then
    raise exception 'You are the host of this event';
  end if;
  if v_event.end_at < now() then
    raise exception 'This event has already ended';
  end if;
  if v_event.current_rsvp_count + p_party_size > v_event.capacity then
    raise exception 'Not enough spots left for your party size';
  end if;
  if exists (
    select 1 from public.user_blocks
    where (blocker_id = auth.uid() and blocked_id = v_event.host_id)
       or (blocker_id = v_event.host_id and blocked_id = auth.uid())
  ) then
    raise exception 'Unable to send this request';
  end if;

  insert into public.booking_requests (event_id, host_id, guest_id, party_size, message)
  values (p_event_id, v_event.host_id, auth.uid(), p_party_size, nullif(trim(p_message), ''))
  returning * into v_row;
  return v_row;
exception
  when unique_violation then
    raise exception 'You already have a request for this event';
end;
$$;

-- ---------------------------------------------------------------------------
-- nearby_events: hide events hosted by anyone the viewer has blocked.
-- SECURITY INVOKER (unchanged), so auth.uid() is the calling user.
-- ---------------------------------------------------------------------------
create or replace function public.nearby_events(
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
    and (
      auth.uid() is null or not exists (
        select 1 from public.user_blocks ub
        where ub.blocker_id = auth.uid() and ub.blocked_id = e.host_id
      )
    )
  order by
    case when p_search is null then 0
         else -ts_rank(e.search_vector, websearch_to_tsquery('english', p_search)) end,
    distance_meters
  limit 200
$$;

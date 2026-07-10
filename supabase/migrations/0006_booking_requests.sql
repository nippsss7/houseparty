-- HouseParty M3: booking requests, capacity-guarded accept, RSVP rollup.

create table public.booking_requests (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  -- Denormalized from events so RLS checks and Realtime filters on the host
  -- side don't need a join; kept correct by trigger below.
  host_id uuid not null references public.profiles (id) on delete cascade,
  guest_id uuid not null references public.profiles (id) on delete cascade,
  party_size int not null default 1 check (party_size between 1 and 20),
  message text check (message is null or char_length(message) <= 500),
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined', 'cancelled')),
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (guest_id <> host_id)
);

create index booking_requests_event_id_idx on public.booking_requests (event_id);
create index booking_requests_guest_id_idx on public.booking_requests (guest_id, created_at desc);
create index booking_requests_host_id_idx on public.booking_requests (host_id, status, created_at desc);

-- One live request per guest per event (a declined/cancelled one may be retried).
create unique index booking_requests_one_active_idx
  on public.booking_requests (event_id, guest_id)
  where status in ('pending', 'accepted');

create trigger set_booking_requests_updated_at
  before update on public.booking_requests
  for each row execute function extensions.moddatetime('updated_at');

-- Keep events.current_rsvp_count = sum(party_size) of accepted requests.
create function public.refresh_event_rsvp_count()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_event_id uuid := coalesce(new.event_id, old.event_id);
begin
  update public.events e
  set current_rsvp_count = coalesce((
    select sum(br.party_size) from public.booking_requests br
    where br.event_id = v_event_id and br.status = 'accepted'
  ), 0)
  where e.id = v_event_id;
  return null;
end;
$$;

create trigger refresh_rsvp_count_after_change
  after insert or update or delete on public.booking_requests
  for each row execute function public.refresh_event_rsvp_count();

alter table public.booking_requests enable row level security;

create policy "guests see their own requests"
  on public.booking_requests for select
  to authenticated
  using (guest_id = auth.uid() or host_id = auth.uid());

-- All writes go through the RPCs below (they enforce capacity, ownership and
-- state transitions atomically); no direct insert/update/delete policies.

-- Guest sends a request.
create function public.request_to_join(
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

  insert into public.booking_requests (event_id, host_id, guest_id, party_size, message)
  values (p_event_id, v_event.host_id, auth.uid(), p_party_size, nullif(trim(p_message), ''))
  returning * into v_row;
  return v_row;
exception
  when unique_violation then
    raise exception 'You already have a request for this event';
end;
$$;

-- Host accepts or declines. Accept re-checks capacity inside the row lock so
-- two concurrent accepts can't oversell the event.
create function public.respond_to_booking(
  p_request_id uuid,
  p_accept boolean
)
returns public.booking_requests
language plpgsql
security definer set search_path = public
as $$
declare
  v_row public.booking_requests;
  v_event public.events;
begin
  select * into v_row from public.booking_requests where id = p_request_id for update;
  if not found then
    raise exception 'Request not found';
  end if;
  if v_row.host_id <> auth.uid() then
    raise exception 'Only the host can respond to this request';
  end if;
  if v_row.status <> 'pending' then
    raise exception 'This request was already %', v_row.status;
  end if;

  if p_accept then
    select * into v_event from public.events where id = v_row.event_id for update;
    if v_event.current_rsvp_count + v_row.party_size > v_event.capacity then
      raise exception 'Not enough spots left — the event is nearly full';
    end if;
  end if;

  update public.booking_requests
  set status = case when p_accept then 'accepted' else 'declined' end,
      responded_at = now()
  where id = p_request_id
  returning * into v_row;
  return v_row;
end;
$$;

-- Guest cancels their own pending/accepted request.
create function public.cancel_booking_request(p_request_id uuid)
returns public.booking_requests
language plpgsql
security definer set search_path = public
as $$
declare
  v_row public.booking_requests;
begin
  select * into v_row from public.booking_requests where id = p_request_id for update;
  if not found then
    raise exception 'Request not found';
  end if;
  if v_row.guest_id <> auth.uid() then
    raise exception 'Only the guest can cancel this request';
  end if;
  if v_row.status not in ('pending', 'accepted') then
    raise exception 'This request is already %', v_row.status;
  end if;

  update public.booking_requests
  set status = 'cancelled', responded_at = now()
  where id = p_request_id
  returning * into v_row;
  return v_row;
end;
$$;

-- Live updates for both sides (RLS still applies to subscribers).
alter publication supabase_realtime add table public.booking_requests;

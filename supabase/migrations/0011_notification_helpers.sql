-- Helper RPCs for the notify-* Edge Functions (service-role callers only —
-- these return other users' push tokens, so they must never be reachable
-- with a plain user JWT).

-- Verified, opted-in users near a given event (excluding its host and
-- anyone blocked in either direction), each with all of their push tokens.
create function public.find_nearby_users_for_event(p_event_id uuid)
returns table (user_id uuid, expo_push_token text)
language sql
stable
security definer set search_path = public
as $$
  select p.id, t.expo_push_token
  from public.events e
  join public.profiles p
    on p.id <> e.host_id
   and p.verification_status = 'verified'
   and p.notify_new_events = true
   and p.last_lat is not null
   and p.last_lng is not null
   and st_dwithin(
     st_setsrid(st_makepoint(p.last_lng, p.last_lat), 4326)::geography,
     e.location,
     25000
   )
  join public.device_push_tokens t on t.user_id = p.id
  where e.id = p_event_id
    and not exists (
      select 1 from public.user_blocks ub
      where (ub.blocker_id = p.id and ub.blocked_id = e.host_id)
         or (ub.blocker_id = e.host_id and ub.blocked_id = p.id)
    );
$$;

-- Accepted bookings for events starting within [p_from, p_to), for the
-- "starts soon" reminder scan.
create function public.find_upcoming_event_starts(p_from timestamptz, p_to timestamptz)
returns table (booking_id uuid, user_id uuid, expo_push_token text, event_title text, event_id uuid)
language sql
stable
security definer set search_path = public
as $$
  select br.id, br.guest_id, t.expo_push_token, e.title, e.id
  from public.booking_requests br
  join public.events e on e.id = br.event_id
  join public.device_push_tokens t on t.user_id = br.guest_id
  where br.status = 'accepted'
    and e.start_at >= p_from and e.start_at < p_to
$$;

-- Pending booking requests older than p_older_than, for the host nudge scan.
create function public.find_stale_pending_requests(p_older_than timestamptz)
returns table (booking_id uuid, host_id uuid, expo_push_token text, event_title text, event_id uuid)
language sql
stable
security definer set search_path = public
as $$
  select br.id, br.host_id, t.expo_push_token, e.title, e.id
  from public.booking_requests br
  join public.events e on e.id = br.event_id
  join public.device_push_tokens t on t.user_id = br.host_id
  where br.status = 'pending'
    and br.created_at < p_older_than
$$;

-- Users whose weekly digest is due: email notifications on, at least one new
-- published event near their last known location since their last digest
-- (or in the last 7 days if they've never had one), and haven't opened the
-- app in the last day (so active users aren't emailed on top of what they
-- already saw in-app).
create function public.find_weekly_digest_recipients()
returns table (
  user_id uuid,
  email text,
  full_name text,
  new_event_count bigint
)
language sql
stable
security definer set search_path = public
as $$
  select
    p.id,
    u.email,
    p.full_name,
    count(e.id)
  from public.profiles p
  join auth.users u on u.id = p.id
  join public.events e
    on e.status = 'published'
   and e.created_at > now() - interval '7 days'
   and e.host_id <> p.id
   and st_dwithin(
     st_setsrid(st_makepoint(p.last_lng, p.last_lat), 4326)::geography,
     e.location,
     25000
   )
  where p.notify_email = true
    and p.last_lat is not null
    and p.last_lng is not null
    and p.last_active_at < now() - interval '1 day'
    and not exists (
      select 1 from public.notification_log nl
      where nl.user_id = p.id and nl.type = 'weekly_digest'
        and nl.sent_at > now() - interval '6 days'
    )
  group by p.id, u.email, p.full_name
  having count(e.id) > 0
$$;

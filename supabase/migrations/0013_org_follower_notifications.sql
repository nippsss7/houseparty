-- Extends the new-event notification pipeline (migration 0010/0011) to
-- also reach an organization's followers, not just nearby users — this is
-- the "marketing to subscribers" half of M6. Followers who are verified and
-- opted into notify_new_events get push; those opted into notify_email get
-- an immediate marketing email (unlike the proximity-based weekly digest, a
-- follower explicitly subscribed to this org, so an immediate email is the
-- more precise, intentional design here).
--
-- Split into two functions (rather than one joined result) because a user
-- can have multiple device_push_tokens rows — joining that against a
-- one-row-per-user email target would fan out into duplicate emails.

create function public.find_org_follower_push_targets(p_event_id uuid)
returns table (user_id uuid, expo_push_token text)
language sql
stable
security definer set search_path = public
as $$
  select p.id, t.expo_push_token
  from public.events e
  join public.organization_followers f on f.organization_id = e.organization_id
  join public.profiles p on p.id = f.user_id
  join public.device_push_tokens t on t.user_id = p.id
  where e.id = p_event_id
    and e.organization_id is not null
    and p.notify_new_events = true
    and p.id <> e.host_id
$$;

create function public.find_org_follower_email_targets(p_event_id uuid)
returns table (user_id uuid, email text, full_name text)
language sql
stable
security definer set search_path = public
as $$
  select distinct p.id, u.email, p.full_name
  from public.events e
  join public.organization_followers f on f.organization_id = e.organization_id
  join public.profiles p on p.id = f.user_id
  join auth.users u on u.id = p.id
  where e.id = p_event_id
    and e.organization_id is not null
    and p.notify_email = true
    and p.id <> e.host_id
$$;

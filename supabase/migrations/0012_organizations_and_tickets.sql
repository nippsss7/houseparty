-- HouseParty M6 (part 1): organizer/company profiles with a social feed,
-- follow/subscribe system, and paid-ticketing data model. Payment collection
-- itself is NOT wired yet (blocked on Apple Developer enrollment for Apple
-- Pay) — tickets.price_paid records what a tier costs, but purchase_ticket
-- below issues the ticket without charging anything. This is deliberate:
-- Stripe integration later only needs to insert a charge step in front of
-- the existing purchase_ticket flow, no schema change required.

-- ---------------------------------------------------------------------------
-- organizations: a company/brand profile, distinct from a personal user
-- profile. Any verified user can create one (self-serve, like an Instagram
-- business account).
-- ---------------------------------------------------------------------------
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (char_length(name) between 2 and 60),
  handle text not null unique check (handle ~ '^[a-z0-9_]{3,30}$'),
  bio text check (bio is null or char_length(bio) <= 500),
  avatar_url text,
  cover_url text,
  follower_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index organizations_owner_id_idx on public.organizations (owner_id);

create trigger set_organizations_updated_at
  before update on public.organizations
  for each row execute function extensions.moddatetime('updated_at');

alter table public.organizations enable row level security;

create policy "organizations are publicly readable"
  on public.organizations for select
  to authenticated
  using (true);

create policy "verified users create their own organization"
  on public.organizations for insert
  to authenticated
  with check (owner_id = auth.uid() and public.is_verified(auth.uid()));

create policy "owners update their own organization"
  on public.organizations for update
  to authenticated
  using (owner_id = auth.uid());

create policy "owners delete their own organization"
  on public.organizations for delete
  to authenticated
  using (owner_id = auth.uid());

-- ---------------------------------------------------------------------------
-- organization_followers: the "subscribe" relationship driving follower-
-- based marketing notifications.
-- ---------------------------------------------------------------------------
create table public.organization_followers (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create index organization_followers_user_id_idx on public.organization_followers (user_id);

alter table public.organization_followers enable row level security;

create policy "follower relationships are readable"
  on public.organization_followers for select
  to authenticated
  using (true);

create policy "users manage their own follows"
  on public.organization_followers for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "users remove their own follows"
  on public.organization_followers for delete
  to authenticated
  using (user_id = auth.uid());

create function public.refresh_follower_count()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_org_id uuid := coalesce(new.organization_id, old.organization_id);
begin
  update public.organizations
  set follower_count = (select count(*) from public.organization_followers where organization_id = v_org_id)
  where id = v_org_id;
  return null;
end;
$$;

create trigger refresh_follower_count_after_change
  after insert or delete on public.organization_followers
  for each row execute function public.refresh_follower_count();

-- ---------------------------------------------------------------------------
-- organization_posts / organization_post_photos: the social feed.
-- ---------------------------------------------------------------------------
create table public.organization_posts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  caption text check (caption is null or char_length(caption) <= 2000),
  created_at timestamptz not null default now()
);

create index organization_posts_org_id_idx on public.organization_posts (organization_id, created_at desc);

alter table public.organization_posts enable row level security;

create policy "organization posts are publicly readable"
  on public.organization_posts for select
  to authenticated
  using (true);

create policy "owners create posts for their organization"
  on public.organization_posts for insert
  to authenticated
  with check (
    exists (select 1 from public.organizations o where o.id = organization_id and o.owner_id = auth.uid())
  );

create policy "owners delete their organization posts"
  on public.organization_posts for delete
  to authenticated
  using (
    exists (select 1 from public.organizations o where o.id = organization_id and o.owner_id = auth.uid())
  );

create table public.organization_post_photos (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.organization_posts (id) on delete cascade,
  storage_path text not null,
  position int not null default 0
);

create index organization_post_photos_post_id_idx on public.organization_post_photos (post_id, position);

alter table public.organization_post_photos enable row level security;

create policy "organization post photos are publicly readable"
  on public.organization_post_photos for select
  to authenticated
  using (true);

create policy "owners manage their organization post photos"
  on public.organization_post_photos for insert
  to authenticated
  with check (
    exists (
      select 1 from public.organization_posts p
      join public.organizations o on o.id = p.organization_id
      where p.id = post_id and o.owner_id = auth.uid()
    )
  );

create policy "owners delete their organization post photos"
  on public.organization_post_photos for delete
  to authenticated
  using (
    exists (
      select 1 from public.organization_posts p
      join public.organizations o on o.id = p.organization_id
      where p.id = post_id and o.owner_id = auth.uid()
    )
  );

-- organization-photos bucket: public read, owner write. Path convention:
-- {user_id}/{org_id}/{avatar|cover|post}-{uuid}.jpg
insert into storage.buckets (id, name, public)
values ('organization-photos', 'organization-photos', true)
on conflict (id) do nothing;

create policy "anyone can view organization photos"
  on storage.objects for select
  to public
  using (bucket_id = 'organization-photos');

create policy "verified users upload their own organization photos"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'organization-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.is_verified(auth.uid())
  );

create policy "users delete their own organization photos"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'organization-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---------------------------------------------------------------------------
-- events: optional attribution to an organization, so a company can post
-- events under its brand profile instead of (or alongside) a personal host.
-- ---------------------------------------------------------------------------
alter table public.events add column organization_id uuid references public.organizations (id) on delete set null;
create index events_organization_id_idx on public.events (organization_id);

drop policy "verified users create their own events" on public.events;
create policy "verified users create their own events"
  on public.events for insert
  to authenticated
  with check (
    host_id = auth.uid()
    and public.is_verified(auth.uid())
    and (
      organization_id is null
      or exists (select 1 from public.organizations o where o.id = organization_id and o.owner_id = auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- ticket_tiers: 1+ priced tiers per event (e.g. General / VIP). Separate
-- from the existing booking_requests flow — an event either uses tiers
-- (buy-to-attend, no host approval step) or the original request/accept
-- flow, never both. Presence of a tier row is what the client checks.
-- ---------------------------------------------------------------------------
create table public.ticket_tiers (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  price numeric(10, 2) not null default 0 check (price >= 0),
  currency text not null default 'USD' check (char_length(currency) = 3),
  quantity_total int not null check (quantity_total between 1 and 100000),
  quantity_sold int not null default 0 check (quantity_sold >= 0),
  position int not null default 0,
  created_at timestamptz not null default now(),
  check (quantity_sold <= quantity_total)
);

create index ticket_tiers_event_id_idx on public.ticket_tiers (event_id, position);

alter table public.ticket_tiers enable row level security;

create policy "ticket tiers readable with their event"
  on public.ticket_tiers for select
  to authenticated
  using (
    exists (
      select 1 from public.events e
      where e.id = event_id and (e.status = 'published' or e.host_id = auth.uid())
    )
  );

create policy "hosts manage their own event ticket tiers"
  on public.ticket_tiers for insert
  to authenticated
  with check (
    exists (select 1 from public.events e where e.id = event_id and e.host_id = auth.uid())
  );

create policy "hosts update their own event ticket tiers"
  on public.ticket_tiers for update
  to authenticated
  using (
    exists (select 1 from public.events e where e.id = event_id and e.host_id = auth.uid())
  );

create policy "hosts delete their own event ticket tiers"
  on public.ticket_tiers for delete
  to authenticated
  using (
    exists (select 1 from public.events e where e.id = event_id and e.host_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- tickets: one row per issued ticket. Written only through the RPCs below
-- (purchase/cancel/check-in), which handle capacity locking and ownership
-- checks atomically — no direct insert/update policies.
-- ---------------------------------------------------------------------------
create table public.tickets (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  tier_id uuid not null references public.ticket_tiers (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  qr_token text not null unique default encode(extensions.gen_random_bytes(16), 'hex'),
  status text not null default 'confirmed' check (status in ('confirmed', 'checked_in', 'cancelled')),
  price_paid numeric(10, 2) not null default 0,
  currency text not null default 'USD',
  checked_in_at timestamptz,
  checked_in_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create index tickets_event_id_idx on public.tickets (event_id);
create index tickets_user_id_idx on public.tickets (user_id, created_at desc);
create unique index tickets_qr_token_idx on public.tickets (qr_token);

alter table public.tickets enable row level security;

create policy "ticket holders and hosts can view tickets"
  on public.tickets for select
  to authenticated
  using (
    user_id = auth.uid()
    or exists (select 1 from public.events e where e.id = event_id and e.host_id = auth.uid())
  );

-- Guest buys a ticket for a tier. Row-locks the tier so concurrent
-- purchases can't oversell it. Does not collect payment yet — price_paid
-- records what the tier costs for when Stripe is wired in.
create function public.purchase_ticket(p_tier_id uuid)
returns public.tickets
language plpgsql
security definer set search_path = public
as $$
declare
  v_tier public.ticket_tiers;
  v_event public.events;
  v_row public.tickets;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  if not public.is_verified(auth.uid()) then
    raise exception 'Only verified users can get tickets';
  end if;

  select * into v_tier from public.ticket_tiers where id = p_tier_id for update;
  if not found then
    raise exception 'Ticket type not found';
  end if;

  select * into v_event from public.events where id = v_tier.event_id;
  if v_event.status <> 'published' then
    raise exception 'This event is not available';
  end if;
  if v_event.host_id = auth.uid() then
    raise exception 'You are the host of this event';
  end if;
  if v_event.end_at < now() then
    raise exception 'This event has already ended';
  end if;
  if v_tier.quantity_sold >= v_tier.quantity_total then
    raise exception 'This ticket type is sold out';
  end if;
  if exists (
    select 1 from public.tickets t
    where t.tier_id = p_tier_id and t.user_id = auth.uid() and t.status <> 'cancelled'
  ) then
    raise exception 'You already have a ticket for this tier';
  end if;

  update public.ticket_tiers set quantity_sold = quantity_sold + 1 where id = p_tier_id;

  insert into public.tickets (event_id, tier_id, user_id, price_paid, currency)
  values (v_tier.event_id, p_tier_id, auth.uid(), v_tier.price, v_tier.currency)
  returning * into v_row;
  return v_row;
end;
$$;

-- Ticket holder cancels their own ticket, freeing the tier's capacity.
create function public.cancel_ticket(p_ticket_id uuid)
returns public.tickets
language plpgsql
security definer set search_path = public
as $$
declare
  v_row public.tickets;
begin
  select * into v_row from public.tickets where id = p_ticket_id for update;
  if not found then
    raise exception 'Ticket not found';
  end if;
  if v_row.user_id <> auth.uid() then
    raise exception 'Only the ticket holder can cancel this ticket';
  end if;
  if v_row.status = 'cancelled' then
    raise exception 'This ticket is already cancelled';
  end if;
  if v_row.status = 'checked_in' then
    raise exception 'This ticket has already been used';
  end if;

  update public.ticket_tiers set quantity_sold = greatest(0, quantity_sold - 1) where id = v_row.tier_id;
  update public.tickets set status = 'cancelled' where id = p_ticket_id returning * into v_row;
  return v_row;
end;
$$;

-- Host scans a ticket's QR code at the door. Returns the ticket + attendee
-- name so the scanning screen can show who was just checked in.
create function public.check_in_ticket(p_qr_token text)
returns table (
  ticket_id uuid,
  status text,
  already_checked_in_at timestamptz,
  guest_name text,
  guest_avatar_url text,
  tier_name text,
  event_title text
)
language plpgsql
security definer set search_path = public
as $$
declare
  v_ticket public.tickets;
  v_event public.events;
begin
  select * into v_ticket from public.tickets where qr_token = p_qr_token for update;
  if not found then
    raise exception 'Invalid ticket';
  end if;

  select * into v_event from public.events where id = v_ticket.event_id;
  if v_event.host_id <> auth.uid() then
    raise exception 'Only the host can check in tickets for this event';
  end if;

  if v_ticket.status = 'cancelled' then
    raise exception 'This ticket was cancelled';
  end if;

  if v_ticket.status = 'checked_in' then
    return query
      select v_ticket.id, v_ticket.status, v_ticket.checked_in_at,
             p.full_name, p.avatar_url, t.name, v_event.title
      from public.profiles p, public.ticket_tiers t
      where p.id = v_ticket.user_id and t.id = v_ticket.tier_id;
    return;
  end if;

  update public.tickets
  set status = 'checked_in', checked_in_at = now(), checked_in_by = auth.uid()
  where id = v_ticket.id;

  return query
    select v_ticket.id, 'checked_in'::text, now(),
           p.full_name, p.avatar_url, t.name, v_event.title
    from public.profiles p, public.ticket_tiers t
    where p.id = v_ticket.user_id and t.id = v_ticket.tier_id;
end;
$$;

-- HouseParty: notification system.
-- Immediate/actionable stuff (new nearby party, booking updates) -> push.
-- Periodic summaries (weekly digest) -> email via Resend, from notify-weekly-digest.
-- Time-based reminders (event starting soon, stale pending requests) -> push,
-- dispatched by a pg_cron job so they don't depend on any specific write happening.

create extension if not exists pg_cron;

-- ---------------------------------------------------------------------------
-- profiles: last-known location (opportunistic, from the Map screen — reuses
-- the location permission already granted there), activity timestamp, and
-- notification preferences.
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column last_lat double precision,
  add column last_lng double precision,
  add column last_location_at timestamptz,
  add column last_active_at timestamptz not null default now(),
  add column notify_new_events boolean not null default true,
  add column notify_email boolean not null default true;

create function public.update_my_location(p_lat double precision, p_lng double precision)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  update public.profiles
  set last_lat = p_lat, last_lng = p_lng, last_location_at = now()
  where id = auth.uid();
end;
$$;

create function public.touch_last_active()
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  update public.profiles set last_active_at = now() where id = auth.uid();
end;
$$;

-- ---------------------------------------------------------------------------
-- notification_log: idempotency guard for anything dispatched by a cron scan
-- (as opposed to a direct trigger on the row itself) — the scan can run
-- multiple times before a reminder's window closes, so each (user, type,
-- related row) combination must fire at most once.
-- ---------------------------------------------------------------------------
create table public.notification_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null,
  related_id uuid not null,
  sent_at timestamptz not null default now(),
  unique (user_id, type, related_id)
);

alter table public.notification_log enable row level security;
-- No public policies: only the service role (Edge Functions) touches this table.

-- ---------------------------------------------------------------------------
-- New published event -> notify nearby, opted-in, verified users (not the
-- host, not blocked either direction) via notify-new-event-push.
-- ---------------------------------------------------------------------------
create function public.notify_new_event_webhook()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.status <> 'published' then
    return null;
  end if;
  perform net.http_post(
    url := 'https://anuojxpkbyomuwfawvyo.supabase.co/functions/v1/notify-new-event-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Webhook-Secret', '4ca55ff9f6610d8de55f31e369534f981a7061ccd57be499'
    ),
    body := jsonb_build_object('event_id', new.id)
  );
  return null;
end;
$$;

create trigger notify_new_event_change
  after insert on public.events
  for each row execute function public.notify_new_event_webhook();

-- ---------------------------------------------------------------------------
-- Scheduled dispatch: event-starting-soon reminders + stale-pending-request
-- nudges. Runs every 15 minutes; notify-scheduled itself is idempotent via
-- notification_log, so overlap with its own window is harmless.
-- ---------------------------------------------------------------------------
select cron.schedule(
  'notify-scheduled-every-15-min',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := 'https://anuojxpkbyomuwfawvyo.supabase.co/functions/v1/notify-scheduled',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Webhook-Secret', '4ca55ff9f6610d8de55f31e369534f981a7061ccd57be499'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Weekly digest email: Sundays at 16:00 UTC.
select cron.schedule(
  'notify-weekly-digest-sunday',
  '0 16 * * 0',
  $$
  select net.http_post(
    url := 'https://anuojxpkbyomuwfawvyo.supabase.co/functions/v1/notify-weekly-digest',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Webhook-Secret', '4ca55ff9f6610d8de55f31e369534f981a7061ccd57be499'
    ),
    body := '{}'::jsonb
  );
  $$
);

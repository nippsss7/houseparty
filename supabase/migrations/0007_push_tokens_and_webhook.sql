-- HouseParty M3: Expo push tokens + booking-change webhook to the
-- notify-booking-push Edge Function.

create table public.device_push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  expo_push_token text not null unique,
  updated_at timestamptz not null default now()
);

create index device_push_tokens_user_id_idx on public.device_push_tokens (user_id);

alter table public.device_push_tokens enable row level security;

create policy "users manage their own push tokens"
  on public.device_push_tokens for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Booking changes → HTTP POST to the Edge Function (async via pg_net, so the
-- booking transaction never waits on push delivery). The shared secret only
-- gates spam to the function; real auth is the service key inside it.
create extension if not exists pg_net;

create function public.notify_booking_webhook()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  -- Only notify on: new pending request (host), or pending -> accepted/declined (guest).
  if tg_op = 'UPDATE' and (old.status = new.status or new.status not in ('accepted', 'declined')) then
    return null;
  end if;

  perform net.http_post(
    url := 'https://anuojxpkbyomuwfawvyo.supabase.co/functions/v1/notify-booking-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Webhook-Secret', '4ca55ff9f6610d8de55f31e369534f981a7061ccd57be499'
    ),
    body := jsonb_build_object(
      'type', tg_op,
      'record', to_jsonb(new),
      'old_record', case when tg_op = 'UPDATE' then to_jsonb(old) else null end
    )
  );
  return null;
end;
$$;

create trigger notify_booking_change
  after insert or update on public.booking_requests
  for each row execute function public.notify_booking_webhook();

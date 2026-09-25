-- Fires the ticket confirmation email (with QR code) whenever purchase_ticket
-- issues a new ticket (migration 0012).

create function public.notify_ticket_purchased_webhook()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  perform net.http_post(
    url := 'https://anuojxpkbyomuwfawvyo.supabase.co/functions/v1/notify-ticket-purchased',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Webhook-Secret', '4ca55ff9f6610d8de55f31e369534f981a7061ccd57be499'
    ),
    body := jsonb_build_object('ticket_id', new.id)
  );
  return null;
end;
$$;

create trigger notify_ticket_purchased_change
  after insert on public.tickets
  for each row execute function public.notify_ticket_purchased_webhook();

// Sends Expo push notifications on booking changes. Invoked by the
// notify_booking_change trigger (see migration 0007) with the standard
// database-webhook payload shape.

import { createClient } from "jsr:@supabase/supabase-js@2";

interface BookingRecord {
  id: string;
  event_id: string;
  host_id: string;
  guest_id: string;
  party_size: number;
  status: string;
}

interface WebhookPayload {
  type: "INSERT" | "UPDATE";
  record: BookingRecord;
  old_record: BookingRecord | null;
}

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

Deno.serve(async (request) => {
  if (request.headers.get("x-webhook-secret") !== Deno.env.get("BOOKING_WEBHOOK_SECRET")) {
    return new Response("forbidden", { status: 403 });
  }

  const payload = (await request.json()) as WebhookPayload;
  const booking = payload.record;

  const { data: event } = await supabase
    .from("events")
    .select("title")
    .eq("id", booking.event_id)
    .single();
  const eventTitle = event?.title ?? "your event";

  let recipientId: string;
  let title: string;
  let body: string;

  if (payload.type === "INSERT") {
    recipientId = booking.host_id;
    const { data: guest } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", booking.guest_id)
      .single();
    title = "New request to join 🎉";
    body = `${guest?.full_name ?? "Someone"} wants to join "${eventTitle}" (party of ${booking.party_size})`;
  } else if (booking.status === "accepted") {
    recipientId = booking.guest_id;
    title = "You're in! 🎉";
    body = `Your request for "${eventTitle}" was accepted — the address is now visible.`;
  } else {
    recipientId = booking.guest_id;
    title = "Request declined";
    body = `The host couldn't fit your party of ${booking.party_size} at "${eventTitle}".`;
  }

  const { data: tokens } = await supabase
    .from("device_push_tokens")
    .select("expo_push_token")
    .eq("user_id", recipientId);

  if (!tokens || tokens.length === 0) {
    return Response.json({ sent: 0, reason: "no tokens" });
  }

  const messages = tokens.map((t) => ({
    to: t.expo_push_token,
    title,
    body,
    sound: "default",
    data: { url: payload.type === "INSERT" ? "/(tabs)/bookings" : `/event/${booking.event_id}` },
  }));

  const pushResponse = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(messages),
  });
  const pushResult = await pushResponse.json();

  // Prune tokens Expo reports as no longer registered.
  const stale: string[] = [];
  const tickets = Array.isArray(pushResult?.data) ? pushResult.data : [];
  tickets.forEach((ticket: { status: string; details?: { error?: string } }, index: number) => {
    if (ticket.status === "error" && ticket.details?.error === "DeviceNotRegistered") {
      stale.push(messages[index].to);
    }
  });
  if (stale.length > 0) {
    await supabase.from("device_push_tokens").delete().in("expo_push_token", stale);
  }

  return Response.json({ sent: messages.length - stale.length, pruned: stale.length });
});

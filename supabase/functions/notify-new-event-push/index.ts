// Fired by the notify_new_event_change trigger (migration 0010) whenever a
// new event is published. Notifies verified, opted-in users within 25km who
// haven't blocked (or been blocked by) the host.

import { createClient } from "jsr:@supabase/supabase-js@2";
import { sendExpoPush, type PushMessage } from "../_shared/push.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

Deno.serve(async (request) => {
  if (request.headers.get("x-webhook-secret") !== Deno.env.get("BOOKING_WEBHOOK_SECRET")) {
    return new Response("forbidden", { status: 403 });
  }

  const { event_id: eventId } = (await request.json()) as { event_id: string };

  const { data: event } = await supabase
    .from("events")
    .select("id, title, city, category")
    .eq("id", eventId)
    .single();
  if (!event) return Response.json({ sent: 0, reason: "event not found" });

  const { data: recipients, error } = await supabase.rpc("find_nearby_users_for_event", {
    p_event_id: eventId,
  });
  if (error) {
    console.error("find_nearby_users_for_event failed:", error);
    return Response.json({ sent: 0, error: error.message }, { status: 500 });
  }
  if (!recipients || recipients.length === 0) return Response.json({ sent: 0 });

  const messages: PushMessage[] = recipients.map((r: { expo_push_token: string }) => ({
    to: r.expo_push_token,
    title: "New party near you 🎉",
    body: `${event.title} — ${event.city}`,
    data: { url: `/event/${event.id}` },
  }));

  const result = await sendExpoPush(supabase, messages);
  return Response.json(result);
});

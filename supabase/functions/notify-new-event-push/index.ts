// Fired by the notify_new_event_change trigger (migration 0010) whenever a
// new event is published. Two audiences:
//   1. Nearby users (25km, proximity-based) — push only.
//   2. Followers of the event's organization, if it's posted under one
//      (migration 0013) — push AND an immediate marketing email, since
//      following an org is an explicit opt-in, unlike proximity.
// Push tokens are deduped so a nearby follower doesn't get double-pushed.

import { createClient } from "jsr:@supabase/supabase-js@2";
import { sendExpoPush, type PushMessage } from "../_shared/push.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_ADDRESS = "HouseParty <onboarding@resend.dev>";

function marketingEmailHtml(fullName: string, eventTitle: string, city: string, eventId: string) {
  return `
  <div style="background:#0B0B14;padding:32px 16px;font-family:-apple-system,Helvetica,Arial,sans-serif;">
    <div style="max-width:480px;margin:0 auto;background:#15151F;border-radius:16px;padding:32px;color:#F5F5FA;">
      <p style="font-size:13px;letter-spacing:0.05em;color:#FF4D8D;font-weight:700;margin:0 0 8px;">HOUSEPARTY</p>
      <h1 style="font-size:22px;margin:0 0 16px;">Hey ${fullName || "there"} 👋</h1>
      <p style="font-size:16px;line-height:1.5;color:#9B9BAE;margin:0 0 24px;">
        A company you follow just posted a new event: <strong style="color:#F5F5FA;">${eventTitle}</strong> in ${city}.
      </p>
      <a href="houseparty://event/${eventId}" style="display:inline-block;background:#FF4D8D;color:#FFFFFF;
        text-decoration:none;font-weight:700;padding:14px 28px;border-radius:14px;font-size:15px;">
        View event
      </a>
      <p style="font-size:12px;color:#6B6B80;margin-top:32px;">
        You're getting this because you follow this organizer and email notifications are on.
        Manage this anytime from Profile → Notification settings.
      </p>
    </div>
  </div>`;
}

async function sendFollowerEmails(
  targets: { user_id: string; email: string; full_name: string | null }[],
  eventTitle: string,
  city: string,
  eventId: string
) {
  if (!RESEND_API_KEY || targets.length === 0) return { emailsSent: 0 };
  let sent = 0;
  for (const target of targets) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: target.email,
        subject: `New event: ${eventTitle}`,
        html: marketingEmailHtml(target.full_name ?? "", eventTitle, city, eventId),
      }),
    });
    if (response.ok) sent++;
    else console.error(`Resend send failed for ${target.user_id}:`, await response.text());
  }
  return { emailsSent: sent };
}

Deno.serve(async (request) => {
  if (request.headers.get("x-webhook-secret") !== Deno.env.get("BOOKING_WEBHOOK_SECRET")) {
    return new Response("forbidden", { status: 403 });
  }

  const { event_id: eventId } = (await request.json()) as { event_id: string };

  const { data: event } = await supabase
    .from("events")
    .select("id, title, city, category, organization_id")
    .eq("id", eventId)
    .single();
  if (!event) return Response.json({ sent: 0, reason: "event not found" });

  const { data: nearby, error: nearbyError } = await supabase.rpc("find_nearby_users_for_event", {
    p_event_id: eventId,
  });
  if (nearbyError) {
    console.error("find_nearby_users_for_event failed:", nearbyError);
  }

  let followerPush: { user_id: string; expo_push_token: string }[] = [];
  let followerEmails: { user_id: string; email: string; full_name: string | null }[] = [];
  if (event.organization_id) {
    const [pushResult, emailResult] = await Promise.all([
      supabase.rpc("find_org_follower_push_targets", { p_event_id: eventId }),
      supabase.rpc("find_org_follower_email_targets", { p_event_id: eventId }),
    ]);
    if (pushResult.error) console.error("find_org_follower_push_targets failed:", pushResult.error);
    else followerPush = pushResult.data ?? [];
    if (emailResult.error) console.error("find_org_follower_email_targets failed:", emailResult.error);
    else followerEmails = emailResult.data ?? [];
  }

  // Dedupe push tokens: a follower who's also geographically nearby should
  // only get one notification, not two.
  const seenTokens = new Set<string>();
  const pushMessages: PushMessage[] = [];
  for (const r of [...(nearby ?? []), ...followerPush] as { expo_push_token: string }[]) {
    if (seenTokens.has(r.expo_push_token)) continue;
    seenTokens.add(r.expo_push_token);
    pushMessages.push({
      to: r.expo_push_token,
      title: "New party near you 🎉",
      body: `${event.title} — ${event.city}`,
      data: { url: `/event/${event.id}` },
    });
  }

  const [pushResult, emailResult] = await Promise.all([
    sendExpoPush(supabase, pushMessages),
    sendFollowerEmails(followerEmails, event.title, event.city, event.id),
  ]);

  return Response.json({ ...pushResult, ...emailResult, followers: followerPush.length });
});

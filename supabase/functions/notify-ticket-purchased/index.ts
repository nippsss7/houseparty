// Fired by the notify_ticket_purchased_change trigger (migration 0014)
// whenever purchase_ticket issues a new ticket. Emails the ticket holder a
// confirmation with a scannable QR (via a public QR-image API — the QR
// encodes the ticket's raw qr_token, the same value the in-app wallet and
// the host's check-in scanner both work with) and pushes a confirmation too.

import { createClient } from "jsr:@supabase/supabase-js@2";
import { sendExpoPush } from "../_shared/push.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_ADDRESS = "HouseParty <onboarding@resend.dev>";

function qrImageUrl(token: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=12&data=${encodeURIComponent(token)}`;
}

function ticketEmailHtml(params: {
  fullName: string;
  eventTitle: string;
  tierName: string;
  startAt: string;
  city: string;
  qrToken: string;
}) {
  const when = new Date(params.startAt).toLocaleString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  return `
  <div style="background:#0B0B14;padding:32px 16px;font-family:-apple-system,Helvetica,Arial,sans-serif;">
    <div style="max-width:480px;margin:0 auto;background:#15151F;border-radius:16px;padding:32px;color:#F5F5FA;text-align:center;">
      <p style="font-size:13px;letter-spacing:0.05em;color:#FF4D8D;font-weight:700;margin:0 0 8px;">HOUSEPARTY · YOUR TICKET</p>
      <h1 style="font-size:22px;margin:0 0 4px;">${params.eventTitle}</h1>
      <p style="font-size:14px;color:#9B9BAE;margin:0 0 24px;">${params.tierName} · ${when} · ${params.city}</p>
      <div style="background:#FFFFFF;border-radius:12px;padding:16px;display:inline-block;margin-bottom:20px;">
        <img src="${qrImageUrl(params.qrToken)}" width="240" height="240" alt="Ticket QR code" style="display:block;">
      </div>
      <p style="font-size:13px;color:#9B9BAE;margin:0 0 24px;">
        Show this QR code at the door — it's also saved in the app under My Tickets.
      </p>
      <a href="houseparty://" style="display:inline-block;background:#FF4D8D;color:#FFFFFF;
        text-decoration:none;font-weight:700;padding:14px 28px;border-radius:14px;font-size:15px;">
        Open HouseParty
      </a>
    </div>
  </div>`;
}

Deno.serve(async (request) => {
  if (request.headers.get("x-webhook-secret") !== Deno.env.get("BOOKING_WEBHOOK_SECRET")) {
    return new Response("forbidden", { status: 403 });
  }

  const { ticket_id: ticketId } = (await request.json()) as { ticket_id: string };

  const { data: ticket } = await supabase
    .from("tickets")
    .select(
      "id, qr_token, user_id, event:events(title, city, start_at), tier:ticket_tiers(name), profile:profiles!tickets_user_id_fkey(full_name)"
    )
    .eq("id", ticketId)
    .single();
  if (!ticket) return Response.json({ sent: false, reason: "ticket not found" });

  const event = Array.isArray(ticket.event) ? ticket.event[0] : ticket.event;
  const tier = Array.isArray(ticket.tier) ? ticket.tier[0] : ticket.tier;
  const profile = Array.isArray(ticket.profile) ? ticket.profile[0] : ticket.profile;
  if (!event || !tier) return Response.json({ sent: false, reason: "incomplete ticket data" });

  const { data: authUser } = await supabase.auth.admin.getUserById(ticket.user_id);
  const email = authUser?.user?.email;

  let emailSent = false;
  if (RESEND_API_KEY && email) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: email,
        subject: `Your ticket for ${event.title}`,
        html: ticketEmailHtml({
          fullName: profile?.full_name ?? "",
          eventTitle: event.title,
          tierName: tier.name,
          startAt: event.start_at,
          city: event.city,
          qrToken: ticket.qr_token,
        }),
      }),
    });
    emailSent = response.ok;
    if (!response.ok) console.error("Resend ticket email failed:", await response.text());
  }

  const { data: tokens } = await supabase
    .from("device_push_tokens")
    .select("expo_push_token")
    .eq("user_id", ticket.user_id);
  const pushResult = await sendExpoPush(
    supabase,
    (tokens ?? []).map((t) => ({
      to: t.expo_push_token,
      title: "Ticket confirmed 🎟️",
      body: `${event.title} — check My Tickets for your QR code`,
      data: { url: "/(tabs)/bookings" },
    }))
  );

  return Response.json({ emailSent, ...pushResult });
});

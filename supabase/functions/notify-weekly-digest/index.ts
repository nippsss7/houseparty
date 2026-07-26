// Invoked weekly (Sundays, migration 0010) by pg_cron. Emails users who:
// have email notifications on, have a new nearby event to see, and haven't
// opened the app in the last day — so active users aren't emailed on top of
// what they've already seen in-app. Sent via Resend.

import { createClient } from "jsr:@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
// Resend's shared sandbox sender — works with zero setup, but deliverability
// and branding are both better once a real domain is verified in Resend and
// this is swapped for e.g. "HouseParty <hello@yourdomain.com>".
const FROM_ADDRESS = "HouseParty <onboarding@resend.dev>";

function digestEmailHtml(fullName: string, eventCount: number) {
  const plural = eventCount === 1 ? "party" : "parties";
  return `
  <div style="background:#0B0B14;padding:32px 16px;font-family:-apple-system,Helvetica,Arial,sans-serif;">
    <div style="max-width:480px;margin:0 auto;background:#15151F;border-radius:16px;padding:32px;color:#F5F5FA;">
      <p style="font-size:13px;letter-spacing:0.05em;color:#FF4D8D;font-weight:700;margin:0 0 8px;">HOUSEPARTY</p>
      <h1 style="font-size:22px;margin:0 0 16px;">Hey ${fullName || "there"} 👋</h1>
      <p style="font-size:16px;line-height:1.5;color:#9B9BAE;margin:0 0 24px;">
        ${eventCount} new ${plural} popped up near you this week. Open the app to check them out
        before spots fill up.
      </p>
      <a href="houseparty://" style="display:inline-block;background:#FF4D8D;color:#FFFFFF;
        text-decoration:none;font-weight:700;padding:14px 28px;border-radius:14px;font-size:15px;">
        Open HouseParty
      </a>
      <p style="font-size:12px;color:#6B6B80;margin-top:32px;">
        You're getting this because email notifications are on in your HouseParty settings.
        Turn them off anytime from Profile → Notification settings.
      </p>
    </div>
  </div>`;
}

Deno.serve(async (request) => {
  if (request.headers.get("x-webhook-secret") !== Deno.env.get("BOOKING_WEBHOOK_SECRET")) {
    return new Response("forbidden", { status: 403 });
  }
  if (!RESEND_API_KEY) {
    console.error("RESEND_API_KEY not set — skipping weekly digest");
    return Response.json({ sent: 0, reason: "RESEND_API_KEY not configured" });
  }

  const { data: recipients, error } = await supabase.rpc("find_weekly_digest_recipients");
  if (error) {
    console.error("find_weekly_digest_recipients failed:", error);
    return Response.json({ sent: 0, error: error.message }, { status: 500 });
  }
  if (!recipients || recipients.length === 0) return Response.json({ sent: 0 });

  let sent = 0;
  for (const recipient of recipients as {
    user_id: string;
    email: string;
    full_name: string | null;
    new_event_count: number;
  }[]) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: recipient.email,
        subject: `${recipient.new_event_count} new ${recipient.new_event_count === 1 ? "party" : "parties"} near you this week`,
        html: digestEmailHtml(recipient.full_name ?? "", recipient.new_event_count),
      }),
    });
    if (response.ok) {
      sent++;
      await supabase
        .from("notification_log")
        .insert({ user_id: recipient.user_id, type: "weekly_digest", related_id: recipient.user_id });
    } else {
      console.error(`Resend send failed for ${recipient.user_id}:`, await response.text());
    }
  }

  return Response.json({ sent, total: recipients.length });
});

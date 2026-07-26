// Invoked every 15 minutes by pg_cron (migration 0010). Two jobs in one
// function to keep cron/webhook plumbing minimal:
//   1. "Starts soon" reminders to accepted guests, ~2h before an event.
//   2. Nudges to hosts sitting on a pending request for 6+ hours.
// Both are guarded by notification_log so re-running within the same
// window (or a slow cron tick) never double-sends.

import { createClient } from "jsr:@supabase/supabase-js@2";
import { sendExpoPush, type PushMessage } from "../_shared/push.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

async function filterUnsent(type: string, candidates: { booking_id: string; user_id: string }[]) {
  if (candidates.length === 0) return [];
  const { data: alreadySent } = await supabase
    .from("notification_log")
    .select("related_id, user_id")
    .eq("type", type)
    .in(
      "related_id",
      candidates.map((c) => c.booking_id)
    );
  const sentKeys = new Set((alreadySent ?? []).map((r) => `${r.user_id}:${r.related_id}`));
  return candidates.filter((c) => !sentKeys.has(`${c.user_id}:${c.booking_id}`));
}

async function logSent(type: string, rows: { booking_id: string; user_id: string }[]) {
  if (rows.length === 0) return;
  await supabase
    .from("notification_log")
    .insert(rows.map((r) => ({ user_id: r.user_id, type, related_id: r.booking_id })));
}

Deno.serve(async (request) => {
  if (request.headers.get("x-webhook-secret") !== Deno.env.get("BOOKING_WEBHOOK_SECRET")) {
    return new Response("forbidden", { status: 403 });
  }

  const now = new Date();

  // --- Starts-soon reminders: events starting 105-135 min from now (a 30min
  // window centered on "2 hours out", wide enough that a 15-min cron tick
  // can't skip past it). ---
  const from = new Date(now.getTime() + 105 * 60 * 1000).toISOString();
  const to = new Date(now.getTime() + 135 * 60 * 1000).toISOString();
  const { data: upcoming } = await supabase.rpc("find_upcoming_event_starts", {
    p_from: from,
    p_to: to,
  });
  const upcomingCandidates = (upcoming ?? []).map(
    (r: { booking_id: string; user_id: string }) => ({ booking_id: r.booking_id, user_id: r.user_id })
  );
  const dueReminders = await filterUnsent("event_starting_soon", upcomingCandidates);
  const reminderMessages: PushMessage[] = dueReminders.map((r) => {
    const full = (upcoming ?? []).find((u: { booking_id: string }) => u.booking_id === r.booking_id)!;
    return {
      to: full.expo_push_token,
      title: "Starting soon ⏰",
      body: `${full.event_title} starts in about 2 hours`,
      data: { url: `/event/${full.event_id}` },
    };
  });

  // --- Stale pending-request nudges: pending for 6h+. ---
  const staleBefore = new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString();
  const { data: stale } = await supabase.rpc("find_stale_pending_requests", {
    p_older_than: staleBefore,
  });
  const staleCandidates = (stale ?? []).map((r: { booking_id: string; host_id: string }) => ({
    booking_id: r.booking_id,
    user_id: r.host_id,
  }));
  const dueNudges = await filterUnsent("stale_pending_request", staleCandidates);
  const nudgeMessages: PushMessage[] = dueNudges.map((r) => {
    const full = (stale ?? []).find((s: { booking_id: string }) => s.booking_id === r.booking_id)!;
    return {
      to: full.expo_push_token,
      title: "A request is waiting 📩",
      body: `Someone's still waiting to hear back about "${full.event_title}"`,
      data: { url: `/host/${full.event_id}` },
    };
  });

  const result = await sendExpoPush(supabase, [...reminderMessages, ...nudgeMessages]);
  await logSent("event_starting_soon", dueReminders);
  await logSent("stale_pending_request", dueNudges);

  return Response.json({
    ...result,
    reminders: dueReminders.length,
    nudges: dueNudges.length,
  });
});

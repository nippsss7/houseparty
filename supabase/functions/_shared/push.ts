// Shared Expo push sender + stale-token pruning, used by every
// notify-* Edge Function so the batching/error-handling logic lives once.
import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";

export interface PushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

/** Expo caps a single push request at 100 messages. */
function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

export async function sendExpoPush(supabase: SupabaseClient, messages: PushMessage[]) {
  if (messages.length === 0) return { sent: 0, pruned: 0 };

  let sent = 0;
  const stale: string[] = [];

  for (const batch of chunk(messages, 100)) {
    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(batch.map((m) => ({ ...m, sound: "default" }))),
    });
    const result = await response.json();
    const tickets = Array.isArray(result?.data) ? result.data : [];
    tickets.forEach((ticket: { status: string; details?: { error?: string } }, index: number) => {
      if (ticket.status === "error" && ticket.details?.error === "DeviceNotRegistered") {
        stale.push(batch[index].to);
      } else if (ticket.status !== "error") {
        sent++;
      }
    });
  }

  if (stale.length > 0) {
    await supabase.from("device_push_tokens").delete().in("expo_push_token", stale);
  }

  return { sent, pruned: stale.length };
}

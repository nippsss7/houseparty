import { supabase } from "@/services/supabase";
import type { Database } from "@/types/database.types";

export type ReportReason = Database["public"]["Tables"]["reports"]["Row"]["reason"];

export const REPORT_REASON_OPTIONS: { value: ReportReason; label: string }[] = [
  { value: "spam", label: "Spam" },
  { value: "inappropriate_content", label: "Inappropriate content" },
  { value: "harassment", label: "Harassment or abuse" },
  { value: "safety_concern", label: "Safety concern" },
  { value: "fake_listing", label: "Fake or misleading listing" },
  { value: "other", label: "Something else" },
];

export async function submitReport(params: {
  reportedUserId?: string;
  reportedEventId?: string;
  reason: ReportReason;
  details?: string;
}) {
  const { error } = await supabase.from("reports").insert({
    reporter_id: (await supabase.auth.getUser()).data.user!.id,
    reported_user_id: params.reportedUserId ?? null,
    reported_event_id: params.reportedEventId ?? null,
    reason: params.reason,
    details: params.details || null,
  });
  if (error) throw error;
}

export async function blockUser(blockedId: string) {
  const { error } = await supabase
    .from("user_blocks")
    .insert({ blocker_id: (await supabase.auth.getUser()).data.user!.id, blocked_id: blockedId });
  if (error) throw error;
}

export async function unblockUser(blockedId: string) {
  const { error } = await supabase.from("user_blocks").delete().eq("blocked_id", blockedId);
  if (error) throw error;
}

export async function fetchBlockedUsers() {
  const { data, error } = await supabase
    .from("user_blocks")
    .select("blocked_id, created_at, blocked:profiles!user_blocks_blocked_id_fkey(id, full_name, username, avatar_url)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

/** Open reports for the admin queue, with reporter + target context. */
export async function fetchOpenReports() {
  const { data, error } = await supabase
    .from("reports")
    .select(
      "*, reporter:profiles!reports_reporter_id_fkey(full_name, username), reported_user:profiles!reports_reported_user_id_fkey(full_name, username), reported_event:events!reports_reported_event_id_fkey(title)"
    )
    .eq("status", "open")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

export async function resolveReport(reportId: string, status: "resolved" | "dismissed") {
  const { error } = await supabase
    .from("reports")
    .update({ status, reviewed_at: new Date().toISOString() })
    .eq("id", reportId);
  if (error) throw error;
}

export type BlockedUser = Awaited<ReturnType<typeof fetchBlockedUsers>>[number];
export type OpenReport = Awaited<ReturnType<typeof fetchOpenReports>>[number];

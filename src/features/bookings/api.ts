import { supabase } from "@/services/supabase";
import type { Database } from "@/types/database.types";

export type BookingRequestRow = Database["public"]["Tables"]["booking_requests"]["Row"];

const GUEST_REQUEST_SELECT =
  "*, event:events!booking_requests_event_id_fkey(id, title, city, start_at, end_at, price_per_person, capacity, current_rsvp_count, status)";
const HOST_REQUEST_SELECT =
  "*, event:events!booking_requests_event_id_fkey(id, title, start_at, capacity, current_rsvp_count), guest:profiles!booking_requests_guest_id_fkey(id, full_name, username, avatar_url, guest_rating_avg, guest_rating_count)";

export async function requestToJoin(params: {
  eventId: string;
  partySize: number;
  message?: string;
}) {
  const { data, error } = await supabase.rpc("request_to_join", {
    p_event_id: params.eventId,
    p_party_size: params.partySize,
    p_message: params.message ?? undefined,
  });
  if (error) throw error;
  return data;
}

export async function cancelBookingRequest(requestId: string) {
  const { data, error } = await supabase.rpc("cancel_booking_request", {
    p_request_id: requestId,
  });
  if (error) throw error;
  return data;
}

export async function respondToBooking(requestId: string, accept: boolean) {
  const { data, error } = await supabase.rpc("respond_to_booking", {
    p_request_id: requestId,
    p_accept: accept,
  });
  if (error) throw error;
  return data;
}

/** The signed-in guest's requests, newest first, with event summaries. */
export async function fetchMyRequests(userId: string) {
  const { data, error } = await supabase
    .from("booking_requests")
    .select(GUEST_REQUEST_SELECT)
    .eq("guest_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

/** Requests for events the signed-in user hosts, pending first. */
export async function fetchHostRequests(userId: string) {
  const { data, error } = await supabase
    .from("booking_requests")
    .select(HOST_REQUEST_SELECT)
    .eq("host_id", userId)
    .in("status", ["pending", "accepted"])
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

/** The guest's live (pending/accepted) request for one event, if any. */
export async function fetchMyRequestForEvent(userId: string, eventId: string) {
  const { data, error } = await supabase
    .from("booking_requests")
    .select("*")
    .eq("guest_id", userId)
    .eq("event_id", eventId)
    .in("status", ["pending", "accepted"])
    .maybeSingle();
  if (error) throw error;
  return data;
}

export type MyRequest = Awaited<ReturnType<typeof fetchMyRequests>>[number];
export type HostRequest = Awaited<ReturnType<typeof fetchHostRequests>>[number];

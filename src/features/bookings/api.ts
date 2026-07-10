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

/** Events the user hosts, newest start first, with request-status tallies. */
export async function fetchMyHostedEvents(userId: string) {
  const { data, error } = await supabase
    .from("events")
    .select("id, title, city, start_at, end_at, capacity, current_rsvp_count, status, requests:booking_requests(status)")
    .eq("host_id", userId)
    .order("start_at", { ascending: false });
  if (error) throw error;
  return data.map((event) => ({
    ...event,
    pendingCount: event.requests.filter((r) => r.status === "pending").length,
    acceptedCount: event.requests.filter((r) => r.status === "accepted").length,
  }));
}

/** All requests for one hosted event, pending first, with guest summaries. */
export async function fetchRequestsForEvent(eventId: string) {
  const { data, error } = await supabase
    .from("booking_requests")
    .select(
      "*, guest:profiles!booking_requests_guest_id_fkey(id, full_name, username, avatar_url, guest_rating_avg, guest_rating_count)"
    )
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  const order = { pending: 0, accepted: 1, declined: 2, cancelled: 3 } as Record<string, number>;
  return data.sort((a, b) => (order[a.status] ?? 9) - (order[b.status] ?? 9));
}

/** One request with the full guest profile, for the host's review screen. */
export async function fetchRequestDetail(requestId: string) {
  const { data, error } = await supabase
    .from("booking_requests")
    .select(
      "*, guest:profiles!booking_requests_guest_id_fkey(id, full_name, username, avatar_url, bio, guest_rating_avg, guest_rating_count, verification_status, created_at), event:events!booking_requests_event_id_fkey(id, title, capacity, current_rsvp_count, start_at, end_at)"
    )
    .eq("id", requestId)
    .single();
  if (error) throw error;
  return data;
}

export type MyRequest = Awaited<ReturnType<typeof fetchMyRequests>>[number];
export type HostRequest = Awaited<ReturnType<typeof fetchHostRequests>>[number];
export type HostedEvent = Awaited<ReturnType<typeof fetchMyHostedEvents>>[number];
export type EventRequest = Awaited<ReturnType<typeof fetchRequestsForEvent>>[number];
export type RequestDetail = Awaited<ReturnType<typeof fetchRequestDetail>>;

import { supabase } from "@/services/supabase";
import type { Database } from "@/types/database.types";

export type ReviewRow = Database["public"]["Tables"]["reviews"]["Row"];

export async function submitReview(params: {
  bookingId: string;
  rating: number;
  comment?: string;
}) {
  const { data, error } = await supabase.rpc("submit_review", {
    p_booking_id: params.bookingId,
    p_rating: params.rating,
    p_comment: params.comment ?? undefined,
  });
  if (error) throw error;
  return data;
}

/** The signed-in user's own review on a booking, if they already left one. */
export async function fetchMyReviewForBooking(userId: string, bookingId: string) {
  const { data, error } = await supabase
    .from("reviews")
    .select("*")
    .eq("booking_id", bookingId)
    .eq("reviewer_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** Reviews received by a user, newest first, with reviewer + event context. */
export async function fetchReviewsForUser(userId: string) {
  const { data, error } = await supabase
    .from("reviews")
    .select(
      "*, reviewer:profiles!reviews_reviewer_id_fkey(id, full_name, username, avatar_url), event:events!reviews_event_id_fkey(id, title)"
    )
    .eq("reviewee_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return data;
}

export type ReceivedReview = Awaited<ReturnType<typeof fetchReviewsForUser>>[number];

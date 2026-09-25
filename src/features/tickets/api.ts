import { supabase } from "@/services/supabase";
import type { Database } from "@/types/database.types";

export type TicketTierRow = Database["public"]["Tables"]["ticket_tiers"]["Row"];
export type TicketRow = Database["public"]["Tables"]["tickets"]["Row"];

export async function createTicketTier(params: {
  eventId: string;
  name: string;
  price: number;
  quantityTotal: number;
  position: number;
}) {
  const { data, error } = await supabase
    .from("ticket_tiers")
    .insert({
      event_id: params.eventId,
      name: params.name,
      price: params.price,
      quantity_total: params.quantityTotal,
      position: params.position,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function fetchTicketTiers(eventId: string) {
  const { data, error } = await supabase
    .from("ticket_tiers")
    .select("*")
    .eq("event_id", eventId)
    .order("position", { ascending: true });
  if (error) throw error;
  return data;
}

export async function purchaseTicket(tierId: string) {
  const { data, error } = await supabase.rpc("purchase_ticket", { p_tier_id: tierId });
  if (error) throw error;
  return data;
}

export async function cancelTicket(ticketId: string) {
  const { data, error } = await supabase.rpc("cancel_ticket", { p_ticket_id: ticketId });
  if (error) throw error;
  return data;
}

export type CheckInResult = Database["public"]["Functions"]["check_in_ticket"]["Returns"][number];

export async function checkInTicket(qrToken: string): Promise<CheckInResult | null> {
  const { data, error } = await supabase.rpc("check_in_ticket", { p_qr_token: qrToken });
  if (error) throw error;
  return data?.[0] ?? null;
}

/** The signed-in user's tickets, upcoming first, with event + tier context. */
export async function fetchMyTickets(userId: string) {
  const { data, error } = await supabase
    .from("tickets")
    .select(
      "*, event:events!tickets_event_id_fkey(id, title, city, start_at, end_at, address), tier:ticket_tiers!tickets_tier_id_fkey(name)"
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

/** All tickets sold for one of the host's events — the door list. */
export async function fetchEventTickets(eventId: string) {
  const { data, error } = await supabase
    .from("tickets")
    .select(
      "*, guest:profiles!tickets_user_id_fkey(full_name, avatar_url), tier:ticket_tiers!tickets_tier_id_fkey(name)"
    )
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export type MyTicket = Awaited<ReturnType<typeof fetchMyTickets>>[number];
export type EventTicket = Awaited<ReturnType<typeof fetchEventTickets>>[number];

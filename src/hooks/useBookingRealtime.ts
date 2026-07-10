import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { supabase } from "@/services/supabase";

/**
 * Live-refreshes booking data while mounted: any change to a request where I
 * am the guest or the host invalidates the booking/event queries, so inboxes,
 * statuses and spot counts update without pull-to-refresh.
 */
export function useBookingRealtime(userId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    const invalidate = () => {
      queryClient.invalidateQueries({ queryKey: ["my-requests"] });
      queryClient.invalidateQueries({ queryKey: ["host-requests"] });
      queryClient.invalidateQueries({ queryKey: ["my-request-for-event"] });
      queryClient.invalidateQueries({ queryKey: ["event"] });
      queryClient.invalidateQueries({ queryKey: ["nearby-events"] });
    };

    // Unique name per mount: multiple screens use this hook concurrently, and
    // supabase.channel() returns the same instance for a reused name — adding
    // callbacks to an already-subscribed channel throws.
    const channel = supabase
      .channel(`bookings-${userId}-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "booking_requests", filter: `guest_id=eq.${userId}` },
        invalidate
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "booking_requests", filter: `host_id=eq.${userId}` },
        invalidate
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);
}

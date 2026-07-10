import { useQuery } from "@tanstack/react-query";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { FlatList, Image, Pressable, StyleSheet, Text, View } from "react-native";

import { fetchRequestsForEvent, type EventRequest } from "@/features/bookings/api";
import { fetchEvent } from "@/features/events/api";
import { useAuth } from "@/hooks/useAuth";
import { BOOKING_STATUS_LABELS } from "@/features/bookings/status";
import { useBookingRealtime } from "@/hooks/useBookingRealtime";
import { colors, radii, spacing, typography } from "@/lib/theme";
import type { BookingStatus } from "@/types/domain";

export default function EventRequestsScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const router = useRouter();
  const { session } = useAuth();
  useBookingRealtime(session?.user.id);

  const { data: event } = useQuery({
    queryKey: ["event", eventId],
    queryFn: () => fetchEvent(eventId),
    enabled: !!eventId,
  });

  const { data: requests = [], isPending } = useQuery({
    queryKey: ["host-requests", "event", eventId],
    queryFn: () => fetchRequestsForEvent(eventId),
    enabled: !!eventId,
  });

  return (
    <>
      <Stack.Screen options={{ title: event?.title ?? "Requests" }} />
      <View style={styles.container}>
        {event && (
          <Text style={styles.summary}>
            {event.current_rsvp_count}/{event.capacity} spots filled ·{" "}
            {requests.filter((r) => r.status === "pending").length} pending
          </Text>
        )}
        {!isPending && requests.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>📭</Text>
            <Text style={typography.heading}>No requests yet</Text>
            <Text style={styles.emptyBody}>
              When someone asks to join this event, they'll appear here.
            </Text>
          </View>
        ) : (
          <FlatList
            data={requests}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }: { item: EventRequest }) => {
              const status = BOOKING_STATUS_LABELS[item.status as BookingStatus];
              return (
                <Pressable
                  style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
                  onPress={() => router.push(`/host/request/${item.id}`)}
                >
                  {item.guest?.avatar_url ? (
                    <Image source={{ uri: item.guest.avatar_url }} style={styles.avatar} />
                  ) : (
                    <View style={[styles.avatar, styles.avatarFallback]}>
                      <Text style={styles.avatarInitial}>
                        {(item.guest?.full_name ?? "?").slice(0, 1).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <View style={styles.cardBody}>
                    <Text style={typography.body} numberOfLines={1}>
                      {item.guest?.full_name ?? "Guest"}
                    </Text>
                    <Text style={styles.cardMeta} numberOfLines={1}>
                      Party of {item.party_size}
                      {item.message ? ` · “${item.message}”` : ""}
                    </Text>
                  </View>
                  <Text style={[styles.statusChip, { color: status.color }]}>{status.label}</Text>
                </Pressable>
              );
            }}
          />
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  summary: {
    ...typography.caption,
    color: colors.textMuted,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  listContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: spacing.sm },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  cardPressed: { opacity: 0.8 },
  cardBody: { flex: 1 },
  cardMeta: { ...typography.caption, color: colors.textMuted },
  statusChip: { ...typography.label },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarFallback: {
    backgroundColor: colors.primaryMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: { ...typography.body, color: colors.primary, fontWeight: "700" },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  emptyEmoji: { fontSize: 48 },
  emptyBody: { ...typography.body, color: colors.textMuted, textAlign: "center" },
});

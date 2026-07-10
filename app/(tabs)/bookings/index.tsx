import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import {
  cancelBookingRequest,
  fetchMyHostedEvents,
  fetchMyRequests,
  type HostedEvent,
  type MyRequest,
} from "@/features/bookings/api";
import { useAuth } from "@/hooks/useAuth";
import { BOOKING_STATUS_LABELS } from "@/features/bookings/status";
import { useBookingRealtime } from "@/hooks/useBookingRealtime";
import { colors, radii, spacing, typography } from "@/lib/theme";
import type { BookingStatus } from "@/types/domain";

type Mode = "guest" | "host";

export default function BookingsScreen() {
  const { session } = useAuth();
  const [mode, setMode] = useState<Mode>("guest");
  useBookingRealtime(session?.user.id);

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <Text style={typography.title}>My Events</Text>
        <View style={styles.segments}>
          <Segment label="My requests" active={mode === "guest"} onPress={() => setMode("guest")} />
          <Segment label="Hosting" active={mode === "host"} onPress={() => setMode("host")} />
        </View>
      </View>
      {mode === "guest" ? <GuestList userId={session?.user.id} /> : <HostList userId={session?.user.id} />}
    </Screen>
  );
}

function Segment({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.segment, active && styles.segmentActive]} onPress={onPress}>
      <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{label}</Text>
    </Pressable>
  );
}

function GuestList({ userId }: { userId?: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: requests = [], isPending } = useQuery({
    queryKey: ["my-requests", userId],
    queryFn: () => fetchMyRequests(userId!),
    enabled: !!userId,
  });

  const cancel = useMutation({
    mutationFn: (requestId: string) => cancelBookingRequest(requestId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["my-requests"] }),
  });

  if (!isPending && requests.length === 0) {
    return (
      <EmptyState
        emoji="🎟️"
        title="No requests yet"
        body="Find a party on the map and request a spot — your requests will show up here."
      />
    );
  }

  return (
    <FlatList
      data={requests}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContent}
      renderItem={({ item }: { item: MyRequest }) => {
        const status = BOOKING_STATUS_LABELS[item.status as BookingStatus];
        const startAt = item.event ? new Date(item.event.start_at) : null;
        const eventEnded = item.event ? new Date(item.event.end_at) < new Date() : false;
        const reviewable = item.status === "accepted" && eventEnded;
        const cancellable = (item.status === "pending" || item.status === "accepted") && !eventEnded;
        return (
          <Pressable
            style={styles.card}
            onPress={() => item.event && router.push(`/event/${item.event.id}`)}
          >
            <View style={styles.cardHeader}>
              <Text style={typography.heading} numberOfLines={1}>
                {item.event?.title ?? "Event"}
              </Text>
              <Text style={[styles.statusChip, { color: status.color }]}>{status.label}</Text>
            </View>
            <Text style={styles.cardMeta}>
              {item.event?.city}
              {startAt
                ? ` · ${startAt.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}`
                : ""}
              {` · party of ${item.party_size}`}
            </Text>
            {cancellable && (
              <Button
                label="Cancel"
                variant="secondary"
                onPress={() => cancel.mutate(item.id)}
                loading={cancel.isPending && cancel.variables === item.id}
              />
            )}
            {reviewable && (
              <Button
                label="Review the host"
                variant="secondary"
                onPress={() => router.push(`/review/${item.id}`)}
              />
            )}
          </Pressable>
        );
      }}
    />
  );
}

function HostList({ userId }: { userId?: string }) {
  const router = useRouter();

  const { data: events = [], isPending } = useQuery({
    queryKey: ["host-requests", userId],
    queryFn: () => fetchMyHostedEvents(userId!),
    enabled: !!userId,
  });

  if (!isPending && events.length === 0) {
    return (
      <EmptyState
        emoji="🏠"
        title="You're not hosting yet"
        body="Post an event from the Create tab — it will show up here with its guest requests."
      />
    );
  }

  return (
    <FlatList
      data={events}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContent}
      renderItem={({ item }: { item: HostedEvent }) => {
        const startAt = new Date(item.start_at);
        const isPast = new Date(item.end_at) < new Date();
        return (
          <Pressable style={styles.card} onPress={() => router.push(`/event/${item.id}`)}>
            <View style={styles.cardHeader}>
              <Text style={typography.heading} numberOfLines={1}>
                {item.title}
              </Text>
              {item.pendingCount > 0 && (
                <View style={styles.pendingBadge}>
                  <Text style={styles.pendingBadgeText}>{item.pendingCount}</Text>
                </View>
              )}
            </View>
            <Text style={styles.cardMeta}>
              {item.city} ·{" "}
              {startAt.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
              {isPast ? " · ended" : ""}
            </Text>
            <Text style={styles.cardMeta}>
              {item.current_rsvp_count}/{item.capacity} spots filled
              {item.pendingCount > 0
                ? ` · ${item.pendingCount} pending ${item.pendingCount === 1 ? "request" : "requests"}`
                : " · no pending requests"}
            </Text>
          </Pressable>
        );
      }}
    />
  );
}

function EmptyState({ emoji, title, body }: { emoji: string; title: string; body: string }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyEmoji}>{emoji}</Text>
      <Text style={typography.heading}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, gap: spacing.md },
  segments: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 3,
    marginBottom: spacing.sm,
  },
  segment: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
    alignItems: "center",
  },
  segmentActive: { backgroundColor: colors.primaryMuted },
  segmentText: { ...typography.label, color: colors.textMuted },
  segmentTextActive: { color: colors.text },
  listContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: spacing.md },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing.sm },
  cardMeta: { ...typography.caption, color: colors.textMuted },
  statusChip: { ...typography.label },
  pendingBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  pendingBadgeText: { color: colors.white, fontSize: 13, fontWeight: "700" },
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

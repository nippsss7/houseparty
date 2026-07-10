import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import { FlatList, Image, Pressable, StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import {
  cancelBookingRequest,
  fetchHostRequests,
  fetchMyRequests,
  respondToBooking,
  type HostRequest,
  type MyRequest,
} from "@/features/bookings/api";
import { useAuth } from "@/hooks/useAuth";
import { useBookingRealtime } from "@/hooks/useBookingRealtime";
import { colors, radii, spacing, typography } from "@/lib/theme";
import type { BookingStatus } from "@/types/domain";

type Mode = "guest" | "host";

const STATUS_LABELS: Record<BookingStatus, { label: string; color: string }> = {
  pending: { label: "Pending", color: colors.warning },
  accepted: { label: "Accepted", color: colors.success },
  declined: { label: "Declined", color: colors.danger },
  cancelled: { label: "Cancelled", color: colors.textFaint },
};

export default function BookingsScreen() {
  const { session } = useAuth();
  const [mode, setMode] = useState<Mode>("guest");
  useBookingRealtime(session?.user.id);

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <Text style={typography.title}>Bookings</Text>
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
        const status = STATUS_LABELS[item.status as BookingStatus];
        const startAt = item.event ? new Date(item.event.start_at) : null;
        const cancellable = item.status === "pending" || item.status === "accepted";
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
          </Pressable>
        );
      }}
    />
  );
}

function HostList({ userId }: { userId?: string }) {
  const queryClient = useQueryClient();

  const { data: requests = [], isPending } = useQuery({
    queryKey: ["host-requests", userId],
    queryFn: () => fetchHostRequests(userId!),
    enabled: !!userId,
  });

  const respond = useMutation({
    mutationFn: ({ requestId, accept }: { requestId: string; accept: boolean }) =>
      respondToBooking(requestId, accept),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["host-requests"] });
      queryClient.invalidateQueries({ queryKey: ["event"] });
    },
  });

  if (!isPending && requests.length === 0) {
    return (
      <EmptyState
        emoji="📭"
        title="No requests to review"
        body="When guests ask to join your events, you'll accept or decline them here."
      />
    );
  }

  return (
    <FlatList
      data={requests}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContent}
      renderItem={({ item }: { item: HostRequest }) => {
        const pending = item.status === "pending";
        const status = STATUS_LABELS[item.status as BookingStatus];
        const spotsLeft = item.event ? item.event.capacity - item.event.current_rsvp_count : 0;
        return (
          <View style={styles.card}>
            <View style={styles.guestRow}>
              {item.guest?.avatar_url ? (
                <Image source={{ uri: item.guest.avatar_url }} style={styles.guestAvatar} />
              ) : (
                <View style={[styles.guestAvatar, styles.guestAvatarFallback]}>
                  <Text style={styles.guestAvatarInitial}>
                    {(item.guest?.full_name ?? "?").slice(0, 1).toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={styles.guestInfo}>
                <Text style={typography.body} numberOfLines={1}>
                  {item.guest?.full_name ?? "Guest"}
                </Text>
                <Text style={styles.cardMeta} numberOfLines={1}>
                  {item.event?.title} · party of {item.party_size}
                </Text>
              </View>
              {!pending && (
                <Text style={[styles.statusChip, { color: status.color }]}>{status.label}</Text>
              )}
            </View>
            {!!item.message && <Text style={styles.guestMessage}>“{item.message}”</Text>}
            {pending && (
              <View style={styles.actions}>
                <View style={styles.actionButton}>
                  <Button
                    label="Decline"
                    variant="secondary"
                    onPress={() => respond.mutate({ requestId: item.id, accept: false })}
                    loading={respond.isPending && respond.variables?.requestId === item.id && !respond.variables.accept}
                  />
                </View>
                <View style={styles.actionButton}>
                  <Button
                    label={spotsLeft >= item.party_size ? "Accept" : "No room"}
                    onPress={() => respond.mutate({ requestId: item.id, accept: true })}
                    disabled={spotsLeft < item.party_size}
                    loading={respond.isPending && respond.variables?.requestId === item.id && respond.variables.accept}
                  />
                </View>
              </View>
            )}
          </View>
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
  cardHeader: { flexDirection: "row", justifyContent: "space-between", gap: spacing.sm },
  cardMeta: { ...typography.caption, color: colors.textMuted },
  statusChip: { ...typography.label },
  guestRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  guestAvatar: { width: 40, height: 40, borderRadius: 20 },
  guestAvatarFallback: {
    backgroundColor: colors.primaryMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  guestAvatarInitial: { ...typography.body, color: colors.primary, fontWeight: "700" },
  guestInfo: { flex: 1 },
  guestMessage: { ...typography.body, color: colors.textMuted, fontStyle: "italic" },
  actions: { flexDirection: "row", gap: spacing.sm },
  actionButton: { flex: 1 },
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

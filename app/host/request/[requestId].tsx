import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/Button";
import { fetchRequestDetail, respondToBooking } from "@/features/bookings/api";
import { useAuth } from "@/hooks/useAuth";
import { BOOKING_STATUS_LABELS } from "@/features/bookings/status";
import { useBookingRealtime } from "@/hooks/useBookingRealtime";
import { colors, radii, spacing, typography } from "@/lib/theme";
import type { BookingStatus } from "@/types/domain";

export default function RequestDetailScreen() {
  const { requestId } = useLocalSearchParams<{ requestId: string }>();
  const router = useRouter();
  const { session } = useAuth();
  const queryClient = useQueryClient();
  useBookingRealtime(session?.user.id);

  const { data: request, isPending } = useQuery({
    queryKey: ["host-requests", "detail", requestId],
    queryFn: () => fetchRequestDetail(requestId),
    enabled: !!requestId,
  });

  const respond = useMutation({
    mutationFn: (accept: boolean) => respondToBooking(requestId, accept),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["host-requests"] });
      queryClient.invalidateQueries({ queryKey: ["event"] });
    },
  });

  if (isPending || !request) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const guest = request.guest;
  const status = BOOKING_STATUS_LABELS[request.status as BookingStatus];
  const spotsLeft = request.event
    ? request.event.capacity - request.event.current_rsvp_count
    : 0;
  const memberSince = guest?.created_at
    ? new Date(guest.created_at).toLocaleDateString(undefined, { month: "long", year: "numeric" })
    : null;

  return (
    <>
      <Stack.Screen options={{ title: "Request" }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.profileCard}>
          {guest?.avatar_url ? (
            <Image source={{ uri: guest.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Text style={styles.avatarInitial}>
                {(guest?.full_name ?? "?").slice(0, 1).toUpperCase()}
              </Text>
            </View>
          )}
          <Text style={typography.title}>{guest?.full_name ?? "Guest"}</Text>
          {!!guest?.username && <Text style={styles.username}>@{guest.username}</Text>}
          <View style={styles.badges}>
            {guest?.verification_status === "verified" && (
              <Text style={styles.verifiedBadge}>✓ ID verified</Text>
            )}
            <Text style={styles.ratingBadge}>
              {guest?.guest_rating_count
                ? `★ ${Number(guest.guest_rating_avg).toFixed(1)} · ${guest.guest_rating_count} reviews`
                : "No guest reviews yet"}
            </Text>
          </View>
          {!!memberSince && <Text style={styles.memberSince}>Member since {memberSince}</Text>}
          {!!guest?.bio && <Text style={styles.bio}>{guest.bio}</Text>}
        </View>

        <View style={styles.requestCard}>
          <Row label="Event">{request.event?.title ?? "—"}</Row>
          <Row label="Party size">{`${request.party_size} ${request.party_size === 1 ? "person" : "people"}`}</Row>
          <Row label="Requested">
            {new Date(request.created_at).toLocaleDateString(undefined, {
              weekday: "short",
              month: "short",
              day: "numeric",
            })}
          </Row>
          <Row label="Status">
            <Text style={{ color: status.color }}>{status.label}</Text>
          </Row>
          {!!request.message && (
            <View style={styles.messageBox}>
              <Text style={styles.messageLabel}>Message</Text>
              <Text style={styles.message}>“{request.message}”</Text>
            </View>
          )}
        </View>

        {respond.error && (
          <Text style={styles.error}>
            {respond.error instanceof Error ? respond.error.message : "Something went wrong"}
          </Text>
        )}

        {request.status === "pending" && (
          <View style={styles.actions}>
            <View style={styles.actionButton}>
              <Button
                label="Decline"
                variant="secondary"
                onPress={() => respond.mutate(false)}
                loading={respond.isPending && respond.variables === false}
              />
            </View>
            <View style={styles.actionButton}>
              <Button
                label={spotsLeft >= request.party_size ? "Accept" : "No room left"}
                onPress={() => respond.mutate(true)}
                disabled={spotsLeft < request.party_size}
                loading={respond.isPending && respond.variables === true}
              />
            </View>
          </View>
        )}
        {request.status === "accepted" &&
          !!request.event?.end_at &&
          new Date(request.event.end_at) < new Date() && (
            <Button
              label="Review this guest"
              variant="secondary"
              onPress={() => router.push(`/review/${request.id}`)}
            />
          )}
      </ScrollView>
    </>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  profileCard: {
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  avatar: { width: 88, height: 88, borderRadius: 44, marginBottom: spacing.sm },
  avatarFallback: {
    backgroundColor: colors.primaryMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: { fontSize: 36, fontWeight: "700", color: colors.primary },
  username: { ...typography.caption, color: colors.textMuted },
  badges: { flexDirection: "row", gap: spacing.md, marginTop: spacing.xs },
  verifiedBadge: { ...typography.label, color: colors.success },
  ratingBadge: { ...typography.label, color: colors.textMuted },
  memberSince: { ...typography.caption, color: colors.textFaint },
  bio: { ...typography.body, color: colors.textMuted, textAlign: "center", marginTop: spacing.sm },
  requestCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  row: { flexDirection: "row", gap: spacing.md },
  rowLabel: { ...typography.label, width: 88 },
  rowValue: { ...typography.body, flex: 1 },
  messageBox: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.sm,
    padding: spacing.md,
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
  messageLabel: { ...typography.label },
  message: { ...typography.body, color: colors.textMuted, fontStyle: "italic" },
  error: { fontSize: 13, color: colors.danger },
  actions: { flexDirection: "row", gap: spacing.sm },
  actionButton: { flex: 1 },
});

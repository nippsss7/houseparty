import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { Button } from "@/components/Button";
import { FullScreenState } from "@/components/FullScreenState";
import {
  cancelBookingRequest,
  fetchMyRequestForEvent,
  fetchRequestsForEvent,
  requestToJoin,
} from "@/features/bookings/api";
import { eventPhotoUrl, fetchEvent } from "@/features/events/api";
import { cancellationPolicyOptions, eventCategoryOptions } from "@/features/events/schemas";
import { showSafetyMenu } from "@/features/safety/actions";
import { useAuth } from "@/hooks/useAuth";
import { useBookingRealtime } from "@/hooks/useBookingRealtime";
import { colors, radii, spacing, typography } from "@/lib/theme";

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session, isVerified } = useAuth();
  useBookingRealtime(session?.user.id);

  const {
    data: event,
    isPending,
    error,
    refetch,
  } = useQuery({
    queryKey: ["event", id],
    queryFn: () => fetchEvent(id),
    enabled: !!id,
  });

  const { data: myRequest } = useQuery({
    queryKey: ["my-request-for-event", id, session?.user.id],
    queryFn: () => fetchMyRequestForEvent(session!.user.id, id),
    enabled: !!id && !!session,
  });

  const isHost = !!event && !!session && event.host_id === session.user.id;
  const { data: hostRequests = [] } = useQuery({
    queryKey: ["host-requests", "event", id],
    queryFn: () => fetchRequestsForEvent(id),
    enabled: isHost,
  });
  const pendingCount = hostRequests.filter((r) => r.status === "pending").length;

  if (isPending) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (error || !event) {
    // PGRST116 = PostgREST's "no rows" code from .single() — a real 404, not
    // a network hiccup, so no retry button makes sense for it.
    const notFound = (error as { code?: string } | null)?.code === "PGRST116";
    return (
      <FullScreenState
        emoji={notFound ? "🔍" : "📡"}
        title={notFound ? "Event not found" : "Couldn't load this event"}
        body={notFound ? "It may have been removed or the link is wrong." : "Check your connection and try again."}
        actionLabel={notFound ? undefined : "Retry"}
        onAction={notFound ? undefined : () => refetch()}
      />
    );
  }

  const photos = [...(event.photos ?? [])].sort((a, b) => a.position - b.position);
  const categoryLabel =
    eventCategoryOptions.find((option) => option.value === event.category)?.label ?? event.category;
  const policy = cancellationPolicyOptions.find((option) => option.value === event.cancellation_policy);
  const startAt = new Date(event.start_at);
  const endAt = new Date(event.end_at);
  const isOwnEvent = event.host_id === session?.user.id;
  const spotsLeft = event.capacity - event.current_rsvp_count;
  const addressRevealed = isOwnEvent || myRequest?.status === "accepted";

  const onOpenSafetyMenu = () => {
    if (!event.host) return;
    showSafetyMenu(
      router,
      {
        userId: event.host.id,
        userName: event.host.full_name ?? "this host",
        eventId: event.id,
        eventTitle: event.title,
      },
      () => router.back()
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: event.title,
          headerRight: isOwnEvent
            ? undefined
            : () => (
                <Pressable onPress={onOpenSafetyMenu} hitSlop={8} style={styles.headerMenuButton}>
                  <Text style={styles.headerMenuDots}>•••</Text>
                </Pressable>
              ),
        }}
      />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {photos.length > 0 ? (
          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={styles.gallery}>
            {photos.map((photo) => (
              <Image
                key={photo.id}
                source={{ uri: eventPhotoUrl(photo.storage_path) }}
                style={styles.galleryImage}
              />
            ))}
          </ScrollView>
        ) : (
          <View style={[styles.gallery, styles.galleryFallback]}>
            <Text style={styles.galleryEmoji}>🎉</Text>
          </View>
        )}

        <View style={styles.body}>
          <Text style={styles.category}>{categoryLabel.toUpperCase()}</Text>
          <Text style={typography.title}>{event.title}</Text>

          <View style={styles.hostRow}>
            {event.host?.avatar_url ? (
              <Image source={{ uri: event.host.avatar_url }} style={styles.hostAvatar} />
            ) : (
              <View style={[styles.hostAvatar, styles.hostAvatarFallback]}>
                <Text style={styles.hostAvatarInitial}>
                  {(event.host?.full_name ?? "?").slice(0, 1).toUpperCase()}
                </Text>
              </View>
            )}
            <View>
              <Text style={typography.body}>Hosted by {event.host?.full_name ?? "a member"}</Text>
              <Text style={styles.hostMeta}>
                {event.host?.host_rating_count
                  ? `★ ${Number(event.host.host_rating_avg).toFixed(1)} · ${event.host.host_rating_count} reviews`
                  : "New host"}
              </Text>
            </View>
          </View>

          <InfoRow label="When">
            {startAt.toLocaleDateString(undefined, {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
            {"\n"}
            {startAt.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })} –{" "}
            {endAt.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
          </InfoRow>
          <InfoRow label="Where">
            {addressRevealed
              ? `${event.address}, ${event.city}`
              : `${event.city} — exact address shared with accepted guests`}
          </InfoRow>
          <InfoRow label="Price">
            {Number(event.price_per_person) > 0 ? `$${event.price_per_person} per person` : "Free"}
          </InfoRow>
          <InfoRow label="Spots">
            {spotsLeft > 0 ? `${spotsLeft} of ${event.capacity} left` : "Sold out"}
          </InfoRow>
          {event.age_restriction != null && <InfoRow label="Age">{event.age_restriction}+</InfoRow>}

          <Text style={styles.sectionTitle}>About this event</Text>
          <Text style={styles.description}>{event.description}</Text>

          {!!event.house_rules && (
            <>
              <Text style={styles.sectionTitle}>House rules</Text>
              <Text style={styles.description}>{event.house_rules}</Text>
            </>
          )}

          {policy && (
            <>
              <Text style={styles.sectionTitle}>Cancellation</Text>
              <Text style={styles.description}>
                {policy.label} — {policy.description}
              </Text>
            </>
          )}

          <View style={styles.ctaSpacer} />
          {isOwnEvent ? (
            <Pressable
              style={({ pressed }) => [styles.hostCta, pressed && styles.hostCtaPressed]}
              onPress={() => router.push(`/host/${event.id}`)}
            >
              <Text style={styles.hostCtaText}>Guest requests</Text>
              <View style={styles.hostCtaRight}>
                {pendingCount > 0 && (
                  <View style={styles.pendingBadge}>
                    <Text style={styles.pendingBadgeText}>{pendingCount}</Text>
                  </View>
                )}
                <Text style={styles.hostCtaChevron}>›</Text>
              </View>
            </Pressable>
          ) : (
            <RequestSection
              eventId={event.id}
              spotsLeft={spotsLeft}
              isVerified={isVerified}
              myRequest={myRequest ?? null}
            />
          )}
        </View>
      </ScrollView>
    </>
  );
}

function RequestSection({
  eventId,
  spotsLeft,
  isVerified,
  myRequest,
}: {
  eventId: string;
  spotsLeft: number;
  isVerified: boolean;
  myRequest: { id: string; status: string; party_size: number } | null;
}) {
  const queryClient = useQueryClient();
  const [isComposing, setIsComposing] = useState(false);
  const [partySize, setPartySize] = useState(1);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["my-request-for-event"] });
    queryClient.invalidateQueries({ queryKey: ["my-requests"] });
    queryClient.invalidateQueries({ queryKey: ["event"] });
  };

  const send = useMutation({
    mutationFn: () => requestToJoin({ eventId, partySize, message: message || undefined }),
    onSuccess: () => {
      setIsComposing(false);
      setError(null);
      invalidate();
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Something went wrong"),
  });

  const cancel = useMutation({
    mutationFn: () => cancelBookingRequest(myRequest!.id),
    onSuccess: () => {
      setError(null);
      invalidate();
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Something went wrong"),
  });

  if (myRequest) {
    const accepted = myRequest.status === "accepted";
    return (
      <View style={styles.requestCard}>
        <Text style={[styles.requestStatus, accepted && styles.requestStatusAccepted]}>
          {accepted ? "🎉 You're in!" : "⏳ Request sent"}
        </Text>
        <Text style={styles.requestStatusHint}>
          {accepted
            ? `Party of ${myRequest.party_size} accepted — the address above is where it's at.`
            : `Party of ${myRequest.party_size} · waiting for the host to respond.`}
        </Text>
        {!!error && <Text style={styles.requestError}>{error}</Text>}
        <Button
          label={accepted ? "Cancel my spot" : "Cancel request"}
          variant="secondary"
          onPress={() =>
            Alert.alert(
              accepted ? "Cancel your spot?" : "Cancel request?",
              accepted ? "The host will be notified and your spots will be freed." : undefined,
              [
                { text: "Keep it", style: "cancel" },
                { text: "Yes, cancel", style: "destructive", onPress: () => cancel.mutate() },
              ]
            )
          }
          loading={cancel.isPending}
        />
      </View>
    );
  }

  if (!isComposing) {
    return (
      <Button
        label={spotsLeft > 0 ? "Request to join" : "Sold out"}
        onPress={() => {
          if (!isVerified) {
            Alert.alert("Verification required", "Verify your ID to request a spot at events.");
            return;
          }
          setIsComposing(true);
        }}
        disabled={spotsLeft <= 0}
      />
    );
  }

  return (
    <View style={styles.requestCard}>
      <Text style={typography.heading}>Request a spot</Text>
      <View style={styles.stepperRow}>
        <Text style={typography.body}>Party size</Text>
        <View style={styles.stepper}>
          <Pressable
            style={styles.stepperButton}
            onPress={() => setPartySize((n) => Math.max(1, n - 1))}
          >
            <Text style={styles.stepperButtonText}>−</Text>
          </Pressable>
          <Text style={styles.stepperValue}>{partySize}</Text>
          <Pressable
            style={styles.stepperButton}
            onPress={() => setPartySize((n) => Math.min(Math.min(20, spotsLeft), n + 1))}
          >
            <Text style={styles.stepperButtonText}>＋</Text>
          </Pressable>
        </View>
      </View>
      <TextInput
        placeholder="Say hi to the host (optional)"
        placeholderTextColor={colors.textFaint}
        value={message}
        onChangeText={setMessage}
        multiline
        maxLength={500}
        style={styles.messageInput}
      />
      {!!error && <Text style={styles.requestError}>{error}</Text>}
      <Button label="Send request" onPress={() => send.mutate()} loading={send.isPending} />
      <Button label="Back" variant="ghost" onPress={() => setIsComposing(false)} />
    </View>
  );
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: spacing.xxl },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  gallery: { height: 260 },
  galleryImage: { width: 393, height: 260, resizeMode: "cover" },
  galleryFallback: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  galleryEmoji: { fontSize: 56 },
  body: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, gap: spacing.sm },
  category: { ...typography.caption, color: colors.primary, fontWeight: "700" },
  hostRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: spacing.sm,
  },
  hostAvatar: { width: 44, height: 44, borderRadius: 22 },
  hostAvatarFallback: {
    backgroundColor: colors.primaryMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  hostAvatarInitial: { ...typography.heading, color: colors.primary },
  hostMeta: { ...typography.caption, color: colors.textMuted },
  infoRow: { flexDirection: "row", gap: spacing.md, paddingVertical: spacing.xs },
  infoLabel: { ...typography.label, width: 64 },
  infoValue: { ...typography.body, flex: 1 },
  sectionTitle: { ...typography.heading, marginTop: spacing.lg },
  description: { ...typography.body, color: colors.textMuted, lineHeight: 24 },
  ctaSpacer: { height: spacing.lg },
  headerMenuButton: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  headerMenuDots: { fontSize: 20, color: colors.text, fontWeight: "700" },
  hostCta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  hostCtaPressed: { opacity: 0.8 },
  hostCtaText: { ...typography.body, fontWeight: "600" },
  hostCtaRight: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  hostCtaChevron: { fontSize: 24, color: colors.textFaint, marginTop: -2 },
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
  requestCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.md,
  },
  requestStatus: { ...typography.heading, color: colors.warning },
  requestStatusAccepted: { color: colors.success },
  requestStatusHint: { ...typography.body, color: colors.textMuted },
  requestError: { fontSize: 13, color: colors.danger },
  stepperRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  stepper: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  stepperButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  stepperButtonText: { color: colors.text, fontSize: 18, fontWeight: "700" },
  stepperValue: { ...typography.heading, minWidth: 24, textAlign: "center" },
  messageInput: {
    minHeight: 72,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    fontSize: 15,
    color: colors.text,
    textAlignVertical: "top",
  },
});

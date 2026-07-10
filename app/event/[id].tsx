import { useQuery } from "@tanstack/react-query";
import { Stack, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/Button";
import { eventPhotoUrl, fetchEvent } from "@/features/events/api";
import { cancellationPolicyOptions, eventCategoryOptions } from "@/features/events/schemas";
import { useAuth } from "@/hooks/useAuth";
import { colors, radii, spacing, typography } from "@/lib/theme";

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session, isVerified } = useAuth();

  const { data: event, isPending, error } = useQuery({
    queryKey: ["event", id],
    queryFn: () => fetchEvent(id),
    enabled: !!id,
  });

  if (isPending) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (error || !event) {
    return (
      <View style={styles.center}>
        <Text style={typography.body}>This event isn't available anymore.</Text>
      </View>
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

  const onRequestToJoin = () => {
    if (!isVerified) {
      Alert.alert("Verification required", "Verify your ID to request a spot at events.");
      return;
    }
    // Booking requests land in Milestone 3.
    Alert.alert("Coming soon", "Requests to join are almost ready — hang tight!");
  };

  return (
    <>
      <Stack.Screen options={{ title: event.title }} />
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
            {event.city} — exact address shared with accepted guests
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
            <Text style={styles.ownEventNote}>This is your event.</Text>
          ) : (
            <Button
              label={spotsLeft > 0 ? "Request to join" : "Sold out"}
              onPress={onRequestToJoin}
              disabled={spotsLeft <= 0}
            />
          )}
        </View>
      </ScrollView>
    </>
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
  ownEventNote: { ...typography.body, color: colors.textFaint, textAlign: "center" },
});

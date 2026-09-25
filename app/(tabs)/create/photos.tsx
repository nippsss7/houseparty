import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { StepHeader } from "@/components/StepHeader";
import { createEvent } from "@/features/events/api";
import { eventCategoryOptions } from "@/features/events/schemas";
import { createTicketTier } from "@/features/tickets/api";
import { useAuth } from "@/hooks/useAuth";
import { useImagePicker } from "@/hooks/useImagePicker";
import { useCreateEventStore } from "@/stores/createEventStore";
import { colors, radii, spacing, typography } from "@/lib/theme";

const MAX_PHOTOS = 5;

export default function CreateEventPhotosScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const { pickMultipleFromLibrary } = useImagePicker();
  const { basics, details, locationSchedule, organizationId, ticketTiers, photoUris, setPhotoUris, reset } =
    useCreateEventStore();
  const [error, setError] = useState<string | null>(null);

  const publish = useMutation({
    mutationFn: async () => {
      if (!session || !basics || !details || !locationSchedule) {
        throw new Error("Missing event details — go back and complete every step.");
      }
      const event = await createEvent({
        hostId: session.user.id,
        title: basics.title,
        description: basics.description,
        category: basics.category,
        capacity: details.capacity,
        pricePerPerson: details.pricePerPerson,
        ageRestriction:
          details.ageRestriction === "" || details.ageRestriction === undefined
            ? undefined
            : details.ageRestriction,
        houseRules: details.houseRules || undefined,
        cancellationPolicy: details.cancellationPolicy,
        lat: locationSchedule.lat,
        lng: locationSchedule.lng,
        address: locationSchedule.address,
        city: locationSchedule.city,
        startAt: locationSchedule.startAt,
        endAt: locationSchedule.endAt,
        photoUris,
        organizationId: organizationId ?? undefined,
      });

      if (ticketTiers.length > 0) {
        await Promise.all(
          ticketTiers.map((tier, index) =>
            createTicketTier({
              eventId: event.id,
              name: tier.name,
              price: tier.price,
              quantityTotal: tier.quantityTotal,
              position: index,
            })
          )
        );
      }
      return event;
    },
    onSuccess: (event) => {
      queryClient.invalidateQueries({ queryKey: ["nearby-events"] });
      reset();
      router.dismissTo("/(tabs)/create");
      router.replace(`/event/${event.id}`);
    },
    onError: (err) => {
      console.error("Publish event failed:", err);
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    },
  });

  const onAddPhotos = async () => {
    const uris = await pickMultipleFromLibrary(MAX_PHOTOS - photoUris.length);
    if (uris.length > 0) setPhotoUris([...photoUris, ...uris].slice(0, MAX_PHOTOS));
  };

  const removePhoto = (uri: string) => setPhotoUris(photoUris.filter((u) => u !== uri));

  const categoryLabel = eventCategoryOptions.find((o) => o.value === basics?.category)?.label;

  return (
    <Screen scroll>
      <StepHeader step={5} total={5} title="Photos & review" />

      <Text style={typography.label}>Photos ({photoUris.length}/{MAX_PHOTOS})</Text>
      <View style={styles.photoGrid}>
        {photoUris.map((uri) => (
          <Pressable key={uri} style={styles.photoWrap} onPress={() => removePhoto(uri)}>
            <Image source={{ uri }} style={styles.photo} />
            <View style={styles.photoRemove}>
              <Text style={styles.photoRemoveText}>✕</Text>
            </View>
          </Pressable>
        ))}
        {photoUris.length < MAX_PHOTOS && (
          <Pressable style={styles.addPhoto} onPress={onAddPhotos}>
            <Text style={styles.addPhotoText}>＋</Text>
          </Pressable>
        )}
      </View>
      <Text style={styles.hint}>Tap a photo to remove it. The first photo is the cover.</Text>

      {basics && details && locationSchedule ? (
        <View style={styles.summary}>
          <SummaryRow label="Event" value={basics.title} />
          <SummaryRow label="Category" value={categoryLabel ?? basics.category} />
          <SummaryRow
            label="Capacity"
            value={`${details.capacity} guests · ${details.pricePerPerson > 0 ? `$${details.pricePerPerson}/person` : "Free"}`}
          />
          <SummaryRow label="Where" value={`${locationSchedule.address}, ${locationSchedule.city}`} />
          <SummaryRow
            label="When"
            value={`${locationSchedule.startAt.toLocaleString()} → ${locationSchedule.endAt.toLocaleString()}`}
          />
          <SummaryRow
            label="Tickets"
            value={
              ticketTiers.length > 0
                ? ticketTiers.map((t) => `${t.name} $${t.price.toFixed(2)} × ${t.quantityTotal}`).join(", ")
                : "Free — request to join"
            }
          />
        </View>
      ) : (
        <Text style={styles.error}>Some steps are incomplete — go back and finish them.</Text>
      )}

      {!!error && <Text style={styles.error}>{error}</Text>}
      <View style={styles.spacer} />
      <Button
        label="Publish event"
        onPress={() => publish.mutate()}
        loading={publish.isPending}
        disabled={!basics || !details || !locationSchedule}
      />
      <View style={styles.bottomPad} />
    </Screen>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.xs },
  photoWrap: { position: "relative" },
  photo: { width: 96, height: 96, borderRadius: radii.sm },
  photoRemove: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  photoRemoveText: { color: colors.text, fontSize: 11, fontWeight: "700" },
  addPhoto: {
    width: 96,
    height: 96,
    borderRadius: radii.sm,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  addPhotoText: { color: colors.textMuted, fontSize: 28 },
  hint: { ...typography.caption, color: colors.textFaint, marginTop: spacing.sm, marginBottom: spacing.lg },
  summary: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  summaryRow: { flexDirection: "row", gap: spacing.md },
  summaryLabel: { ...typography.label, width: 80 },
  summaryValue: { ...typography.body, flex: 1 },
  error: { fontSize: 13, color: colors.danger, marginTop: spacing.md },
  spacer: { flex: 1, minHeight: spacing.lg },
  bottomPad: { height: spacing.md },
});

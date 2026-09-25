import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/Button";
import { ChipGroup } from "@/components/ChipGroup";
import { Screen } from "@/components/Screen";
import { StepHeader } from "@/components/StepHeader";
import { TextField } from "@/components/TextField";
import { eventBasicsSchema, eventCategoryOptions, type EventBasics } from "@/features/events/schemas";
import { fetchMyOrganizations } from "@/features/organizations/api";
import { useAuth } from "@/hooks/useAuth";
import { useCreateEventStore } from "@/stores/createEventStore";
import { colors, radii, spacing, typography } from "@/lib/theme";

export default function CreateEventBasicsScreen() {
  const router = useRouter();
  const { session, isVerified } = useAuth();
  const basics = useCreateEventStore((s) => s.basics);
  const setBasics = useCreateEventStore((s) => s.setBasics);
  const organizationId = useCreateEventStore((s) => s.organizationId);
  const setOrganizationId = useCreateEventStore((s) => s.setOrganizationId);

  const { data: myOrgs = [] } = useQuery({
    queryKey: ["my-organizations", session?.user.id],
    queryFn: () => fetchMyOrganizations(session!.user.id),
    enabled: !!session && isVerified,
  });

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<EventBasics>({
    resolver: zodResolver(eventBasicsSchema),
    defaultValues: basics ?? { title: "", description: "", category: undefined },
  });

  if (!isVerified) {
    return (
      <Screen>
        <View style={styles.gate}>
          <Text style={styles.gateEmoji}>🪪</Text>
          <Text style={typography.heading}>Verification required</Text>
          <Text style={styles.gateText}>
            Only verified hosts can create events. Finish your ID verification to start hosting.
          </Text>
        </View>
      </Screen>
    );
  }

  const onNext = (values: EventBasics) => {
    setBasics(values);
    router.push("/(tabs)/create/details");
  };

  return (
    <Screen scroll>
      <StepHeader step={1} total={5} title="Host an event" />

      {myOrgs.length > 0 && (
        <View style={styles.orgPicker}>
          <Text style={typography.label}>Post as</Text>
          <View style={styles.orgChips}>
            <Pressable
              style={[styles.orgChip, organizationId === null && styles.orgChipActive]}
              onPress={() => setOrganizationId(null)}
            >
              <Text style={[styles.orgChipText, organizationId === null && styles.orgChipTextActive]}>
                Yourself
              </Text>
            </Pressable>
            {myOrgs.map((org) => (
              <Pressable
                key={org.id}
                style={[styles.orgChip, organizationId === org.id && styles.orgChipActive]}
                onPress={() => setOrganizationId(org.id)}
              >
                <Text style={[styles.orgChipText, organizationId === org.id && styles.orgChipTextActive]}>
                  {org.name}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      <Controller
        control={control}
        name="title"
        render={({ field }) => (
          <TextField
            label="Title"
            placeholder="Friday rooftop sundowner"
            value={field.value}
            onChangeText={field.onChange}
            error={errors.title?.message}
            maxLength={80}
          />
        )}
      />

      <Controller
        control={control}
        name="description"
        render={({ field }) => (
          <TextField
            label="Description"
            placeholder="What's the vibe? What should guests expect?"
            value={field.value}
            onChangeText={field.onChange}
            error={errors.description?.message}
            multiline
            style={styles.multiline}
            maxLength={2000}
          />
        )}
      />

      <Text style={typography.label}>Category</Text>
      <Controller
        control={control}
        name="category"
        render={({ field }) => (
          <View style={styles.chips}>
            <ChipGroup
              options={eventCategoryOptions}
              value={field.value ?? null}
              onChange={field.onChange}
            />
            {!!errors.category && <Text style={styles.error}>{errors.category.message}</Text>}
          </View>
        )}
      />

      <View style={styles.spacer} />
      <Button label="Next: Details" onPress={handleSubmit(onNext)} />
      <View style={styles.bottomPad} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  multiline: { height: 120, paddingTop: spacing.md, textAlignVertical: "top" },
  orgPicker: { marginBottom: spacing.md, gap: spacing.xs },
  orgChips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  orgChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  orgChipActive: { backgroundColor: colors.primaryMuted, borderColor: colors.primary },
  orgChipText: { ...typography.label, color: colors.textMuted },
  orgChipTextActive: { color: colors.primary },
  chips: { marginTop: spacing.xs, gap: spacing.xs },
  error: { fontSize: 13, color: colors.danger },
  spacer: { flex: 1, minHeight: spacing.lg },
  bottomPad: { height: spacing.md },
  gate: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.sm, paddingHorizontal: spacing.lg },
  gateEmoji: { fontSize: 48 },
  gateText: { ...typography.body, color: colors.textMuted, textAlign: "center" },
});

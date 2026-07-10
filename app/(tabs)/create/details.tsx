import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/Button";
import { ChipGroup } from "@/components/ChipGroup";
import { Screen } from "@/components/Screen";
import { StepHeader } from "@/components/StepHeader";
import { TextField } from "@/components/TextField";
import {
  cancellationPolicyOptions,
  eventDetailsSchema,
  type EventDetails,
  type EventDetailsInput,
} from "@/features/events/schemas";
import { useCreateEventStore } from "@/stores/createEventStore";
import { colors, spacing, typography } from "@/lib/theme";

export default function CreateEventDetailsScreen() {
  const router = useRouter();
  const details = useCreateEventStore((s) => s.details);
  const setDetails = useCreateEventStore((s) => s.setDetails);

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<EventDetailsInput, unknown, EventDetails>({
    resolver: zodResolver(eventDetailsSchema),
    defaultValues: details ?? {
      capacity: undefined,
      pricePerPerson: 0,
      ageRestriction: "",
      houseRules: "",
      cancellationPolicy: "flexible",
    },
  });

  const policy = watch("cancellationPolicy");
  const policyDescription = cancellationPolicyOptions.find((o) => o.value === policy)?.description;

  const onNext = (values: EventDetails) => {
    setDetails(values);
    router.push("/(tabs)/create/where-when");
  };

  return (
    <Screen scroll>
      <StepHeader step={2} total={4} title="The details" />

      <Controller
        control={control}
        name="capacity"
        render={({ field }) => (
          <TextField
            label="Capacity (guests)"
            placeholder="20"
            value={field.value === undefined ? "" : String(field.value)}
            onChangeText={field.onChange}
            error={errors.capacity?.message}
            keyboardType="number-pad"
          />
        )}
      />

      <Controller
        control={control}
        name="pricePerPerson"
        render={({ field }) => (
          <TextField
            label="Price per person (0 = free)"
            placeholder="10"
            value={field.value === undefined ? "" : String(field.value)}
            onChangeText={field.onChange}
            error={errors.pricePerPerson?.message}
            keyboardType="decimal-pad"
          />
        )}
      />

      <Controller
        control={control}
        name="ageRestriction"
        render={({ field }) => (
          <TextField
            label="Minimum age (optional)"
            placeholder="18"
            value={field.value === undefined ? "" : String(field.value)}
            onChangeText={field.onChange}
            error={errors.ageRestriction?.message}
            keyboardType="number-pad"
          />
        )}
      />

      <Controller
        control={control}
        name="houseRules"
        render={({ field }) => (
          <TextField
            label="House rules (optional)"
            placeholder="No shoes inside, BYO drinks, respect the neighbours…"
            value={field.value ?? ""}
            onChangeText={field.onChange}
            error={errors.houseRules?.message}
            multiline
            style={styles.multiline}
            maxLength={1000}
          />
        )}
      />

      <Text style={typography.label}>Cancellation policy</Text>
      <Controller
        control={control}
        name="cancellationPolicy"
        render={({ field }) => (
          <View style={styles.chips}>
            <ChipGroup
              options={cancellationPolicyOptions}
              value={field.value ?? null}
              onChange={field.onChange}
            />
            {!!policyDescription && <Text style={styles.policyHint}>{policyDescription}</Text>}
          </View>
        )}
      />

      <View style={styles.spacer} />
      <Button label="Next: Where & when" onPress={handleSubmit(onNext)} />
      <View style={styles.bottomPad} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  multiline: { height: 100, paddingTop: spacing.md, textAlignVertical: "top" },
  chips: { marginTop: spacing.xs, gap: spacing.sm },
  policyHint: { ...typography.caption, color: colors.textFaint },
  spacer: { flex: 1, minHeight: spacing.lg },
  bottomPad: { height: spacing.md },
});

import { useMutation } from "@tanstack/react-query";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { Button } from "@/components/Button";
import { ChipGroup } from "@/components/ChipGroup";
import { REPORT_REASON_OPTIONS, submitReport, type ReportReason } from "@/features/safety/api";
import { colors, radii, spacing, typography } from "@/lib/theme";

/**
 * Shared report composer for both target types. Pass either
 * `userId` (+ optional `userName`) or `eventId` (+ optional `eventTitle`) as
 * route params.
 */
export default function ReportScreen() {
  const params = useLocalSearchParams<{
    userId?: string;
    userName?: string;
    eventId?: string;
    eventTitle?: string;
  }>();
  const router = useRouter();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState("");

  const targetLabel = params.userName ?? params.eventTitle ?? "this";

  const submit = useMutation({
    mutationFn: () =>
      submitReport({
        reportedUserId: params.userId,
        reportedEventId: params.eventId,
        reason: reason!,
        details: details || undefined,
      }),
    onSuccess: () => {
      Alert.alert("Report submitted", "Thanks — our team will review it shortly.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    },
    onError: (err) => {
      Alert.alert("Couldn't submit report", err instanceof Error ? err.message : "Try again.");
    },
  });

  return (
    <>
      <Stack.Screen options={{ title: "Report" }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={typography.heading}>Report {targetLabel}</Text>
        <Text style={styles.subheading}>
          Your report is confidential. We'll review it and take action if needed.
        </Text>

        <Text style={typography.label}>Reason</Text>
        <ChipGroup options={REPORT_REASON_OPTIONS} value={reason} onChange={setReason} />

        <Text style={[typography.label, styles.detailsLabel]}>Details (optional)</Text>
        <TextInput
          placeholder="Anything else we should know?"
          placeholderTextColor={colors.textFaint}
          value={details}
          onChangeText={setDetails}
          multiline
          maxLength={1000}
          style={styles.input}
        />

        <View style={styles.spacer} />
        <Button
          label="Submit report"
          onPress={() => {
            if (!reason) {
              Alert.alert("Pick a reason", "Choose why you're reporting this.");
              return;
            }
            submit.mutate();
          }}
          loading={submit.isPending}
        />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.sm, paddingBottom: spacing.xxl },
  subheading: { ...typography.body, color: colors.textMuted, marginBottom: spacing.md },
  detailsLabel: { marginTop: spacing.md },
  input: {
    minHeight: 100,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    fontSize: 16,
    color: colors.text,
    textAlignVertical: "top",
  },
  spacer: { height: spacing.lg },
});

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Redirect } from "expo-router";
import { FlatList, StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { fetchOpenReports, resolveReport, REPORT_REASON_OPTIONS, type OpenReport } from "@/features/safety/api";
import { useAuth } from "@/hooks/useAuth";
import { colors, radii, spacing, typography } from "@/lib/theme";

export default function AdminReportsScreen() {
  const { isAdmin, isInitializing } = useAuth();
  const queryClient = useQueryClient();

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["open-reports"],
    queryFn: fetchOpenReports,
    enabled: isAdmin,
  });

  if (isInitializing) return null;
  if (!isAdmin) return <Redirect href="/(tabs)/profile" />;

  return (
    <Screen>
      <Text style={styles.heading}>Open reports</Text>
      {isLoading ? (
        <Text style={styles.muted}>Loading…</Text>
      ) : reports.length === 0 ? (
        <Text style={styles.muted}>No open reports right now.</Text>
      ) : (
        <FlatList
          data={reports}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ gap: spacing.md, paddingBottom: spacing.xl }}
          renderItem={({ item }: { item: OpenReport }) => (
            <ReportCard
              item={item}
              onResolved={() => queryClient.invalidateQueries({ queryKey: ["open-reports"] })}
            />
          )}
        />
      )}
    </Screen>
  );
}

function ReportCard({ item, onResolved }: { item: OpenReport; onResolved: () => void }) {
  const reasonLabel = REPORT_REASON_OPTIONS.find((r) => r.value === item.reason)?.label ?? item.reason;
  const targetLabel = item.reported_event
    ? `Event: ${item.reported_event.title}`
    : `User: ${item.reported_user?.full_name ?? "Unknown"}`;

  return (
    <View style={styles.card}>
      <Text style={styles.cardReason}>{reasonLabel}</Text>
      <Text style={styles.cardTarget}>{targetLabel}</Text>
      <Text style={styles.cardMeta}>
        Reported by {item.reporter?.full_name ?? "Unknown"} ·{" "}
        {new Date(item.created_at).toLocaleDateString()}
      </Text>
      {!!item.details && <Text style={styles.cardDetails}>“{item.details}”</Text>}
      <View style={styles.actionsRow}>
        <View style={styles.actionButton}>
          <Button
            label="Dismiss"
            variant="secondary"
            onPress={() => resolveReport(item.id, "dismissed").then(onResolved)}
          />
        </View>
        <View style={styles.actionButton}>
          <Button label="Mark resolved" onPress={() => resolveReport(item.id, "resolved").then(onResolved)} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  heading: { ...typography.title, marginTop: spacing.xl, marginBottom: spacing.lg },
  muted: { ...typography.body, color: colors.textMuted, textAlign: "center", marginTop: spacing.xl },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs,
  },
  cardReason: { ...typography.heading, color: colors.danger },
  cardTarget: { ...typography.body },
  cardMeta: { ...typography.caption, color: colors.textMuted },
  cardDetails: { ...typography.body, color: colors.textMuted, fontStyle: "italic", marginTop: spacing.xs },
  actionsRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
  actionButton: { flex: 1 },
});

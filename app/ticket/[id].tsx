import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { ActivityIndicator, Alert, StyleSheet, Text, View } from "react-native";
import QRCode from "react-native-qrcode-svg";

import { Button } from "@/components/Button";
import { cancelTicket, fetchMyTickets, type MyTicket } from "@/features/tickets/api";
import { useAuth } from "@/hooks/useAuth";
import { colors, radii, spacing, typography } from "@/lib/theme";

const STATUS_COPY: Record<string, { label: string; color: string; hint: string }> = {
  confirmed: { label: "Ready to scan", color: colors.success, hint: "Show this QR code at the door." },
  checked_in: { label: "Already checked in", color: colors.textMuted, hint: "This ticket has been used." },
  cancelled: { label: "Cancelled", color: colors.danger, hint: "This ticket is no longer valid." },
};

export default function TicketDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session } = useAuth();
  const queryClient = useQueryClient();

  // Tickets don't have a dedicated single-fetch RPC yet — reuse the list
  // query (already cached from the wallet screen) and find this one.
  const { data: tickets, isPending } = useQuery({
    queryKey: ["my-tickets", session?.user.id],
    queryFn: () => fetchMyTickets(session!.user.id),
    enabled: !!session,
  });
  const ticket = tickets?.find((t: MyTicket) => t.id === id);

  const cancel = useMutation({
    mutationFn: () => cancelTicket(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-tickets"] });
      router.back();
    },
    onError: (err) => Alert.alert("Couldn't cancel", err instanceof Error ? err.message : "Try again."),
  });

  if (isPending || !ticket) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const status = STATUS_COPY[ticket.status] ?? STATUS_COPY.confirmed;
  const startAt = ticket.event ? new Date(ticket.event.start_at) : null;

  return (
    <>
      <Stack.Screen options={{ title: "Your ticket" }} />
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={[styles.statusLabel, { color: status.color }]}>{status.label}</Text>
          <Text style={typography.title} numberOfLines={2}>
            {ticket.event?.title ?? "Event"}
          </Text>
          <Text style={styles.meta}>{ticket.tier?.name}</Text>
          {!!startAt && (
            <Text style={styles.meta}>
              {startAt.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
              {" · "}
              {startAt.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
            </Text>
          )}
          {!!ticket.event?.address && <Text style={styles.meta}>{ticket.event.address}</Text>}

          <View style={styles.qrWrap}>
            <QRCode
              value={ticket.qr_token}
              size={220}
              color={colors.black}
              backgroundColor={colors.white}
            />
          </View>
          <Text style={styles.hint}>{status.hint}</Text>
        </View>

        {ticket.status === "confirmed" && (
          <Button
            label="Cancel ticket"
            variant="ghost"
            onPress={() =>
              Alert.alert("Cancel this ticket?", "This frees up your spot for someone else.", [
                { text: "Keep it", style: "cancel" },
                { text: "Cancel ticket", style: "destructive", onPress: () => cancel.mutate() },
              ])
            }
            loading={cancel.isPending}
          />
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.lg, gap: spacing.lg },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  card: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.lg,
    padding: spacing.xl,
    alignItems: "center",
    gap: spacing.xs,
    shadowColor: colors.black,
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  statusLabel: { ...typography.label, fontWeight: "700" },
  meta: { ...typography.body, color: colors.textMuted, textAlign: "center" },
  qrWrap: {
    marginTop: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radii.md,
  },
  hint: { ...typography.caption, color: colors.textFaint, marginTop: spacing.md, textAlign: "center" },
});

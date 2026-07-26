import { Stack } from "expo-router";
import { useState } from "react";
import { StyleSheet, Switch, Text, View } from "react-native";

import { updateNotificationPreferences } from "@/features/notifications/api";
import { useAuth } from "@/hooks/useAuth";
import { useAuthStore } from "@/stores/authStore";
import { colors, radii, spacing, typography } from "@/lib/theme";

export default function NotificationSettingsScreen() {
  const { session, profile } = useAuth();
  const [notifyNewEvents, setNotifyNewEvents] = useState(profile?.notify_new_events ?? true);
  const [notifyEmail, setNotifyEmail] = useState(profile?.notify_email ?? true);
  const [error, setError] = useState<string | null>(null);

  const save = async (next: { notifyNewEvents: boolean; notifyEmail: boolean }) => {
    if (!session || !profile) return;
    setError(null);
    try {
      await updateNotificationPreferences({
        userId: session.user.id,
        notifyNewEvents: next.notifyNewEvents,
        notifyEmail: next.notifyEmail,
      });
      useAuthStore.getState().setProfile({
        ...profile,
        notify_new_events: next.notifyNewEvents,
        notify_email: next.notifyEmail,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save — try again");
      // Revert the optimistic toggle on failure.
      setNotifyNewEvents(profile.notify_new_events);
      setNotifyEmail(profile.notify_email);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: "Notification settings" }} />
      <View style={styles.container}>
        <Text style={styles.sectionLabel}>PUSH</Text>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={typography.body}>Booking updates</Text>
            <Text style={styles.rowHint}>New requests, accepted/declined — can't be turned off.</Text>
          </View>
          <Switch value disabled trackColor={{ true: colors.primary }} />
        </View>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={typography.body}>New parties near you</Text>
            <Text style={styles.rowHint}>When someone posts an event close to your location.</Text>
          </View>
          <Switch
            value={notifyNewEvents}
            onValueChange={(value) => {
              setNotifyNewEvents(value);
              save({ notifyNewEvents: value, notifyEmail });
            }}
            trackColor={{ true: colors.primary }}
          />
        </View>

        <Text style={[styles.sectionLabel, styles.sectionSpacing]}>EMAIL</Text>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={typography.body}>Weekly digest</Text>
            <Text style={styles.rowHint}>
              An occasional email if there are new parties near you and you haven't checked the
              app in a while.
            </Text>
          </View>
          <Switch
            value={notifyEmail}
            onValueChange={(value) => {
              setNotifyEmail(value);
              save({ notifyNewEvents, notifyEmail: value });
            }}
            trackColor={{ true: colors.primary }}
          />
        </View>

        {!!error && <Text style={styles.error}>{error}</Text>}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.lg },
  sectionLabel: { ...typography.label, color: colors.textFaint, marginBottom: spacing.sm },
  sectionSpacing: { marginTop: spacing.xl },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  rowText: { flex: 1, gap: 2 },
  rowHint: { ...typography.caption, color: colors.textMuted },
  error: { fontSize: 13, color: colors.danger, marginTop: spacing.sm },
});

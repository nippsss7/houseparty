import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { useAuth } from "@/hooks/useAuth";
import { colors, spacing, typography } from "@/lib/theme";

export default function PendingReviewScreen() {
  const router = useRouter();
  const { profile, signOut } = useAuth();

  const isRejected = profile?.verification_status === "rejected";

  return (
    <Screen>
      <View style={styles.center}>
        <Text style={styles.icon}>{isRejected ? "✕" : "⏳"}</Text>
        <Text style={styles.heading}>
          {isRejected ? "Verification not approved" : "Your ID is under review"}
        </Text>
        <Text style={styles.subheading}>
          {isRejected
            ? "We couldn't verify your ID. Please check your photos are clear and try again."
            : "This usually takes less than a day. We'll let you know the moment it's approved — feel free to close the app."}
        </Text>
      </View>
      <View style={styles.actions}>
        {isRejected && (
          <Button label="Re-submit ID" onPress={() => router.replace("/(onboarding)/id-upload")} />
        )}
        <Button label="Sign out" variant="secondary" onPress={signOut} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.sm },
  icon: { fontSize: 48, marginBottom: spacing.sm },
  heading: { ...typography.heading, textAlign: "center" },
  subheading: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: "center",
    paddingHorizontal: spacing.md,
  },
  actions: { gap: spacing.sm, paddingBottom: spacing.xl },
});

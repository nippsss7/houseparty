import { useRouter } from "expo-router";
import { Image, StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { useAuth } from "@/hooks/useAuth";
import { colors, radii, spacing, typography } from "@/lib/theme";

const STATUS_LABEL: Record<string, string> = {
  unverified: "Not verified",
  pending: "Verification pending",
  verified: "Verified",
  rejected: "Verification rejected",
};

const STATUS_COLOR: Record<string, string> = {
  unverified: colors.textMuted,
  pending: colors.warning,
  verified: colors.success,
  rejected: colors.danger,
};

export default function ProfileScreen() {
  const router = useRouter();
  const { profile, isAdmin, signOut } = useAuth();
  const status = profile?.verification_status ?? "unverified";

  return (
    <Screen>
      <View style={styles.header}>
        {profile?.avatar_url ? (
          <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder} />
        )}
        <Text style={styles.name}>{profile?.full_name ?? "Your profile"}</Text>
        {!!profile?.username && <Text style={styles.username}>@{profile.username}</Text>}
        <View style={[styles.badge, { borderColor: STATUS_COLOR[status] }]}>
          <Text style={[styles.badgeText, { color: STATUS_COLOR[status] }]}>
            {STATUS_LABEL[status]}
          </Text>
        </View>
      </View>

      <View style={styles.ratingsRow}>
        <View style={styles.ratingCard}>
          <Text style={styles.ratingValue}>{profile?.host_rating_avg?.toFixed(1) ?? "—"}</Text>
          <Text style={styles.ratingLabel}>Host rating ({profile?.host_rating_count ?? 0})</Text>
        </View>
        <View style={styles.ratingCard}>
          <Text style={styles.ratingValue}>{profile?.guest_rating_avg?.toFixed(1) ?? "—"}</Text>
          <Text style={styles.ratingLabel}>Guest rating ({profile?.guest_rating_count ?? 0})</Text>
        </View>
      </View>

      <View style={styles.spacer} />

      {isAdmin && (
        <Button
          label="Admin: review verifications"
          variant="secondary"
          onPress={() => router.push("/admin/verifications")}
        />
      )}
      <Button label="Sign out" variant="secondary" onPress={signOut} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: "center", paddingTop: spacing.xl, gap: spacing.xs },
  avatar: { width: 88, height: 88, borderRadius: radii.full },
  avatarPlaceholder: {
    width: 88,
    height: 88,
    borderRadius: radii.full,
    backgroundColor: colors.surface,
  },
  name: { ...typography.heading, marginTop: spacing.sm },
  username: { color: colors.textMuted },
  badge: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
    borderWidth: 1.5,
  },
  badgeText: { fontWeight: "700", fontSize: 13 },
  ratingsRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.xl },
  ratingCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.md,
    alignItems: "center",
    gap: spacing.xs,
  },
  ratingValue: { ...typography.heading },
  ratingLabel: { ...typography.caption, textAlign: "center" },
  spacer: { flex: 1 },
});

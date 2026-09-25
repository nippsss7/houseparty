import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Alert, Image, Linking, Pressable, StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { fetchMyOrganizations } from "@/features/organizations/api";
import { deleteMyAccount } from "@/features/profile/api";
import { useAuth } from "@/hooks/useAuth";
import { PRIVACY_POLICY_URL, TERMS_OF_SERVICE_URL } from "@/lib/legal";
import { colors, radii, spacing, TAB_BAR_CLEARANCE, typography } from "@/lib/theme";

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
  const { profile, session, isAdmin, signOut } = useAuth();
  const status = profile?.verification_status ?? "unverified";

  const { data: myOrgs = [] } = useQuery({
    queryKey: ["my-organizations", session?.user.id],
    queryFn: () => fetchMyOrganizations(session!.user.id),
    enabled: !!session && status === "verified",
  });

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

      <View style={styles.menu}>
        <Button
          label="Edit profile"
          variant="secondary"
          onPress={() => router.push("/settings/edit-profile")}
        />
        <Button
          label="My reviews"
          variant="secondary"
          onPress={() => router.push("/settings/reviews")}
        />
        <Button
          label="Blocked users"
          variant="secondary"
          onPress={() => router.push("/settings/blocked-users")}
        />
        <Button
          label="Notification settings"
          variant="secondary"
          onPress={() => router.push("/settings/notifications")}
        />
        {status === "verified" &&
          (myOrgs.length > 0 ? (
            myOrgs.map((org) => (
              <Button
                key={org.id}
                label={`My organization: ${org.name}`}
                variant="secondary"
                onPress={() => router.push(`/org/${org.id}`)}
              />
            ))
          ) : (
            <Button
              label="Create an organization"
              variant="secondary"
              onPress={() => router.push("/org/create")}
            />
          ))}
        {isAdmin && (
          <>
            <Button
              label="Admin: review verifications"
              variant="secondary"
              onPress={() => router.push("/admin/verifications")}
            />
            <Button
              label="Admin: open reports"
              variant="secondary"
              onPress={() => router.push("/admin/reports")}
            />
          </>
        )}
      </View>

      <View style={styles.spacer} />

      <View style={styles.legalRow}>
        <Pressable onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}>
          <Text style={styles.legalLink}>Privacy Policy</Text>
        </Pressable>
        <Text style={styles.legalDivider}>·</Text>
        <Pressable onPress={() => Linking.openURL(TERMS_OF_SERVICE_URL)}>
          <Text style={styles.legalLink}>Terms of Service</Text>
        </Pressable>
      </View>

      <Button label="Sign out" variant="secondary" onPress={signOut} />
      <Button
        label="Delete account"
        variant="ghost"
        onPress={() =>
          Alert.alert(
            "Delete your account?",
            "This permanently removes your profile, events, requests and reviews. This cannot be undone.",
            [
              { text: "Keep my account", style: "cancel" },
              {
                text: "Delete forever",
                style: "destructive",
                onPress: async () => {
                  try {
                    await deleteMyAccount();
                    await signOut();
                  } catch (err) {
                    Alert.alert(
                      "Could not delete account",
                      err instanceof Error ? err.message : "Please try again."
                    );
                  }
                },
              },
            ]
          )
        }
      />
      <View style={{ height: TAB_BAR_CLEARANCE }} />
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
  menu: { marginTop: spacing.xl, gap: spacing.sm },
  spacer: { flex: 1 },
  legalRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  legalLink: { ...typography.caption, color: colors.textMuted, textDecorationLine: "underline" },
  legalDivider: { ...typography.caption, color: colors.textFaint },
});

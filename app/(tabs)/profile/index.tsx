import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import type { ComponentProps } from "react";
import { Alert, Image, Linking, Pressable, StyleSheet, Text, View } from "react-native";

import { Screen } from "@/components/Screen";
import { fetchMyOrganizations } from "@/features/organizations/api";
import { deleteMyAccount } from "@/features/profile/api";
import { useAuth } from "@/hooks/useAuth";
import { PRIVACY_POLICY_URL, TERMS_OF_SERVICE_URL } from "@/lib/legal";
import { colors, radii, shadows, spacing, TAB_BAR_CLEARANCE, typography } from "@/lib/theme";

type IconName = ComponentProps<typeof Ionicons>["name"];

const STATUS_META: Record<string, { label: string; color: string; icon: IconName }> = {
  unverified: { label: "Not verified", color: colors.textMuted, icon: "help-circle-outline" },
  pending: { label: "Verification pending", color: colors.warning, icon: "time-outline" },
  verified: { label: "Verified", color: colors.success, icon: "checkmark-circle" },
  rejected: { label: "Verification rejected", color: colors.danger, icon: "close-circle-outline" },
};

export default function ProfileScreen() {
  const router = useRouter();
  const { profile, session, isAdmin, signOut } = useAuth();
  const status = profile?.verification_status ?? "unverified";
  const statusMeta = STATUS_META[status];

  const { data: myOrgs = [] } = useQuery({
    queryKey: ["my-organizations", session?.user.id],
    queryFn: () => fetchMyOrganizations(session!.user.id),
    enabled: !!session && status === "verified",
  });

  const onSignOut = () => {
    Alert.alert("Sign out?", "You can sign back in any time.", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: signOut },
    ]);
  };

  const onDeleteAccount = () =>
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
              Alert.alert("Could not delete account", err instanceof Error ? err.message : "Please try again.");
            }
          },
        },
      ]
    );

  return (
    <Screen scroll>
      <View style={styles.hero}>
        {profile?.avatar_url ? (
          <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Text style={styles.avatarInitial}>{(profile?.full_name ?? "?").slice(0, 1).toUpperCase()}</Text>
          </View>
        )}
        <Text style={styles.name}>{profile?.full_name ?? "Your profile"}</Text>
        {!!profile?.username && <Text style={styles.username}>@{profile.username}</Text>}
        <View style={styles.badge}>
          <Ionicons name={statusMeta.icon} size={14} color={statusMeta.color} />
          <Text style={[styles.badgeText, { color: statusMeta.color }]}>{statusMeta.label}</Text>
        </View>
      </View>

      <View style={styles.ratingsRow}>
        <RatingCard
          value={profile?.host_rating_avg}
          count={profile?.host_rating_count ?? 0}
          label="Host rating"
        />
        <RatingCard
          value={profile?.guest_rating_avg}
          count={profile?.guest_rating_count ?? 0}
          label="Guest rating"
        />
      </View>

      <SectionLabel>Account</SectionLabel>
      <SectionCard>
        <MenuRow
          icon="person-circle-outline"
          label="Edit profile"
          onPress={() => router.push("/settings/edit-profile")}
        />
        <MenuRow icon="star-outline" label="My reviews" onPress={() => router.push("/settings/reviews")} />
        <MenuRow
          icon="notifications-outline"
          label="Notification settings"
          onPress={() => router.push("/settings/notifications")}
        />
        <MenuRow
          icon="hand-left-outline"
          label="Blocked users"
          onPress={() => router.push("/settings/blocked-users")}
          last
        />
      </SectionCard>

      {status === "verified" && (
        <>
          <SectionLabel>Organization</SectionLabel>
          <SectionCard>
            {myOrgs.length > 0 ? (
              myOrgs.map((org, index) => (
                <MenuRow
                  key={org.id}
                  icon="business-outline"
                  label={org.name}
                  onPress={() => router.push(`/org/${org.id}`)}
                  last={index === myOrgs.length - 1}
                />
              ))
            ) : (
              <MenuRow
                icon="add-circle-outline"
                label="Create an organization"
                onPress={() => router.push("/org/create")}
                last
              />
            )}
          </SectionCard>
        </>
      )}

      {isAdmin && (
        <>
          <SectionLabel>Admin</SectionLabel>
          <SectionCard>
            <MenuRow
              icon="shield-checkmark-outline"
              label="Review verifications"
              onPress={() => router.push("/admin/verifications")}
            />
            <MenuRow
              icon="flag-outline"
              label="Open reports"
              onPress={() => router.push("/admin/reports")}
              last
            />
          </SectionCard>
        </>
      )}

      <SectionLabel>Session</SectionLabel>
      <SectionCard>
        <MenuRow icon="log-out-outline" label="Sign out" onPress={onSignOut} tone="danger" last />
      </SectionCard>

      <View style={styles.legalRow}>
        <Pressable onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}>
          <Text style={styles.legalLink}>Privacy Policy</Text>
        </Pressable>
        <Text style={styles.legalDivider}>·</Text>
        <Pressable onPress={() => Linking.openURL(TERMS_OF_SERVICE_URL)}>
          <Text style={styles.legalLink}>Terms of Service</Text>
        </Pressable>
      </View>

      <Pressable onPress={onDeleteAccount} hitSlop={8} style={styles.deleteLink}>
        <Text style={styles.deleteLinkText}>Delete account</Text>
      </Pressable>

      <View style={{ height: TAB_BAR_CLEARANCE }} />
    </Screen>
  );
}

function RatingCard({ value, count, label }: { value?: number | null; count: number; label: string }) {
  return (
    <View style={styles.ratingCard}>
      <View style={styles.ratingValueRow}>
        <Ionicons name="star" size={16} color={colors.warning} />
        <Text style={styles.ratingValue}>{value ? value.toFixed(1) : "—"}</Text>
      </View>
      <Text style={styles.ratingLabel}>
        {label} ({count})
      </Text>
    </View>
  );
}

function SectionLabel({ children }: { children: string }) {
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

function SectionCard({ children }: { children: React.ReactNode }) {
  return <View style={styles.sectionCard}>{children}</View>;
}

function MenuRow({
  icon,
  label,
  onPress,
  tone = "default",
  last = false,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  tone?: "default" | "danger";
  last?: boolean;
}) {
  const isDanger = tone === "danger";
  return (
    <Pressable
      style={({ pressed }) => [styles.row, !last && styles.rowDivider, pressed && styles.rowPressed]}
      onPress={onPress}
    >
      <View style={[styles.rowIconWrap, isDanger && styles.rowIconWrapDanger]}>
        <Ionicons name={icon} size={18} color={isDanger ? colors.danger : colors.primary} />
      </View>
      <Text style={[styles.rowLabel, isDanger && styles.rowLabelDanger]} numberOfLines={1}>
        {label}
      </Text>
      {!isDanger && <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: "center", paddingTop: spacing.lg, gap: 4 },
  avatar: { width: 96, height: 96, borderRadius: radii.full, ...shadows.card },
  avatarFallback: { backgroundColor: colors.primaryMuted, alignItems: "center", justifyContent: "center" },
  avatarInitial: { fontSize: 36, fontWeight: "700", color: colors.primary },
  name: { ...typography.heading, marginTop: spacing.sm },
  username: { color: colors.textMuted },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.full,
    backgroundColor: colors.surface,
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
  ratingValueRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  ratingValue: { ...typography.heading },
  ratingLabel: { ...typography.caption, textAlign: "center" },
  sectionLabel: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  sectionCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  rowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  rowPressed: { backgroundColor: colors.surface },
  rowIconWrap: {
    width: 30,
    height: 30,
    borderRadius: radii.sm,
    backgroundColor: colors.primaryMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  rowIconWrapDanger: { backgroundColor: "#FFE5E3" },
  rowLabel: { ...typography.body, flex: 1 },
  rowLabelDanger: { color: colors.danger, fontWeight: "600" },
  legalRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  legalLink: { ...typography.caption, color: colors.textMuted, textDecorationLine: "underline" },
  legalDivider: { ...typography.caption, color: colors.textFaint },
  deleteLink: { alignSelf: "center", marginTop: spacing.md, padding: spacing.xs },
  deleteLinkText: { ...typography.caption, color: colors.danger },
});

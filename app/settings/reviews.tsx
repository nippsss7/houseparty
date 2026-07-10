import { useQuery } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { FlatList, Image, StyleSheet, Text, View } from "react-native";

import { fetchReviewsForUser, type ReceivedReview } from "@/features/reviews/api";
import { useAuth } from "@/hooks/useAuth";
import { colors, radii, spacing, typography } from "@/lib/theme";

export default function MyReviewsScreen() {
  const { session } = useAuth();

  const { data: reviews = [], isPending } = useQuery({
    queryKey: ["received-reviews", session?.user.id],
    queryFn: () => fetchReviewsForUser(session!.user.id),
    enabled: !!session,
  });

  return (
    <>
      <Stack.Screen options={{ title: "My reviews" }} />
      <View style={styles.container}>
        {!isPending && reviews.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>⭐️</Text>
            <Text style={typography.heading}>No reviews yet</Text>
            <Text style={styles.emptyBody}>
              After events you host or attend, the other side can leave you a review.
            </Text>
          </View>
        ) : (
          <FlatList
            data={reviews}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }: { item: ReceivedReview }) => (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  {item.reviewer?.avatar_url ? (
                    <Image source={{ uri: item.reviewer.avatar_url }} style={styles.avatar} />
                  ) : (
                    <View style={[styles.avatar, styles.avatarFallback]}>
                      <Text style={styles.avatarInitial}>
                        {(item.reviewer?.full_name ?? "?").slice(0, 1).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <View style={styles.headerText}>
                    <Text style={typography.body}>{item.reviewer?.full_name ?? "Someone"}</Text>
                    <Text style={styles.meta}>
                      {item.direction === "guest_to_host" ? "as your guest" : "as your host"} ·{" "}
                      {item.event?.title}
                    </Text>
                  </View>
                  <Text style={styles.rating}>
                    {"★".repeat(item.rating)}
                    <Text style={styles.ratingFaint}>{"★".repeat(5 - item.rating)}</Text>
                  </Text>
                </View>
                {!!item.comment && <Text style={styles.comment}>“{item.comment}”</Text>}
              </View>
            )}
          />
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  listContent: { padding: spacing.lg, gap: spacing.md },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  headerText: { flex: 1 },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  avatarFallback: {
    backgroundColor: colors.primaryMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: { ...typography.body, color: colors.primary, fontWeight: "700" },
  meta: { ...typography.caption, color: colors.textMuted },
  rating: { fontSize: 15, color: colors.warning, letterSpacing: 1 },
  ratingFaint: { color: colors.surfaceElevated },
  comment: { ...typography.body, color: colors.textMuted, fontStyle: "italic" },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  emptyEmoji: { fontSize: 48 },
  emptyBody: { ...typography.body, color: colors.textMuted, textAlign: "center" },
});

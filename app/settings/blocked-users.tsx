import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { FlatList, Image, StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/Button";
import { fetchBlockedUsers, unblockUser, type BlockedUser } from "@/features/safety/api";
import { colors, radii, spacing, typography } from "@/lib/theme";

export default function BlockedUsersScreen() {
  const queryClient = useQueryClient();

  const { data: blocked = [], isPending } = useQuery({
    queryKey: ["blocked-users"],
    queryFn: fetchBlockedUsers,
  });

  const unblock = useMutation({
    mutationFn: (userId: string) => unblockUser(userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["blocked-users"] }),
  });

  return (
    <>
      <Stack.Screen options={{ title: "Blocked users" }} />
      <View style={styles.container}>
        {!isPending && blocked.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🚫</Text>
            <Text style={typography.heading}>No one blocked</Text>
            <Text style={styles.emptyBody}>
              Users you block won't see your events, and you won't see theirs.
            </Text>
          </View>
        ) : (
          <FlatList
            data={blocked}
            keyExtractor={(item) => item.blocked_id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }: { item: BlockedUser }) => (
              <View style={styles.card}>
                {item.blocked?.avatar_url ? (
                  <Image source={{ uri: item.blocked.avatar_url }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, styles.avatarFallback]}>
                    <Text style={styles.avatarInitial}>
                      {(item.blocked?.full_name ?? "?").slice(0, 1).toUpperCase()}
                    </Text>
                  </View>
                )}
                <Text style={styles.name} numberOfLines={1}>
                  {item.blocked?.full_name ?? "Unknown user"}
                </Text>
                <Button
                  label="Unblock"
                  variant="secondary"
                  onPress={() => unblock.mutate(item.blocked_id)}
                  loading={unblock.isPending && unblock.variables === item.blocked_id}
                />
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
  listContent: { padding: spacing.lg, gap: spacing.sm },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  avatarFallback: {
    backgroundColor: colors.primaryMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: { ...typography.body, color: colors.primary, fontWeight: "700" },
  name: { ...typography.body, flex: 1 },
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

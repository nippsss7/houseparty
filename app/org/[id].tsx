import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/Button";
import {
  fetchIsFollowing,
  fetchOrganization,
  fetchOrganizationEvents,
  fetchOrganizationPosts,
  followOrganization,
  orgPhotoUrl,
  unfollowOrganization,
  type OrganizationPost,
} from "@/features/organizations/api";
import { useAuth } from "@/hooks/useAuth";
import { colors, radii, spacing, typography } from "@/lib/theme";

type Tab = "posts" | "events";

export default function OrganizationProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const [tab, setTab] = useState<Tab>("posts");

  const { data: org, isPending } = useQuery({
    queryKey: ["organization", id],
    queryFn: () => fetchOrganization(id),
    enabled: !!id,
  });

  const { data: isFollowing } = useQuery({
    queryKey: ["org-following", id, session?.user.id],
    queryFn: () => fetchIsFollowing(id, session!.user.id),
    enabled: !!id && !!session,
  });

  const { data: posts = [] } = useQuery({
    queryKey: ["org-posts", id],
    queryFn: () => fetchOrganizationPosts(id),
    enabled: !!id && tab === "posts",
  });

  const { data: events = [] } = useQuery({
    queryKey: ["org-events", id],
    queryFn: () => fetchOrganizationEvents(id),
    enabled: !!id && tab === "events",
  });

  const follow = useMutation({
    mutationFn: () => followOrganization(id, session!.user.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org-following", id] });
      queryClient.invalidateQueries({ queryKey: ["organization", id] });
    },
  });
  const unfollow = useMutation({
    mutationFn: () => unfollowOrganization(id, session!.user.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org-following", id] });
      queryClient.invalidateQueries({ queryKey: ["organization", id] });
    },
  });

  if (isPending || !org) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const isOwner = org.owner_id === session?.user.id;

  return (
    <>
      <Stack.Screen options={{ title: org.name }} />
      <ScrollView style={styles.container}>
        {org.cover_url ? (
          <Image source={{ uri: org.cover_url }} style={styles.cover} />
        ) : (
          <View style={[styles.cover, styles.coverFallback]} />
        )}

        <View style={styles.header}>
          {org.avatar_url ? (
            <Image source={{ uri: org.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Text style={styles.avatarEmoji}>🏢</Text>
            </View>
          )}
          <Text style={typography.title}>{org.name}</Text>
          <Text style={styles.handle}>@{org.handle}</Text>
          {!!org.bio && <Text style={styles.bio}>{org.bio}</Text>}
          <Text style={styles.followerCount}>
            {org.follower_count} {org.follower_count === 1 ? "follower" : "followers"}
          </Text>

          {isOwner ? (
            <Button label="New post" onPress={() => router.push(`/org/${org.id}/post`)} />
          ) : (
            <Button
              label={isFollowing ? "Following" : "Follow"}
              variant={isFollowing ? "secondary" : "primary"}
              onPress={() => (isFollowing ? unfollow.mutate() : follow.mutate())}
              loading={follow.isPending || unfollow.isPending}
            />
          )}
        </View>

        <View style={styles.tabs}>
          <TabButton label="Posts" active={tab === "posts"} onPress={() => setTab("posts")} />
          <TabButton label="Upcoming events" active={tab === "events"} onPress={() => setTab("events")} />
        </View>

        {tab === "posts" &&
          (posts.length === 0 ? (
            <Text style={styles.emptyText}>No posts yet.</Text>
          ) : (
            posts.map((post: OrganizationPost) => <PostCard key={post.id} post={post} />)
          ))}

        {tab === "events" &&
          (events.length === 0 ? (
            <Text style={styles.emptyText}>No upcoming events.</Text>
          ) : (
            <View style={styles.eventsList}>
              {events.map((event: { id: string; title: string; city: string; start_at: string; price_per_person: number }) => (
                <Pressable
                  key={event.id}
                  style={styles.eventCard}
                  onPress={() => router.push(`/event/${event.id}`)}
                >
                  <Text style={typography.body} numberOfLines={1}>
                    {event.title}
                  </Text>
                  <Text style={styles.eventMeta}>
                    {event.city} ·{" "}
                    {new Date(event.start_at).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                    {Number(event.price_per_person) > 0 ? ` · $${event.price_per_person}` : " · Free"}
                  </Text>
                </Pressable>
              ))}
            </View>
          ))}
      </ScrollView>
    </>
  );
}

function TabButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.tabButton, active && styles.tabButtonActive]} onPress={onPress}>
      <Text style={[styles.tabButtonText, active && styles.tabButtonTextActive]}>{label}</Text>
    </Pressable>
  );
}

function PostCard({ post }: { post: OrganizationPost }) {
  const photos = [...(post.photos ?? [])].sort((a, b) => a.position - b.position);
  return (
    <View style={styles.postCard}>
      {photos.length > 0 && (
        <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
          {photos.map((photo) => (
            <Image
              key={photo.id}
              source={{ uri: orgPhotoUrl(photo.storage_path) }}
              style={styles.postImage}
            />
          ))}
        </ScrollView>
      )}
      {!!post.caption && <Text style={styles.postCaption}>{post.caption}</Text>}
      <Text style={styles.postDate}>{new Date(post.created_at).toLocaleDateString()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  cover: { width: "100%", height: 140 },
  coverFallback: { backgroundColor: colors.surface },
  header: { alignItems: "center", paddingHorizontal: spacing.lg, marginTop: -44, gap: spacing.xs },
  avatar: { width: 88, height: 88, borderRadius: radii.full, borderWidth: 3, borderColor: colors.background },
  avatarFallback: {
    backgroundColor: colors.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarEmoji: { fontSize: 32 },
  handle: { color: colors.textMuted },
  bio: { ...typography.body, color: colors.textMuted, textAlign: "center", marginTop: spacing.xs },
  followerCount: { ...typography.caption, color: colors.textFaint, marginBottom: spacing.sm },
  tabs: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  tabButton: { paddingVertical: spacing.sm, marginRight: spacing.lg, borderBottomWidth: 2, borderBottomColor: "transparent" },
  tabButtonActive: { borderBottomColor: colors.primary },
  tabButtonText: { ...typography.label, color: colors.textMuted },
  tabButtonTextActive: { color: colors.text },
  emptyText: { ...typography.body, color: colors.textMuted, textAlign: "center", padding: spacing.xl },
  eventsList: { padding: spacing.lg, gap: spacing.sm },
  eventCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: 4,
  },
  eventMeta: { ...typography.caption, color: colors.textMuted },
  postCard: { paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  postImage: { width: 393, height: 300 },
  postCaption: { ...typography.body, paddingHorizontal: spacing.lg, marginTop: spacing.sm },
  postDate: { ...typography.caption, color: colors.textFaint, paddingHorizontal: spacing.lg, marginTop: 4 },
});

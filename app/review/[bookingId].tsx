import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { Button } from "@/components/Button";
import { fetchMyReviewForBooking, submitReview } from "@/features/reviews/api";
import { useAuth } from "@/hooks/useAuth";
import { colors, radii, spacing, typography } from "@/lib/theme";

export default function ReviewComposerScreen() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data: existing, isPending: isChecking } = useQuery({
    queryKey: ["my-review", bookingId, session?.user.id],
    queryFn: () => fetchMyReviewForBooking(session!.user.id, bookingId),
    enabled: !!bookingId && !!session,
  });

  const submit = useMutation({
    mutationFn: () => submitReview({ bookingId, rating, comment: comment || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-review"] });
      queryClient.invalidateQueries({ queryKey: ["received-reviews"] });
      router.back();
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Something went wrong"),
  });

  const alreadyReviewed = !!existing;
  const displayRating = alreadyReviewed ? existing.rating : rating;

  return (
    <>
      <Stack.Screen options={{ title: alreadyReviewed ? "Your review" : "Leave a review" }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={typography.heading}>
          {alreadyReviewed ? "You rated this" : "How was it?"}
        </Text>

        <View style={styles.stars}>
          {[1, 2, 3, 4, 5].map((value) => (
            <Pressable
              key={value}
              disabled={alreadyReviewed}
              onPress={() => setRating(value)}
              hitSlop={6}
            >
              <Text style={[styles.star, value <= displayRating && styles.starActive]}>★</Text>
            </Pressable>
          ))}
        </View>

        {alreadyReviewed ? (
          !!existing.comment && <Text style={styles.existingComment}>“{existing.comment}”</Text>
        ) : (
          <TextInput
            placeholder="Share a few words (optional)"
            placeholderTextColor={colors.textFaint}
            value={comment}
            onChangeText={setComment}
            multiline
            maxLength={1000}
            style={styles.commentInput}
          />
        )}

        {!!error && <Text style={styles.error}>{error}</Text>}

        {!alreadyReviewed && !isChecking && (
          <Button
            label="Submit review"
            onPress={() => {
              if (rating === 0) {
                setError("Tap a star rating first");
                return;
              }
              setError(null);
              submit.mutate();
            }}
            loading={submit.isPending}
          />
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.lg },
  stars: { flexDirection: "row", gap: spacing.md, justifyContent: "center" },
  star: { fontSize: 44, color: colors.surfaceElevated },
  starActive: { color: colors.warning },
  existingComment: { ...typography.body, color: colors.textMuted, fontStyle: "italic", textAlign: "center" },
  commentInput: {
    minHeight: 100,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    fontSize: 16,
    color: colors.text,
    textAlignVertical: "top",
  },
  error: { fontSize: 13, color: colors.danger, textAlign: "center" },
});

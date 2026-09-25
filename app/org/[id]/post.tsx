import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/Button";
import { TextField } from "@/components/TextField";
import { createOrganizationPost } from "@/features/organizations/api";
import { useAuth } from "@/hooks/useAuth";
import { useImagePicker } from "@/hooks/useImagePicker";
import { colors, radii, spacing, typography } from "@/lib/theme";

const MAX_PHOTOS = 5;

export default function CreateOrganizationPostScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const { pickMultipleFromLibrary } = useImagePicker();

  const [caption, setCaption] = useState("");
  const [photoUris, setPhotoUris] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const onAddPhotos = async () => {
    const uris = await pickMultipleFromLibrary(MAX_PHOTOS - photoUris.length);
    if (uris.length > 0) setPhotoUris([...photoUris, ...uris].slice(0, MAX_PHOTOS));
  };

  const removePhoto = (uri: string) => setPhotoUris(photoUris.filter((u) => u !== uri));

  const publish = useMutation({
    mutationFn: () => {
      if (!session) throw new Error("Not signed in");
      return createOrganizationPost({
        organizationId: id,
        ownerId: session.user.id,
        caption: caption.trim() || undefined,
        photoUris,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org-posts", id] });
      router.back();
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Couldn't publish post — try again"),
  });

  const canPublish = caption.trim().length > 0 || photoUris.length > 0;

  return (
    <>
      <Stack.Screen options={{ title: "New post" }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={typography.label}>
          Photos ({photoUris.length}/{MAX_PHOTOS})
        </Text>
        <View style={styles.photoGrid}>
          {photoUris.map((uri) => (
            <Pressable key={uri} style={styles.photoWrap} onPress={() => removePhoto(uri)}>
              <Image source={{ uri }} style={styles.photo} />
              <View style={styles.photoRemove}>
                <Text style={styles.photoRemoveText}>✕</Text>
              </View>
            </Pressable>
          ))}
          {photoUris.length < MAX_PHOTOS && (
            <Pressable style={styles.addPhoto} onPress={onAddPhotos}>
              <Text style={styles.addPhotoText}>＋</Text>
            </Pressable>
          )}
        </View>

        <TextField
          label="Caption (optional)"
          placeholder="What's the vibe for this one?"
          value={caption}
          onChangeText={setCaption}
          multiline
          style={styles.captionInput}
          maxLength={500}
        />

        {!!error && <Text style={styles.error}>{error}</Text>}
        <Button label="Publish post" onPress={() => publish.mutate()} loading={publish.isPending} disabled={!canPublish} />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  photoWrap: { position: "relative" },
  photo: { width: 96, height: 96, borderRadius: radii.sm },
  photoRemove: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  photoRemoveText: { color: colors.text, fontSize: 11, fontWeight: "700" },
  addPhoto: {
    width: 96,
    height: 96,
    borderRadius: radii.sm,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  addPhotoText: { color: colors.textMuted, fontSize: 28 },
  captionInput: { height: 100, paddingTop: spacing.md, textAlignVertical: "top" },
  error: { fontSize: 13, color: colors.danger },
});

import { useQueryClient } from "@tanstack/react-query";
import { Stack, useRouter } from "expo-router";
import { useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/Button";
import { TextField } from "@/components/TextField";
import { updateProfile, uploadAvatar } from "@/features/profile/api";
import { useAuth } from "@/hooks/useAuth";
import { useImagePicker } from "@/hooks/useImagePicker";
import { useAuthStore } from "@/stores/authStore";
import { colors, radii, spacing, typography } from "@/lib/theme";

export default function EditProfileScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { session, profile } = useAuth();
  const { pickWithSourceChoice } = useImagePicker();

  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [username, setUsername] = useState(profile?.username ?? "");
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [newAvatarUri, setNewAvatarUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const avatarShown = newAvatarUri ?? profile?.avatar_url ?? null;

  const onSave = async () => {
    if (!session || !profile) return;
    if (fullName.trim().length < 2) {
      setError("Enter your name");
      return;
    }
    if (!/^[a-z0-9_.-]{3,30}$/i.test(username.trim())) {
      setError("Username: 3-30 letters, numbers, dots, dashes or underscores");
      return;
    }
    setError(null);
    setIsSaving(true);
    try {
      let avatarUrl: string | undefined;
      if (newAvatarUri) avatarUrl = await uploadAvatar(session.user.id, newAvatarUri);
      await updateProfile({
        userId: session.user.id,
        fullName: fullName.trim(),
        username: username.trim(),
        bio: bio.trim() || undefined,
        avatarUrl,
      });
      useAuthStore.getState().setProfile({
        ...profile,
        full_name: fullName.trim(),
        username: username.trim(),
        bio: bio.trim() || null,
        ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
      });
      queryClient.invalidateQueries({ queryKey: ["event"] });
      router.back();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save — try again");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: "Edit profile" }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Pressable style={styles.avatarWrap} onPress={async () => {
          const uri = await pickWithSourceChoice();
          if (uri) setNewAvatarUri(uri);
        }}>
          {avatarShown ? (
            <Image source={{ uri: avatarShown }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Text style={styles.avatarEmoji}>📷</Text>
            </View>
          )}
          <Text style={styles.avatarHint}>Tap to change photo</Text>
        </Pressable>

        <TextField label="Full name" value={fullName} onChangeText={setFullName} />
        <TextField
          label="Username"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TextField
          label="Bio"
          value={bio}
          onChangeText={setBio}
          multiline
          style={styles.bioInput}
          maxLength={300}
          placeholder="Tell people a little about yourself"
        />

        {!!error && <Text style={styles.error}>{error}</Text>}
        <Button label="Save changes" onPress={onSave} loading={isSaving} />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.sm, paddingBottom: spacing.xxl },
  avatarWrap: { alignItems: "center", gap: spacing.xs, marginBottom: spacing.lg },
  avatar: { width: 96, height: 96, borderRadius: radii.full },
  avatarFallback: {
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarEmoji: { fontSize: 32 },
  avatarHint: { ...typography.caption, color: colors.primary },
  bioInput: { height: 90, paddingTop: spacing.md, textAlignVertical: "top" },
  error: { fontSize: 13, color: colors.danger },
});

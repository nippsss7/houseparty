import { useQueryClient } from "@tanstack/react-query";
import { Stack, useRouter } from "expo-router";
import { useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/Button";
import { TextField } from "@/components/TextField";
import { createOrganization, isHandleAvailable } from "@/features/organizations/api";
import { useAuth } from "@/hooks/useAuth";
import { useImagePicker } from "@/hooks/useImagePicker";
import { colors, radii, spacing, typography } from "@/lib/theme";

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9_\s]/g, "")
    .trim()
    .replace(/\s+/g, "_")
    .slice(0, 30);
}

export default function CreateOrganizationScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const { pickWithSourceChoice } = useImagePicker();

  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [handleEdited, setHandleEdited] = useState(false);
  const [bio, setBio] = useState("");
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const onNameChange = (value: string) => {
    setName(value);
    if (!handleEdited) setHandle(slugify(value));
  };

  const onSubmit = async () => {
    if (!session) return;
    if (name.trim().length < 2) {
      setError("Give your company a name");
      return;
    }
    if (!/^[a-z0-9_]{3,30}$/.test(handle)) {
      setError("Handle: 3-30 lowercase letters, numbers, or underscores");
      return;
    }
    setError(null);
    setIsSaving(true);
    try {
      const available = await isHandleAvailable(handle);
      if (!available) {
        setError("That handle is already taken");
        setIsSaving(false);
        return;
      }
      const org = await createOrganization({
        ownerId: session.user.id,
        name: name.trim(),
        handle,
        bio: bio.trim() || undefined,
        avatarUri: avatarUri ?? undefined,
      });
      queryClient.invalidateQueries({ queryKey: ["my-organizations"] });
      router.replace(`/org/${org.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't create organization — try again");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: "Create organization" }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.subheading}>
          A company profile lets you post as a brand — events, photos, and updates — instead of your
          personal account. Anyone can follow it for updates.
        </Text>

        <Pressable
          style={styles.avatarWrap}
          onPress={async () => {
            const uri = await pickWithSourceChoice();
            if (uri) setAvatarUri(uri);
          }}
        >
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Text style={styles.avatarEmoji}>🏢</Text>
            </View>
          )}
          <Text style={styles.avatarHint}>Tap to add a logo</Text>
        </Pressable>

        <TextField label="Company name" placeholder="Sunset Rooftop Events" value={name} onChangeText={onNameChange} />
        <TextField
          label="Handle"
          placeholder="sunset_rooftop"
          value={handle}
          onChangeText={(value) => {
            setHandleEdited(true);
            setHandle(slugify(value));
          }}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TextField
          label="Bio (optional)"
          placeholder="What kind of events do you throw?"
          value={bio}
          onChangeText={setBio}
          multiline
          style={styles.bioInput}
          maxLength={500}
        />

        {!!error && <Text style={styles.error}>{error}</Text>}
        <Button label="Create organization" onPress={onSubmit} loading={isSaving} />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.sm, paddingBottom: spacing.xxl },
  subheading: { ...typography.body, color: colors.textMuted, marginBottom: spacing.md },
  avatarWrap: { alignItems: "center", gap: spacing.xs, marginBottom: spacing.lg },
  avatar: { width: 88, height: 88, borderRadius: radii.full },
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

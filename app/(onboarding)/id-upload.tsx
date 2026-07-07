import { useRouter } from "expo-router";
import { useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { submitIdVerification } from "@/features/verification/api";
import { documentTypeOptions } from "@/features/verification/schemas";
import { useAuth } from "@/hooks/useAuth";
import { useImagePicker } from "@/hooks/useImagePicker";
import { colors, radii, spacing, typography } from "@/lib/theme";
import type { DocumentType } from "@/types/domain";

export default function IdUploadScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const { pickWithSourceChoice } = useImagePicker();
  const [documentType, setDocumentType] = useState<DocumentType>("drivers_license");
  const [frontUri, setFrontUri] = useState<string | null>(null);
  const [backUri, setBackUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const needsBack = documentType !== "passport";

  const onSubmit = async () => {
    if (!session) return;
    if (!frontUri) {
      setError("Please add a photo of the front of your ID.");
      return;
    }
    if (needsBack && !backUri) {
      setError("Please add a photo of the back of your ID.");
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await submitIdVerification({
        userId: session.user.id,
        documentType,
        frontUri,
        backUri: backUri ?? undefined,
      });
      router.replace("/(onboarding)/pending-review");
    } catch (err) {
      console.error("ID verification submit failed:", err);
      setError(err instanceof Error ? err.message : "Upload failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Screen scroll>
      <Text style={styles.heading}>Verify your identity</Text>
      <Text style={styles.subheading}>
        We manually review every ID to keep HouseParty safe. Your document is stored securely and
        only visible to our review team.
      </Text>

      <Text style={typography.label}>Document type</Text>
      <View style={styles.optionsRow}>
        {documentTypeOptions.map((option) => (
          <Pressable
            key={option.value}
            style={[styles.option, documentType === option.value && styles.optionSelected]}
            onPress={() => setDocumentType(option.value)}
          >
            <Text
              style={[
                styles.optionText,
                documentType === option.value && styles.optionTextSelected,
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <UploadSlot
        label="Front of ID"
        uri={frontUri}
        onPick={async () => setFrontUri(await pickWithSourceChoice())}
      />
      {needsBack && (
        <UploadSlot
          label="Back of ID"
          uri={backUri}
          onPick={async () => setBackUri(await pickWithSourceChoice())}
        />
      )}

      {!!error && <Text style={styles.error}>{error}</Text>}
      <View style={styles.spacer} />
      <Button label="Submit for review" onPress={onSubmit} loading={isSubmitting} />
    </Screen>
  );
}

function UploadSlot({
  label,
  uri,
  onPick,
}: {
  label: string;
  uri: string | null;
  onPick: () => void;
}) {
  return (
    <View style={styles.uploadSlot}>
      <Text style={typography.label}>{label}</Text>
      <Pressable style={styles.uploadArea} onPress={onPick}>
        {uri ? (
          <Image source={{ uri }} style={styles.uploadImage} />
        ) : (
          <Text style={styles.uploadPlaceholder}>Tap to add photo</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  heading: { ...typography.title, marginTop: spacing.xl, marginBottom: spacing.xs },
  subheading: { ...typography.body, color: colors.textMuted, marginBottom: spacing.lg },
  optionsRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.xs, marginBottom: spacing.lg },
  option: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  optionSelected: { borderColor: colors.primary, backgroundColor: colors.primaryMuted },
  optionText: { color: colors.textMuted, fontWeight: "600" },
  optionTextSelected: { color: colors.text },
  uploadSlot: { marginBottom: spacing.lg, gap: spacing.xs },
  uploadArea: {
    height: 160,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: "dashed",
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  uploadImage: { width: "100%", height: "100%" },
  uploadPlaceholder: { color: colors.textMuted },
  error: { color: colors.danger, marginBottom: spacing.md },
  spacer: { height: spacing.sm },
});

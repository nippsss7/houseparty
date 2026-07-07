import { zodResolver } from "@hookform/resolvers/zod";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { TextField } from "@/components/TextField";
import { completeProfileSetup, uploadAvatar } from "@/features/profile/api";
import { profileSetupSchema, type ProfileSetupFormValues } from "@/features/profile/schemas";
import { useImagePicker } from "@/hooks/useImagePicker";
import { useAuth } from "@/hooks/useAuth";
import { colors, radii, spacing, typography } from "@/lib/theme";

export default function ProfileSetupScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const { pickWithSourceChoice } = useImagePicker();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ProfileSetupFormValues>({
    resolver: zodResolver(profileSetupSchema),
    defaultValues: {
      fullName: session?.user.user_metadata?.full_name ?? "",
      username: "",
      bio: "",
    },
  });

  const avatarUri = watch("avatarUri");
  const dateOfBirth = watch("dateOfBirth");

  const onPickAvatar = async () => {
    const uri = await pickWithSourceChoice();
    if (uri) setValue("avatarUri", uri, { shouldValidate: true });
  };

  const onSubmit = async (values: ProfileSetupFormValues) => {
    if (!session) return;
    setSubmitError(null);
    try {
      let avatarUrl: string | undefined;
      if (values.avatarUri) {
        avatarUrl = await uploadAvatar(session.user.id, values.avatarUri);
      }
      await completeProfileSetup({
        userId: session.user.id,
        fullName: values.fullName,
        username: values.username,
        bio: values.bio,
        dateOfBirth: values.dateOfBirth,
        avatarUrl,
      });
      router.replace("/(onboarding)/id-upload");
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    }
  };

  return (
    <Screen scroll>
      <Text style={styles.heading}>Set up your profile</Text>
      <Text style={styles.subheading}>This is what other guests and hosts will see.</Text>

      <Pressable style={styles.avatarPicker} onPress={onPickAvatar}>
        {avatarUri ? (
          <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
        ) : (
          <Text style={styles.avatarPlaceholder}>Add photo</Text>
        )}
      </Pressable>

      <Controller
        control={control}
        name="fullName"
        render={({ field }) => (
          <TextField
            label="Full name"
            autoCapitalize="words"
            value={field.value}
            onChangeText={field.onChange}
            error={errors.fullName?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="username"
        render={({ field }) => (
          <TextField
            label="Username"
            autoCapitalize="none"
            value={field.value}
            onChangeText={(text) => field.onChange(text.toLowerCase())}
            error={errors.username?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="bio"
        render={({ field }) => (
          <TextField
            label="Bio (optional)"
            multiline
            numberOfLines={3}
            value={field.value}
            onChangeText={field.onChange}
            error={errors.bio?.message}
          />
        )}
      />

      <Text style={typography.label}>Date of birth</Text>
      <Pressable style={styles.dateInput} onPress={() => setShowDatePicker(true)}>
        <Text style={dateOfBirth ? styles.dateText : styles.datePlaceholder}>
          {dateOfBirth ? dateOfBirth.toLocaleDateString() : "Select date of birth"}
        </Text>
      </Pressable>
      {!!errors.dateOfBirth && <Text style={styles.error}>{errors.dateOfBirth.message}</Text>}
      {showDatePicker && (
        <DateTimePicker
          value={dateOfBirth ?? new Date(2000, 0, 1)}
          mode="date"
          maximumDate={new Date()}
          onChange={(_event, selectedDate) => {
            setShowDatePicker(false);
            if (selectedDate) setValue("dateOfBirth", selectedDate, { shouldValidate: true });
          }}
        />
      )}

      {!!submitError && <Text style={styles.error}>{submitError}</Text>}
      <View style={styles.spacer} />
      <Button label="Continue" onPress={handleSubmit(onSubmit)} loading={isSubmitting} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: { ...typography.title, marginTop: spacing.xl, marginBottom: spacing.xs },
  subheading: { ...typography.body, color: colors.textMuted, marginBottom: spacing.lg },
  avatarPicker: {
    width: 96,
    height: 96,
    borderRadius: radii.full,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: spacing.lg,
    overflow: "hidden",
  },
  avatarImage: { width: "100%", height: "100%" },
  avatarPlaceholder: { color: colors.textMuted, fontSize: 13 },
  dateInput: {
    height: 52,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    justifyContent: "center",
    marginTop: spacing.xs,
  },
  dateText: { color: colors.text, fontSize: 16 },
  datePlaceholder: { color: colors.textFaint, fontSize: 16 },
  error: { color: colors.danger, marginTop: spacing.xs },
  spacer: { height: spacing.lg },
});

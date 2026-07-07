import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { StyleSheet, Text } from "react-native";

import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { TextField } from "@/components/TextField";
import { sendPasswordReset } from "@/features/auth/api";
import { forgotPasswordSchema, type ForgotPasswordFormValues } from "@/features/auth/schemas";
import { colors, spacing, typography } from "@/lib/theme";

export default function ForgotPasswordScreen() {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (values: ForgotPasswordFormValues) => {
    setSubmitError(null);
    try {
      await sendPasswordReset(values.email);
      setSent(true);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    }
  };

  return (
    <Screen scroll>
      <Text style={styles.heading}>Reset your password</Text>
      <Text style={styles.subheading}>We'll email you a link to reset your password.</Text>
      <Controller
        control={control}
        name="email"
        render={({ field }) => (
          <TextField
            label="Email"
            autoCapitalize="none"
            keyboardType="email-address"
            value={field.value}
            onChangeText={field.onChange}
            error={errors.email?.message}
          />
        )}
      />
      {!!submitError && <Text style={styles.error}>{submitError}</Text>}
      {sent && <Text style={styles.success}>Check your email for a reset link.</Text>}
      <Button label="Send reset link" onPress={handleSubmit(onSubmit)} loading={isSubmitting} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: { ...typography.title, marginTop: spacing.xl, marginBottom: spacing.sm },
  subheading: { ...typography.body, color: colors.textMuted, marginBottom: spacing.lg },
  error: { color: colors.danger, marginBottom: spacing.md },
  success: { color: colors.success, marginBottom: spacing.md },
});

import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useRouter } from "expo-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { TextField } from "@/components/TextField";
import { signUpWithEmail } from "@/features/auth/api";
import { signUpSchema, type SignUpFormValues } from "@/features/auth/schemas";
import { colors, spacing, typography } from "@/lib/theme";

export default function SignUpScreen() {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { fullName: "", email: "", password: "", confirmPassword: "" },
  });

  const onSubmit = async (values: SignUpFormValues) => {
    setSubmitError(null);
    try {
      await signUpWithEmail({ email: values.email, password: values.password, fullName: values.fullName });
      // Root layout's redirect precedence takes it from here once the
      // session is established (auth -> onboarding/profile-setup).
      router.replace("/(onboarding)/profile-setup");
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    }
  };

  return (
    <Screen scroll>
      <Text style={styles.heading}>Create your account</Text>
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
      <Controller
        control={control}
        name="password"
        render={({ field }) => (
          <TextField
            label="Password"
            secureTextEntry
            value={field.value}
            onChangeText={field.onChange}
            error={errors.password?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="confirmPassword"
        render={({ field }) => (
          <TextField
            label="Confirm password"
            secureTextEntry
            value={field.value}
            onChangeText={field.onChange}
            error={errors.confirmPassword?.message}
          />
        )}
      />
      {!!submitError && <Text style={styles.error}>{submitError}</Text>}
      <Button label="Create account" onPress={handleSubmit(onSubmit)} loading={isSubmitting} />
      <View style={styles.footer}>
        <Text style={styles.footerText}>Already have an account? </Text>
        <Link href="/(auth)/sign-in" replace>
          <Text style={styles.footerLink}>Sign in</Text>
        </Link>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: { ...typography.title, marginTop: spacing.xl, marginBottom: spacing.lg },
  error: { color: colors.danger, marginBottom: spacing.md },
  footer: { flexDirection: "row", justifyContent: "center", paddingVertical: spacing.xl },
  footerText: { color: colors.textMuted },
  footerLink: { color: colors.primary, fontWeight: "700" },
});

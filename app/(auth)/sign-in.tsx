import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useRouter } from "expo-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { TextField } from "@/components/TextField";
import { signInWithEmail } from "@/features/auth/api";
import { signInSchema, type SignInFormValues } from "@/features/auth/schemas";
import { colors, spacing, typography } from "@/lib/theme";

export default function SignInScreen() {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInFormValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (values: SignInFormValues) => {
    setSubmitError(null);
    try {
      await signInWithEmail(values);
      // Root layout's redirect precedence takes over from here.
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Invalid email or password.");
    }
  };

  return (
    <Screen scroll>
      <Text style={styles.heading}>Welcome back</Text>
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
      {!!submitError && <Text style={styles.error}>{submitError}</Text>}
      <Link href="/(auth)/forgot-password" style={styles.forgot}>
        <Text style={styles.forgotText}>Forgot password?</Text>
      </Link>
      <Button label="Sign in" onPress={handleSubmit(onSubmit)} loading={isSubmitting} />
      <View style={styles.footer}>
        <Text style={styles.footerText}>New to HouseParty? </Text>
        <Link href="/(auth)/sign-up" replace>
          <Text style={styles.footerLink}>Create an account</Text>
        </Link>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: { ...typography.title, marginTop: spacing.xl, marginBottom: spacing.lg },
  error: { color: colors.danger, marginBottom: spacing.md },
  forgot: { alignSelf: "flex-end", marginBottom: spacing.lg },
  forgotText: { color: colors.textMuted },
  footer: { flexDirection: "row", justifyContent: "center", paddingVertical: spacing.xl },
  footerText: { color: colors.textMuted },
  footerLink: { color: colors.primary, fontWeight: "700" },
});

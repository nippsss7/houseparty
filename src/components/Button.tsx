import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";

import { colors, radii, spacing } from "@/lib/theme";

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "ghost";
  disabled?: boolean;
  loading?: boolean;
}

export function Button({ label, onPress, variant = "primary", disabled, loading }: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        variant === "primary" && styles.primary,
        variant === "secondary" && styles.secondary,
        variant === "ghost" && styles.ghost,
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === "primary" ? colors.white : colors.primary} />
      ) : (
        <Text
          style={[
            styles.label,
            variant === "secondary" && styles.secondaryLabel,
            variant === "ghost" && styles.ghostLabel,
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 52,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  primary: { backgroundColor: colors.primary },
  secondary: {
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  ghost: { backgroundColor: "transparent" },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.85 },
  label: { fontSize: 16, fontWeight: "700", color: colors.white },
  secondaryLabel: { color: colors.text },
  ghostLabel: { color: colors.primary },
});

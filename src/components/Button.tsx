import * as Haptics from "expo-haptics";
import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";

import { colors, radii, shadows, spacing } from "@/lib/theme";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "ghost";
  disabled?: boolean;
  loading?: boolean;
}

export function Button({ label, onPress, variant = "primary", disabled, loading }: ButtonProps) {
  const isDisabled = disabled || loading;
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      onPress={() => {
        if (variant !== "ghost") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      onPressIn={() => {
        scale.value = withSpring(0.96, { damping: 16, stiffness: 400 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 12, stiffness: 300 });
      }}
      disabled={isDisabled}
      style={[
        animatedStyle,
        styles.base,
        variant === "primary" && styles.primary,
        variant === "secondary" && styles.secondary,
        variant === "ghost" && styles.ghost,
        isDisabled && styles.disabled,
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
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 52,
    borderRadius: radii.lg,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  primary: { backgroundColor: colors.primary, ...shadows.card, shadowColor: colors.primary, shadowOpacity: 0.28 },
  secondary: { backgroundColor: colors.surface },
  ghost: { backgroundColor: "transparent" },
  disabled: { opacity: 0.4 },
  label: { fontSize: 16, fontWeight: "700", color: colors.white },
  secondaryLabel: { color: colors.text },
  ghostLabel: { color: colors.primary },
});

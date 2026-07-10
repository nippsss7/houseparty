import { StyleSheet, Text, View } from "react-native";

import { colors, spacing, typography } from "@/lib/theme";

export function StepHeader({ step, total, title }: { step: number; total: number; title: string }) {
  return (
    <View style={styles.container}>
      <Text style={styles.step}>
        Step {step} of {total}
      </Text>
      <Text style={typography.title}>{title}</Text>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${(step / total) * 100}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: spacing.md, marginBottom: spacing.lg, gap: spacing.xs },
  step: { ...typography.caption, color: colors.primary, fontWeight: "700" },
  track: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.surfaceElevated,
    marginTop: spacing.sm,
    overflow: "hidden",
  },
  fill: { height: "100%", borderRadius: 2, backgroundColor: colors.primary },
});

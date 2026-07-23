import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/Button";
import { colors, spacing, typography } from "@/lib/theme";

interface FullScreenStateProps {
  emoji: string;
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
}

/** Centered emoji/title/body/action — used for bootstrap failures, render
 * errors, and any query error state that needs a full-screen retry. */
export function FullScreenState({ emoji, title, body, actionLabel, onAction }: FullScreenStateProps) {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={typography.heading}>{title}</Text>
      {!!body && <Text style={styles.body}>{body}</Text>}
      {!!actionLabel && !!onAction && (
        <View style={styles.action}>
          <Button label={actionLabel} onPress={onAction} />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  emoji: { fontSize: 48, marginBottom: spacing.xs },
  body: { ...typography.body, color: colors.textMuted, textAlign: "center" },
  action: { marginTop: spacing.md, alignSelf: "stretch" },
});

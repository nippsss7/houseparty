import { StyleSheet, Text, View } from "react-native";

import { colors, spacing, typography } from "@/lib/theme";

export function PlaceholderNotice({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.sm },
  title: { ...typography.heading },
  body: { ...typography.body, color: colors.textMuted, textAlign: "center" },
});

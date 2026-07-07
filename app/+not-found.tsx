import { Link } from "expo-router";
import { StyleSheet, Text } from "react-native";

import { Screen } from "@/components/Screen";
import { colors, spacing, typography } from "@/lib/theme";

export default function NotFoundScreen() {
  return (
    <Screen>
      <Text style={styles.heading}>This screen doesn't exist.</Text>
      <Link href="/(tabs)/map" style={styles.link}>
        <Text style={styles.linkText}>Go back home</Text>
      </Link>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: { ...typography.heading, textAlign: "center", marginTop: spacing.xxl },
  link: { marginTop: spacing.lg, alignSelf: "center" },
  linkText: { color: colors.primary, fontWeight: "700" },
});

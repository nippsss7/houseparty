import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { colors, spacing, typography } from "@/lib/theme";

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <Screen>
      <View style={styles.hero}>
        <Text style={styles.brand}>HouseParty</Text>
        <Text style={styles.tagline}>Find the party. Tonight.</Text>
      </View>
      <View style={styles.actions}>
        <Button label="Create account" onPress={() => router.push("/(auth)/sign-up")} />
        <Button
          label="I already have an account"
          variant="secondary"
          onPress={() => router.push("/(auth)/sign-in")}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { flex: 1, justifyContent: "center", alignItems: "center" },
  brand: { ...typography.title, fontSize: 40 },
  tagline: { ...typography.body, color: colors.textMuted, marginTop: spacing.sm },
  actions: { gap: spacing.sm, paddingBottom: spacing.xl },
});

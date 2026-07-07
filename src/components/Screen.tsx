import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import type { PropsWithChildren } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors, radii, spacing } from "@/lib/theme";

interface ScreenProps extends PropsWithChildren {
  scroll?: boolean;
  padded?: boolean;
  /** Hide the automatic back button even when navigation history exists. */
  hideBack?: boolean;
}

export function Screen({ children, scroll = false, padded = true, hideBack = false }: ScreenProps) {
  const router = useRouter();
  const showBack = !hideBack && router.canGoBack();

  const content = (
    <View style={[styles.content, padded && styles.padded]}>{children}</View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      {showBack && (
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </Pressable>
        </View>
      )}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {scroll ? (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {content}
          </ScrollView>
        ) : (
          content
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    // Optical centering: the chevron glyph leans right, nudge it back.
    paddingRight: 2,
  },
  backButtonPressed: { opacity: 0.6 },
  scrollContent: { flexGrow: 1 },
  content: { flex: 1 },
  padded: { paddingHorizontal: spacing.lg },
});

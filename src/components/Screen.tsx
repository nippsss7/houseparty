import type { PropsWithChildren } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors, spacing } from "@/lib/theme";

interface ScreenProps extends PropsWithChildren {
  scroll?: boolean;
  padded?: boolean;
}

export function Screen({ children, scroll = false, padded = true }: ScreenProps) {
  const content = (
    <View style={[styles.content, padded && styles.padded]}>{children}</View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
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
  scrollContent: { flexGrow: 1 },
  content: { flex: 1 },
  padded: { paddingHorizontal: spacing.lg },
});

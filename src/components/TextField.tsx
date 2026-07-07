import { StyleSheet, Text, TextInput, type TextInputProps, View } from "react-native";

import { colors, radii, spacing, typography } from "@/lib/theme";

interface TextFieldProps extends TextInputProps {
  label: string;
  error?: string;
}

export function TextField({ label, error, style, ...inputProps }: TextFieldProps) {
  return (
    <View style={styles.container}>
      <Text style={typography.label}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.textFaint}
        style={[styles.input, !!error && styles.inputError, style]}
        {...inputProps}
      />
      {!!error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs, marginBottom: spacing.md },
  input: {
    height: 52,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    fontSize: 16,
    color: colors.text,
  },
  inputError: { borderColor: colors.danger },
  error: { fontSize: 13, color: colors.danger },
});

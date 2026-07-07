export const colors = {
  background: "#0B0B14",
  surface: "#15151F",
  surfaceElevated: "#1E1E2B",
  border: "#2A2A3A",
  primary: "#FF4D8D",
  primaryMuted: "#4A1F31",
  accent: "#7C5CFF",
  text: "#F5F5FA",
  textMuted: "#9B9BAE",
  textFaint: "#6B6B80",
  success: "#3DD68C",
  warning: "#F5A623",
  danger: "#FF5C5C",
  white: "#FFFFFF",
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radii = {
  sm: 8,
  md: 14,
  lg: 20,
  full: 999,
};

export const typography = {
  title: { fontSize: 28, fontWeight: "700" as const, color: colors.text },
  heading: { fontSize: 20, fontWeight: "700" as const, color: colors.text },
  body: { fontSize: 16, fontWeight: "400" as const, color: colors.text },
  caption: { fontSize: 13, fontWeight: "400" as const, color: colors.textMuted },
  label: { fontSize: 14, fontWeight: "600" as const, color: colors.textMuted },
};

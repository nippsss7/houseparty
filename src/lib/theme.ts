// Light, Apple-HIG-inspired palette. iOS renders the system font (San
// Francisco) automatically, so no custom font loading is needed for the
// "native" feel — just the right sizes, weights, and tracking.

export const colors = {
  background: "#FFFFFF",
  surface: "#F7F7F9",
  surfaceElevated: "#FFFFFF",
  border: "#E5E5EA",
  primary: "#FF3B7F",
  primaryMuted: "#FFE3ED",
  accent: "#5E5CE6",
  text: "#1C1C1E",
  textMuted: "#8E8E93",
  textFaint: "#C7C7CC",
  success: "#34C759",
  warning: "#FF9500",
  danger: "#FF3B30",
  white: "#FFFFFF",
  black: "#000000",
};

// Approximate footprint of the floating glass tab bar (item row + vertical
// padding + bottom margin), so scrollable tab screens can reserve room at
// the bottom instead of letting their last item hide underneath it.
export const TAB_BAR_CLEARANCE = 100;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radii = {
  sm: 10,
  md: 16,
  lg: 22,
  full: 999,
};

// Soft, low-opacity iOS-style shadows — subtle elevation rather than the
// harsher default RN/Android shadow look.
export const shadows = {
  card: {
    shadowColor: colors.black,
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  floating: {
    shadowColor: colors.black,
    shadowOpacity: 0.14,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
};

export const typography = {
  title: { fontSize: 28, fontWeight: "700" as const, color: colors.text, letterSpacing: -0.4 },
  heading: { fontSize: 20, fontWeight: "700" as const, color: colors.text, letterSpacing: -0.3 },
  body: { fontSize: 16, fontWeight: "400" as const, color: colors.text },
  caption: { fontSize: 13, fontWeight: "400" as const, color: colors.textMuted },
  label: { fontSize: 14, fontWeight: "600" as const, color: colors.textMuted },
};

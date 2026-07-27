import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { colors, radii, shadows, spacing } from "@/lib/theme";

// Loosely-typed on purpose: react-navigation's BottomTabBarProps aren't
// re-exported by expo-router (which bundles its own internal copy), so this
// captures only the shape actually used here rather than reaching into
// non-exported internals.
interface TabBarProps {
  state: { index: number; routes: { key: string; name: string; params?: object }[] };
  descriptors: Record<string, { options: { title?: string } }>;
  navigation: {
    navigate: (name: string, params?: object) => void;
    emit: (event: {
      type: string;
      target: string;
      canPreventDefault?: boolean;
    }) => { defaultPrevented: boolean };
  };
}

const ICONS: Record<string, { outline: keyof typeof Ionicons.glyphMap; filled: keyof typeof Ionicons.glyphMap }> = {
  "map/index": { outline: "map-outline", filled: "map" },
  "explore/index": { outline: "compass-outline", filled: "compass" },
  "bookings/index": { outline: "ticket-outline", filled: "ticket" },
  "profile/index": { outline: "person-circle-outline", filled: "person-circle" },
};

export function GlassTabBar({ state, descriptors, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrap, { bottom: insets.bottom + spacing.sm }]} pointerEvents="box-none">
      <BlurView intensity={72} tint="light" style={styles.blur}>
        <View style={styles.tint} />
        <View style={styles.row}>
          {state.routes.map((route, index) => {
            const isFocused = state.index === index;
            const { options } = descriptors[route.key];
            const label = options.title ?? route.name;

            const onPress = () => {
              const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
              Haptics.selectionAsync();
              if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
            };

            if (route.name === "create") {
              return <CreateTabButton key={route.key} focused={isFocused} onPress={onPress} />;
            }

            const icons = ICONS[route.name];
            return (
              <TabItem
                key={route.key}
                label={label}
                focused={isFocused}
                icon={isFocused ? icons?.filled : icons?.outline}
                onPress={onPress}
              />
            );
          })}
        </View>
      </BlurView>
    </View>
  );
}

function TabItem({
  label,
  icon,
  focused,
  onPress,
}: {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  focused: boolean;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => {
        scale.value = withSpring(0.88, { damping: 14, stiffness: 400 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 10, stiffness: 300 });
      }}
      style={styles.item}
      accessibilityRole="button"
      accessibilityState={{ selected: focused }}
    >
      <Animated.View style={animatedStyle}>
        {icon && <Ionicons name={icon} size={24} color={focused ? colors.primary : colors.textMuted} />}
      </Animated.View>
      <Text style={[styles.itemLabel, focused && styles.itemLabelActive]}>{label}</Text>
    </Pressable>
  );
}

function CreateTabButton({ focused, onPress }: { focused: boolean; onPress: () => void }) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => {
        scale.value = withSpring(0.9, { damping: 12, stiffness: 400 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 8, stiffness: 260 });
      }}
      style={styles.item}
      accessibilityRole="button"
      accessibilityState={{ selected: focused }}
    >
      <Animated.View style={[styles.createButton, animatedStyle]}>
        <Ionicons name="add" size={28} color={colors.white} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: spacing.md,
    right: spacing.md,
  },
  blur: {
    borderRadius: radii.full,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.6)",
    ...shadows.floating,
  },
  tint: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(255,255,255,0.55)",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingVertical: spacing.sm,
  },
  item: { flex: 1, alignItems: "center", justifyContent: "center", gap: 2, paddingVertical: 2 },
  itemLabel: { fontSize: 11, fontWeight: "600", color: colors.textMuted },
  itemLabelActive: { color: colors.primary },
  createButton: {
    width: 52,
    height: 52,
    borderRadius: radii.full,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -20,
    shadowColor: colors.primary,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
});

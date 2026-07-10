import { Tabs } from "expo-router";
import { Text } from "react-native";

import { colors } from "@/lib/theme";

function TabIcon({ emoji }: { emoji: string }) {
  return <Text style={{ fontSize: 20 }}>{emoji}</Text>;
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
      }}
    >
      <Tabs.Screen
        name="map/index"
        options={{ title: "Map", tabBarIcon: () => <TabIcon emoji="🗺️" /> }}
      />
      <Tabs.Screen
        name="explore/index"
        options={{ title: "Explore", tabBarIcon: () => <TabIcon emoji="🔍" /> }}
      />
      <Tabs.Screen
        name="create"
        options={{ title: "Create", tabBarIcon: () => <TabIcon emoji="➕" /> }}
      />
      <Tabs.Screen
        name="bookings/index"
        options={{ title: "Bookings", tabBarIcon: () => <TabIcon emoji="📩" /> }}
      />
      <Tabs.Screen
        name="profile/index"
        options={{ title: "Profile", tabBarIcon: () => <TabIcon emoji="👤" /> }}
      />
    </Tabs>
  );
}

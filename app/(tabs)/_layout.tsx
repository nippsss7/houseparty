import { Tabs } from "expo-router";
import type { ComponentProps } from "react";

import { GlassTabBar } from "@/components/GlassTabBar";

// expo-router doesn't re-export react-navigation's BottomTabBarProps type
// (it bundles its own internal copy), so the incoming prop shape is cast at
// this single boundary rather than typed loosely throughout GlassTabBar.
type TabsProps = ComponentProps<typeof Tabs>;
const renderTabBar: TabsProps["tabBar"] = (props) => (
  <GlassTabBar {...(props as unknown as ComponentProps<typeof GlassTabBar>)} />
);

export default function TabsLayout() {
  return (
    <Tabs tabBar={renderTabBar} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="map/index" options={{ title: "Map" }} />
      <Tabs.Screen name="explore/index" options={{ title: "Explore" }} />
      <Tabs.Screen name="create" options={{ title: "Create" }} />
      <Tabs.Screen name="bookings/index" options={{ title: "My Events" }} />
      <Tabs.Screen name="profile/index" options={{ title: "Profile" }} />
    </Tabs>
  );
}

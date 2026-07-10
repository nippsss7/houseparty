import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { Platform } from "react-native";

import { supabase } from "@/services/supabase";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function registerToken(userId: string) {
  if (!Device.isDevice) return; // simulators can't receive Expo pushes

  const projectId: string | undefined = Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) {
    console.log("Push registration skipped: no EAS project id configured");
    return;
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  const { status } =
    existing === "granted" ? { status: existing } : await Notifications.requestPermissionsAsync();
  if (status !== "granted") return;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Default",
      importance: Notifications.AndroidImportance.HIGH,
    });
  }

  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  const { error } = await supabase
    .from("device_push_tokens")
    .upsert({ user_id: userId, expo_push_token: token }, { onConflict: "expo_push_token" });
  if (error) console.error("Failed to store push token:", error);
}

/**
 * Registers this device for Expo push when a user is signed in, and routes
 * notification taps to the screen in the notification's data.url.
 */
export function usePushNotifications(userId: string | undefined) {
  const router = useRouter();

  useEffect(() => {
    if (!userId) return;
    registerToken(userId).catch((err) => {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes("aps-environment")) {
        // Expected on free personal Apple teams — push needs a paid
        // Apple Developer membership; everything else works without it.
        console.log("Push unavailable: requires a paid Apple Developer team");
        return;
      }
      console.error("Push registration failed:", err);
    });
  }, [userId]);

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const url = response.notification.request.content.data?.url;
      if (typeof url === "string") router.push(url as never);
    });
    return () => subscription.remove();
  }, [router]);
}

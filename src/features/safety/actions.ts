import { Alert } from "react-native";
import type { useRouter } from "expo-router";

import { blockUser } from "@/features/safety/api";

type Router = ReturnType<typeof useRouter>;

/**
 * Shared "•••" action sheet for reporting/blocking a user, optionally in the
 * context of one of their events. Used from the event detail page (report
 * the host) and the host's request-review page (report the guest).
 */
export function showSafetyMenu(
  router: Router,
  target: { userId: string; userName: string; eventId?: string; eventTitle?: string },
  onBlocked?: () => void
) {
  const options: Parameters<typeof Alert.alert>[2] = [
    {
      text: `Report ${target.userName}`,
      onPress: () =>
        router.push({
          pathname: "/report",
          params: { userId: target.userId, userName: target.userName },
        }),
    },
  ];

  if (target.eventId) {
    options.push({
      text: "Report this event",
      onPress: () =>
        router.push({
          pathname: "/report",
          params: { eventId: target.eventId, eventTitle: target.eventTitle ?? "this event" },
        }),
    });
  }

  options.push({
    text: `Block ${target.userName}`,
    style: "destructive",
    onPress: () =>
      Alert.alert(
        `Block ${target.userName}?`,
        "You won't see their events, and neither of you can send booking requests to each other.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Block",
            style: "destructive",
            onPress: async () => {
              try {
                await blockUser(target.userId);
                onBlocked?.();
              } catch (err) {
                Alert.alert("Couldn't block user", err instanceof Error ? err.message : "Try again.");
              }
            },
          },
        ]
      ),
  });

  options.push({ text: "Cancel", style: "cancel" });

  Alert.alert("Report or block", undefined, options);
}

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { LogBox } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";

// @rnmapbox/maps logs its own "MapLoad error" whenever a tile fetch fails
// (e.g. offline) via a dev-only console.error → LogBox toast. It's noise:
// our own map-badge error state already tells the user the same thing, and
// LogBox doesn't exist outside development builds anyway.
LogBox.ignoreLogs(["MapLoad error"]);
import { FullScreenState } from "@/components/FullScreenState";
import { retryAuthBootstrap, useAuth, useAuthBootstrap } from "@/hooks/useAuth";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { usePushNotifications } from "@/hooks/usePushNotifications";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Network blips (the Supabase-project-asleep case, a dropped hotspot
      // hop, etc.) are common enough here to deserve automatic backoff
      // instead of surfacing on the first failed attempt.
      retry: 2,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
    },
  },
});

function RootNavigator() {
  useAuthBootstrap();
  useProtectedRoute();
  const { isInitializing, bootstrapError, session } = useAuth();
  usePushNotifications(session?.user.id);

  if (bootstrapError && !isInitializing) {
    return (
      <FullScreenState
        emoji="📡"
        title="Can't connect"
        body={bootstrapError}
        actionLabel="Try again"
        onAction={retryAuthBootstrap}
      />
    );
  }

  if (isInitializing) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(onboarding)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="event/[id]" options={{ headerShown: true, title: "" }} />
      <Stack.Screen name="host/[eventId]" options={{ headerShown: true, title: "Requests" }} />
      <Stack.Screen name="host/request/[requestId]" options={{ headerShown: true, title: "Request" }} />
      <Stack.Screen name="review/[bookingId]" options={{ headerShown: true, title: "Review" }} />
      <Stack.Screen name="settings/edit-profile" options={{ headerShown: true, title: "Edit profile" }} />
      <Stack.Screen name="settings/reviews" options={{ headerShown: true, title: "My reviews" }} />
      <Stack.Screen name="settings/blocked-users" options={{ headerShown: true, title: "Blocked users" }} />
      <Stack.Screen name="report" options={{ headerShown: true, title: "Report" }} />
      <Stack.Screen name="admin/verifications" options={{ headerShown: true, title: "Review verifications" }} />
      <Stack.Screen name="admin/reports" options={{ headerShown: true, title: "Open reports" }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="light" />
          <ErrorBoundary>
            <RootNavigator />
          </ErrorBoundary>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

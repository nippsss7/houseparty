import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { useAuth, useAuthBootstrap } from "@/hooks/useAuth";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { usePushNotifications } from "@/hooks/usePushNotifications";

const queryClient = new QueryClient();

function RootNavigator() {
  useAuthBootstrap();
  useProtectedRoute();
  const { isInitializing, session } = useAuth();
  usePushNotifications(session?.user.id);

  if (isInitializing) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(onboarding)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="event/[id]" options={{ headerShown: true, title: "" }} />
      <Stack.Screen name="host/[eventId]" options={{ headerShown: true, title: "Requests" }} />
      <Stack.Screen name="host/request/[requestId]" options={{ headerShown: true, title: "Request" }} />
      <Stack.Screen name="admin/verifications" options={{ headerShown: true, title: "Review verifications" }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="light" />
          <RootNavigator />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

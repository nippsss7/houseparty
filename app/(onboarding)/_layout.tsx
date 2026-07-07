import { Stack } from "expo-router";

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="profile-setup" />
      <Stack.Screen name="id-upload" />
      <Stack.Screen name="pending-review" />
    </Stack>
  );
}

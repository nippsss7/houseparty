import { Stack } from "expo-router";

export default function CreateEventLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="details" />
      <Stack.Screen name="where-when" />
      <Stack.Screen name="photos" />
    </Stack>
  );
}

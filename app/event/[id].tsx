import { useLocalSearchParams } from "expo-router";

import { PlaceholderNotice } from "@/components/PlaceholderNotice";
import { Screen } from "@/components/Screen";

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <Screen>
      <PlaceholderNotice
        title="Event detail"
        body={`Full event details for "${id}" arrive in Milestone 2.`}
      />
    </Screen>
  );
}

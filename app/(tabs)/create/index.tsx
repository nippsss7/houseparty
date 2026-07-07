import { PlaceholderNotice } from "@/components/PlaceholderNotice";
import { Screen } from "@/components/Screen";
import { useAuth } from "@/hooks/useAuth";

export default function CreateEventScreen() {
  const { isVerified } = useAuth();

  return (
    <Screen>
      {isVerified ? (
        <PlaceholderNotice
          title="Create an event"
          body="The event creation wizard arrives in Milestone 2."
        />
      ) : (
        <PlaceholderNotice
          title="Verify your identity to host"
          body="Only verified users can create events. Check your verification status from your profile."
        />
      )}
    </Screen>
  );
}

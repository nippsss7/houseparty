import { Screen } from "@/components/Screen";
import { PlaceholderNotice } from "@/components/PlaceholderNotice";

export default function MapScreen() {
  return (
    <Screen>
      <PlaceholderNotice
        title="Map"
        body="The live event map arrives in Milestone 2, once Mapbox credentials are wired up."
      />
    </Screen>
  );
}

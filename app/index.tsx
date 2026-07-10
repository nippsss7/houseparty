import { Redirect } from "expo-router";

// Cold starts land on "/", which has no screen of its own. Forward to the
// tabs; useProtectedRoute immediately reroutes anyone who shouldn't be there
// (signed out → welcome, unverified → their onboarding step).
export default function Index() {
  return <Redirect href="/(tabs)/map" />;
}

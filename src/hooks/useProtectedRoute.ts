import { usePathname, useRouter, useSegments, type Href } from "expo-router";
import { useEffect } from "react";

import { useAuth } from "@/hooks/useAuth";

/**
 * Central redirect precedence for the whole app. Runs on every auth/profile
 * change and on every navigation, and only issues a redirect when the current
 * route doesn't match where the user is supposed to be — so it never fights
 * with in-group navigation (e.g. moving between sign-in and sign-up).
 *
 * Precedence: no session -> (auth); session but admin -> (tabs) unconditionally
 * (lets the bootstrap admin, promoted by a one-off SQL update, reach the
 * review screen without needing to pass their own verification first);
 * otherwise profile incomplete -> profile-setup; no ID submitted -> id-upload;
 * pending/rejected -> pending-review; verified -> (tabs).
 */
export function useProtectedRoute() {
  const { session, profile, isInitializing } = useAuth();
  const segments = useSegments();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (isInitializing) return;

    const group = segments[0];

    if (!session) {
      if (group !== "(auth)") router.replace("/(auth)/welcome");
      return;
    }

    if (profile?.role === "admin") {
      if (group === "(auth)" || group === "(onboarding)") router.replace("/(tabs)/map");
      return;
    }

    const hasCompletedProfile = !!profile?.full_name && !!profile?.username;
    const status = profile?.verification_status ?? "unverified";

    let requiredRoute: Extract<Href, string> | null = null;
    if (!hasCompletedProfile) requiredRoute = "/(onboarding)/profile-setup";
    else if (status === "unverified") requiredRoute = "/(onboarding)/id-upload";
    else if (status === "pending" || status === "rejected") requiredRoute = "/(onboarding)/pending-review";

    if (requiredRoute) {
      // usePathname() omits (group) segments, so strip them before comparing —
      // comparing against the full route string never matches and causes
      // redirect loops (e.g. bouncing users back to id-upload after submit).
      const requiredPath = requiredRoute.replace(/\/\([^)]+\)/g, "");
      if (pathname !== requiredPath) router.replace(requiredRoute);
      return;
    }

    if (group === "(auth)" || group === "(onboarding)") {
      router.replace("/(tabs)/map");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, profile, isInitializing, segments.join("/")]);
}

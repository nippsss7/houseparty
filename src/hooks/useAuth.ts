import { useEffect } from "react";

import { signOut as signOutApi } from "@/features/auth/api";
import { supabase } from "@/services/supabase";
import { useAuthStore } from "@/stores/authStore";
import type { Database } from "@/types/database.types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

async function fetchProfile(userId: string) {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();
  if (error) {
    console.error("Failed to fetch profile", error);
    return null;
  }
  return data;
}

/**
 * Mount once near the app root. Keeps authStore in sync with Supabase auth
 * state and subscribes to Realtime updates on the signed-in user's own
 * profile row, so verification-status changes made by the admin appear
 * instantly without a manual refetch.
 */
export function useAuthBootstrap() {
  const setSession = useAuthStore((s) => s.setSession);
  const setProfile = useAuthStore((s) => s.setProfile);
  const setInitializing = useAuthStore((s) => s.setInitializing);

  useEffect(() => {
    let profileChannel: ReturnType<typeof supabase.channel> | null = null;
    let subscribedUserId: string | null = null;
    // Auth events fire in bursts (INITIAL_SESSION + getSession at startup,
    // TOKEN_REFRESHED periodically). Concurrent runs would grab the same named
    // channel and throw "cannot add postgres_changes callbacks after
    // subscribe()", so runs are serialized and same-user runs are no-ops.
    let syncQueue: Promise<void> = Promise.resolve();

    function syncProfileSubscription(userId: string | null) {
      syncQueue = syncQueue
        .then(async () => {
          if (userId === subscribedUserId) return;

          if (profileChannel) {
            await supabase.removeChannel(profileChannel);
            profileChannel = null;
          }
          subscribedUserId = userId;
          if (!userId) {
            setProfile(null);
            return;
          }

          setProfile(await fetchProfile(userId));

          profileChannel = supabase
            .channel(`profile-${userId}`)
            .on(
              "postgres_changes",
              { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${userId}` },
              (payload) => setProfile(payload.new as Profile)
            )
            .subscribe();
        })
        .catch((err) => console.error("Profile subscription sync failed:", err));
      return syncQueue;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      syncProfileSubscription(session?.user.id ?? null).finally(() => setInitializing(false));
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      syncProfileSubscription(session?.user.id ?? null);
    });

    return () => {
      authListener.subscription.unsubscribe();
      if (profileChannel) supabase.removeChannel(profileChannel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

export function useAuth() {
  const session = useAuthStore((s) => s.session);
  const profile = useAuthStore((s) => s.profile);
  const isInitializing = useAuthStore((s) => s.isInitializing);

  return {
    session,
    profile,
    isInitializing,
    isAuthenticated: !!session,
    isAdmin: profile?.role === "admin",
    isVerified: profile?.verification_status === "verified",
    signOut: signOutApi,
  };
}

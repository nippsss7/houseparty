import type { Session } from "@supabase/supabase-js";
import { create } from "zustand";

import type { Database } from "@/types/database.types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

interface AuthState {
  session: Session | null;
  profile: Profile | null;
  isInitializing: boolean;
  /** Set when the initial getSession() call fails outright (e.g. no network) — lets the
   * root layout show a retry screen instead of hanging on a blank one forever. */
  bootstrapError: string | null;
  setSession: (session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
  setInitializing: (isInitializing: boolean) => void;
  setBootstrapError: (bootstrapError: string | null) => void;
  reset: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  profile: null,
  isInitializing: true,
  bootstrapError: null,
  setSession: (session) => set({ session }),
  setProfile: (profile) => set({ profile }),
  setInitializing: (isInitializing) => set({ isInitializing }),
  setBootstrapError: (bootstrapError) => set({ bootstrapError }),
  reset: () => set({ session: null, profile: null }),
}));

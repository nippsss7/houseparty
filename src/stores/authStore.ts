import type { Session } from "@supabase/supabase-js";
import { create } from "zustand";

import type { Database } from "@/types/database.types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

interface AuthState {
  session: Session | null;
  profile: Profile | null;
  isInitializing: boolean;
  setSession: (session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
  setInitializing: (isInitializing: boolean) => void;
  reset: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  profile: null,
  isInitializing: true,
  setSession: (session) => set({ session }),
  setProfile: (profile) => set({ profile }),
  setInitializing: (isInitializing) => set({ isInitializing }),
  reset: () => set({ session: null, profile: null }),
}));

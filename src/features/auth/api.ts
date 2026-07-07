import { supabase } from "@/services/supabase";

export async function signUpWithEmail(params: { email: string; password: string; fullName: string }) {
  const { error } = await supabase.auth.signUp({
    email: params.email,
    password: params.password,
    options: {
      data: { full_name: params.fullName },
    },
  });
  if (error) throw error;
}

export async function signInWithEmail(params: { email: string; password: string }) {
  const { error } = await supabase.auth.signInWithPassword(params);
  if (error) throw error;
}

export async function sendPasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) throw error;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

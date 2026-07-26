import { supabase } from "@/services/supabase";

export async function updateMyLocation(lat: number, lng: number) {
  const { error } = await supabase.rpc("update_my_location", { p_lat: lat, p_lng: lng });
  if (error) throw error;
}

export async function touchLastActive() {
  const { error } = await supabase.rpc("touch_last_active");
  if (error) throw error;
}

export async function updateNotificationPreferences(params: {
  userId: string;
  notifyNewEvents: boolean;
  notifyEmail: boolean;
}) {
  const { error } = await supabase
    .from("profiles")
    .update({ notify_new_events: params.notifyNewEvents, notify_email: params.notifyEmail })
    .eq("id", params.userId);
  if (error) throw error;
}

import { compressImage, uploadImageToBucket } from "@/services/storage";
import { supabase } from "@/services/supabase";

const AVATARS_BUCKET = "avatars";

export async function uploadAvatar(userId: string, localUri: string) {
  const compressedUri = await compressImage(localUri, 800);
  const path = `${userId}/avatar-${Date.now()}.jpg`;
  await uploadImageToBucket(AVATARS_BUCKET, path, compressedUri);

  const { data } = supabase.storage.from(AVATARS_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function completeProfileSetup(params: {
  userId: string;
  fullName: string;
  username: string;
  bio?: string;
  dateOfBirth: Date;
  avatarUrl?: string;
}) {
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: params.fullName,
      username: params.username,
      bio: params.bio ?? null,
      date_of_birth: params.dateOfBirth.toISOString().slice(0, 10),
      ...(params.avatarUrl ? { avatar_url: params.avatarUrl } : {}),
    })
    .eq("id", params.userId);
  if (error) throw error;
}

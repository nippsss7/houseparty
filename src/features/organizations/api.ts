import { compressImage, uploadImageToBucket } from "@/services/storage";
import { supabase } from "@/services/supabase";

const ORG_PHOTOS_BUCKET = "organization-photos";

export function orgPhotoUrl(storagePath: string) {
  return supabase.storage.from(ORG_PHOTOS_BUCKET).getPublicUrl(storagePath).data.publicUrl;
}

async function uploadOrgPhoto(userId: string, orgId: string, label: string, localUri: string) {
  const compressed = await compressImage(localUri, label === "avatar" ? 800 : 1600);
  const path = `${userId}/${orgId}/${label}-${Date.now()}.jpg`;
  await uploadImageToBucket(ORG_PHOTOS_BUCKET, path, compressed);
  return path;
}

export async function createOrganization(params: {
  ownerId: string;
  name: string;
  handle: string;
  bio?: string;
  avatarUri?: string;
  coverUri?: string;
}) {
  const { data: org, error } = await supabase
    .from("organizations")
    .insert({ owner_id: params.ownerId, name: params.name, handle: params.handle, bio: params.bio || null })
    .select()
    .single();
  if (error) throw error;

  const updates: { avatar_url?: string; cover_url?: string } = {};
  if (params.avatarUri) {
    updates.avatar_url = orgPhotoUrl(await uploadOrgPhoto(params.ownerId, org.id, "avatar", params.avatarUri));
  }
  if (params.coverUri) {
    updates.cover_url = orgPhotoUrl(await uploadOrgPhoto(params.ownerId, org.id, "cover", params.coverUri));
  }
  if (Object.keys(updates).length > 0) {
    const { error: updateErr } = await supabase.from("organizations").update(updates).eq("id", org.id);
    if (updateErr) throw updateErr;
    return { ...org, ...updates };
  }
  return org;
}

export async function fetchOrganization(id: string) {
  const { data, error } = await supabase.from("organizations").select("*").eq("id", id).single();
  if (error) throw error;
  return data;
}

export async function fetchOrganizationByHandle(handle: string) {
  const { data, error } = await supabase.from("organizations").select("*").eq("handle", handle).single();
  if (error) throw error;
  return data;
}

export async function fetchMyOrganizations(ownerId: string) {
  const { data, error } = await supabase
    .from("organizations")
    .select("*")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function isHandleAvailable(handle: string) {
  const { data, error } = await supabase
    .from("organizations")
    .select("id")
    .eq("handle", handle)
    .maybeSingle();
  if (error) throw error;
  return !data;
}

export async function followOrganization(organizationId: string, userId: string) {
  const { error } = await supabase
    .from("organization_followers")
    .insert({ organization_id: organizationId, user_id: userId });
  if (error) throw error;
}

export async function unfollowOrganization(organizationId: string, userId: string) {
  const { error } = await supabase
    .from("organization_followers")
    .delete()
    .eq("organization_id", organizationId)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function fetchIsFollowing(organizationId: string, userId: string) {
  const { data, error } = await supabase
    .from("organization_followers")
    .select("organization_id")
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return !!data;
}

export async function createOrganizationPost(params: {
  organizationId: string;
  ownerId: string;
  caption?: string;
  photoUris: string[];
}) {
  const { data: post, error } = await supabase
    .from("organization_posts")
    .insert({ organization_id: params.organizationId, caption: params.caption || null })
    .select()
    .single();
  if (error) throw error;

  await Promise.all(
    params.photoUris.map(async (uri, index) => {
      const path = await uploadOrgPhoto(params.ownerId, params.organizationId, `post-${post.id}`, uri);
      const { error: photoError } = await supabase
        .from("organization_post_photos")
        .insert({ post_id: post.id, storage_path: path, position: index });
      if (photoError) throw photoError;
    })
  );
  return post;
}

export async function fetchOrganizationPosts(organizationId: string) {
  const { data, error } = await supabase
    .from("organization_posts")
    .select("*, photos:organization_post_photos(id, storage_path, position)")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function fetchOrganizationEvents(organizationId: string) {
  const { data, error } = await supabase
    .from("events")
    .select("id, title, city, start_at, price_per_person, status")
    .eq("organization_id", organizationId)
    .eq("status", "published")
    .order("start_at", { ascending: true });
  if (error) throw error;
  return data;
}

export type Organization = Awaited<ReturnType<typeof fetchOrganization>>;
export type OrganizationPost = Awaited<ReturnType<typeof fetchOrganizationPosts>>[number];

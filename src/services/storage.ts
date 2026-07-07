import { ImageManipulator, SaveFormat } from "expo-image-manipulator";

import { supabase } from "@/services/supabase";

/**
 * Resizes + JPEG-compresses a local image URI before upload, so photo/ID
 * uploads don't ship multi-megabyte originals over the wire.
 */
export async function compressImage(uri: string, maxDimension = 1600) {
  const context = ImageManipulator.manipulate(uri);
  context.resize({ width: maxDimension });
  const rendered = await context.renderAsync();
  const result = await rendered.saveAsync({
    format: SaveFormat.JPEG,
    compress: 0.75,
  });
  return result.uri;
}

/**
 * Uploads a local file URI to a Supabase Storage bucket under `path` and
 * returns the storage path (not a public URL — callers decide how to resolve
 * it, since private buckets need signed URLs instead).
 */
export async function uploadImageToBucket(bucket: string, path: string, localUri: string) {
  const response = await fetch(localUri);
  const arrayBuffer = await response.arrayBuffer();

  const { error } = await supabase.storage.from(bucket).upload(path, arrayBuffer, {
    contentType: "image/jpeg",
    upsert: true,
  });
  if (error) throw error;

  return path;
}

export async function getSignedUrl(bucket: string, path: string, expiresInSeconds = 60) {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresInSeconds);
  if (error) throw error;
  return data.signedUrl;
}

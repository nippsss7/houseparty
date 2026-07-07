import { compressImage, uploadImageToBucket } from "@/services/storage";
import { supabase } from "@/services/supabase";
import type { Database } from "@/types/database.types";
import type { DocumentType } from "@/types/domain";

const ID_DOCUMENTS_BUCKET = "id-documents";

async function uploadIdImage(userId: string, label: string, localUri: string) {
  const compressedUri = await compressImage(localUri);
  const path = `${userId}/${label}-${Date.now()}.jpg`;
  return uploadImageToBucket(ID_DOCUMENTS_BUCKET, path, compressedUri);
}

export async function submitIdVerification(params: {
  userId: string;
  documentType: DocumentType;
  frontUri: string;
  backUri?: string;
  selfieUri?: string;
}) {
  const frontPath = await uploadIdImage(params.userId, "front", params.frontUri);
  const backPath = params.backUri ? await uploadIdImage(params.userId, "back", params.backUri) : null;
  const selfiePath = params.selfieUri
    ? await uploadIdImage(params.userId, "selfie", params.selfieUri)
    : null;

  const { data, error } = await supabase.rpc("submit_id_verification", {
    p_document_type: params.documentType,
    p_front_image_path: frontPath,
    p_back_image_path: backPath ?? undefined,
    p_selfie_image_path: selfiePath ?? undefined,
  });
  if (error) throw error;
  return data;
}

export async function fetchPendingVerifications() {
  const { data, error } = await supabase
    .from("id_verifications")
    .select("*, profile:profiles!id_verifications_user_id_fkey(full_name, username)")
    .eq("status", "pending")
    .order("submitted_at", { ascending: true });
  if (error) throw error;
  return data;
}

export async function reviewIdVerification(params: {
  verificationId: string;
  approve: boolean;
  rejectionReason?: string;
}) {
  const { data, error } = await supabase.rpc("review_id_verification", {
    p_verification_id: params.verificationId,
    p_approve: params.approve,
    p_rejection_reason: params.rejectionReason,
  });
  if (error) throw error;
  return data as Database["public"]["Tables"]["id_verifications"]["Row"];
}

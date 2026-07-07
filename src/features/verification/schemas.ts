import { z } from "zod";

export const documentTypeOptions = [
  { value: "passport", label: "Passport" },
  { value: "drivers_license", label: "Driver's license" },
  { value: "national_id", label: "National ID card" },
] as const;

export const idUploadSchema = z.object({
  documentType: z.enum(["passport", "drivers_license", "national_id"]),
  frontUri: z.string().min(1, "Upload the front of your ID"),
  backUri: z.string().optional(),
});

export type IdUploadFormValues = z.infer<typeof idUploadSchema>;

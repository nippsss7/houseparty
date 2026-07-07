import { z } from "zod";

const MIN_AGE_YEARS = 18;

function isOldEnough(dateOfBirth: Date) {
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - MIN_AGE_YEARS);
  return dateOfBirth <= cutoff;
}

export const profileSetupSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name"),
  username: z
    .string()
    .trim()
    .min(3, "At least 3 characters")
    .regex(/^[a-z0-9_]+$/, "Lowercase letters, numbers, underscores only"),
  bio: z.string().trim().max(200, "Keep it under 200 characters").optional(),
  dateOfBirth: z.date({ message: "Enter your date of birth" }).refine(isOldEnough, {
    message: "You must be at least 18 years old to use HouseParty",
  }),
  avatarUri: z.string().optional(),
});

export type ProfileSetupFormValues = z.infer<typeof profileSetupSchema>;

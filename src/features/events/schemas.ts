import { z } from "zod";

import type { CancellationPolicy, EventCategory } from "@/types/domain";

export const eventCategoryOptions: { value: EventCategory; label: string }[] = [
  { value: "house_party", label: "House party" },
  { value: "rooftop", label: "Rooftop" },
  { value: "pool_party", label: "Pool party" },
  { value: "dinner_party", label: "Dinner party" },
  { value: "game_night", label: "Game night" },
  { value: "music", label: "Music" },
  { value: "outdoor", label: "Outdoor" },
  { value: "other", label: "Other" },
];

export const cancellationPolicyOptions: {
  value: CancellationPolicy;
  label: string;
  description: string;
}[] = [
  { value: "flexible", label: "Flexible", description: "Guests can cancel any time" },
  { value: "moderate", label: "Moderate", description: "Guests can cancel up to 24h before" },
  { value: "strict", label: "Strict", description: "No refunds after acceptance" },
];

// Mirrors the CHECK constraints in supabase/migrations/0005_events.sql.
export const eventBasicsSchema = z.object({
  title: z.string().trim().min(3, "At least 3 characters").max(80, "At most 80 characters"),
  description: z
    .string()
    .trim()
    .min(10, "Tell guests a bit more — at least 10 characters")
    .max(2000, "At most 2000 characters"),
  category: z.custom<EventCategory>(
    (v) => eventCategoryOptions.some((o) => o.value === v),
    "Pick a category"
  ),
});

export const eventDetailsSchema = z.object({
  capacity: z.coerce
    .number({ message: "How many guests can you host?" })
    .int("Whole number")
    .min(1, "At least 1 guest")
    .max(500, "At most 500 guests"),
  pricePerPerson: z.coerce
    .number({ message: "Enter a price (0 for free)" })
    .min(0, "Can't be negative")
    .max(99999, "Too high"),
  ageRestriction: z
    .union([z.literal(""), z.coerce.number().int().min(16, "Minimum 16").max(99, "Maximum 99")])
    .optional(),
  houseRules: z.string().trim().max(1000, "At most 1000 characters").optional(),
  cancellationPolicy: z.custom<CancellationPolicy>(
    (v) => cancellationPolicyOptions.some((o) => o.value === v),
    "Pick a policy"
  ),
});

export const eventLocationScheduleSchema = z
  .object({
    lat: z.number({ message: "Drop a pin on the map" }),
    lng: z.number({ message: "Drop a pin on the map" }),
    address: z.string().trim().min(5, "Enter the street address"),
    city: z.string().trim().min(2, "Enter the city"),
    startAt: z.date({ message: "Pick a start time" }),
    endAt: z.date({ message: "Pick an end time" }),
  })
  .refine((v) => v.endAt > v.startAt, {
    message: "End time must be after the start",
    path: ["endAt"],
  })
  .refine((v) => v.startAt.getTime() > Date.now() - 60_000, {
    message: "Start time is in the past",
    path: ["startAt"],
  });

export type EventBasics = z.infer<typeof eventBasicsSchema>;
// coerce fields make zod's input type differ from its output; react-hook-form
// needs both (values are strings while typing, numbers after validation).
export type EventDetailsInput = z.input<typeof eventDetailsSchema>;
export type EventDetails = z.output<typeof eventDetailsSchema>;
export type EventLocationSchedule = z.infer<typeof eventLocationScheduleSchema>;

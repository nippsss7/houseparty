// Literal-union types mirroring the CHECK constraints in supabase/migrations/*.sql.
// database.types.ts is auto-generated (`npm run db:types`) and only knows Postgres
// enum types, not CHECK-constrained text columns, so those columns come back as
// plain `string` there. These aliases restore literal typing at the call sites
// that need it (state, props, exhaustive switches) without hand-editing the
// generated file.

export type VerificationStatus = "unverified" | "pending" | "verified" | "rejected";
export type UserRole = "user" | "admin";
export type DocumentType = "passport" | "drivers_license" | "national_id";
export type IdVerificationReviewStatus = "pending" | "approved" | "rejected";

export type EventCategory =
  | "house_party"
  | "rooftop"
  | "pool_party"
  | "dinner_party"
  | "game_night"
  | "music"
  | "outdoor"
  | "other";
export type CancellationPolicy = "flexible" | "moderate" | "strict";
export type EventStatus = "draft" | "published" | "cancelled" | "completed";

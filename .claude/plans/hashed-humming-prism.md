# HouseParty — Events & House Party Booking App

## Context

Greenfield build (directory currently has only an empty README.md). Goal: a commercial-grade, App Store/Play Store-ready mobile app for discovering and booking house parties/events via a Snapchat-style live map, with mandatory ID verification (manually approved by the business owner), host-created event listings, a request-to-book flow (host accepts/declines), an explore/list alternative to the map, a profile page, and two-way ratings/reviews.

Confirmed stack:
- **Client**: React Native + Expo (managed, but requires `expo-dev-client`/EAS Build since Mapbox needs native modules — Expo Go won't work)
- **Backend**: Supabase (Postgres + PostGIS, Auth, Storage, Realtime, Row Level Security)
- **Maps**: Mapbox (`@rnmapbox/maps`) for custom Snap-map-style styling + clustering

User will create the Supabase project and Mapbox account/token themselves and share the URL/keys before scaffolding needs them (~M1 step 2 onward).

## Additional stack decisions (this plan)

| Concern | Decision | Why |
|---|---|---|
| Navigation | Expo Router | First-party Expo standard, typed routes, built-in deep linking (needed for push→event navigation) |
| Server-state cache | TanStack Query | Pairs naturally with Supabase's promise client for events/bookings/verification refetching |
| Local/UI state | Zustand | Lightweight store for auth session + create-event wizard state |
| Forms/validation | react-hook-form + zod | Zod schemas mirror Postgres CHECK constraints — one source of truth, two enforcement points |
| Map clustering | `@rnmapbox/maps` native `ShapeSource cluster` | Mapbox GL clusters GeoJSON natively, no extra JS clustering lib |
| Pin preview | `@gorhom/bottom-sheet` | Standard for Snap-map-style slide-up preview cards |
| Session storage | Encrypted AsyncStorage adapter (`expo-secure-store` key + AsyncStorage blob) | Supabase's documented Expo pattern — plain SecureStore has a ~2KB limit, session JSON exceeds it |
| Admin review | In-app screen gated by `profiles.role='admin'`, no separate admin app | Only one admin (you) at launch — avoids building/hosting a second product |
| Reviews | Two-way (guest→host, host→guest), Airbnb-style | Hosts are letting strangers into a private residence — they need vetting signal too, not just guests |

## Supabase schema (core tables)

- **`profiles`** — id, full_name, username, avatar_url, bio, date_of_birth, phone, `role` (user/admin), `verification_status` (unverified/pending/verified/rejected), host_rating_avg/count, guest_rating_avg/count. Auto-created via `handle_new_user()` trigger on `auth.users` insert.
- **`id_verifications`** — user_id, document_type, front/back/selfie image paths (private bucket), status, rejection_reason, reviewed_by, reviewed_at.
- **`events`** — host_id, title, description, category, tags[], `location geography(Point,4326)` + address/city, capacity, price_per_person, currency, start_at/end_at, age_restriction, house_rules, cancellation_policy, status (draft/published/cancelled/completed), current_rsvp_count (trigger-maintained), search_vector (generated tsvector). GiST index on location, GIN index on search_vector.
- **`event_photos`** — event_id, storage_path, position.
- **`booking_requests`** — event_id, guest_id, party_size, message, status (pending/accepted/declined/cancelled), responded_at. Partial unique index blocks duplicate active requests per guest/event.
- **`reviews`** — event_id, reviewer_id, reviewee_id, direction (guest_to_host/host_to_guest), rating (1-5), comment. Unique per (event, reviewer, reviewee, direction).
- **`device_push_tokens`** — user_id, expo_push_token.
- **`reports`** — reporter_id, reported_event_id/reported_user_id, reason, details, status (required for App Store UGC moderation compliance).
- **`nearby_events(lat, lng, radius_meters, category_filter, max_price, start_after)`** — PostGIS RPC using `ST_DWithin`/`<->` ordering, powers both Map and Explore.
- Trigger-maintained: `current_rsvp_count` recompute + capacity guard on `booking_requests` change; rating averages recompute on `reviews` insert.
- RLS helper functions `is_admin(uid)` / `is_verified(uid)` (security definer) to avoid repeating role checks and recursive-policy issues.
- RLS pattern: users only touch their own rows (`profiles`, `id_verifications`, `booking_requests` guest-side, `reviews` insert); hosts manage only their own `events`/`event_photos`/booking accept-decline; `id-documents` storage bucket is private (owner or admin only, signed URLs only, never public); `event-photos`/`avatars` buckets are public-read, owner-write.

## Feature flows

- **Auth & verification**: email/password signup → profile setup (name, DOB with 18+ check, avatar) → ID capture (camera/gallery, compressed, uploaded to private bucket) → `pending` state with live Realtime status subscription → admin screen (`role='admin'`) lists pending docs via short-lived signed URLs, approves/rejects via an atomic RPC. First admin promoted once, manually, via one SQL update after your own signup.
- **Gating**: unverified users can still browse Map/Explore/event details (don't block discovery); only "Create event" and "Request to join" require `verified`.
- **Map**: `@rnmapbox/maps` custom dark/nightlife style, native clustering, region-change-triggered `nearby_events` RPC calls, tap pin → bottom-sheet preview → tap preview → full event detail push.
- **Event creation**: multi-step wizard (Basics → Details → Location → Schedule → Photos → Policies/Review) sharing one form state via Zustand + react-hook-form/zod; fields = title, description, category, tags, capacity, price_per_person, currency, location/address, start/end time, age_restriction, house_rules, cancellation_policy, multi-photo upload (compressed via `expo-image-manipulator`).
- **Booking requests**: guest sends request (party size + optional message) → host inbox (grouped by event, Realtime live updates) → accept/decline (capacity-guarded) → guest notified via Realtime subscription + Expo push (dispatched from a Database Webhook → Edge Function on status change).
- **Explore**: `FlatList` backed by the same `nearby_events` RPC (larger radius) + full-text fallback via `search_vector`; filter bar (date, price, category, distance) drives React Query params.
- **Profile**: header (avatar, name, verification badge, host + guest ratings) → tabs for Hosted Events, Bookings, Reviews (given/received), Settings (edit profile, notifications, logout, delete account — required by Apple 5.1.1(v)).
- **Reviews**: two-way, eligible only after an `accepted` booking whose event has ended; prompted a few hours post-event; rolling averages trigger-maintained on `profiles`.

## Security

PII (ID images) never public, short-lived signed URLs only, RLS everywhere (no client-trust), CHECK constraints mirroring Zod schemas, trigger-based rate limits on event creation and booking requests (no extra infra needed for v1), `reports` table + report/block UI for UGC moderation compliance, Supabase leaked-password protection + required email confirmation.

## Build order (milestones)

1. **M1 — Foundation, Auth & Verification** (detailed below — this is what gets built first)
2. **M2 — Event Creation + Map Discovery** (event CRUD, Mapbox map, `nearby_events` RPC, clustering)
3. **M3 — Booking Requests + Realtime/Push** (request/accept/decline flow, Realtime, Expo push)
4. **M4 — Explore, Profile, Reviews** (filtered list, full profile, two-way reviews + rollups)
5. **M5 — Security Hardening, Polish & Store Submission** (rate limits, reports/block, empty/error states, Sentry, privacy policy, EAS build/submit, store listings)

### M1 — detailed tasks (starting point)

1. `npx create-expo-app` (TS template); add `expo-router`, `expo-dev-client`, `@rnmapbox/maps` (installed now to lock in the dev-client build path even though unused until M2); configure `app.json` bundle id/scheme; link EAS project.
2. Once you share the Supabase project URL/anon key and Mapbox token: write `supabase/migrations/0001_init.sql` — `profiles`, `id_verifications`, `handle_new_user` trigger, `is_admin`/`is_verified` helpers, RLS policies, storage buckets (`id-documents` private, `avatars` public) + their storage policies. Enable the `postgis` extension.
3. `src/services/supabase.ts` — client init with encrypted-AsyncStorage session adapter.
4. `src/stores/authStore.ts` + `src/hooks/useAuth.ts` — session/profile state, `onAuthStateChange`, Realtime subscription on own profile row.
5. `app/(auth)/{welcome,sign-in,sign-up,forgot-password}.tsx`.
6. `app/(onboarding)/{profile-setup,id-upload,pending-review}.tsx` — avatar upload, DOB/age check, ID capture + compression + upload, live pending-status screen.
7. `app/_layout.tsx` — root redirect precedence: no session → `(auth)`; no/incomplete profile → `profile-setup`; no ID submitted → `id-upload`; pending/rejected → `pending-review`; verified → `(tabs)`.
8. `app/admin/verifications.tsx` — admin-gated pending list, signed-URL preview, approve/reject RPC.
9. One-time manual SQL to promote your account to `role='admin'` after first signup.
10. Manual end-to-end test: signup → ID upload → pending → admin approves → status flips live for the user.

## Verification

- After M1: run the app via Expo dev client on a simulator/device, create two test accounts, walk signup → ID upload → pending screen, log in as the promoted admin account, approve the verification, confirm the first account's `pending-review` screen flips to verified live (Realtime) without a manual refresh.
- After each subsequent milestone: exercise the new flow end-to-end in the running app (create + view an event on the map, send + accept a booking request, leave a review) rather than relying on type-checking alone.

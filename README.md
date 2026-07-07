# HouseParty

Events & house-party discovery and booking app. React Native (Expo) + Supabase + Mapbox.

See `.claude/plans/hashed-humming-prism.md` (or ask Claude) for the full architecture/milestone plan. This README covers day-to-day setup.

## Prerequisites

- Node `22.23.1` (an `.nvmrc` is checked in — run `nvm use`)
- A [Supabase](https://supabase.com) project
- A [Mapbox](https://mapbox.com) account with a public access token and a secret **download** token (Account -> Tokens -> create one with the `Downloads:Read` scope)
- Xcode (iOS) and/or Android Studio, since this app requires a custom dev client — **Expo Go will not work** (Mapbox needs native modules)
- On macOS, keep this project outside `~/Desktop` and `~/Documents` if you have iCloud Drive's "Desktop & Documents Folders" sync enabled — it syncing `node_modules` causes `npm`/`npx`/`tsc` to hang for minutes at a time

## First-time setup

1. `nvm use`
2. `npm install`
3. `cp .env.example .env` and fill in:
   - `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` — from your Supabase project's Settings -> API
   - `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN` — your Mapbox public token
   - `RNMAPBOX_MAPS_DOWNLOAD_TOKEN` — your Mapbox secret download token
4. Push the database schema:
   - Generate a personal access token at supabase.com/dashboard/account/tokens (separate from the anon key — used by the CLI, not the app)
   - `SUPABASE_ACCESS_TOKEN=<token> npx supabase link --project-ref <your-project-ref>`
   - `SUPABASE_ACCESS_TOKEN=<token> SUPABASE_DB_PASSWORD=<your-db-password> npx supabase db push`
   - (or skip the CLI and paste `supabase/migrations/0001_init.sql` directly into the Supabase SQL editor)
   - Whenever the schema changes, regenerate types with `npm run db:types`
5. Build and run a dev client:
   ```
   npx expo prebuild
   npx expo run:ios   # or: npx expo run:android
   ```
6. Sign up in the app once, then promote yourself to admin (one-time, in the Supabase SQL editor):
   ```sql
   update profiles set role = 'admin' where id = '<your-auth-user-id>';
   ```
   Your account will then bypass onboarding and can approve/reject ID verifications from Profile -> "Admin: review verifications".

## Day-to-day

```
npx expo start --dev-client
```

## Project structure

- `app/` — Expo Router routes (screens only)
- `src/features/*` — API calls, Zod schemas, and hooks grouped by domain (auth, verification, profile, events, bookings, reviews, map)
- `src/components/` — shared UI primitives
- `src/services/` — Supabase client, storage/upload helpers
- `supabase/migrations/` — versioned SQL schema, applied in order

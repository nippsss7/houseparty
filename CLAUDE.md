@AGENTS.md

# Session handoff — HouseParty Milestone 1

This section is a handoff summary from a prior Claude (Sonnet 5) session, written so a
new session/model can pick up context without re-deriving it. The full architecture
plan (all milestones M1-M5, schema design, feature flows) lives at
`.claude/plans/hashed-humming-prism.md` — read that first for the big picture. This
section covers what's actually been *done* and the one thing currently blocking
end-to-end verification.

## Project

HouseParty: events/house-party discovery + booking app, for real App Store/Play Store
launch. Stack: **React Native (Expo SDK 57) + Supabase (Postgres/PostGIS/Auth/Storage/
Realtime) + Mapbox**. Requires a custom dev client (`expo-dev-client`) — Expo Go will
not work because Mapbox needs native modules.

**Note:** the project was moved from `~/Desktop/Projects/HouseParty` to
`~/Developer/HouseParty` mid-session because macOS iCloud Drive's "Desktop & Documents
Folders" sync was actively syncing `node_modules`, causing `npm`/`npx`/`tsc` to hang
for minutes at a time (confirmed via `brctl status` showing sync activity under that
exact path). The old Desktop copy is stale/orphaned — this directory
(`~/Developer/HouseParty`) is the only one that matters now.

## What's done (Milestone 1: foundation, auth, ID verification)

All scaffolding and M1 feature code is written and typechecks cleanly (`npm run
typecheck` — should complete in ~1s with zero errors; if it hangs or takes long, you
are probably back on an iCloud-synced path, see above):

- Full Expo Router app structure under `app/`: `(auth)` (welcome/sign-in/sign-up/
  forgot-password), `(onboarding)` (profile-setup/id-upload/pending-review), `(tabs)`
  (map/explore/create/bookings/profile — these 5 are currently placeholder screens,
  real implementations are M2-M4), `admin/verifications.tsx` (admin ID-review screen),
  `event/[id].tsx` (placeholder), root `app/_layout.tsx` with the auth/onboarding/
  verification redirect-precedence logic in `src/hooks/useProtectedRoute.ts`.
- `src/` feature modules: `auth`, `verification`, `profile` (api.ts + schemas.ts each),
  plus `services/supabase.ts` (client with Supabase's documented encrypted-
  AsyncStorage session adapter for Expo), `services/storage.ts` (image compression +
  upload + signed URL helpers), `stores/authStore.ts` (Zustand), `hooks/useAuth.ts`,
  `hooks/useImagePicker.ts`.
- Design tokens/components in `src/lib/theme.ts`, `src/components/{Button,TextField,
  Screen,PlaceholderNotice}.tsx`.
- Supabase schema in `supabase/migrations/0001_init.sql`: `profiles`, `id_verifications`,
  `is_admin`/`is_verified` helper functions, `submit_id_verification`/
  `review_id_verification` atomic RPCs, RLS policies, `id-documents` (private) and
  `avatars` (public) storage buckets. **This migration is already pushed to the live
  Supabase project** and confirmed in sync (`supabase migration list` shows local/remote
  both at `0001`).
- `src/types/database.types.ts` is the **real generated types file** (via `supabase gen
  types typescript --linked`), not hand-written — regenerate with `npm run db:types`
  whenever the schema changes. Literal-union types the generator can't infer from
  CHECK-constrained columns (e.g. `verification_status`, `role`, `document_type`) live
  separately in `src/types/domain.ts` so they survive regeneration.
- `.env` is filled in with real Supabase URL/anon key and Mapbox public/secret-download
  tokens (gitignored). `.env.example` is the clean template (never put real secrets in
  that file — it happened once already this session and was cleaned up).
- A local Expo config plugin, `plugins/withDisableUserScriptSandboxing.js`, patches the
  generated `ios/Podfile` post_install hook to set `ENABLE_USER_SCRIPT_SANDBOXING=NO`
  on all Pods targets — needed because current Xcode's script sandboxing was blocking
  CocoaPods' `[CP] Copy XCFrameworks` phase with a `RegisterExecutionPolicyException`
  error. This is wired into `app.config.ts`'s `plugins` array so it survives
  `expo prebuild --clean`.

## Build blocker: RESOLVED (2026-07-07) — app builds and runs on the simulator

The long-standing "AssetCatalogSimulatorAgent / Failed to open FIFOs" build failure
was diagnosed as Xcode 16.2 being fundamentally incompatible with macOS 26.2 (its
`actool` could not compile ANY image-bearing asset catalog for iOS), and separately
**Expo SDK 57 hard-requires Xcode 26.4+** (`expo-modules-jsi` declares
`swift-tools-version: 6.2`; Xcode 16.2 ships Swift 6.0 — see
https://docs.expo.dev/versions/v57.0.0/). **Fixed by the user updating Xcode to 26.6
via the App Store.** After that, `node_modules` + `ios/` were regenerated from
scratch and the app now builds, installs, launches, bundles (2022 modules), and
renders the auth screens on the iPhone 16 Pro simulator. A temporary
asset-catalog-stripping workaround script from the diagnosis phase was deleted again
once Xcode was updated.

Gotchas discovered while regenerating the toolchain state (all now handled, but
relevant when touching deps):

- **Use the nvm Node from `.nvmrc` (22.23.1), not whatever is on PATH.** The default
  shell picks up Node 23.x which RN 0.86's engines don't support. Prefix commands
  with `export PATH=~/.nvm/versions/node/v22.23.1/bin:$PATH` (or `nvm use`).
- **`react-dom` must be pinned to exactly the `react` version (19.2.3).** The old
  lockfile contained an inconsistent tree (react-dom@19.2.7 peer-requiring
  react@^19.2.7), which made both `npm install` and `npm ci` fail ERESOLVE after
  node_modules was wiped. It is now a pinned direct dependency; keep the two in
  lockstep when upgrading React.
- **`babel-preset-expo` must be an explicit devDependency.** npm nested it under
  `node_modules/expo/node_modules/`, where Babel (resolving from the project root)
  can't find it — Metro then dies at startup with the misleading error
  `Cannot read properties of undefined (reading 'transformFile')`; the real error
  (`Cannot find module 'babel-preset-expo'`) is further up in the log.
- `plugins/withDisableUserScriptSandboxing.js` is still active and still needed
  (not re-verified whether Xcode 26 + CocoaPods fixed the underlying
  RegisterExecutionPolicyException issue; it re-applied cleanly via prebuild).
- Typed-routes note: expo-router's generated route union has no `"/"` (there is no
  root index route) — use concrete routes like `/(tabs)/map` in `Link`/`router`
  calls and type route variables as `Href`.

## Verifying M1 (build now works)

Two test accounts: sign up → land on `(onboarding)/profile-setup` → `id-upload` →
`pending-review` (should show a live Realtime-driven "pending" state). Promote one
account to admin via Supabase SQL editor: `update profiles set role='admin' where
id='<uid>'` — that account then bypasses onboarding straight to `(tabs)`, where
Profile → "Admin: review verifications" lets it approve/reject the other account's ID.
The other account's `pending-review` screen should flip to verified live, without a
manual refresh, confirming the Realtime subscription in `src/hooks/useAuth.ts` works.

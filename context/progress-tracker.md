# Progress Tracker

Update this file after every meaningful implementation change.

## Current Phase

- Phase 0 — Foundation: complete. Waiting on backend decisions and credentials before Phase 1.

## Current Goal

- Confirm the real Supabase schema, RLS and Edge Function, then write `context/specs/00-build-plan.md` for Phase 1 (live backend and delivery operations).

## Completed

- **Unit 00 — Foundation scaffold** (2026-11-07)
  - Expo SDK 58 + strict TypeScript + Expo Router, development-build workflow, npm.
  - Routes: `(auth)/sign-in`, `(app)/index` (assigned deliveries), `(app)/deliveries/[id]`, `(app)/profile`, protected with `Stack.Protected`.
  - `AuthProvider` (session restore/verify, sign-in/out, auto-refresh, driver profile) and `ServicesProvider`.
  - Zustand stores: delivery selection, tracking preferences (persisted).
  - Services: Supabase auth, delivery and driver repositories with runtime mappers; Edge Function maps service with parsers; `expo-location` service; full mock set with `MockModeBanner`.
  - Config validation (`src/config/env.ts`) and `ConfigErrorScreen`.
  - Design system and reusable states.
  - Tooling: ESLint flat config + Prettier, Jest (`jest-expo`) + RNTL, `npm run validate`, `app.json`, `eas.json`, `.env.example`, `.gitignore`, README.
  - Validation: type-check, lint, format check, 54 tests in 10 suites and `expo-doctor` (20/20) pass.
  - Not run: native builds, device/simulator runs, EAS, real Supabase or Google calls, web build, `npm audit fix`.
- **Context files** (2026-11-08): six context files rewritten for this project.

## In Progress

- None.

## Next Up

Proposed order; confirm with the user and turn into `context/specs/00-build-plan.md`:

1. Confirm the real Supabase schema; update mappers, domain types and `architecture.md`; consider generated Supabase types.
2. Verify RLS policies for `drivers`, `deliveries` and `delivery_items` against a test project (outside this repo).
3. Connect to a non-production Supabase project and verify sign-in, list and details in live mode.
4. Implement or confirm the `google-maps` Edge Function contract and verify route estimates in live mode.
5. Run `npx eas-cli@latest init`, set real bundle IDs, and produce a development build on a physical device (needs consent).
6. Delivery status changes in the UI (requires the status transition rules, see Open Questions).
7. Apply approved Eskort brand tokens, icon and splash.

## Open Questions

- What is the real Supabase schema (tables, columns, status values) and does it match the assumed schema in `architecture.md`?
- Who writes and deploys the RLS policies and the `google-maps` Edge Function, and where do they live?
- Which status transitions may a driver make (for example `assigned → picked_up → en_route → delivered | failed`), and is a reason required for `failed`?
- Is background location or live location sharing required? It needs "always" permission, store review justification and a new design.
- Is proof of delivery (photo, signature, PIN) required, and where are the files stored?
- Are driver accounts provisioned only by Eskort, or is password reset needed in the app?
- Real iOS bundle identifier and Android package name (currently `com.example.eskortdriver`), and the EAS owner/project.
- Approved Eskort brand colours, fonts, app icon and splash artwork.
- Should offline support (cached deliveries, queued status updates) be in scope?
- Icon library choice, if icons are needed.
- How to handle the 31 npm audit warnings (1 low, 30 moderate), and whether to remove unused starter packages (`@expo/ui`, `expo-glass-effect`, `expo-symbols`).

## Architecture Decisions

- **Auth in React Context, operational state in Zustand.** Keeps one owner for session and driver profile, avoiding two sources of truth that drift on sign-out or refresh.
- **Services behind interfaces, injected with `ServicesProvider`.** Screens stay testable and backend-agnostic; mocks and real backends swap in one place (`createServices`).
- **Supabase is the source of truth; repositories do not cache.** Avoids stale delivery data; caching can be added deliberately later.
- **Untyped Supabase client plus runtime mappers.** The schema is unconfirmed, so rows are validated at runtime instead of trusting generated types that do not exist yet.
- **Google APIs through a Supabase Edge Function.** Google keys cannot be secured in a mobile bundle; the proxy holds the key and can verify the driver's JWT.
- **Keyless Google Maps URL for directions.** Turn-by-turn navigation without bundling a key or adding a maps SDK.
- **Chunked SecureStore for the session.** SecureStore values have size limits on some platforms; chunking keeps the session encrypted at rest. AsyncStorage on web, where SecureStore is unavailable.
- **Session verification with `getClaims`, kept when offline.** Drivers in poor coverage must not be signed out by a network failure; invalid sessions are still cleared.
- **Foreground location only.** Background tracking needs extra permissions and store review; deferred until required.
- **Removed the `shareLiveLocation` preference.** Live sharing does not exist, so a toggle would mislead drivers.
- **Mock mode refused in production and always bannered.** Prevents shipping fictional data or confusing testers.
- **Development builds (`expo-dev-client`), not Expo Go.** Expo Go cannot load arbitrary native modules; dev builds match production behaviour.
- **TypeScript 6 needs `"types": ["jest"]`.** TS 6 no longer loads all `@types` automatically.
- **`Fragment` instead of the empty-tag fragment shorthand.** The CookieMonster file transport stripped empty tags, which broke JSX.

## Session Notes

- The git repo has one template commit. All foundation work is **uncommitted**; do not commit unless the user asks.
- Default `.env` setup uses mock mode. Copy `.env.example` to `.env`; restart with `npx expo start --clear` after env changes. SDK 58 loads `.env`, `.env.local`, `.env.development`, `.env.production` and their `.local` variants only.
- `context/README.md` is the methodology guide, not a context file.
- `context/` is excluded in `.prettierignore`, so context files are not format-checked.
- The glob tool skips gitignored `node_modules`; use the shell to inspect installed packages.
- Run EAS as `npx eas-cli@latest <command>`, only with user consent.
- `AGENTS.md` has an "Application Building Context" section that points at these six files (added 2026-11-08 at the user's request).

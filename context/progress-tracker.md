# Progress Tracker

Update this file after every meaningful implementation change.

## Current Phase

- Phase 1 — Standalone delivery system (units in `context/specs/00-build-plan.md`).
- Unit 04 — Persisted preference validation: completed 2026-11-11.
- Unit 02 — Scope and contracts: pending operational decisions.
- Next unit not started; confirm with the user.

## Current Goal

- Confirm the next unit with the user (build plan order suggests Unit 05 — Mock-mode visibility).
- Keep Unit 02 scope and contracts pending until the operational rules are approved.

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
- **Unit 01 — Windows line-ending normalization**
  - `.gitattributes` (`* text=auto eol=lf`) and `.editorconfig` added; Prettier `endOfLine: "lf"`.
  - `.gitignore` excludes `.env*` except `.env.example`; `.prettierignore` excludes env files and credential material.
  - Verified 2026-11-11 (this session): changes present; lint and format check pass in `npm run validate`.
- **Unit 03 — Authentication restoration correctness**
  - Revision guard in `AuthProvider`: a pending restoration cannot replace a newer auth event, sign-in or sign-out.
  - Regression tests in `src/providers/__tests__/auth-restore-race.test.tsx`.
  - Verified 2026-11-11 (this session): `npm run validate` passed, 57 tests in 11 suites.
- **Unit 04 — Persisted preference validation** (2026-11-11)
  - `src/stores/tracking-preferences-store.ts`: a custom `persist` `merge` treats stored state as untrusted. It accepts `highAccuracy` only as a boolean and `distanceIntervalMeters` only as a finite number, which is rounded and clamped to 5–500. Missing or invalid fields use the defaults. Other stored keys, including action names, are ignored.
  - Persistence key `eskort-driver.tracking-preferences` and version 1 unchanged. No migration was needed. Setter behaviour unchanged; setters and hydration share `normalizeDistanceInterval`.
  - New `src/stores/__tests__/tracking-preferences-hydration.test.ts` (37 tests). The tests write raw values to the mocked AsyncStorage and call the real `persist.rehydrate()`. `stores.test.ts` now clears storage and awaits hydration in `beforeEach`.
  - Verified 2026-11-11 (this session): `npm run validate` passed, 94 tests in 12 suites.
  - Not run: Expo Doctor (blocked; no dependency or native changes), device runs.
  - Zustand behaviour: a stored version other than 1 with no `migrate` logs a console error and keeps the defaults.

## In Progress

- **Unit 02 — Scope and contracts**
  - Pending. Operational decisions are not approved; no backend features implemented.

## Diagnostic Blocker

- Expo Doctor 1.21.7 fails before running checks with MODULE_NOT_FOUND
  for @expo/env.
- Failure reproduced with the original cache, an isolated cache, and
  explicitly supplying @expo/env in the isolated tool installation.
- Root cause remains unconfirmed. Further workaround attempts paused.
- Historical (user-supplied): validation passed with 54 tests in 10 suites, later 57 tests in 11 suites.
- This session (2026-11-11): baseline `npm run validate` passed, 57 tests in 11 suites.
  After Unit 04: `npm run validate` passed, 94 tests in 12 suites.
  Expo Doctor was not re-run; no dependencies or native configuration changed.

## Next Up

Order follows `context/specs/00-build-plan.md`. Confirm each unit with the user before starting it.

1. **Unit 05 — Mock-mode visibility.** No open question blocks it.
2. **Unit 02 — Scope and contracts.** Blocked on the operational rules under **Open Questions**. `project-overview.md` and `architecture.md` must be updated before Units 06–14 start.
3. **Unit 06 — Backend schema and authorization.** Needs Unit 02 and the backend questions answered.
4. **Unit 07 — Live read-only integration.** Needs Unit 06 and a non-production Supabase project.
5. **Units 08–11 — Status operations, PIN proof of delivery, offline reads, offline status queue.** Need the status, reason, PIN and offline answers.
6. **Units 12–13 — Background location configuration, tracking lifecycle and uploads.** Need the tracking answers. Unit 12 requires a new development build.
7. **Unit 14 — Google Routes integration.** Needs Google Cloud billing and APIs enabled; the user configures secrets and deploys the Edge Function.
8. **Unit 15 — Device verification and handover.** Needs approved app identifiers, EAS ownership and consent for EAS commands.

Not yet in the build plan: applying approved Eskort brand tokens, icon and splash (waiting on brand assets).

## Open Questions

Approved direction is recorded under **Requirements Received**. Each question below lists only what is still unanswered.

### Operational rules (block Unit 02 and Units 08–13)

- **Status transitions.** Approved: drivers need all delivery status actions. Open: the exact transition graph, including cancellation and retries.
- **Failure and cancellation reasons.** Approved: reasons are predefined. Open: the reason codes and when each is required.
- **PIN proof of delivery.** Approved: proof of delivery uses a PIN. Open: how recipients receive their PIN, PIN expiry and the failed-attempt limit.
- **Live tracking.** Approved: tracking starts after package collection from the store. Open: who may view live tracking, and when tracking stops, including with multiple collected deliveries. Background location needs "always" permission and store-review justification.
- **Offline support.** Approved: cached delivery reads and queued status updates are in scope. Open: cache retention, location retention, and what happens to queued updates on sign-out.
- **Administration.** Approved: driver accounts are administrator-provisioned; no password reset for now. Open: who creates deliveries, assigns drivers and provisions accounts.

### Backend

- **Schema.** Unit 06 plans new migrations. Does an existing Supabase project or schema need to be preserved, or does Unit 06 start from the assumed schema in `architecture.md`?
- **Ownership of backend code.** Approved: the user configures secrets and deploys the Maps Edge Function. Open: where the migrations, RLS policies and Edge Function source live (`project-overview.md` currently says outside this repo), and who applies migrations.
- **Google Cloud.** The project is new; billing and the required APIs are not enabled yet. Blocks Unit 14.

### Release and tooling

- Real iOS bundle identifier and Android package name (currently `com.example.eskortdriver`), and the EAS owner/project.
- Approved Eskort brand colours, fonts, app icon and splash artwork.
- Icon library choice, if icons are needed.
- How to handle the 31 npm audit warnings (1 low, 30 moderate), and whether to remove unused starter packages (`@expo/ui`, `expo-glass-effect`, `expo-symbols`).

Dropped: "where are proof-of-delivery files stored" no longer applies because PIN was chosen. Reopen it if photo or signature proof is added.

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
- 2026-11-11: **Next Up** and **Open Questions** reconciled with `context/specs/00-build-plan.md` and the approved requirements, at the user's request. Documentation only; no decisions were added.

## Requirements Received — Standalone Delivery System

Confirmed by the user:
- No Eskort e-commerce integration is required for now.
- Drivers need all delivery status actions; the exact transition rules still need specification.
- Failure/cancellation reasons can be predefined.
- Proof of delivery will use a PIN.
- Live tracking should start after package collection from the store.
- Offline support must include cached delivery reads and queued status updates.
- Password reset is not required for now.
- Development machine: Windows 11; an iPhone is available for testing.
- Google Cloud project is new; billing and APIs are not enabled yet.
- No Maps Edge Function exists. The user will configure secrets and deploy it.

These requirements are approved direction, not completed functionality.
Update project-overview.md and architecture.md before implementing the new features.

Validation history (historical, user-supplied):
- Earlier output: type-check passed; lint failed with CRLF formatting errors (addressed by Unit 01).
- Later output: type-check, lint, format check and 57 tests in 11 suites passed.
- Checks run in later sessions are recorded with their unit under **Completed**.

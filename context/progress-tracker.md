# Progress Tracker

Update this file after every meaningful implementation change.

## Current Phase

- Phase 1 — Standalone delivery system (units in `context/specs/00-build-plan.md`).
- Unit 04 — Persisted preference validation: completed 2026-11-11.
- Unit 05 — Mock-mode visibility: completed 2026-11-11.
- Unit 02 — Scope and contracts: **approved** by the user as operational contract v1 on 2026-11-12 (`context/specs/02-operational-contract.md`).
- Unit 06 — Backend schema and authorization: specification drafted 2026-11-12 (`context/specs/06-backend-schema-authorization.md`); **awaiting review. Implementation not approved.**

## Current Goal

- User review of `context/specs/06-backend-schema-authorization.md`: the proposed schema, access matrix, integration contract, migration plan and test plan, and answers to U6-Q1 to U6-Q17 (§13).
- Do not create `supabase/` or any migration, function, seed or test file until the Unit 06 specification is approved.
- No remote migrations, function deployments, secrets, commits, EAS commands or new dependencies without explicit approval.

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
  - Verified 2026-11-11: changes present; lint and format check pass in `npm run validate`.
- **Unit 03 — Authentication restoration correctness**
  - Revision guard in `AuthProvider`: a pending restoration cannot replace a newer auth event, sign-in or sign-out.
  - Regression tests in `src/providers/__tests__/auth-restore-race.test.tsx`.
  - Verified 2026-11-11: `npm run validate` passed, 57 tests in 11 suites.
- **Unit 04 — Persisted preference validation** (2026-11-11)
  - `src/stores/tracking-preferences-store.ts`: a custom `persist` `merge` treats stored state as untrusted. It accepts `highAccuracy` only as a boolean and `distanceIntervalMeters` only as a finite number, which is rounded and clamped to 5–500. Missing or invalid fields use the defaults. Other stored keys, including action names, are ignored.
  - Persistence key `eskort-driver.tracking-preferences` and version 1 unchanged. No migration was needed. Setter behaviour unchanged; setters and hydration share `normalizeDistanceInterval`.
  - New `src/stores/__tests__/tracking-preferences-hydration.test.ts` (37 tests). The tests write raw values to the mocked AsyncStorage and call the real `persist.rehydrate()`. `stores.test.ts` now clears storage and awaits hydration in `beforeEach`.
  - Verified 2026-11-11: `npm run validate` passed, 94 tests in 12 suites.
  - Not run: Expo Doctor (blocked; no dependency or native changes), device runs.
  - Zustand behaviour: a stored version other than 1 with no `migrate` logs a console error and keeps the defaults.
- **Unit 05 — Mock-mode visibility** (2026-11-11)
  - Before: the banner rendered only on sign-in and in the ready-state list header of Assigned deliveries, where it scrolled away. Delivery details, profile and the loading, empty, inactive-account and error states had no banner.
  - New `src/components/mock-mode-screen-layout.tsx`: a navigator `screenLayout` wrapper that renders `MockModeBanner` once above the screen in mock mode and returns the screen unchanged in live mode. A context guard prevents a second banner if layouts are nested.
  - `src/app/(app)/_layout.tsx` and `src/app/(auth)/_layout.tsx` pass it as `screenLayout`. In `(app)` the banner sits directly below the native header; the headerless `(auth)` stack uses `headerless`, so the banner clears the status bar.
  - Removed the duplicate placements from `sign-in-screen.tsx` and the list header in `assigned-deliveries-screen.tsx`. The list header still shows the refresh error message. The banner's accessible label is unchanged.
  - The banner is outside each screen's `ScrollView`/`FlatList`, so list scrolling, pull-to-refresh and keyboard avoidance are unchanged. On sign-in, `KeyboardAvoidingView` is a direct sibling below the banner.
  - Tests: `src/components/__tests__/mock-mode-screen-layout.test.tsx` (mock, headerless, live, nested) and `src/components/__tests__/mock-mode-routes.test.tsx`. The route test renders the real layouts and routes with `renderRouter` and checks exactly one banner in mock mode and none in live mode for 13 states across sign-in, assigned deliveries, delivery details and profile.
  - Jest config: added `standard-navigation` (an ESM-only `expo-router` dependency) to `transformIgnorePatterns` in `package.json`, so router tests can load. No dependency changes.
  - Verified 2026-11-11: `npm run validate` passed, 124 tests in 14 suites.
  - Not run: Expo Doctor (blocked; no dependency or native changes), device or simulator runs. Visual placement under the native header, status-bar clearance and keyboard behaviour on a real device are not verified.
- **Unit 02 — Scope and contracts** (documentation only; drafted 2026-11-11, approved 2026-11-12)
  - `context/specs/02-operational-contract.md` rewritten as operational contract v1 from the user's decision record. Confirmed rules carry their decision IDs; Unit 06 design details are labelled as proposals; still-open items are in §12.
  - `project-overview.md`: implemented features kept factual; **Approved Future Direction** rewritten from the decision record; the e-commerce application recorded as a separate, later, bounded integration; the high-accuracy preference relabelled as affecting route estimates.
  - `architecture.md`: **Planned Architecture** rewritten as approved direction (backend in `supabase/`, schemas, role membership, custody, attempts and versions, audit events, PIN verifier and notification boundary, integration endpoint, client units). Current sections and invariants unchanged.
  - `specs/00-build-plan.md`: Unit 02 approved; Unit 06 scope expanded; decisions section resolved; later integration work listed separately.
  - Root `README.md`: describes the standalone system and separates implemented, planned and not-planned features.
  - Obsolete `context/README.md` references removed from `AGENTS.md` and `context/ai-workflow-rules.md` (targeted edits, explicit user permission).
  - CRLF normalised to LF in `AGENTS.md`, `context/ai-workflow-rules.md`, `context/project-overview.md`, `context/architecture.md`, `context/progress-tracker.md` and `context/specs/00-build-plan.md` only. `code-standards.md` and `ui-context.md` were not edited and keep CRLF.
  - No code, dependency, migration, remote, EAS or git changes.
  - Verified 2026-11-12: first `npm run validate` passed type-check, lint and format check. Two auth suites (`auth-provider.test.tsx`, `auth-restore-race.test.tsx`) then hit Jest's 5 s timeout in a 164 s run. Run alone, those two suites passed (4 tests). `git diff` showed no changes under `src/` or in the config files. A second full `npm run validate` passed: 124 tests in 14 suites, 32 s. The timeouts are attributed to machine load, not to a code change.
  - Not run: Expo Doctor (blocked; no dependency or native changes), backend tests (no Docker or Supabase CLI).

## In Progress

- **Unit 06 — Backend schema and authorization** (2026-11-12) — **specification awaiting review**
  - `context/specs/06-backend-schema-authorization.md`: scope, schemas and exposure, types, tables, settings, immutability, functions (driver, administrator, PIN, notification, integration), access matrix and column grants, integration contract, retention, migration plan, seed data, pgTAP test plan, risks and design questions U6-Q1 to U6-Q17.
  - Nothing implemented. `supabase/` does not exist.
  - Local backend tests cannot run: Docker and the Supabase CLI are not installed (only Deno 2.9.8). Installing them needs user consent.

## Diagnostic Blocker

- Expo Doctor 1.21.7 fails before running checks with MODULE_NOT_FOUND
  for @expo/env.
- Failure reproduced with the original cache, an isolated cache, and
  explicitly supplying @expo/env in the isolated tool installation.
- Root cause remains unconfirmed. Further workaround attempts paused.
- Historical (user-supplied): validation passed with 54 tests in 10 suites, later 57 tests in 11 suites.
- 2026-11-11: baseline `npm run validate` passed, 57 tests in 11 suites.
  After Unit 04: `npm run validate` passed, 94 tests in 12 suites.
  After Unit 05: `npm run validate` passed, 124 tests in 14 suites.
  Expo Doctor was not re-run; no dependencies or native configuration changed.
- 2026-11-12 (documentation only): `npm run validate` passed on the second run, 124 tests in 14 suites. The first run had two auth-suite timeouts under load (see Unit 02 under **Completed**).
- Backend tooling (2026-11-12): Docker and the Supabase CLI are not installed, so `supabase test db` cannot run.

## Next Up

Order follows `context/specs/00-build-plan.md`. Confirm each unit with the user before starting it.

1. **Unit 06 — Backend schema and authorization.** Review the specification and answer U6-Q1 to U6-Q17. Then implement `supabase/` locally. Running the tests needs Docker and the Supabase CLI (consent to install).
2. **Unit 07 — Live read-only integration.** Needs Unit 06 applied by the user to a non-production Supabase project. Updates domain types, mappers and mocks (`pending_assignment`, `reference`, `recipient_*`, attempt, version, custody).
3. **Units 08–11 — Status operations, PIN proof of delivery, offline reads, offline status queue.**
4. **Units 12–13 — Background location configuration, tracking lifecycle and uploads.** Unit 12 requires a new development build and changes Invariant 9.
5. **Unit 14 — Google Routes integration.** Needs Google Cloud billing and APIs enabled; the user configures secrets and deploys the Edge Function.
6. **Unit 15 — Device verification and handover.** Needs approved app identifiers, EAS ownership and consent for EAS commands.
7. **Later, separate:** email PIN sender, create-delivery and delivery-status Edge Functions, and the e-commerce application (outside this repository).

Not yet in the build plan: applying approved Eskort brand tokens, icon and splash (waiting on brand assets).

## Open Questions

Approved direction is recorded under **Requirements Received**. Each question below lists only what is still unanswered.

### Unit 06 design (block Unit 06 implementation)

- U6-Q1 to U6-Q17 in `context/specs/06-backend-schema-authorization.md` §13. Each has a proposal awaiting acceptance or an answer. Key items: how administrator functions are invoked (U6-Q1), when PINs are generated and requested (U6-Q2, U6-Q3), custody transfer excluded from the MVP (U6-Q5), who confirms returns to store (U6-Q6), whether `failed` is terminal (U6-Q7), the integration credential (U6-Q14), and the column renames that Unit 07 must follow (U6-Q16).

### Operational (from contract §12)

- **D-A3** — Initial password and account recovery process for drivers (Unit 06 runbooks).
- **D-A4** — Which corrections are allowed after `delivered` or `cancelled` (Units 06, 08).
- **D-A6** — Geocoding of recipient addresses (Units 06, 14).
- **D-A7** — Stores per delivery; Unit 06 proposes exactly one (Unit 06).
- **D-O6** — Device clock differences; proposed: server time authoritative (Units 08, 11).
- **D-O7** — Replay from a background task (Unit 11).
- **D-T7** — Who controls tracking sampling (Unit 13).

### Backend tooling and environment

- Consent to install Docker and the Supabase CLI for local backend tests, or another place to run them (for example CI).
- A non-production Supabase project for Unit 07; who creates it and when.
- **Google Cloud.** The project is new; billing and the required APIs are not enabled yet. Blocks Unit 14.

### Release and tooling

- Real iOS bundle identifier and Android package name (currently `com.example.eskortdriver`), and the EAS owner/project.
- Approved Eskort brand colours, fonts, app icon and splash artwork.
- Icon library choice, if icons are needed.
- How to handle the 31 npm audit warnings (1 low, 30 moderate), and whether to remove unused starter packages (`@expo/ui`, `expo-glass-effect`, `expo-symbols`).

Dropped: "where are proof-of-delivery files stored" no longer applies because PIN was chosen. Reopen it if photo or signature proof is added. Resolved by the decision record (2026-11-12): status graph, reason codes, PIN channel, format, attempts and expiry, tracking audience and stop rules, cache, queue and location retention, sign-out behaviour, administration, schema preservation and backend source ownership.

## Architecture Decisions

- **Auth in React Context, operational state in Zustand.** Keeps one owner for session and driver profile, avoiding two sources of truth that drift on sign-out or refresh.
- **Services behind interfaces, injected with `ServicesProvider`.** Screens stay testable and backend-agnostic; mocks and real backends swap in one place (`createServices`).
- **Supabase is the source of truth; repositories do not cache.** Avoids stale delivery data. Approved direction (Unit 10): the Supabase repository stays uncached and an encrypted caching wrapper is added; server records never go into Zustand.
- **Untyped Supabase client plus runtime mappers.** The schema is unconfirmed, so rows are validated at runtime instead of trusting generated types that do not exist yet.
- **Google APIs through a Supabase Edge Function.** Google keys cannot be secured in a mobile bundle; the proxy holds the key and can verify the driver's JWT.
- **Keyless Google Maps URL for directions.** Turn-by-turn navigation without bundling a key or adding a maps SDK.
- **Chunked SecureStore for the session.** SecureStore values have size limits on some platforms; chunking keeps the session encrypted at rest. AsyncStorage on web, where SecureStore is unavailable.
- **Session verification with `getClaims`, kept when offline.** Drivers in poor coverage must not be signed out by a network failure; invalid sessions are still cleared.
- **Foreground location only.** Background tracking needs extra permissions and store review. Approved direction: changes in Unit 12, not before.
- **Removed the `shareLiveLocation` preference.** Live sharing does not exist, so a toggle would mislead drivers.
- **Mock mode refused in production and always bannered.** Prevents shipping fictional data or confusing testers.
- **Development builds (`expo-dev-client`), not Expo Go.** Expo Go cannot load arbitrary native modules; dev builds match production behaviour.
- **TypeScript 6 needs `"types": ["jest"]`.** TS 6 no longer loads all `@types` automatically.
- **`Fragment` instead of the empty-tag fragment shorthand.** The CookieMonster file transport stripped empty tags, which broke JSX.
- **Atomic server operations instead of direct status writes** (approved 2026-11-12). RLS alone cannot validate workflow transitions or restrict columns. Design under review in Unit 06.
- **Backend source in `supabase/` in this repository** (approved 2026-11-12). Agents prepare and test locally; the user applies and deploys.

## Session Notes

- Git history (checked 2026-11-11 during Unit 02): `b41eff9` initial commit, `4ed3faf` foundation scaffold, `18cfd26` auth restoration, preference hydration and line endings, `162e594` mock banner. Unit 02 and the Unit 06 specification are uncommitted. Do not commit unless the user asks.
- Default `.env` setup uses mock mode. Copy `.env.example` to `.env`; restart with `npx expo start --clear` after env changes. SDK 58 loads `.env`, `.env.local`, `.env.development`, `.env.production` and their `.local` variants only.
- `context/` is excluded in `.prettierignore`, so context files are not format-checked. The root `README.md` is format-checked.
- `.sql` files are not checked by TypeScript, ESLint or Prettier. Future `supabase/functions/` (Deno) must be excluded from `tsconfig.json` and ESLint in the unit that adds them.
- The glob tool skips gitignored `node_modules`; use the shell to inspect installed packages.
- Run EAS as `npx eas-cli@latest <command>`, only with user consent.
- `AGENTS.md` has an "Application Building Context" section that points at the six context files (added 2026-11-08 at the user's request).
- 2026-11-11: **Next Up** and **Open Questions** reconciled with `context/specs/00-build-plan.md` and the approved requirements, at the user's request.
- 2026-11-11: Unit 05 implemented at the user's request. The mock banner now lives only in the route-group `screenLayout` (`MockModeScreenLayout`); do not add it to screens. Router-level tests use `expo-router/testing-library`, which enables fake timers.
- 2026-11-11: Unit 02 drafted at the user's request.
- 2026-11-12: the user's decision record adopted as operational contract v1. The obsolete `context/README.md` references were removed from `AGENTS.md` and `ai-workflow-rules.md` with explicit permission. Unit 06 specification drafted for review.

## Requirements Received — Standalone Delivery System

Confirmed by the user:
- Drivers need all legitimate delivery status actions (not unrestricted access to every status value).
- Failure/cancellation reasons are predefined.
- Proof of delivery uses a PIN.
- Live tracking starts after package collection from the store.
- Offline support includes cached delivery reads and queued status updates.
- Password reset is not required for now.
- Development machine: Windows 11; an iPhone is available for testing.
- Google Cloud project is new; billing and APIs are not enabled yet.
- No Maps Edge Function exists. The user will configure secrets and deploy it.

Confirmed by the decision record (2026-11-12), detailed in `context/specs/02-operational-contract.md` v1:
- **Administration (D-A1, D-A2, D-A5).** Designated administrators provision accounts, create deliveries, assign drivers, initiate retries and make corrections. Initial tooling: Supabase Dashboard, runbooks and controlled database functions. Individually identifiable administrator accounts; authorization from a protected server-managed role/membership table, never user-editable metadata. Every administrative operation is audited (actor, reason, timestamp, record). Project collaborators are distinct from application administrators.
- **E-commerce application (D-A1).** Separate, later, bounded: catalogue and basket, recipient details, order creation and confirmation, delivery reference and basic status. Excludes payments, inventory and fleet optimisation.
- **Pending assignment (D-S3).** `pending_assignment` with `driver_id = null`; assignment moves it to `assigned`. Visible only to administrators and the permitted originating application. Types, mappers and mocks change in a later unit.
- **Schema and source (D-B1, D-B2).** No existing schema to preserve. Backend source in `supabase/` in this repository. The user applies migrations and deploys; agents prepare and test locally. Authenticated, idempotent create-delivery endpoint that never trusts a supplied driver, role, PIN or status; unique on originating application and external order ID.
- **Status (D-S1, D-S2, D-S4).** `pending_assignment → assigned → picked_up → en_route → delivered`, `failed` from `en_route`, `assigned` or `picked_up` with an applicable reason. `picked_up` means physically collected. One `en_route` per driver; `en_route` required before delivery. Delivery requires PIN verification. Drivers cannot cancel.
- **Retry (D-S5).** Same delivery ID, new attempt ID; earlier events immutable. Driver requests, administrator authorises. New attempt starts at `picked_up` if the driver holds the package, else `assigned`. Queued operations carry attempt ID and assignment version. Drivers never reopen delivered or cancelled records.
- **Reassignment (D-S7).** Allowed before collection. After collection only through an audited custody transfer; otherwise blocked. Custody is tracked separately from status.
- **Reasons (D-R1 to D-R4).** Codes `recipient_unavailable`, `recipient_refused`, `address_incorrect`, `access_blocked`, `vehicle_breakdown`, `package_damaged`, `store_not_ready`, `package_missing`, `other`; notes required except for `recipient_unavailable` and `store_not_ready`. Server-validated and stage-restricted. `store_not_ready` is a collection issue (stays `assigned`). Missing or damaged packages need administrator intervention. Cancellation reasons: customer cancellation, duplicate order, fulfilment unavailable, other (note required). Minimise personal data in notes.
- **PIN (D-P1 to D-P7).** Transactional email from a server-side function; test inboxes for demos; SMS deferred. Notification failures visible and retryable; completion only after valid issuance. Manual fallback only for synthetic records. Six-digit cryptographic PIN with leading zeros; server-secret-backed verifier. Nobody retrieves the PIN; administrators regenerate and resend. Never in logs, analytics, responses or audit payloads. Five incorrect attempts per issued PIN, atomic, plus rate limiting; locks until an administrator regenerates. 48-hour validity; regeneration invalidates immediately; a valid PIN before dispatch; configurable. Online verification only; no bypass; retry the same operation ID after a lost connection; raw PINs not persisted offline.
- **Offline (D-O1 to D-O5).** Driver-scoped cache with last-synced time, 24-hour maximum age, then hide customer details and block new actions; pending operations kept. Encrypted storage, preferably Expo SQLite + SQLCipher with keys in SecureStore after SDK confirmation. Queue limit 500, rejected with a warning when full. Ordered replay per delivery; permanent conflicts go to reconciliation. Sign-out choices "Sync first", "Stay signed in", "Sign out and discard pending changes". Explicit sign-out clears caches and queues and stops tracking; network-triggered expiry pauses sync for same-account recovery. Separate bounded location queue.
- **Tracking (D-T1 to D-T3, D-T5, D-T6).** Administrators view; drivers see their own state; customer tracking deferred. Starts after collection (including pending sync); continues while any package is held; stops when custody is resolved, on sign-out or on revocation. 12-hour session limit with recorded extension. Permissions required before a new collection; revocation later shows a warning without blocking custody actions. Disclosures approved by the product owner and a privacy representative. Background auth through a shared concurrency-safe layer, no service-role key, device testing required; `AFTER_FIRST_UNLOCK` not bypassed.
- **Retention (D-T4, D-X2).** Location 7 days; customer contact and address 90 days after terminal resolution; audit events 12 months, minimised; local cache and unsent locations 24 hours. Scheduled jobs, legal holds, backups and exports included. Product owner validates under POPIA.
- **Privacy (D-X1).** Synthetic data and informed test participants until a responsible-party representative approves real-data use. Passing tests is not POPIA approval.
- **Contradiction resolutions.** Atomic server operations replace direct status writes; uncached Supabase repository plus encrypted caching wrapper; Invariant 9 changes in its unit; Maps accepts delivery IDs and the Places UI is deferred; Dashboard and runbooks are bootstrap tooling; email notification boundary added; profile preferences labelled as affecting route estimates; obsolete methodology-file references removed; README updated; CRLF normalised only in edited docs.

These requirements are approved direction, not completed functionality.

Validation history (historical, user-supplied):
- Earlier output: type-check passed; lint failed with CRLF formatting errors (addressed by Unit 01).
- Later output: type-check, lint, format check and 57 tests in 11 suites passed.
- Checks run in later sessions are recorded with their unit under **Completed**.

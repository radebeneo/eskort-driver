# Architecture Context

## Stack

| Layer                  | Technology                                                    | Role                                                                                       |
| ---------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Framework              | Expo SDK 58, React Native 0.88, React 19.3, TypeScript ~6.0   | Cross-platform Android/iOS app. Strict TypeScript.                                         |
| Native workflow        | Continuous Native Generation + `expo-dev-client`              | `ios/` and `android/` are generated, never edited. Development builds, not Expo Go.        |
| Navigation             | Expo Router (`src/app`), `Stack.Protected`                    | File-based routes. Separates signed-in `(app)` and signed-out `(auth)` groups.             |
| Auth and session state | React Context (`AuthProvider`)                                | Owns session lifecycle, sign-in/out and the authenticated driver profile.                  |
| Client state           | Zustand                                                       | Client operational state only: selected delivery, tracking preferences.                    |
| Dependency injection   | React Context (`ServicesProvider`)                            | Supplies the typed `Services` object (live or mock) to hooks.                              |
| Backend                | Supabase (`@supabase/supabase-js`)                            | Auth, `drivers` and `deliveries` data. Source of truth. Access enforced by RLS.            |
| Session storage        | `expo-secure-store` (chunked), AsyncStorage on web            | Persists the Supabase session.                                                             |
| Preferences storage    | AsyncStorage (Zustand `persist`)                              | Persists tracking preferences.                                                             |
| Location               | `expo-location`                                               | Foreground permission, current position, position watching.                                |
| Routing, distance, places | Google Routes / Distance Matrix / Places via Supabase Edge Function | Server-side proxy holds the Google key. App calls it with the user's JWT.          |
| Directions hand-off    | Google Maps URL (`https://www.google.com/maps/dir/?api=1…`)    | Keyless deep link for turn-by-turn navigation.                                             |
| Builds                 | EAS Build / Submit / Update (`eas.json`)                      | Cloud builds. Profiles: `development`, `development-simulator`, `preview`, `production`.   |
| Tooling                | ESLint (`eslint-config-expo`) + Prettier, Jest (`jest-expo`) + RNTL 14 | Lint, format, unit and component tests.                                           |

## System Boundaries

- `src/app/` — Routes only. Each file is a screen or a `_layout.tsx` navigator. Route files are thin: they render a feature screen and set navigator options. No data fetching, no business logic.
- `src/features/<feature>/` — Feature screens, feature hooks and feature-only components and helpers. Features: `auth`, `deliveries`, `location`, `navigation`. Features call services only through hooks that use `useServices()`.
- `src/components/ui/` — The design system: theme tokens, `useTheme`, `Text`, `Button`, `Card`, `TextField`, `Screen`, `InfoRow`, `SwitchRow`. No feature knowledge.
- `src/components/states/` — Reusable loading, empty, error and permission-denied states.
- `src/components/` (root) — App-wide components that are not primitives: `config-error-screen`, `mock-mode-banner`, `mock-mode-screen-layout`, `header-link-button`.
- `src/providers/` — `ServicesProvider`, `AuthProvider`, `AppProviders` (composition). The only React Context providers in the app.
- `src/stores/` — Zustand stores for client operational state.
- `src/services/` — Typed interfaces and implementations for every external integration (`auth`, `deliveries`, `drivers`, `maps`, `location`), Supabase error mapping, the `Services` type, and `createServices`.
- `src/services/mocks/` — Mock implementations and fictional data. Selected only by `createServices`.
- `src/lib/` — Framework-level utilities: Supabase client factory, secure storage adapter, `AppError`, runtime validation helpers, geo and formatting helpers, `useAsyncResource`.
- `src/types/` — Domain types (`Delivery`, `Driver`, `AuthSession`, `GeoPoint`, routing types). No runtime dependencies on services.
- `src/config/` — Environment parsing and validation (`env.ts`).
- `src/hooks/` — App-wide hooks (`use-color-scheme`).

## Data Flow

```
route file (src/app) → feature screen → feature hook → useServices() → service interface
                                                                        ├─ Supabase implementation → Supabase (RLS)
                                                                        ├─ Edge Function maps service → google-maps function → Google
                                                                        ├─ expo-location service → device
                                                                        └─ mock implementation (mock mode only)
```

- Services return domain types. Raw Supabase rows and Edge Function responses are validated by mappers/parsers (`*-mapper.ts`, `maps-parsers.ts`) before leaving the service.
- Services throw `AppError` with a driver-safe `message` and the original error in `details`.
- `createServices(config)` in `src/services/index.ts` is the single place where live or mock implementations are chosen. Device location is real in both modes.

## Storage Model

- **Supabase Postgres (source of truth)**: drivers, deliveries, delivery items. The schema below is **assumed** and must be confirmed.
  - `drivers`: `id, user_id (auth.users.id), full_name, phone, vehicle_registration, is_active`
  - `deliveries`: `id, driver_id, order_number, status, customer_name, customer_phone, address_line1, address_line2, suburb, city, postal_code, latitude, longitude, scheduled_for, notes, updated_at`
  - `delivery_items`: `id, delivery_id, name, quantity`
  - `status` ∈ `assigned | picked_up | en_route | delivered | failed | cancelled`
- **Supabase Auth**: driver identities and sessions.
- **SecureStore (device)**: the Supabase session, split into 1024-character chunks plus a `.chunks` count key, `AFTER_FIRST_UNLOCK` accessibility. AsyncStorage on web.
- **AsyncStorage (device)**: persisted Zustand tracking preferences (key `eskort-driver.tracking-preferences`, version 1). Stored state is untrusted: a custom `persist` `merge` reads only `highAccuracy` (boolean) and `distanceIntervalMeters` (finite number, rounded and clamped to 5–500). Missing or invalid fields fall back to the defaults. Other stored keys, including action names, are ignored. A missing value or a version mismatch keeps the defaults.
- **In memory only**: delivery lists and details (reloaded through repositories; repositories do not cache beyond one call), the selected delivery ID, route estimates.
- **Supabase Edge Function secrets**: the Google Maps API key.
- **Never on the device**: Supabase secret/service-role key, Google Maps key, copies of Supabase data in Zustand.

## Auth and Access Model

- Drivers sign in with email and password through Supabase Auth. Accounts are provisioned outside the app.
- `AuthProvider` restores the stored session on launch, verifies it with `getClaims`, keeps it when offline (`isAuthRetryableFetchError`) and signs out locally on other failures. It ignores `INITIAL_SESSION` events and starts/stops token auto-refresh on `AppState` changes (not on web).
- After sign-in, `AuthProvider` loads the driver row for `auth.uid()` via the driver repository. The driver profile lives only in `AuthProvider`.
- Sign-out clears the session and resets client operational stores (selected delivery).
- **Access control is Supabase Row Level Security.** A driver may read only their own `drivers` row and deliveries (and items) whose `driver_id` matches that row, and may update status only on those deliveries. `Stack.Protected` route guards are UX, not security.
- The Google Maps Edge Function must verify the caller's JWT before calling Google.
- Session restoration is revision-guarded: a pending restoration result
  cannot replace a newer authentication event, completed sign-in, or
  explicit sign-out.

## Google Maps Proxy Contract

The Edge Function named by `EXPO_PUBLIC_GOOGLE_MAPS_FUNCTION` (default `google-maps`) is invoked with `supabase.functions.invoke` and body `{ action, ...payload }`:

| `action`             | Request                           | Response                                                                                     |
| -------------------- | --------------------------------- | -------------------------------------------------------------------------------------------- |
| `computeRoute`       | `origin, destination, waypoints?` | `{ distanceMeters, durationSeconds, encodedPolyline }`                                       |
| `distanceMatrix`     | `origins[], destinations[]`       | `{ elements: [{ originIndex, destinationIndex, status, distanceMeters, durationSeconds }] }` |
| `placesAutocomplete` | `input, sessionToken, near?`      | `{ suggestions: [{ placeId, primaryText, secondaryText }] }`                                 |
| `placeDetails`       | `placeId, sessionToken`           | `{ placeId, formattedAddress, location: { latitude, longitude } }`                           |

Responses are validated by `src/services/maps/maps-parsers.ts`. The function is not in this repo.

## Configuration Model

- Only client-safe values use `EXPO_PUBLIC_*`: `EXPO_PUBLIC_APP_ENV` (`development | preview | production`), `EXPO_PUBLIC_USE_MOCKS`, `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `EXPO_PUBLIC_GOOGLE_MAPS_FUNCTION`.
- `parseConfig` in `src/config/env.ts` is pure and unit tested. It rejects placeholders, non-base URLs, `http` outside development, invalid function names, mocks in production, and keys that look like server secrets (`sb_secret_…` or a JWT with `role: service_role`) even in mock mode.
- Invalid config renders `ConfigErrorScreen` instead of the app. It lists issues but never values.
- Expo inlines `EXPO_PUBLIC_*` only with static `process.env.EXPO_PUBLIC_X` access, read in `readProcessEnv`.
- Per-environment values for EAS builds come from EAS environment variables, not `eas.json`.

## Invariants

1. Screens and route files never call Supabase, Google, `fetch` or `expo-location` directly. All external access goes through a service interface obtained from `useServices()`.
2. Auth state (session, sign-in status, driver profile) lives only in `AuthProvider`. It is never duplicated in Zustand or any other store.
3. Supabase is the source of truth for deliveries. Zustand stores hold IDs and device preferences, never copies of server records.
4. No server secret is ever bundled: no Supabase secret/service-role key, no Google API key, no secret in `EXPO_PUBLIC_*`, `app.json` or `eas.json`. Google APIs are reached only through the Edge Function.
5. Mock implementations live only in `src/services/mocks/`, are selected only in `createServices`, are refused when `EXPO_PUBLIC_APP_ENV=production`, and are always visible to the user through `MockModeBanner`. The banner is rendered only by `MockModeScreenLayout`, the `screenLayout` of the `(auth)` and `(app)` stacks, so it appears exactly once above every screen and state. Screens and states must not render it themselves.
6. Every response from Supabase or the Edge Function is validated by a mapper or parser before it becomes a domain type.
7. Client route guards are not access control. Every data rule must also be enforced by RLS or the Edge Function.
8. `ios/` and `android/` are never created or edited by hand. Native behaviour is configured in `app.json` and config plugins.
9. Location is foreground-only. Background location must not be added without a scope change in `project-overview.md` and new permission configuration.

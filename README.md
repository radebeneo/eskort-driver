# Eskort Driver

Driver app (Android and iOS) for a standalone Eskort delivery system, built with Expo SDK 58, Expo Router and TypeScript. Supabase is the source of truth for drivers and deliveries.

This is a foundation, not the finished system. Today it includes sign-in, assigned deliveries, delivery details and the driver profile. These run against clearly marked mock services or a real Supabase project.

The approved Phase 1 plan extends it with a Supabase backend kept in this repository, controlled driver status operations, PIN proof of delivery, offline support and live tracking. A separate, small e-commerce application will later create deliveries through an authenticated endpoint; it is not part of this repository. See [Implemented and planned](#implemented-and-planned).

> No official Eskort brand assets, colours or fonts are included. The design tokens in `src/components/ui/theme.ts` are neutral placeholders, to be replaced with approved brand tokens.

## Implemented and planned

### Implemented

- Email and password sign-in through Supabase Auth, with the session kept in secure storage and restored on launch (kept when offline).
- Assigned deliveries list (active statuses only) and delivery details, including **Call customer**.
- Foreground location permission handling, route estimates through a Supabase Edge Function (the function does not exist yet, so live estimates cannot succeed until it is deployed), and a keyless Google Maps directions link.
- Driver profile with data source and sign out. The **High-accuracy GPS** preference affects route estimates only.
- Mock mode with an on-screen banner, refused in production. Startup configuration validation.

### Planned (approved, not implemented)

The rules are in `context/specs/02-operational-contract.md` (operational contract v1). Build order is in `context/specs/00-build-plan.md`.

- Backend source in `supabase/`: schema, RLS, controlled functions and tests (Unit 06; specification awaiting review in `context/specs/06-backend-schema-authorization.md`).
- Deliveries that exist before assignment (`pending_assignment`), administrator-controlled assignment, retries with new attempt IDs, and package custody tracked separately from status.
- Controlled, atomic driver status operations with predefined reasons. These replace the current direct status write in the repository, which no screen uses.
- PIN proof of delivery, with the PIN sent to the recipient by email from a server-side function and verified online by the server.
- An encrypted offline cache (24 hours), a status queue (500 operations) and a separate location queue.
- Live tracking after collection, viewable by administrators.
- Google Routes through an authenticated Maps Edge Function that derives destinations from delivery IDs.
- An authenticated, idempotent create-delivery endpoint for the separate e-commerce application.

### Not planned for Phase 1

Payments, inventory, fleet optimisation, customer-facing tracking, SMS, photo or signature proof, push notifications, password reset, an administrator app, in-app map rendering and Eskort branding (waiting on brand assets). Administration uses the Supabase Dashboard, runbooks and controlled database functions.

## Stack

| Concern                       | Choice                                                                 |
| ----------------------------- | ---------------------------------------------------------------------- |
| Framework                     | Expo SDK 58, React Native 0.88, TypeScript (strict)                    |
| Navigation                    | Expo Router (`src/app`), `Stack.Protected` auth guards                 |
| Auth/session + driver profile | React Context (`src/providers/auth-provider.tsx`)                      |
| Client operational state      | Zustand (`src/stores`): selected delivery, location preferences        |
| Backend / delivery data       | Supabase (source of truth), behind typed repositories                  |
| Location                      | `expo-location` (foreground, "when in use")                            |
| Routing / distance / places   | Google APIs through a Supabase Edge Function proxy (no key in the app) |
| Session storage               | `expo-secure-store` (chunked); AsyncStorage on web                     |
| Tooling                       | ESLint (`eslint-config-expo`) + Prettier, Jest (`jest-expo`) + RNTL    |

## Prerequisites

- Node.js LTS and npm
- For device builds: an [Expo account](https://expo.dev) and EAS CLI (`npx eas-cli@latest`), or Android Studio / Xcode for local builds

The app uses **development builds** (`expo-dev-client`), not Expo Go.

## Setup

```bash
npm install
cp .env.example .env        # PowerShell: Copy-Item .env.example .env
```

`.env.example` defaults to `EXPO_PUBLIC_USE_MOCKS=true`, so the app runs with fictional data and no backend. To use Supabase, set `EXPO_PUBLIC_USE_MOCKS=false` and fill in `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

Config is validated at startup (`src/config/env.ts`). Missing or placeholder values, an unknown environment, mocks in production, or a server secret used as the publishable key all show a configuration error screen that names the variable. After you change `.env`, restart with `npx expo start --clear`.

## Commands

| Task                                         | Command                                   |
| -------------------------------------------- | ----------------------------------------- |
| Start (development build)                    | `npm start`                               |
| Start (Expo Go, limited)                     | `npm run start:go`                        |
| Build + run Android locally                  | `npm run android`                         |
| Build + run iOS locally                      | `npm run ios` (macOS only)                |
| Lint                                         | `npm run lint`                            |
| Type-check                                   | `npm run typecheck`                       |
| Test                                         | `npm test` (watch: `npm run test:watch`)  |
| Format / check formatting                    | `npm run format` / `npm run format:check` |
| Diagnose Expo config                         | `npm run doctor`                          |
| Type-check + lint + format check + test (CI) | `npm run validate`                        |

### EAS builds (example profiles in `eas.json`)

```bash
npx eas-cli@latest login
npx eas-cli@latest init                                   # links the project, sets extra.eas.projectId
npx eas-cli@latest build --profile development --platform android
npx eas-cli@latest build --profile development-simulator --platform ios
npx eas-cli@latest build --profile preview --platform all
```

Profiles: `development` (dev client, internal), `development-simulator` (iOS simulator), `preview` (internal, Android APK, live backend), `production` (store, auto-increment). Set `EXPO_PUBLIC_SUPABASE_*` per environment with [EAS environment variables](https://docs.expo.dev/eas/environment-variables/), not in `eas.json`.

## Project structure

```
src/
  app/                    Routes only (thin files that render feature screens)
    _layout.tsx           Root: config check, providers, splash, protected stacks
    (auth)/sign-in.tsx
    (app)/index.tsx       Assigned deliveries
    (app)/deliveries/[id].tsx
    (app)/profile.tsx
  components/
    ui/                   Design system: theme tokens, Text, Button, Card, TextField, Screen, ...
    states/               Loading, Empty, Error, PermissionDenied
  features/
    auth/                 Sign-in, driver profile screen, splash controller
    deliveries/           List, details, status badge, data hooks
    location/             Permission hook, location preference UI
    navigation/           Route estimate, Google Maps directions link
  providers/              ServicesProvider (DI), AuthProvider (session + driver profile)
  stores/                 Zustand: delivery selection, location preferences
  services/
    auth/ deliveries/ drivers/ maps/ location/   Interfaces + real implementations
    mocks/                ⚠️ Mock implementations and fictional data (dev only)
    index.ts              The only place real vs mock services are chosen
  lib/                    Supabase client, secure storage, errors, validation, formatting
  types/                  Domain types
  config/                 Env parsing and validation
context/                  Project context files and unit specifications
```

A `supabase/` folder (migrations, functions, seed data, backend tests) will be added by Unit 06 once its specification is approved.

Rules:

- Screens never call Supabase, Google or `expo-location` directly. They use hooks that call services from `useServices()`.
- Auth state lives only in `AuthProvider`. Zustand holds client operational state and stores IDs, not copies of Supabase data.
- Data from the server is validated at runtime by mappers (`*-mapper.ts`, `maps-parsers.ts`).

## Backend contract

### Current (assumed placeholder)

The app currently reads an **assumed** schema. No backend source exists in this repository yet.

- `drivers`: `id, user_id (auth.users.id), full_name, phone, vehicle_registration, is_active`
- `deliveries`: `id, driver_id, order_number, status, customer_name, customer_phone, address_line1, address_line2, suburb, city, postal_code, latitude, longitude, scheduled_for, notes, updated_at`
- `delivery_items`: `id, delivery_id, name, quantity`
- `status` is one of `assigned | picked_up | en_route | delivered | failed | cancelled`

**Row Level Security is required**: drivers may only read their own driver row and deliveries. The client-side route guards are UX only.

### Planned

The proposed schema, access matrix, migrations and tests are in `context/specs/06-backend-schema-authorization.md` (awaiting review). It renames some columns and adds `pending_assignment`, attempts, assignment versions and custody; Unit 07 aligns the mappers. Do not point the app at the new schema before Unit 07.

### Google Maps proxy contract (current)

The Edge Function named by `EXPO_PUBLIC_GOOGLE_MAPS_FUNCTION` (default `google-maps`) receives `{ action, ...payload }` and keeps the Google API key as a function secret:

| `action`             | Request                           | Response                                                                                     |
| -------------------- | --------------------------------- | -------------------------------------------------------------------------------------------- |
| `computeRoute`       | `origin, destination, waypoints?` | `{ distanceMeters, durationSeconds, encodedPolyline }`                                       |
| `distanceMatrix`     | `origins[], destinations[]`       | `{ elements: [{ originIndex, destinationIndex, status, distanceMeters, durationSeconds }] }` |
| `placesAutocomplete` | `input, sessionToken, near?`      | `{ suggestions: [{ placeId, primaryText, secondaryText }] }`                                 |
| `placeDetails`       | `placeId, sessionToken`           | `{ placeId, formattedAddress, location: { latitude, longitude } }`                           |

The function does not exist yet. It must verify the caller's JWT before calling Google. The approved plan (Unit 14) narrows this contract: the function will accept delivery IDs and derive destinations server-side, and Places search is deferred.

## Security notes

- Every `EXPO_PUBLIC_*` value is bundled into the app. Only the Supabase URL and publishable (anon) key belong there.
- Never put the Supabase secret/service-role key or the Google Maps key in `.env` or `eas.json`.
- `.env` and `.env.*` (except `.env.example`) are gitignored.
- Use synthetic data only until a responsible-party representative approves real driver or customer data (POPIA review). Passing tests is not privacy approval.

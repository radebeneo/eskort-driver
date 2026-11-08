# Eskort Driver

Foundation for the Eskort e-commerce delivery-driver app (Android and iOS), built with Expo SDK 58, Expo Router and TypeScript.

This is a scaffold, not the finished app. It includes sign-in, assigned deliveries, delivery details and the driver profile. These run against clearly marked mock services or a real Supabase project.

> No official Eskort brand assets, colours or fonts are included. The design tokens in `src/components/ui/theme.ts` are neutral placeholders, to be replaced with approved brand tokens.

## Stack

| Concern                       | Choice                                                                 |
| ----------------------------- | ---------------------------------------------------------------------- |
| Framework                     | Expo SDK 58, React Native 0.88, TypeScript (strict)                    |
| Navigation                    | Expo Router (`src/app`), `Stack.Protected` auth guards                 |
| Auth/session + driver profile | React Context (`src/providers/auth-provider.tsx`)                      |
| Client operational state      | Zustand (`src/stores`): selected delivery, tracking preferences        |
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
    location/             Permission hook, tracking preference UI
    navigation/           Route estimate, Google Maps directions link
  providers/              ServicesProvider (DI), AuthProvider (session + driver profile)
  stores/                 Zustand: delivery selection, tracking preferences
  services/
    auth/ deliveries/ drivers/ maps/ location/   Interfaces + real implementations
    mocks/                ⚠️ Mock implementations and fictional data (dev only)
    index.ts              The only place real vs mock services are chosen
  lib/                    Supabase client, secure storage, errors, validation, formatting
  types/                  Domain types
  config/                 Env parsing and validation
```

Rules:

- Screens never call Supabase, Google or `expo-location` directly. They use hooks that call services from `useServices()`.
- Auth state lives only in `AuthProvider`. Zustand holds client operational state and stores IDs, not copies of Supabase data.
- Data from the server is validated at runtime by mappers (`*-mapper.ts`, `maps-parsers.ts`).

## Backend contract (assumed, to be confirmed)

The Supabase schema is a **placeholder**. Update the mappers when the real schema is known, and consider generating types with `supabase gen types typescript`.

- `drivers`: `id, user_id (auth.users.id), full_name, phone, vehicle_registration, is_active`
- `deliveries`: `id, driver_id, order_number, status, customer_name, customer_phone, address_line1, address_line2, suburb, city, postal_code, latitude, longitude, scheduled_for, notes, updated_at`
- `delivery_items`: `id, delivery_id, name, quantity`
- `status` is one of `assigned | picked_up | en_route | delivered | failed | cancelled`

**Row Level Security is required**: drivers may only read their own driver row and deliveries. The client-side route guards are UX only.

### Google Maps proxy contract

The Edge Function named by `EXPO_PUBLIC_GOOGLE_MAPS_FUNCTION` (default `google-maps`) receives `{ action, ...payload }` and keeps the Google API key as a function secret:

| `action`             | Request                           | Response                                                                                     |
| -------------------- | --------------------------------- | -------------------------------------------------------------------------------------------- |
| `computeRoute`       | `origin, destination, waypoints?` | `{ distanceMeters, durationSeconds, encodedPolyline }`                                       |
| `distanceMatrix`     | `origins[], destinations[]`       | `{ elements: [{ originIndex, destinationIndex, status, distanceMeters, durationSeconds }] }` |
| `placesAutocomplete` | `input, sessionToken, near?`      | `{ suggestions: [{ placeId, primaryText, secondaryText }] }`                                 |
| `placeDetails`       | `placeId, sessionToken`           | `{ placeId, formattedAddress, location: { latitude, longitude } }`                           |

The function is not part of this repo. It must verify the caller's JWT before calling Google.

## Security notes

- Every `EXPO_PUBLIC_*` value is bundled into the app. Only the Supabase URL and publishable (anon) key belong there.
- Never put the Supabase secret/service-role key or the Google Maps key in `.env` or `eas.json`.
- `.env` and `.env.*` (except `.env.example`) are gitignored.

## Not yet implemented

Background location and live location sharing, delivery status updates in the UI (the repository supports them), maps rendering, proof of delivery, push notifications, offline caching and Eskort branding.

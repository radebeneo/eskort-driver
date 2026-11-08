# Eskort Driver

## Overview

Eskort Driver is an Android and iOS app for the drivers who deliver Eskort e-commerce orders. A driver signs in and sees the deliveries assigned to them. They can open a delivery to see the customer, address, items and notes, get a distance and drive-time estimate from their current location, and hand off to Google Maps for turn-by-turn directions. Supabase is the source of truth for drivers and deliveries.

The repository is currently a **foundation**, not the finished app. The core screens and integrations exist and run against either clearly marked mock services or a real Supabase project. The backend schema, branding and several operational features are not final.

## Goals

1. A driver with a Supabase account can sign in with email and password and stays signed in across app restarts. The session is kept in secure device storage.
2. A signed-in driver sees only their own active deliveries (`assigned`, `picked_up`, `en_route`), soonest first.
3. A driver can open any assigned delivery and see the order number, status, customer name and phone, address, scheduled time, notes and items.
4. A driver can see an estimated distance and drive time from their current location to a delivery, and can open Google Maps directions in one tap.
5. No server secret (Supabase secret/service-role key or Google Maps API key) is ever bundled into the app.
6. The app can be developed and demonstrated without a backend, using mock services that are visibly labelled in the UI.

## Core User Flow

1. The driver opens the app. The splash screen stays visible while the stored session is restored and verified.
2. If the app configuration is invalid, a configuration error screen lists each problem by variable name. Values are never shown.
3. If no valid session exists, the driver sees the sign-in screen and enters email and password. Field errors and sign-in errors are shown inline.
4. After sign-in, the driver lands on **Assigned deliveries**. The list loads through the delivery repository, with loading, empty and error states.
5. The driver taps a delivery to open **Delivery details**. If the customer has a phone number, the driver can tap **Call customer**.
6. The route section checks foreground location permission:
   - If permission is undetermined, the driver is asked for it.
   - If granted, the app requests a route estimate through the Google Maps Edge Function and shows distance and drive time.
   - If denied, a permission-denied state explains why location is needed and offers to ask again or open settings.
   - If the delivery has no coordinates, a message says no estimate is available.
7. The driver taps **Open in Google Maps** and continues in Google Maps (keyless URL, by coordinates or by address).
8. From the header, the driver opens **Profile** to see driver details, account email, data source (mock or live), tracking preferences and **Sign out**.
9. Signing out clears the session and client operational state (the selected delivery) and returns the driver to sign-in.

## Features

### Authentication and session

- Email and password sign-in through Supabase Auth.
- Session persisted in chunked `expo-secure-store` on native and AsyncStorage on web.
- Session restored on launch and verified with `getClaims`. A cached session is kept when the device is offline and cleared locally on any other verification failure.
- Token auto-refresh runs only while the app is in the foreground.
- Signed-in and signed-out route groups are separated with `Stack.Protected`. This is UX only; Supabase RLS is the access control.

### Deliveries

- Assigned deliveries list showing active statuses only.
- Delivery details: order number, status badge, scheduled time, last updated, customer name, address, notes and items.
- **Call customer** button (opens the phone dialler) when the delivery has a customer phone number.
- The repository supports status updates; the UI does not expose them yet.

### Location and navigation

- Foreground ("when in use") location permission handling with a permission-denied state.
- Route estimate (distance and drive time) through a Supabase Edge Function that proxies Google APIs.
- Keyless Google Maps directions link.
- Tracking preferences stored on the device: high accuracy on/off and distance interval (5–500 m). These are stored for future tracking work; no background tracking exists.

### Driver profile

- Driver name, phone, vehicle registration and active status from the `drivers` table.
- Account email, data source (mock or live) and sign out.

### Developer experience

- Mock mode (`EXPO_PUBLIC_USE_MOCKS=true`) with fictional data and an on-screen banner. Refused in production.
- Startup configuration validation with readable errors.
- Development builds (`expo-dev-client`) and example EAS profiles.
- Strict TypeScript, ESLint, Prettier and Jest with React Native Testing Library.

## Scope

### In Scope

- The four screens: sign-in, assigned deliveries, delivery details, driver profile.
- Supabase Auth, the `drivers` and `deliveries` reads, and the delivery status update method in the repository.
- Foreground location, route estimate through the Edge Function, Google Maps hand-off.
- A neutral, accessible design system and reusable loading, empty, error and permission-denied states.
- Mock services for every backend integration.
- Tooling, config validation, `.env.example`, EAS example profiles and documentation.

### Out of Scope

Do not build these, add dependencies for them, or scaffold them until they are moved into scope in this file:

- Background location tracking and live location sharing with dispatch or customers.
- In-app map rendering (map views, polylines, markers).
- Changing delivery status from the UI (pick up, en route, delivered, failed).
- Proof of delivery (photo, signature, PIN).
- Push notifications.
- Offline caching or queued writes.
- Driver self sign-up, password reset and account management (driver accounts are assumed to be provisioned by Eskort).
- Places autocomplete UI (the service method exists; no screen uses it).
- Official Eskort branding: colours, fonts, logo, icon and splash artwork.
- Customer, dispatcher or admin apps, and payments.
- The Google Maps Edge Function itself and Supabase migrations/RLS policies (they live outside this repo).

## Success Criteria

1. With `EXPO_PUBLIC_USE_MOCKS=true`, a driver can sign in, see mock deliveries, open one, see a mock estimate, open Profile and sign out, with the mock banner visible throughout.
2. With valid Supabase config, a provisioned driver can sign in and sees only deliveries where `driver_id` is their driver row, enforced by RLS.
3. Killing and reopening the app keeps the driver signed in. Opening it offline with a cached session does not sign the driver out.
4. Denying location permission shows the permission-denied state, and the Google Maps button still works.
5. A missing, placeholder or server-secret value in `.env` shows the configuration error screen naming the variable.
6. `npm run validate` (type-check, lint, format check, tests) and `npx expo-doctor` pass.
7. A development build installs and runs on a physical Android device and an iOS device or simulator. *(Not yet verified.)*

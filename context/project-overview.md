# Eskort Driver

## Overview

Eskort Driver is an Android and iOS app for the drivers who deliver Eskort orders. A driver signs in and sees the deliveries assigned to them. They can open a delivery to see the customer, address, items and notes, get a distance and drive-time estimate from their current location, and hand off to Google Maps for turn-by-turn directions. Supabase is the source of truth for drivers and deliveries.

The repository is currently a **foundation**, not the finished app. The core screens and integrations exist and run against either clearly marked mock services or a real Supabase project. The backend schema, branding and several operational features are not final.

Phase 1 extends this foundation into a **standalone delivery system**: the driver app plus a Supabase backend whose source will live in `supabase/` in this repository. A separate, small e-commerce application will later create deliveries through an authenticated, idempotent endpoint. That application is not part of this repository and is not built in Phase 1.

- **Implemented Features** below describes what exists today.
- **Approved Future Direction** lists approved requirements that are not implemented. Their rules are in `context/specs/02-operational-contract.md` (**approved as operational contract v1, 2026-11-12**).
- The backend design for Unit 06 is in `context/specs/06-backend-schema-authorization.md` (**awaiting review; not approved for implementation**).

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
   - If granted, the app requests a route estimate through the Google Maps Edge Function and shows distance and drive time. No Maps Edge Function exists yet, so in live mode the estimate cannot succeed until it is deployed (Unit 14). Mock mode returns a mock estimate.
   - If denied, a permission-denied state explains why location is needed and offers to ask again or open settings.
   - If the delivery has no coordinates, a message says no estimate is available.
7. The driver taps **Open in Google Maps** and continues in Google Maps (keyless URL, by coordinates or by address).
8. From the header, the driver opens **Profile** to see driver details, account email, data source (mock or live), the location preference for route estimates, and **Sign out**.
9. Signing out clears the session and client operational state (the selected delivery) and returns the driver to sign-in.

## Implemented Features

What exists in the code today.

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
- The repository has an `updateStatus` method; the UI does not expose it. It writes the status column directly, accepts any status and records no reason, audit event or idempotency key. It is **not** a secure operational contract. The approved contract replaces it with atomic server operations (Unit 08); it must not be connected to the UI or offline replay.

### Location and navigation

- Foreground ("when in use") location permission handling with a permission-denied state.
- Route estimate (distance and drive time) through a Supabase Edge Function that proxies Google APIs.
- Keyless Google Maps directions link.
- Location preferences stored on the device. **High-accuracy GPS** affects the current-position read used for route estimates. The distance interval (5–500 m) is stored but not used yet. No live or background tracking exists.

### Driver profile

- Driver name, phone, vehicle registration and active status from the `drivers` table.
- Account email, data source (mock or live) and sign out.

### Developer experience

- Mock mode (`EXPO_PUBLIC_USE_MOCKS=true`) with fictional data and an on-screen banner. Refused in production.
- Startup configuration validation with readable errors.
- Development builds (`expo-dev-client`) and example EAS profiles.
- Strict TypeScript, ESLint, Prettier and Jest with React Native Testing Library.

## Approved Future Direction (Phase 1 — not implemented)

Approved by the user in operational contract v1 (`context/specs/02-operational-contract.md`). None of this is implemented. Each item stays out of scope until its unit in `context/specs/00-build-plan.md` is started with approval and that unit's specification is approved.

- **Backend in this repository** (Unit 06). Migrations, functions, synthetic seed data and backend tests in `supabase/`. Agents prepare and test locally; the user applies migrations and deploys functions.
- **Administration** (Unit 06). Designated administrators with individual accounts and a protected role-membership table. Initial tooling is the Supabase Dashboard, runbooks and controlled, audited database functions. No admin app.
- **Deliveries before assignment** (Units 06–07). New status `pending_assignment` with no driver, visible to administrators and the originating app only.
- **Controlled status operations** (Unit 08). Atomic server operations replace direct status writes. Progression `pending_assignment → assigned → picked_up → en_route → delivered`, with `failed` from `assigned`, `picked_up` or `en_route` and predefined, stage-restricted reasons. Only one `en_route` delivery per driver. Drivers cannot cancel.
- **Attempts, retries and custody** (Units 06, 08). Retries keep the delivery ID with a new attempt ID; queued operations carry the attempt ID and assignment version. Package custody is tracked separately from status. Reassignment after collection needs an audited custody transfer, otherwise it is blocked.
- **PIN proof of delivery** (Units 06, 09). Six-digit PIN sent to the recipient by transactional email from a server-side function, stored only as a secret-backed verifier, five attempts, 48-hour validity, online verification only, no bypass.
- **Offline support** (Units 10–11). A 24-hour, driver-scoped, encrypted cache (preferably Expo SQLite with SQLCipher) behind a caching wrapper; a 500-operation status queue; a separate location queue; explicit sign-out choices when writes are pending.
- **Live tracking** (Units 12–13). Starts after collection, continues while the driver holds any package, stops when custody is resolved, on sign-out or on revocation; 12-hour session limit; administrators view it.
- **Google Routes** (Unit 14). The Maps Edge Function accepts delivery IDs and derives destinations server-side. The Places search UI is deferred.
- **Retention and privacy.** Location 7 days; customer contact and address 90 days after terminal resolution; audit events 12 months, minimised. Synthetic data only until a responsible-party representative approves real-data use.
- **Order-to-delivery integration** (later). An authenticated, idempotent create-delivery endpoint for the separate e-commerce application.

Still open: see `context/specs/02-operational-contract.md` §12 and `context/specs/06-backend-schema-authorization.md` §13.

## Scope

### In Scope (implemented foundation)

- The four screens: sign-in, assigned deliveries, delivery details, driver profile.
- Supabase Auth, the `drivers` and `deliveries` reads, and the delivery status update method in the repository (superseded by Unit 08; not used by the UI).
- Foreground location, route estimate through the Edge Function, Google Maps hand-off.
- A neutral, accessible design system and reusable loading, empty, error and permission-denied states.
- Mock services for every backend integration.
- Tooling, config validation, `.env.example`, EAS example profiles and documentation.

### Out of Scope

Do not build these, add dependencies for them, or scaffold them until they are moved into scope in this file. Items marked **Approved direction** are approved for Phase 1 but stay out of scope until their unit's specification is approved and the unit is started.

- Background location tracking and live location sharing. **Approved direction:** tracking after collection for administrator viewers (Units 12–13). Customer-facing tracking is deferred.
- In-app map rendering (map views, polylines, markers).
- Changing delivery status from the UI. **Approved direction:** controlled driver operations (Unit 08).
- Proof of delivery. **Approved direction:** PIN by email (Units 06, 09). Photo and signature proof are not approved. SMS is deferred.
- Push notifications.
- Offline caching or queued writes. **Approved direction:** Units 10–11.
- Driver self sign-up, password reset and in-app account management. Accounts are provisioned by an administrator; there is no password reset for now.
- Places autocomplete UI (the service method exists; no screen uses it). Deferred by the approved contract.
- Official Eskort branding: colours, fonts, logo, icon and splash artwork.
- Customer, dispatcher or admin apps. Administration uses the Supabase Dashboard, runbooks and controlled functions.
- The e-commerce application (catalogue, basket, order creation), payments, inventory and fleet optimisation. **Approved direction:** a separate, bounded application built later outside this repository. Only its create-delivery endpoint belongs to this backend, in a later unit.
- Supabase migrations, RLS policies and Edge Functions. **Approved direction:** source in `supabase/` (Unit 06 schema; Unit 14 Maps function). Nothing exists yet; the Unit 06 specification is awaiting review. The user applies migrations and deploys functions.

## Success Criteria

1. With `EXPO_PUBLIC_USE_MOCKS=true`, a driver can sign in, see mock deliveries, open one, see a mock estimate, open Profile and sign out, with the mock banner visible throughout.
2. With valid Supabase config, a provisioned driver can sign in and sees only deliveries where `driver_id` is their driver row, enforced by RLS.
3. Killing and reopening the app keeps the driver signed in. Opening it offline with a cached session does not sign the driver out.
4. Denying location permission shows the permission-denied state, and the Google Maps button still works.
5. A missing, placeholder or server-secret value in `.env` shows the configuration error screen naming the variable.
6. `npm run validate` (type-check, lint, format check, tests) and `npx expo-doctor` pass. *(Expo Doctor is currently blocked before it runs checks; see the progress tracker.)*
7. A development build installs and runs on a physical Android device and an iOS device or simulator. *(Not yet verified.)*

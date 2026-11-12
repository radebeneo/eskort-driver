# Phase 1 Build Plan — Standalone Delivery System

## Purpose

Extend the existing driver application into a standalone delivery system:
the driver app plus a Supabase backend whose source lives in `supabase/`
in this repository.

A separate, small e-commerce application will later create deliveries
through an authenticated, idempotent endpoint. It is not part of this
repository and is not built by the units below (see **Later, separate**).

Preserve the existing architecture:
- React Context owns authentication and the driver profile.
- Zustand owns client operational state and device preferences.
- Typed services/repositories isolate external integrations.
- Supabase remains the authoritative source of delivery data.
- Mock mode remains clearly identified.

## Confirmed Requirements

- Administrator-provisioned driver accounts.
- Driver delivery-status actions.
- Predefined failure/cancellation reasons.
- PIN-based proof of delivery.
- Live tracking starting after package collection from a store.
- Cached delivery reads and queued offline status updates.
- No password-reset feature for now.
- Google Routes API for routing and route matrices in a new Google Cloud project.
- Google web-service secrets remain server-side.
- The approved MVP decision record (2026-11-12), adopted as
  `context/specs/02-operational-contract.md` v1. It defines the status
  progression, attempts and custody, reasons, PIN by email, offline limits,
  tracking lifecycle, retention, administration and the integration
  endpoint.

## Implementation Units

### 02 — Scope and contracts
Update project-overview.md and architecture.md to distinguish current
implementation from approved future scope.

Specify status transitions, PIN verification, tracking lifecycle, offline
synchronization, and backend administration.

No dependencies, schema changes, or remote deployment in this unit.

Specification: `context/specs/02-operational-contract.md`. Status:
**approved as operational contract v1 (2026-11-12).** Units 06–15
implement against it.

### 03 — Authentication restoration correctness
Prevent stale restoration results from overriding newer authentication
events or sign-out. Add deterministic race-condition tests.

### 04 — Persisted preference validation
Validate stored tracking preferences during hydration.
Preserve defaults and store action functions. Add invalid-data tests.

### 05 — Mock-mode visibility
Ensure the mock indicator remains visible on authenticated screens and
applicable loading/error states without duplicate banners.

### 06 — Backend schema and authorization
Create reviewed Supabase migrations, RLS policies, explicit grants,
controlled database functions, synthetic local seed data, and pgTAP
authorization and workflow tests in `supabase/`.

Include drivers, stores, deliveries with `pending_assignment`, items,
recipient contacts, attempts and assignment versions, package custody,
immutable delivery, custody and administrator audit events, reason codes
and stage rules, protected role membership, PIN verifiers and the
notification outbox, idempotency records, integration clients, settings,
retention functions, and location tables (schema only).

Drivers cannot directly edit assignment, ownership, arbitrary delivery
fields, status, or expected PINs. No API role receives table write
privileges.

Out of scope: UI, domain type and mapper changes (Unit 07), background
tracking and uploads (Unit 13), the email sender and its deployment, the
e-commerce application, and any remote migration or deployment.

Specification: `context/specs/06-backend-schema-authorization.md`.
Status: **draft, awaiting review. Implementation not approved.**
Local test execution needs Docker and the Supabase CLI (not installed).

### 07 — Live read-only integration
Align domain types, mappers and mocks with the approved schema, including
`pending_assignment`, the renamed recipient and reference columns, the
attempt ID, assignment version and custody.
Verify sign-in, assigned delivery reads, detail reads, and driver isolation
against a non-production backend.

### 08 — Controlled status operations
Connect the client to the atomic server operations from Unit 06:
transition validation, audit events, idempotency and conflict handling.
Replace `updateStatus`. Adapt repositories and mocks first, then add the
driver actions in a separate UI increment.

### 09 — PIN proof of delivery
Implement restricted server-side PIN verification with bounded attempts
in the client flow. Expected PINs and verification secrets must not be
returned to the driver. Completion needs server confirmation; raw PINs are
not persisted offline. The email notification sender is a separate,
approved increment.

### 10 — Offline delivery reads
Implement a driver-scoped, encrypted persistent cache as a wrapper around
the uncached Supabase repository, not by copying server records into
Zustand. Preferred storage: Expo SQLite with SQLCipher and keys in
SecureStore, after confirming SDK 58 compatibility.

Apply the 24-hour maximum age, account-switch cleanup, access revocation
behaviour, and handling of customer personal information.

### 11 — Offline status queue
Persist driver-scoped operations (maximum 500) with stable operation IDs,
attempt IDs and assignment versions. Replay in order per delivery,
preserve idempotency, and send permanent conflicts to reconciliation.

Queued operations are not authoritative server status.
Reject replay under a different account. Implement the approved sign-out
choices.

### 12 — Background location configuration
Add SDK-compatible native dependencies and permission configuration.
Require a new development build. Change Invariant 9 in this unit.

### 13 — Tracking lifecycle and uploads
Start tracking after collection according to the approved lifecycle.
Implement a separate bounded location upload queue, battery-conscious
sampling, timestamp validation, authorized uploads, the 12-hour session
limit, and explicit stop behaviour.

Background tasks must not rely on mounted React providers.
OS background execution is not guaranteed.

### 14 — Google Routes integration
Implement the authenticated Maps Edge Function.
Accept delivery IDs, resolve destinations server-side, and enforce driver
access, input limits, quotas, timeouts, and safe errors.

Do not expose an unrestricted routing proxy. Places search UI is deferred.

### 15 — Device verification and handover
Configure approved application identifiers and EAS ownership.
Test a signed development build on the available physical iPhone.

Document Android verification as outstanding until tested.

## Later, separate: order-to-delivery integration

- Create-delivery and delivery-status Edge Functions for the separate
  e-commerce application, built on the Unit 06 database functions.
- The e-commerce application itself (catalogue, basket, recipient
  details, order creation and confirmation) lives outside this repository.
- Excluded unless separately approved: payments, inventory management and
  fleet dispatch optimisation.
- Email PIN notification sender (server-side function and provider
  configuration).

## Decisions

The decisions previously listed here were answered by the user's decision
record and adopted in `context/specs/02-operational-contract.md` v1.
Remaining open items are listed in that contract's §12 and in the Unit 06
specification's §13.

## Validation Rules

- Implement one bounded unit at a time.
- Add tests for new logic.
- Run npm run validate after implementation changes.
- Run Expo Doctor when dependencies or native configuration change.
- Record blocked diagnostics without claiming they passed.
- Update the progress tracker after each unit.
- Obtain consent before remote changes, builds, or deployment.

## Current Evidence

Historical, user-supplied local results:
- Type-check, lint, and formatting passed.
- 54 tests passed across 10 suites, later 57 tests across 11 suites.
- Expo Doctor 1.21.7 failed before checks with missing @expo/env,
  including when installed through an isolated npm cache.

Checks run by the agent on 2026-11-11:
- Baseline `npm run validate`: passed, 57 tests across 11 suites.
- After Unit 04: `npm run validate` passed, 94 tests across 12 suites.
- After Unit 05: `npm run validate` passed, 124 tests across 14 suites.
- Expo Doctor not re-run (no dependency or native configuration changes).

Checks on 2026-11-12: recorded in `context/progress-tracker.md`.

Not verified:
- Native/device behaviour and live backend access.
- Backend tests (Docker and the Supabase CLI are not installed).

# Phase 1 Build Plan — Standalone Delivery System

## Purpose

Extend the existing driver application into a standalone delivery system.
No Eskort e-commerce integration is required for this phase.

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

## Implementation Units

### 02 — Scope and contracts
Update project-overview.md and architecture.md to distinguish current
implementation from approved future scope.

Specify status transitions, PIN verification, tracking lifecycle, offline
synchronization, and backend administration.

No dependencies, schema changes, or remote deployment in this unit.

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
Create reviewed Supabase migrations, RLS policies, local test data, and
authorization tests.

Include drivers, stores, deliveries, items, status events, and protected
PIN verification data.

Drivers cannot directly edit assignment, ownership, arbitrary delivery
fields, or expected PINs.

### 07 — Live read-only integration
Align domain types and mappers with the approved schema.
Verify sign-in, assigned delivery reads, detail reads, and driver isolation
against a non-production backend.

### 08 — Controlled status operations
Implement atomic server-side transition validation, audit events,
idempotency, and conflict handling. Adapt repositories and mocks first,
then add the driver actions in a separate UI increment.

### 09 — PIN proof of delivery
Implement restricted server-side PIN verification with bounded attempts.
Expected PINs and verification secrets must not be returned to the driver.

An offline submission remains pending until accepted by the server.

### 10 — Offline delivery reads
Implement a driver-scoped persistent cache through the repository/storage
layer, not by copying server records into Zustand.

Define expiry, account-switch cleanup, access revocation behaviour,
and handling of customer personal information.

### 11 — Offline status queue
Persist driver-scoped operations with stable operation IDs.
Replay in order, preserve idempotency, and surface conflicts.

Queued operations are not authoritative server status.
Reject replay under a different account.

### 12 — Background location configuration
Add SDK-compatible native dependencies and permission configuration.
Require a new development build.

### 13 — Tracking lifecycle and uploads
Start tracking after collection according to the approved lifecycle.
Implement bounded upload queues, battery-conscious sampling, timestamp
validation, authorized uploads, and explicit stop behaviour.

Background tasks must not rely on mounted React providers.
OS background execution is not guaranteed.

### 14 — Google Routes integration
Implement the authenticated Maps Edge Function.
Resolve delivery destinations server-side and enforce driver access,
input limits, quotas, timeouts, and safe errors.

Do not expose an unrestricted routing proxy.

### 15 — Device verification and handover
Configure approved application identifiers and EAS ownership.
Test a signed development build on the available physical iPhone.

Document Android verification as outstanding until tested.

## Decisions Required Before Relevant Implementation

- Exact status-transition graph, including cancellation and retries.
- Predefined reason codes and when each is required.
- Who creates deliveries, assigns drivers, and provisions accounts.
- How recipients receive their PIN.
- PIN expiry and failed-attempt limits.
- Who may view live tracking.
- When tracking stops, including multiple collected deliveries.
- Cache retention, location retention, and sign-out queue handling.

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
- Expo Doctor not re-run (no dependency or native configuration changes).

Not verified:
- Native/device behaviour and live backend access.
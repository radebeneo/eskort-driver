# Unit 02 — Operational Contract v1 (Phase 1 MVP)

**Status:** Approved by the user as the MVP operational contract on 2026-11-12. Source: the user's decision record (`decisions.md`), recorded in `progress-tracker.md` under **Requirements Received**.
**Applies to:** Units 06–15 in `context/specs/00-build-plan.md`, and the later, separate e-commerce integration.
**Implementation:** none of the new behaviour in this contract is implemented yet. Each rule is built in the unit named next to it, after that unit's own specification is approved. Unit 06 (backend schema and authorization) is specified in `context/specs/06-backend-schema-authorization.md`. That spec is **awaiting review**.

## How to read this document

| Label                 | Meaning                                                                                                                                   |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **Confirmed (D-…)**   | Approved by the user in the decision record. The ID is the decision it comes from.                                                       |
| **Current**           | What the code does today. Verified by reading the source on 2026-11-11 and 2026-11-12.                                                   |
| **Unit 06 proposal**  | A design detail that implements a confirmed rule. It is under review in the Unit 06 spec and is not approved until that spec is approved. |
| **Open**              | Not answered by the decision record. Listed in §12.                                                                                       |

Numbers in confirmed rules, such as the 5-attempt PIN limit or the 24-hour cache age, are the approved MVP defaults. Where the record says a limit is configurable, the server reads it from configuration.

The invariants in `architecture.md` stay in force until the unit that changes them is implemented (§11).

---

## 1. Scope

### 1.1 The delivery system (this repository)

- The driver app and its Supabase backend form a standalone delivery system. The backend source lives in `supabase/` in this repository: migrations, functions, local seed data and backend tests (D-B2).
- No existing production schema needs to be preserved. The working app architecture is preserved and extended (D-B1).
- Agents prepare and test backend changes locally. The user applies reviewed migrations and deploys functions. Every remote operation needs explicit approval (D-B2).

### 1.2 The e-commerce application (later, separate, bounded)

Confirmed (D-A1):

- A separate, small e-commerce application will later create delivery requests through an authenticated backend endpoint (§10).
- Its initial scope is a product catalogue and basket; recipient name, contact details and delivery address; order creation and confirmation; and a delivery reference with basic delivery status.
- Payments, inventory management and fleet dispatch optimisation are excluded unless separately approved.
- It is not part of this repository and is not built by any Phase 1 unit.

### 1.3 Not in the MVP

Payments, inventory, fleet optimisation, customer-facing live tracking (D-T1), SMS PIN delivery (D-P1), the Places search UI (§11), photo or signature proof, password reset, self sign-up, and an administrator app. Initial administration uses the Supabase Dashboard, runbooks and controlled database functions (§3).

---

## 2. Current baseline (facts, not rules)

- **Statuses.** `src/types/delivery.ts` defines six values: `assigned`, `picked_up`, `en_route`, `delivered`, `failed`, `cancelled`. There is no `pending_assignment` yet.
- **Status writes.** `DeliveryRepository.updateStatus(deliveryId, status)` exists. The Supabase implementation runs `update({ status })` on `deliveries` by ID with no transition check, reason, PIN, audit event or idempotency key. The mock accepts any transition. No screen calls it. It is superseded by §4 (Unit 08) and must not be connected to the UI or to offline replay.
- **Delivery shape.** No store, reason, PIN, attempt, assignment-version or custody fields.
- **Backend.** No `supabase/` folder exists yet. The schema in `architecture.md` is assumed.
- **Location.** Foreground only. The high-accuracy preference is used for the current-position read behind route estimates. The distance-interval preference is stored and not used. There is no live tracking.
- **Session.** Chunked SecureStore with `AFTER_FIRST_UNLOCK`. Kept when offline. Token auto-refresh runs only in the foreground.
- **Sign-out.** Clears the session and the selected delivery ID only.
- **Offline.** No cache and no queue.
- **Maps.** The proxy contract accepts client-supplied coordinates and free-text place queries. The function does not exist.

---

## 3. Roles and administration

Confirmed (D-A1, D-A2, D-A5):

- **Administrators** provision driver accounts, create deliveries, assign drivers, initiate retries and make corrections. Drivers cannot change assignments or administrative fields.
- **Initial tooling** is the Supabase Dashboard, documented runbooks and controlled database functions. This is bootstrap tooling for setup and restricted demonstrations. It is not a driver-facing or long-term business administration interface.
- **Identity.** Administrators use individually identifiable accounts. Administrator authorization comes from a protected, server-managed role/membership table. User-editable metadata never grants a role.
- **Audit.** Every administrative operation produces an audit event recording the actor, the reason, the timestamp and the affected record.
- **Collaborators are not administrators.** Supabase project collaborators can run Dashboard SQL, which bypasses application RLS. Runbooks must direct them to the controlled functions and must not encourage direct status edits.

Unit 06 proposal: administrative functions live in a schema that the Data API does not expose. They are called from the SQL editor with an explicit administrator actor that must hold an active membership (Unit 06 spec §6.3, U6-Q1).

---

## 4. Delivery lifecycle

### 4.1 Statuses

| Status               | Meaning                                                                                                      | Terminal | Source       |
| -------------------- | ------------------------------------------------------------------------------------------------------------ | -------- | ------------ |
| `pending_assignment` | Created, no driver yet (`driver_id` is null). Visible only to administrators and the permitted originating app. | No       | D-S3         |
| `assigned`           | Assigned to a driver. Not collected.                                                                         | No       | D-S3         |
| `picked_up`          | The driver has physically collected the package from the store.                                              | No       | D-S1         |
| `en_route`           | The driver is travelling to this recipient. At most one per driver.                                          | No       | D-S2         |
| `delivered`          | The server verified the recipient's PIN.                                                                     | Yes      | D-S2, D-P5   |
| `failed`             | The current attempt failed with a reason. The delivery waits for an administrator retry or cancellation.     | No       | D-S4, D-S5   |
| `cancelled`          | An administrator cancelled the delivery.                                                                     | Yes      | D-S4         |

Confirmed: `pending_assignment` is new. Domain types, mappers and mocks are updated in a later implementation unit (Unit 07), not before (D-S3).
Unit 06 proposal: `failed` is not terminal; an administrator closes it by authorising a retry or cancelling (U6-Q7).

### 4.2 Package custody

Confirmed (D-S7, D-T2): custody is tracked separately from status. A failed or cancelled delivery does not mean the driver no longer holds the package. A terminal status is never proof of return.

Unit 06 proposal: custody is one of `at_store`, `with_driver` (with the holding driver recorded) or `with_recipient`, with an append-only custody history.

- Collection moves custody from `at_store` to `with_driver`.
- Verified delivery moves it to `with_recipient`.
- A confirmed return to store, or a confirmed custody transfer, resolves a driver's custody after failure or cancellation (D-T2).
- Missing or damaged packages at the store are never marked collected unless collection actually happened (D-R4).

### 4.3 Attempts and assignment versions

Confirmed (D-S5):

- A retry keeps the same delivery ID and creates a new attempt ID. Earlier attempt events stay immutable.
- Queued operations carry the attempt ID and the assignment version, so an old operation cannot change a newer attempt.

Unit 06 proposal: the assignment version increases on every assignment, unassignment, retry authorisation and cancellation.

### 4.4 Transitions

Actors: **D** = driver, through a server-side driver operation. **A** = administrator, through a controlled function. **I** = the permitted originating application, through the integration endpoint.

| #   | From                                   | To                                     | Actor | Conditions                                                                                                                           | Source           |
| --- | -------------------------------------- | -------------------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------ | ---------------- |
| T1  | (new)                                  | `pending_assignment`                   | A, I  | Server validates order and recipient data. Never trusts a supplied driver, role, PIN or status.                                      | D-S3, D-B2       |
| T2  | `pending_assignment`                   | `assigned`                             | A     | Driver active. Audited.                                                                                                              | D-S3, D-A1       |
| T3  | `assigned`                             | `assigned` (another driver)            | A     | Before collection only (custody at store). Audited.                                                                                  | D-S7             |
| T4  | `assigned`                             | `pending_assignment`                   | A     | Before collection only. Audited. Unit 06 proposal.                                                                                   | D-S3             |
| T5  | `assigned`                             | `picked_up`                            | D     | Assigned driver; physical collection; location services and tracking permissions enabled on the device first (D-T5).                 | D-S1, D-T5       |
| T6  | `picked_up`                            | `en_route`                             | D     | No other `en_route` delivery for this driver. A valid PIN exists (D-P4).                                                             | D-S2, D-P4       |
| T7  | `en_route`                             | `picked_up`                            | D     | Switch to another collected delivery. **Unit 06 proposal, U6-Q4.**                                                                   | —                |
| T8  | `en_route`                             | `delivered`                            | D     | Server-confirmed PIN verification. Online only.                                                                                      | D-S2, D-P5       |
| T9  | `assigned`, `picked_up` or `en_route`  | `failed`                               | D     | Predefined reason valid for the current stage; note when the code requires one.                                                      | D-S2, D-R1–R3    |
| T10 | `assigned`                             | `assigned` (collection issue event)    | D     | Collection reason (for example `store_not_ready`). Status unchanged.                                                                 | D-R4             |
| T11 | `failed`                               | `picked_up` or `assigned` (new attempt) | A     | Driver requests or administrator initiates; administrator authorises. `picked_up` if the driver holds the package, otherwise `assigned`. | D-S5             |
| T12 | Any non-terminal                       | `cancelled`                            | A     | Predefined cancellation reason. Custody is unchanged; a held package still needs a confirmed return.                                 | D-S4, D-R2       |
| T13 | `picked_up` or `en_route`              | another driver                         | A     | Only through an audited custody-transfer operation. **Blocked in the MVP unless that operation is built** (Unit 06 proposal, U6-Q5). | D-S7             |
| T14 | `delivered` or `cancelled`             | any                                    | —     | Drivers never reopen. Corrections are audited administrative actions (§12, D-A4).                                                    | D-S5             |
| T15 | Same operation ID                      | (no change)                            | D     | Returns the original outcome.                                                                                                        | D-O5             |

Any transition not in this table is rejected. Changing `driver_id` alone is prohibited (D-S7).

### 4.5 Rules for every driver operation

Confirmed (D-S5, D-O5 and the contradiction resolution "direct status writes"):

- There is no direct status write. Every driver action is a controlled, atomic server operation. RLS alone does not validate workflow transitions or restrict arbitrary columns.
- Each operation carries a stable operation ID, the attempt ID and the assignment version.
- The server derives the driver from the session. It never accepts a driver ID from the app.
- Each accepted operation writes the change and an immutable audit event in one transaction.

Unit 06 proposal: the operation also carries the expected current status. Server time is authoritative; device time is recorded for audit only (D-O6 remains open).

### 4.6 Result codes (Unit 06 proposal)

`accepted`, `already_applied`, `operation_id_reused`, `not_a_driver`, `driver_inactive`, `not_assigned`, `delivery_closed`, `stale_attempt`, `stale_assignment`, `conflict`, `invalid_transition`, `en_route_limit`, `reason_required`, `reason_invalid`, `note_required`, `note_too_long`, `pin_not_ready`, `pin_format_invalid`, `pin_incorrect`, `pin_locked`, `pin_expired`, `rate_limited`.

Network failures, timeouts and server errors are retryable with the same operation ID. Every other result is definitive. The app maps each to a driver-safe `AppError` message.

### 4.7 Retry (D-S5)

1. The driver requests a retry, or the administrator initiates one.
2. The administrator authorises it. The server creates a new attempt.
3. The new attempt starts at `picked_up` if the same driver still holds the package, otherwise at `assigned`.
4. Operations queued against the old attempt are rejected as stale.

### 4.8 Reassignment (D-S7)

- Normal reassignment is allowed before collection.
- After collection, reassignment needs an explicit, audited custody-transfer operation that records the outgoing driver, the incoming driver and the transfer confirmation.
- If custody transfer is not built in the MVP, post-collection reassignment is blocked.

---

## 5. Reasons

Confirmed (D-R1 to D-R4): reasons are predefined, validated by the server and restricted to the stages where they apply. Notes must avoid unnecessary personal information.

### 5.1 Driver reasons

| Code                    | Label                          | Note required | Applies at (Unit 06 proposal)                                       |
| ----------------------- | ------------------------------ | ------------- | ------------------------------------------------------------------- |
| `recipient_unavailable` | Recipient unavailable          | No            | Failure from `en_route`                                             |
| `recipient_refused`     | Recipient refused delivery     | Yes           | Failure from `en_route`                                             |
| `address_incorrect`     | Address incorrect              | Yes           | Failure from `en_route`                                             |
| `access_blocked`        | Cannot access delivery address | Yes           | Failure from `en_route`                                             |
| `vehicle_breakdown`     | Vehicle breakdown              | Yes           | Failure from `assigned`, `picked_up` or `en_route`                  |
| `package_damaged`       | Package damaged                | Yes           | Collection issue at `assigned`; failure from `picked_up` or `en_route` |
| `store_not_ready`       | Package not ready at store     | No            | Collection issue at `assigned` only                                 |
| `package_missing`       | Package missing at store       | Yes           | Collection issue at `assigned` only                                 |
| `other`                 | Other problem                  | Yes           | Collection issue at `assigned`; failure from `picked_up` or `en_route` |

Confirmed: `store_not_ready` is normally a collection issue event, and the delivery stays `assigned`. Missing or damaged packages at the store need administrator intervention.

### 5.2 Administrator cancellation reasons

| Code                     | Label                  | Note required |
| ------------------------ | ---------------------- | ------------- |
| `customer_cancelled`     | Customer cancellation  | No            |
| `duplicate_order`        | Duplicate order        | No            |
| `fulfilment_unavailable` | Fulfilment unavailable | No            |
| `other`                  | Other                  | Yes           |

The codes for the three named cancellation reasons are Unit 06 proposals; the record names the reasons, not the codes.

---

## 6. PIN proof of delivery

Confirmed (D-P1 to D-P7):

- **Channel.** The order-creation application collects a recipient email address. A server-side notification function sends the PIN by transactional email. Controlled demonstrations use designated test inboxes. SMS is deferred.
- **Failures.** Notification failures are visible to administrators and retryable. Completion is not enabled until PIN issuance is valid.
- **Fallback.** Manual communication is a supervised fallback for synthetic demonstration records only, never a hidden production bypass.
- **Format.** A cryptographically generated six-digit PIN. Leading zeros are kept.
- **Storage.** A protected, server-secret-backed verifier, never plaintext and never an unprotected fast hash.
- **Access.** Drivers cannot retrieve the PIN. Administrators can regenerate and resend it but cannot retrieve the current PIN through the application. A restricted notification workflow may handle the plaintext briefly; it must not make it broadly readable.
- **Exclusions.** PINs never appear in logs, analytics, ordinary delivery responses or audit payloads.
- **Attempts.** Five incorrect attempts per issued PIN, counted atomically across all callers, plus endpoint rate limiting. After the limit the PIN locks. An administrator checks the situation, then regenerates and resends. Drivers cannot reset the counter.
- **Expiry.** 48 hours from issuance. Regeneration invalidates the previous PIN immediately. A valid PIN must exist before dispatch. The limits are configurable and are reviewed against real scheduling.
- **Handover.** The driver needs server-confirmed verification before handover. Offline completion is never represented as a verified delivery.
- **No PIN.** If the recipient has no PIN, the driver requests an administrator resend or regeneration. There is no universal bypass PIN and no driver override.
- **Lost connection.** Retry the same operation ID or query its outcome. Never assume success or failure.
- **Offline.** Other status operations may queue offline. Raw PIN submissions are not persisted in the first MVP; the driver re-enters the PIN when connectivity returns if no accepted result exists.

Unit 06 proposals (U6-Q2, U6-Q3): the PIN is generated only when an email is sent, so "resend" always issues a new PIN; issuance is requested on assignment; `en_route` is refused until a PIN is ready.

---

## 7. Offline cache and queues

Confirmed (D-O1 to D-O5):

- **Cache contents.** Only the signed-in driver's relevant deliveries, with a last-synchronised timestamp.
- **Maximum age.** 24 hours offline. After expiry, stale records are not used for new delivery actions, cached customer details are hidden and a reconnect message is shown. Pending operations are kept separately; cache expiry never silently deletes them.
- **Storage.** Encrypted native storage, preferably Expo SQLite with SQLCipher and keys in SecureStore, after confirming compatibility with the installed Expo SDK (Unit 10).
- **Ownership.** The Supabase repository stays uncached. An encrypted caching wrapper is added at the repository boundary. Server records never go into Zustand.
- **Queue limit.** At most 500 status operations. Further operations are rejected with a clear warning. Delivery writes are never dropped silently.
- **Replay.** In order per delivery, using stable operation IDs, attempt IDs and assignment versions. Permanent conflicts go to reconciliation, not endless retries.
- **Sign-out with pending writes.** Offer "Sync first", "Stay signed in" or "Sign out and discard pending changes", with explicit confirmation.
- **Explicit sign-out.** Stops tracking and clears account-scoped customer caches and local queues.
- **Network-triggered session expiry.** Pauses synchronisation and allows recovery by the same account. Operations are never replayed under another account.
- **Location uploads.** A separate bounded queue, because telemetry and delivery-status writes need different overflow policies.

---

## 8. Tracking

Confirmed (D-T1 to D-T3, D-T5, D-T6):

- **Viewers.** Authorised administrators only. Drivers may see their own tracking state. Customer-facing live tracking is deferred.
- **Start.** After confirmed package collection, including a collection recorded locally and pending synchronisation.
- **Continue.** While the driver holds any collected package awaiting delivery, retry, transfer or return. Failure alone does not stop tracking.
- **Stop.** When all of the driver's package custody is resolved, on explicit sign-out, or when authorisation is revoked.
- **Duration.** A 12-hour maximum tracking session. Extension needs an explicit, recorded driver action. Warn before expiry and show tracking gaps clearly.
- **Permissions.** Location services and the required tracking permissions must be enabled before a new collection is recorded. If they are revoked later, show a persistent warning and record tracking as unavailable, without blocking PIN completion, return handling or other custody actions. Denied permissions are never bypassed, and tracking is never claimed to survive force-stop or reboot.
- **Disclosures.** The product owner and a designated privacy/responsible-party representative approve permission explanations, driver disclosures and recipient privacy notices before real-user deployment.
- **Background authentication.** Background tasks get credentials through a shared, concurrency-safe auth/storage layer. They refresh an expired session when permitted, or keep bounded uploads for later. They never depend on mounted React providers and never contain service-role credentials. Reboot, locked-device, refresh and revoked-session behaviour need physical-device testing. `AFTER_FIRST_UNLOCK` is a security constraint, not something to bypass; queueing, recovery and visible gaps are the response.
- **Invariant 9** (foreground-only location) changes only when its unit (Unit 12) is implemented.

---

## 9. Retention and privacy

Confirmed (D-T4, D-X2):

| Data                                             | Default                                                      |
| ------------------------------------------------ | ------------------------------------------------------------ |
| Raw server location history                      | 7 days                                                       |
| Customer contact and address data                | 90 days after terminal resolution                            |
| Audit and status events                          | 12 months, with personal details minimised or de-identified  |
| Local delivery cache                             | 24 hours                                                     |
| Local unsent location readings                   | 24 hours maximum                                             |

- Retention is implemented with scheduled jobs, documented legal-hold exceptions and access restrictions. Backups and exports are included in the policy.
- Financial and order records of the future e-commerce system need their own policy. The delivery system does not keep them by default.
- POPIA requires purpose-based retention, not these exact periods. The product owner validates them against contractual, legal and operational requirements.

Confirmed (D-X1): a designated responsible-party representative approves the purpose, lawful basis, notices, access controls, retention, supplier arrangements and any cross-border processing before real driver or customer data is used. Until then, demonstrations use synthetic data and informed test participants. Passing tests is not POPIA approval.

---

## 10. Order-to-delivery integration

Confirmed (D-A1, D-B2):

- An authenticated, idempotent create-delivery endpoint.
- The server validates the order and recipient data and sets the initial delivery state. It never trusts a supplied driver, role, PIN or status.
- Uniqueness on the originating application and its external order ID prevents duplicate deliveries.
- The order application receives a delivery reference and basic delivery status.

The full request and response contract is in `context/specs/06-backend-schema-authorization.md` §8 (awaiting review).

---

## 11. Contradictions resolved, and documentation that changes

| Topic                         | Resolution (confirmed)                                                                                       | When the docs/code change                                  |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------- |
| Direct status writes          | Replaced by controlled, atomic server operations.                                                           | Schema: Unit 06. Client method: Unit 08.                   |
| Caching                       | Supabase repository stays uncached; an encrypted caching wrapper is added. No server records in Zustand.     | Unit 10. `code-standards.md` is updated then.              |
| Background location           | Invariant 9 changes when its unit is implemented, not before.                                               | Unit 12.                                                   |
| Maps                          | The function accepts delivery IDs and derives authorised destinations server-side. Places search UI deferred. | Unit 14.                                                   |
| Administration scope          | Dashboard and runbooks are approved bootstrap tooling. The e-commerce app is a separate, bounded integration. | Documented now.                                           |
| PIN channel                   | A server-side email notification boundary is added.                                                         | Schema boundary: Unit 06. Sender: later unit.              |
| Profile preferences           | High-accuracy settings affect route estimates. Labels must not imply live tracking.                         | Documented now. The app copy already says "route estimates". |
| Missing methodology file      | Obsolete `context/README.md` references removed from `AGENTS.md` and `ai-workflow-rules.md` (permission given). | Done 2026-11-12.                                         |
| README                        | Describes the standalone system and separates implemented from planned features.                            | Done 2026-11-12.                                           |
| CRLF context files            | Normalised to LF only in the edited documentation. No other git operations.                                 | Done 2026-11-12.                                           |

Statements that stay in force until their unit lands: the direct RLS status update in `architecture.md` **Auth and Access Model** (Unit 06/08); "Repositories do not cache" in `code-standards.md` (Unit 10, Supabase repository still uncached); "in memory only" delivery data (Units 10–11); Invariant 9 (Unit 12); the client-coordinate Maps contract (Unit 14). Invariant 3 (no server records in Zustand) is not superseded.

---

## 12. Still open

These were not answered by the decision record. They block only the units listed.

| ID   | Question                                                                 | Blocks  |
| ---- | ------------------------------------------------------------------------ | ------- |
| D-A3 | Initial password and account recovery process for drivers               | 06 runbooks |
| D-A4 | Exactly which corrections are allowed after `delivered` or `cancelled`   | 06, 08  |
| D-A6 | Geocoding of recipient addresses (who supplies coordinates)              | 06, 14  |
| D-A7 | Stores per delivery (Unit 06 proposes exactly one)                       | 06      |
| D-O6 | Device clock differences (proposed: server time authoritative)           | 08, 11  |
| D-O7 | Replay from a background task                                            | 11      |
| D-T7 | Who controls tracking sampling (device preferences, server bounds, both) | 13      |

The Unit 06 design questions (U6-Q1 to U6-Q17) are listed in `context/specs/06-backend-schema-authorization.md` §13.

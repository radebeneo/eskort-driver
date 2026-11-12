# Unit 06 — Backend Schema, Authorization and Backend Tests

**Status:** Draft for review. **Implementation is not approved.** No file in `supabase/` exists yet, and none will be created until the user approves this specification.
**Date:** 2026-11-12
**Implements:** `context/specs/02-operational-contract.md` v1 (approved 2026-11-12).
**Design questions:** U6-Q1 to U6-Q17 in §13. Each one is a proposal that needs an answer or explicit acceptance.

## 1. Purpose and scope

Unit 06 prepares the delivery backend as reviewed source in `supabase/`: schema, Row Level Security, explicit grants, controlled database functions, synthetic seed data, runbooks and pgTAP tests. It is prepared and tested **locally only**.

### 1.1 In scope

- Schemas, types, tables, constraints and indexes for drivers, stores, deliveries (including `pending_assignment`), items, recipient contacts, attempts, assignment versions, package custody, reason codes and stage rules, immutable delivery, custody and administrator audit events, protected role membership, PIN verifiers, the notification outbox, idempotency records, rate limits, settings, integration clients, and the location tables (schema only).
- RLS policies and explicit grants (deny by default).
- `security definer` functions for driver operations, administrator operations, PIN issuance and verification, the notification boundary, the integration boundary and retention.
- Synthetic seed data and pgTAP tests.
- Administrator runbooks.

### 1.2 Out of scope

- Any UI. Domain type, mapper and mock changes (Unit 07). Client operation methods (Unit 08).
- Background tracking, location uploads and their functions (Units 12–13). Only the tables are created.
- The email sender Edge Function, the email provider and its secrets.
- The create-delivery and delivery-status Edge Functions, and the e-commerce application. Unit 06 provides only the database functions they will call (§8).
- Any remote migration, function deployment, secret creation or project linking. No commits, EAS commands or new npm dependencies.

### 1.3 Effect on the current app

The proposed schema renames columns the app reads today (`order_number` → `reference`, `customer_name` → `recipient_name`, `customer_phone` → `recipient_phone`, U6-Q16). The live app will not work against this schema until Unit 07 updates the mappers. Mock mode is unaffected. Do not point a live build at a Unit 06 database before Unit 07.

## 2. Platform facts relied on

Checked against the Supabase docs on 2026-11-11 and 2026-11-12. Re-check them when implementing.

- Objects in exposed schemas are reachable through the Data API according to their grants. Default privileges can grant new objects to `anon`, `authenticated` and `service_role`, so the migrations revoke defaults and grant explicitly. RLS controls rows; grants control tables, columns and functions.
- Schemas not listed in the API configuration are not reachable through the Data API.
- `security definer` functions must set `search_path = ''` and fully qualify every object. `execute` is granted to `public` by default and must be revoked from `public` and `anon`.
- Vault stores encrypted secrets that `security definer` functions can read from `vault.decrypted_secrets`.
- pgTAP tests run with `supabase test db` against a local stack (Docker and the Supabase CLI). Tests can simulate a user by setting the role and `request.jwt.claims`.
- Edge Functions verify a Supabase JWT by default. A function that authenticates its own credential (the integration endpoint) sets `verify_jwt = false` and checks the credential itself.

## 3. Schemas and exposure

| Schema        | Exposed by the Data API | Contents                                                                                                                                                                       |
| ------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `public`      | Yes                     | Read surface protected by RLS and column grants. Driver operation functions (`authenticated`). Notification and integration functions (`service_role` only).                    |
| `app_private` | No                      | Role memberships, recipient emails, PIN issues and verifiers, notification outbox, operation records, rate-limit counters, settings, integration clients, helpers, core logic. |
| `app_admin`   | No                      | Audited administrator functions (§6.3) and read-only administrator views.                                                                                                      |
| `extensions`  | No                      | `pgcrypto` (`gen_random_bytes`, `hmac`, `digest`), `pgtap` (local tests only).                                                                                                  |

`authenticated` is granted `usage` on `app_private` and `execute` on exactly two helpers used inside RLS policies (`current_driver_id`, `current_driver_id_any`). This does not expose the schema through the API. No table in `app_private` or `app_admin` is granted to any API role.

## 4. Types

| Type                        | Values                                                                                                                 |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `public.delivery_status`    | `pending_assignment`, `assigned`, `picked_up`, `en_route`, `delivered`, `failed`, `cancelled`                          |
| `public.package_custody`    | `at_store`, `with_driver`, `with_recipient`                                                                            |
| `public.pin_status`         | `none`, `sending`, `ready`, `send_failed`, `locked`, `used`                                                            |
| `public.attempt_outcome`    | `open`, `delivered`, `failed`, `cancelled`                                                                             |
| `public.actor_kind`         | `driver`, `administrator`, `integration`, `system`                                                                     |
| `public.reason_category`    | `driver`, `cancellation`                                                                                               |
| `public.reason_operation`   | `collection_issue`, `fail_attempt`, `cancel`                                                                           |
| `app_private.app_role`      | `administrator`                                                                                                        |

Enums are used because the values are fixed by the approved contract. Reason codes are data, not enums, so they can be deactivated without a migration.

## 5. Tables

All tables have RLS enabled, even when no policy exists (deny all). Timestamps are `timestamptz` set by the server. Text columns have length checks.

### 5.1 `public`

**`drivers`** — unchanged shape from the current app, so Unit 07 needs no driver mapper change.
`id uuid pk`, `user_id uuid unique not null → auth.users`, `full_name text`, `phone text null`, `vehicle_registration text null`, `is_active boolean default true`, `created_at`, `updated_at`.

**`stores`**
`id uuid pk`, `code text unique` (for example `ESK-CPT-01`), `name`, `address_line1`, `address_line2 null`, `suburb null`, `city`, `postal_code null`, `latitude`, `longitude` (range-checked, nullable), `phone null`, `is_active`, `created_at`, `updated_at`.

**`deliveries`**

| Column                                                                           | Notes                                                                                                         |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `id uuid pk`                                                                     |                                                                                                               |
| `reference text unique`                                                          | Server-generated delivery reference shown to drivers and returned to the order app (U6-Q16).                  |
| `origin_kind text`                                                               | `administrator` or `integration`.                                                                            |
| `origin_client_id uuid null → app_private.integration_clients`                  | Set for integration deliveries.                                                                               |
| `external_order_id text null`                                                    | Unique with `origin_client_id` (D-B2).                                                                        |
| `store_id uuid → stores`                                                         | Exactly one store (D-A7, still open).                                                                         |
| `driver_id uuid null → drivers`                                                  | Null only in `pending_assignment` (and `cancelled` if cancelled before assignment).                          |
| `status delivery_status default 'pending_assignment'`                             |                                                                                                               |
| `custody package_custody default 'at_store'`, `custody_driver_id uuid null`      | Check: `custody = 'with_driver'` exactly when `custody_driver_id` is set.                                     |
| `current_attempt_id uuid`                                                        | FK to `delivery_attempts` (deferrable).                                                                      |
| `assignment_version integer default 0`                                           | Increments on assign, unassign, reassign, retry authorisation and cancellation.                              |
| `pin_status pin_status default 'none'`, `pin_expires_at timestamptz null`        | State only. Never the PIN or verifier.                                                                        |
| `recipient_name`, `recipient_phone null`                                         | Renamed from `customer_*` (U6-Q16). The recipient email is in `app_private.recipient_contacts`.               |
| `address_line1`, `address_line2 null`, `suburb null`, `city`, `postal_code null` |                                                                                                               |
| `latitude null`, `longitude null`                                                | Supplied and range-checked; geocoding is open (D-A6).                                                         |
| `scheduled_for null`, `notes null` (≤ 500)                                       | Delivery instructions. Runbooks warn against unnecessary personal data.                                      |
| `is_synthetic boolean default false`                                             | Enables the supervised manual PIN fallback (§6.4). Seed data sets it to true.                                 |
| `legal_hold boolean default false`                                               | Excludes the delivery and its events from retention (§9).                                                     |
| `created_at`, `updated_at`, `terminal_at null`, `pii_redacted_at null`           |                                                                                                               |

Constraints:

- `status = 'pending_assignment'` ⇒ `driver_id is null`; `status in ('assigned','picked_up','en_route','delivered','failed')` ⇒ `driver_id is not null`.
- Partial unique index on `driver_id where status = 'en_route'` (one `en_route` per driver, D-S2). The operations also check this under a lock.
- Unique `(origin_client_id, external_order_id)` where both are set.

**`delivery_items`** — `id`, `delivery_id`, `position`, `name` (≤ 120), `quantity` (1–999), `sku null`.

**`delivery_attempts`** — `id uuid pk`, `delivery_id`, `attempt_number` (unique per delivery), `driver_id null`, `start_status` (`assigned` or `picked_up`), `started_at`, `ended_at null`, `outcome attempt_outcome default 'open'`, `outcome_reason_code null`, `authorised_by_user_id null`. Attempt 1 is created with the delivery. Only the closing columns can change, once, while `outcome = 'open'` (trigger).

**`delivery_events`** (append-only) — `id bigint identity`, `delivery_id`, `attempt_id`, `event_type`, `from_status null`, `to_status null`, `reason_category null`, `reason_code null`, `note null`, `actor_kind`, `actor_user_id null`, `operation_id null`, `assignment_version`, `client_recorded_at null`, `replayed boolean`, `server_at`, `details jsonb` (allow-listed keys only; never a PIN, verifier, email, phone or address).

Event types: `created`, `assigned`, `unassigned`, `reassigned`, `collected`, `collection_issue`, `route_started`, `route_paused`, `attempt_failed`, `retry_requested`, `retry_authorised`, `pin_requested`, `pin_issued`, `pin_sent`, `pin_send_failed`, `pin_verification_failed`, `pin_locked`, `pin_resend_requested`, `delivered`, `cancelled`, `returned_to_store`, `details_corrected`.

**`custody_events`** (append-only) — `id`, `delivery_id`, `attempt_id`, `kind` (`collected`, `delivered`, `returned_to_store`, `transferred`), `from_custody`, `to_custody`, `from_driver_id null`, `to_driver_id null`, `actor_kind`, `actor_user_id`, `operation_id null`, `confirmation_note null`, `server_at`.

**`admin_audit_events`** (append-only) — `id`, `actor_user_id`, `action`, `target_table`, `target_id`, `reason`, `server_at`, `details jsonb` (minimised). Written by every `app_admin` function (D-A5).

**`reason_codes`** — `category`, `code` (primary key together), `label`, `requires_note`, `is_active`, `sort_order`. Seeded with the approved codes (contract §5). Codes are deactivated, never deleted.

**`reason_rules`** — `category`, `code`, `operation reason_operation`, `from_status`. A reason is valid only if a matching rule exists (D-R1 to D-R4). Seeded from the stage table in contract §5.1 (U6-Q8).

**`tracking_sessions`** and **`location_samples`** (schema only, Unit 13) — sessions: `id`, `driver_id`, `started_at`, `expires_at` (≤ 12 hours after start, D-T3), `ended_at null`, `end_reason null`, `extension_count`. Samples: `id bigint identity`, `driver_id`, `session_id`, `recorded_at`, `received_at`, `latitude`, `longitude`, `accuracy_m null`, `speed_mps null`, `heading_deg null`. No write path or grant in Unit 06.

### 5.2 `app_private`

| Table                        | Columns                                                                                                                                                                                       | Purpose                                                                     |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `role_memberships`           | `id`, `user_id → auth.users`, `role app_role`, `granted_by_user_id`, `granted_at`, `revoked_at null`, `revoked_by_user_id null`, `reason`. One active row per user and role.                    | Protected administrator authorization (D-A5). Never derived from metadata. |
| `recipient_contacts`         | `delivery_id pk`, `email` (≤ 254, format-checked), `created_at`.                                                                                                                              | PIN email address (D-P1). Never visible to drivers.                         |
| `pin_issues`                 | `id`, `delivery_id`, `attempt_id`, `verifier bytea`, `key_version`, `state` (`pending_send`, `active`, `void`, `locked`, `used`, `superseded`), `issued_at`, `activated_at null`, `expires_at`, `failed_attempts`, `locked_at null`, `closed_at null`. At most one row per delivery in `pending_send` or `active`. | PIN verifier (D-P2, D-P3, D-P4).                                            |
| `notification_outbox`        | `id`, `delivery_id`, `pin_issue_id null`, `kind` (`delivery_pin`), `status` (`queued`, `claimed`, `sent`, `failed`), `attempts`, `last_error_code null`, `requested_by_kind`, `requested_by_user_id null`, `created_at`, `claimed_at null`, `completed_at null`. No PIN and no email copy. | Notification boundary (D-P1). Failures visible to administrators.           |
| `operation_records`          | `operation_id pk`, `actor_user_id`, `driver_id`, `delivery_id`, `operation_type`, `request_hash bytea`, `result jsonb`, `created_at`.                                                       | Driver idempotency (D-O5).                                                  |
| `pin_rate_counters`          | `driver_id`, `window_start`, `failures`.                                                                                                                                                      | Per-driver PIN rate limit (D-P3, U6-Q12).                                   |
| `settings`                   | `key pk`, `value jsonb`, `updated_at`, `updated_by_user_id`.                                                                                                                                 | Configurable limits (§5.3).                                                 |
| `integration_clients`        | `id`, `name`, `key_hash bytea unique`, `is_active`, `created_at`, `disabled_at null`.                                                                                                         | Originating applications (U6-Q14).                                          |
| `integration_client_stores`  | `client_id`, `store_id`.                                                                                                                                                                      | Stores each client may create deliveries for.                               |
| `integration_requests`       | `client_id`, `external_order_id` (primary key together), `payload_hash bytea`, `delivery_id`, `created_at`.                                                                                  | Integration idempotency (D-B2).                                             |

The PIN HMAC key is a Vault secret named `pin_hmac_key_v1`, read only inside `security definer` functions. It is never stored in a table, a migration or seed data used outside local tests.

### 5.3 Settings (seeded defaults)

| Key                                   | Default | Source       |
| ------------------------------------- | ------- | ------------ |
| `pin_max_failed_attempts`             | 5       | D-P3         |
| `pin_validity_hours`                  | 48      | D-P4         |
| `pin_driver_failures_per_hour`        | 10      | U6-Q12       |
| `note_max_length`                     | 280     | U6-Q10       |
| `tracking_session_max_hours`          | 12      | D-T3         |
| `retention_location_days`             | 7       | D-T4         |
| `retention_customer_days`             | 90      | D-X2         |
| `retention_audit_months`              | 12      | D-X2         |
| `retention_operation_record_days`     | 30      | U6-Q17       |

### 5.4 Immutability

- `delivery_events`, `custody_events`, `admin_audit_events` and `role_memberships` have triggers that reject `UPDATE` and `DELETE` for every role, including `service_role`. `role_memberships` allows only the one-time revocation update.
- The only permitted delete is the retention function (§9), which sets a transaction-local flag that the trigger checks. No API role can call it.
- Superusers (Dashboard SQL) can still disable triggers. Runbooks forbid it; this is the collaborator/administrator distinction in D-A5.

## 6. Functions

All functions are `security definer`, owned by `postgres`, with `set search_path = ''`. `execute` is revoked from `public` and `anon`, then granted only as listed. Business outcomes are **returned** as a result code, not raised, so failed-attempt counters, events and operation records commit. Only unexpected errors raise.

### 6.1 Helpers (`app_private`)

| Function                                  | Returns                                                           | Granted to      |
| ----------------------------------------- | ----------------------------------------------------------------- | --------------- |
| `current_driver_id()`                     | Active driver ID for `auth.uid()`, or null.                       | `authenticated` |
| `current_driver_id_any()`                 | Driver ID for `auth.uid()` regardless of `is_active`, or null.    | `authenticated` |
| `is_admin(user_id uuid)`                  | True if the user has an active administrator membership.          | none            |
| `setting_int(key text)`                   | Setting value.                                                    | none            |
| `generate_pin()`                          | Six-digit string from `gen_random_bytes`, rejection-sampled to avoid modulo bias, leading zeros kept. | none |
| `pin_verifier(issue_id, delivery_id, pin)`| `hmac(issue_id ‖ delivery_id ‖ pin, vault key, 'sha256')`.        | none            |
| `issue_pin(delivery_id)`                  | Supersedes any open issue, creates a `pending_send` issue and returns the plaintext once. Called only by the notification claim and the synthetic fallback. | none |
| `create_delivery_core(origin, payload)`   | Shared validation and insert for administrator and integration creation. | none     |
| `write_event(...)`, `write_custody_event(...)`, `write_admin_audit(...)` | Insert helpers with allow-listed `details` keys. | none |

### 6.2 Driver operations (`public`, granted to `authenticated`)

Every function takes `p_operation_id uuid`, `p_delivery_id uuid`, `p_attempt_id uuid`, `p_assignment_version integer`, `p_expected_status delivery_status`, `p_client_recorded_at timestamptz` and `p_replayed boolean`, plus the inputs below. Each returns `jsonb`: `{ result, delivery_id, status, attempt_id, assignment_version, custody, pin_status }`, and `original` when the result is `already_applied`.

| Function                            | Extra inputs              | Transition (contract §4.4)                       | Specific checks                                                                                                            |
| ----------------------------------- | ------------------------- | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| `driver_collect`                    | —                         | T5 `assigned → picked_up`; custody `with_driver` | Custody `at_store`. Device permission check is client-side (D-T5).                                                         |
| `driver_start_route`                | —                         | T6 `picked_up → en_route`                        | No other `en_route` for the driver (`en_route_limit`). PIN `ready` and unexpired (`pin_not_ready`, `pin_expired`, `pin_locked`). |
| `driver_pause_route`                | —                         | T7 `en_route → picked_up` (U6-Q4)                | —                                                                                                                          |
| `driver_report_collection_issue`    | `p_reason_code`, `p_note` | T10 `assigned`, status unchanged                 | Reason rule `collection_issue` at `assigned`. Never changes custody.                                                       |
| `driver_fail_attempt`               | `p_reason_code`, `p_note` | T9 `assigned`/`picked_up`/`en_route → failed`    | Reason rule `fail_attempt` for the current status. Custody unchanged. Attempt closed as `failed`.                         |
| `driver_complete_delivery`          | `p_pin text`              | T8 `en_route → delivered`; custody `with_recipient` | §6.4. Not queueable offline.                                                                                             |
| `driver_request_retry`              | `p_note`                  | Status unchanged (`failed`)                      | Writes `retry_requested`. Administrator authorises (§6.3).                                                                 |
| `driver_request_pin_resend`         | —                         | Status unchanged                                 | Writes `pin_resend_requested` for administrators. Does not issue a PIN (D-P6).                                            |
| `driver_get_operation_result`       | `p_operation_id` only     | —                                                | Returns the stored result for the caller's own operation, or `unknown`. Used after a lost connection (D-P5).              |

Order of checks in every mutating operation:

1. Resolve the driver from `auth.uid()`. None: `not_a_driver`. Inactive: `driver_inactive`.
2. Lock the delivery row (`for update`) and the driver row (serialises the `en_route` check). Missing, or not assigned to this driver: `not_assigned`. A delivery that does not exist and one that belongs to someone else return the same result.
3. Operation record: same operation ID with the same actor, type, delivery and request hash returns `already_applied` with the original result. Otherwise a reused ID returns `operation_id_reused`.
4. `p_attempt_id` ≠ current: `stale_attempt`. `p_assignment_version` ≠ current: `stale_assignment`. Status `delivered` or `cancelled`: `delivery_closed`. Status ≠ `p_expected_status`: `conflict` (returns only status, attempt ID and version).
5. Reason and note validation: `reason_invalid`, `reason_required`, `note_required`, `note_too_long`.
6. Operation-specific checks, then the change, its delivery event, any custody event and the operation record, in the same transaction.

Every definitive result from step 3 onwards is stored in `operation_records`, so a replay returns the same outcome. The request hash never includes the PIN: a fast hash of a six-digit PIN would be reversible. Each PIN entry therefore uses a new operation ID; only a retry after a lost connection reuses one.

### 6.3 Administrator operations (`app_admin`, U6-Q1)

Called from the Dashboard SQL editor by a project collaborator acting for an identifiable administrator. Each takes `p_actor_user_id` and `p_reason`. The function checks that the actor has an active membership, then writes `admin_audit_events` and, where relevant, `delivery_events` and `custody_events`.

| Function                                   | Effect                                                                                                                                                 |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `bootstrap_first_admin(target, reason)`    | Creates the first membership. Works only while no active administrator exists.                                                                         |
| `grant_role` / `revoke_role`               | Manage memberships. An actor cannot revoke the last active administrator.                                                                              |
| `provision_driver` / `set_driver_active`   | Creates the `drivers` row for an existing auth user; deactivates or reactivates. The auth user is created in the Dashboard (D-A3 open).              |
| `create_delivery(payload)`                 | Through `create_delivery_core`. Starts at `pending_assignment` with attempt 1.                                                                          |
| `assign_delivery(delivery, driver)`        | T2. Driver active. Version +1. Queues a PIN notification when none is active (U6-Q3).                                                                 |
| `reassign_delivery(delivery, driver)`      | T3. Only while custody is `at_store`. Version +1. Keeps an active PIN.                                                                                |
| `unassign_delivery(delivery)`              | T4. Only while custody is `at_store`. Version +1.                                                                                                      |
| `authorise_retry(delivery, driver?)`       | T11. New attempt. Starts at `picked_up` if the same driver holds the package, otherwise `assigned` (custody must be `at_store` for another driver). Version +1. Queues a new PIN. |
| `cancel_delivery(delivery, reason_code, note)` | T12. Cancellation reason rule. Version +1. Voids open PIN issues. Custody unchanged.                                                               |
| `confirm_return_to_store(delivery)`        | Custody `with_driver → at_store` after failure or cancellation (U6-Q6).                                                                                |
| `request_pin_notification(delivery)`       | Regenerate and resend: supersedes the current PIN immediately and queues a new notification.                                                          |
| `issue_synthetic_pin_manually(delivery)`   | Synthetic records only (`is_synthetic`). Supersedes the current PIN, activates a new one and returns it once to the SQL editor. Audited (D-P1).       |
| `correct_delivery_details(delivery, changes)` | Recipient name, phone, address, schedule or notes before a terminal status. After `delivered` or `cancelled`: rejected until D-A4 is answered.        |
| `set_legal_hold(delivery, on)`             | Retention exception.                                                                                                                                   |
| `set_setting(key, value)`                  | Updates a limit within a validated range.                                                                                                              |

Not provided in the MVP: post-collection reassignment and custody transfer (U6-Q5), and any direct status setter.

Read-only views in `app_admin` support the runbooks: `pending_assignment_queue`, `notification_failures`, `retry_requests`, `pin_resend_requests`, `locked_pins` (state only), `open_custody` (packages held by drivers after failure or cancellation).

### 6.4 PIN issuance and verification (D-P1 to D-P7)

**Issuance (U6-Q2, U6-Q3).**

1. An assignment, an authorised retry or an administrator request inserts a `queued` row in `notification_outbox` and sets `deliveries.pin_status = 'sending'`.
2. The email sender (a later Edge Function, using the secret key) calls `public.notification_claim_pin_job(job_id)`. In one transaction it marks the job `claimed`, calls `issue_pin`, and returns the plaintext PIN, the recipient email, the reference and the expiry. The plaintext exists only in that response and in the sender's memory.
3. The sender calls `public.notification_complete_pin_job(job_id, outcome, error_code)`. `sent` activates the issue (`pin_status = 'ready'`, `pin_expires_at` set). `failed` voids it (`pin_status = 'send_failed'`), keeps the job visible to administrators and allows a retry, which always issues a new PIN.
4. A claimed job that never completes leaves the issue `pending_send`; it never becomes usable, and an administrator retry supersedes it.

Validity runs 48 hours from `issued_at`. Issuing a new PIN supersedes the previous one immediately. Plaintext PINs are never returned by any other function.

**Verification** (`driver_complete_delivery`), after the common checks:

1. More than `pin_driver_failures_per_hour` failures by this driver in the current window: `rate_limited`. Not counted.
2. `p_pin` not exactly six ASCII digits: `pin_format_invalid`. Not counted.
3. No `active` issue: `pin_not_ready`. Expired: `pin_expired`. Locked: `pin_locked`.
4. Lock the issue row, compute the verifier and compare.
5. Mismatch: increment `failed_attempts` and the driver's counter, write `pin_verification_failed` (no PIN value). At the limit, set `locked` (`pin_status = 'locked'`) and write `pin_locked`. Return `pin_incorrect` with `remaining_attempts`, or `pin_locked` (U6-Q11).
6. Match: mark the issue `used`, set `delivered`, custody `with_recipient`, close the attempt, set `terminal_at`, and write `delivered` and `collected → delivered` custody events.

**Exclusions.** No PIN or verifier in events, operation records, the outbox, notices or results. pgTAP tests search every text column of these tables for the test PIN. Statement logging that records bound parameters (`log_statement = 'all'`, or pgAudit parameter logging) would capture PINs submitted by RPC; the runbook requires it to stay off, and the risk is listed in §12.

Comparison of two HMAC digests in SQL is not guaranteed constant-time. The attacker never controls the stored digest, and the attempt limit and rate limit bound guessing, so the residual risk is accepted and documented.

### 6.5 Notification and integration boundary (`public`, granted to `service_role` only)

| Function                                        | Caller (later unit)                 |
| ----------------------------------------------- | ----------------------------------- |
| `notification_claim_pin_job(job_id)`            | Email sender Edge Function          |
| `notification_complete_pin_job(job_id, …)`      | Email sender Edge Function          |
| `notification_next_jobs(limit)`                 | Email sender Edge Function          |
| `integration_resolve_client(key_hash)`          | Create-delivery Edge Function       |
| `integration_create_delivery(client_id, payload_hash, payload)` | Create-delivery Edge Function |
| `integration_delivery_status(client_id, external_order_id)` | Delivery-status Edge Function |

`service_role` receives no table privileges on application tables; it can act only through these functions.

## 7. Access matrix

R = read, X = execute, — = no access. "Own" means the driver row linked to `auth.uid()`; "visible" means deliveries the driver may read (§7.2).

| Object                                         | `anon` | Active driver                         | Inactive driver | Administrator (via `app_admin`, U6-Q1) | Integration (via Edge Function) | `service_role` | `postgres` / SQL editor |
| ---------------------------------------------- | ------ | ------------------------------------- | --------------- | -------------------------------------- | ------------------------------- | -------------- | ----------------------- |
| `drivers`                                      | —      | R own row                             | R own row       | R/W through functions                  | —                               | —              | All (bypasses RLS)      |
| `stores`                                       | —      | R stores of visible deliveries        | —               | R/W through functions                  | Validated in functions          | —              | All                     |
| `deliveries`                                   | —      | R visible rows, allow-listed columns  | —               | R/W through functions                  | Create and status through functions | —          | All                     |
| `delivery_items`                               | —      | R items of visible deliveries         | —               | Through functions                      | Created through functions       | —              | All                     |
| `delivery_attempts`                            | —      | —                                     | —               | R (views)                              | —                               | —              | All                     |
| `delivery_events`, `custody_events`            | —      | —                                     | —               | R (views); written by functions        | —                               | —              | R; no update or delete (trigger) |
| `admin_audit_events`                           | —      | —                                     | —               | R; written by functions                | —                               | —              | R; no update or delete (trigger) |
| `reason_codes`, `reason_rules`                 | —      | R active                              | —               | R                                      | —                               | —              | All                     |
| `tracking_sessions`, `location_samples`        | —      | — (Unit 13 adds own-session read and upload) | —        | R (views)                              | —                               | —              | All                     |
| `app_private.*` tables                         | —      | —                                     | —               | Through functions only                 | Through functions only          | —              | All                     |
| PIN plaintext                                  | —      | —                                     | —               | Never (synthetic fallback only, once)  | —                               | Once, in the claim response | Never stored     |
| Driver operation functions (§6.2)              | —      | X                                     | X (returns `driver_inactive`) | —                        | —                               | —              | X                       |
| `app_admin.*` functions                        | —      | —                                     | —               | X with actor check                     | —                               | —              | X                       |
| Notification and integration functions (§6.5)  | —      | —                                     | —               | —                                      | X (through `service_role`)      | X              | X                       |

No API role has `INSERT`, `UPDATE` or `DELETE` on any table. There is no driver `UPDATE` policy.

### 7.1 Column grants on `deliveries` (`authenticated`)

Granted: `id`, `reference`, `store_id`, `status`, `custody`, `current_attempt_id`, `assignment_version`, `pin_status`, `pin_expires_at`, `recipient_name`, `recipient_phone`, `address_line1`, `address_line2`, `suburb`, `city`, `postal_code`, `latitude`, `longitude`, `scheduled_for`, `notes`, `updated_at`.
Not granted: `driver_id` (filtering uses RLS; U6-Q16 lets Unit 07 drop the client-side filter), `custody_driver_id`, `origin_kind`, `origin_client_id`, `external_order_id`, `is_synthetic`, `legal_hold`, `created_at`, `terminal_at`, `pii_redacted_at`.

### 7.2 Driver row visibility

A driver sees a delivery when `driver_id = current_driver_id()` and either the status is `assigned`, `picked_up` or `en_route`, or the status is `failed` or `cancelled` and the driver still holds the package (`custody_driver_id = current_driver_id()`), so they can return it (U6-Q7). `pending_assignment` rows are never visible to drivers. Deactivation removes all visibility immediately.

## 8. Order-to-delivery integration contract

Implemented as Edge Functions in a later unit; Unit 06 provides and tests the database functions.

### 8.1 Authentication

- Each originating application has a server-side credential: a random 32-byte key, shown once at creation. Only its SHA-256 hash is stored (`integration_clients.key_hash`). A fast hash is acceptable because the key has high entropy (U6-Q14).
- The Edge Function sets `verify_jwt = false`, reads `Authorization: Bearer <key>`, hashes it and calls `integration_resolve_client`. An unknown or disabled client gets `401`. Browser calls are not supported; the key stays on the e-commerce server.
- The Edge Function uses the secret key only to call the §6.5 functions.
- Per-client rate limiting and request-size limits are applied in the Edge Function.

### 8.2 `POST /functions/v1/create-delivery`

Request (strict schema; unknown fields rejected):

```json
{
  "externalOrderId": "SHOP-000123",
  "storeCode": "ESK-CPT-01",
  "recipient": { "name": "Test Recipient", "phone": "+27000000000", "email": "recipient@test.invalid" },
  "address": {
    "line1": "1 Example Street",
    "line2": null,
    "suburb": "Example",
    "city": "Cape Town",
    "postalCode": "8001",
    "location": { "latitude": -33.92, "longitude": 18.42 }
  },
  "scheduledFor": "2026-11-13T10:00:00+02:00",
  "notes": "Gate code at reception",
  "items": [{ "name": "Example item", "quantity": 2, "sku": "SKU-1" }]
}
```

Validation: `externalOrderId` 1–64 characters `[A-Za-z0-9._-]`; store active and permitted for the client; recipient name 1–120; phone optional, E.164; email required, ≤ 254; address line 1 and city required; coordinates optional and range-checked; `scheduledFor` optional, not more than 30 days ahead; notes ≤ 500; 1–50 items, quantity 1–999. Fields such as `driverId`, `status`, `pin`, `role` or `custody` are rejected with `forbidden_field`.

| Outcome                                         | HTTP | Body                                                                                       |
| ----------------------------------------------- | ---- | ------------------------------------------------------------------------------------------ |
| Created                                         | 201  | `{ "deliveryReference", "status": "received", "createdAt" }`                               |
| Same client, same `externalOrderId`, same payload | 200 | The original body, plus `"replayed": true`                                                 |
| Same `externalOrderId`, different payload       | 409  | `{ "error": "external_order_conflict" }`                                                   |
| Invalid payload                                 | 400  | `{ "error": "validation_failed", "fields": ["recipient.email", …] }` (names, never values) |
| Unknown field or forbidden field                | 400  | `{ "error": "forbidden_field", "fields": [...] }`                                          |
| Bad or disabled credential                      | 401  | `{ "error": "unauthorised" }`                                                              |
| Store not permitted                             | 403  | `{ "error": "store_not_permitted" }`                                                       |
| Rate limited                                    | 429  | `{ "error": "rate_limited" }`                                                              |
| Server error                                    | 500  | `{ "error": "server_error" }` (retry with the same body)                                   |

The payload hash is SHA-256 of a canonical JSON serialisation. The delivery starts at `pending_assignment` with custody `at_store` and attempt 1; no PIN is issued until assignment.

### 8.3 `GET /functions/v1/delivery-status?externalOrderId=…`

Returns `{ "deliveryReference", "status", "updatedAt" }` for the caller's own orders only; another client's order returns `404`. Basic statuses (U6-Q15): `received` (`pending_assignment`), `assigned` (`assigned`, `picked_up`), `out_for_delivery` (`en_route`), `delivered`, `attempt_unsuccessful` (`failed`), `cancelled`. Never returns driver identity, location, PIN state, reasons or notes.

## 9. Retention (D-T4, D-X2)

`app_private.run_retention(p_now timestamptz)` runs daily (U6-Q17) and skips anything under legal hold:

- Deletes `location_samples` older than 7 days and ended `tracking_sessions` older than 7 days.
- 90 days after `terminal_at`, when custody is resolved: redacts recipient name, phone, address, coordinates and notes on the delivery, deletes the recipient contact and item names, and redacts event and custody notes for that delivery. Sets `pii_redacted_at`.
- Deletes delivery, custody and administrator audit events older than 12 months.
- Deletes operation records older than 30 days, closed PIN issues older than 30 days, and completed notification jobs older than 30 days.

Backups and exports follow the same policy through the runbook; platform backup retention is configured by the user. The product owner validates the periods under POPIA (D-X2).

## 10. Migration plan

Files in `supabase/migrations/`, applied in order. Timestamps are placeholders set when the files are created.

| #  | File                                  | Contents                                                                                                                                 |
| -- | ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| 1  | `…_01_foundation.sql`                 | `pgcrypto` in `extensions`; schemas `app_private` and `app_admin`; revoke default privileges on tables, sequences and functions from `anon`, `authenticated` and `service_role` in `public`, `app_private` and `app_admin`; revoke `execute` on functions from `public`. |
| 2  | `…_02_types_settings.sql`             | Enums (§4); `app_private.settings` with defaults.                                                                                        |
| 3  | `…_03_roles.sql`                      | `role_memberships`, `is_admin`, immutability trigger.                                                                                    |
| 4  | `…_04_reference_data.sql`             | `stores`, `reason_codes`, `reason_rules` and the approved codes.                                                                         |
| 5  | `…_05_drivers_deliveries.sql`         | `drivers`, `integration_clients`, `integration_client_stores`, `deliveries`, `delivery_items`, `delivery_attempts`, `recipient_contacts`, constraints, indexes, `updated_at` trigger. |
| 6  | `…_06_events_custody.sql`             | `delivery_events`, `custody_events`, `admin_audit_events`, append-only triggers, event helpers.                                          |
| 7  | `…_07_pin_notifications.sql`          | `pin_issues`, `notification_outbox`, `pin_rate_counters`, PIN helpers, notification functions.                                          |
| 8  | `…_08_idempotency.sql`                | `operation_records`, `integration_requests`.                                                                                             |
| 9  | `…_09_rls_grants.sql`                 | Enable RLS on every table; policies; column grants; helper grants; a final assertion that no API role has write privileges.             |
| 10 | `…_10_driver_operations.sql`          | §6.2.                                                                                                                                    |
| 11 | `…_11_admin_operations.sql`           | §6.3 and the administrator views.                                                                                                       |
| 12 | `…_12_integration.sql`                | `create_delivery_core` and the §6.5 integration functions.                                                                              |
| 13 | `…_13_location_schema.sql`            | `tracking_sessions`, `location_samples`, RLS enabled, no write grants.                                                                  |
| 14 | `…_14_retention.sql`                  | `run_retention`. Scheduling is a separate, user-applied step (U6-Q17).                                                                  |

Other files:

- `supabase/config.toml` from `supabase init`: API schemas `public` and `graphql_public` only. Function entries are added in later units.
- `supabase/seed.sql`: synthetic data only (§11.1), including a local-only Vault key generated at seed time.
- `supabase/tests/database/*.test.sql`: pgTAP tests (§11.2).
- `supabase/runbooks/*.md`: bootstrap administrator, provision driver, create, assign, reassign, cancel, authorise retry, resend PIN, synthetic PIN fallback, return to store, notification failures, retention and legal hold, creating the Vault key on a remote project, and logging settings. Each warns against direct SQL status edits.

Tooling: `.sql` files are not checked by TypeScript, ESLint or Prettier today, so `npm run validate` is unaffected. When Edge Functions are added later, `supabase/functions/` must be excluded from `tsconfig.json` and ESLint and get its own Deno configuration; that is decided in that unit.

Remote rollout (user only, after approval): create the Vault key, `supabase db push` to a non-production project, then Unit 07. Rollback before real data: reset the non-production database. No down migrations are planned.

## 11. Seed data and tests

### 11.1 Seed data (synthetic only)

- Auth users and drivers: three drivers (two active, one inactive), one administrator, one user with no role. Fictional names, `@test.invalid` emails.
- Two stores; one integration client with a documented local-only test key; one client disabled.
- Deliveries in every status and custody combination, all `is_synthetic = true`, including a failed delivery still held by the driver.
- No real people, addresses, phone numbers or PINs.

### 11.2 pgTAP test plan

Tests set `role` and `request.jwt.claims` to simulate `anon`, each driver, the administrator and `service_role`. Each file runs in a transaction and rolls back.

| File                               | Covers                                                                                                                                                                                                           |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `00_structure.test.sql`            | Tables, types and indexes exist. RLS is enabled on every table. No API role has insert, update or delete on any table. Every `security definer` function has `search_path=''`. `anon` cannot execute any application function. `service_role` has no table privileges. |
| `01_driver_reads.test.sql`         | A driver reads only their own row, deliveries, items and stores. Other drivers' rows and `pending_assignment` rows are invisible. Inactive drivers see no deliveries. Disallowed columns raise permission errors. `anon` reads nothing. |
| `02_private_data.test.sql`         | No API role can read `app_private` or `app_admin` tables, recipient emails, PIN issues, the outbox or memberships. User metadata claiming an admin role grants nothing.                                         |
| `03_transitions.test.sql`          | Every allowed transition in contract §4.4 succeeds once; every other combination returns `invalid_transition`. Direct `update` on `deliveries` fails for drivers.                                               |
| `04_operation_guards.test.sql`     | `not_assigned`, `driver_inactive`, `stale_attempt`, `stale_assignment`, `conflict`, `delivery_closed`, `en_route_limit`; same results for nonexistent and foreign deliveries.                                    |
| `05_idempotency.test.sql`          | Replay returns `already_applied` with the original result and no second event. A reused ID with a different payload, delivery or user returns `operation_id_reused`. `driver_get_operation_result` returns only own results. |
| `06_reasons.test.sql`              | Stage rules, required notes, note length, inactive codes, cancellation codes rejected for drivers. `store_not_ready` leaves the status `assigned`.                                                               |
| `07_pin.test.sql`                  | Correct PIN delivers. Incorrect PIN counts; the fifth failure locks; a locked PIN rejects even the correct value. Expiry at 48 hours (time passed as a parameter). Regeneration invalidates the old PIN. `pin_not_ready` before activation and after send failure. Format errors and rate limits do not count. Leading zeros. The test PIN appears in no event, record, outbox row or result. |
| `08_notifications.test.sql`        | Claim returns the PIN once; a second claim fails. Completion `sent` activates; `failed` voids and is visible in `notification_failures`. Drivers and administrators cannot call notification functions.         |
| `09_admin.test.sql`                | Each `app_admin` function rejects a non-member and a revoked member, and writes an audit event with actor, reason, time and target. Reassignment works before collection and is rejected after it. Retry starts at `picked_up` or `assigned` correctly and makes old operations stale. Cancellation leaves custody unchanged. Bootstrap works only once. The last administrator cannot be revoked. |
| `10_custody.test.sql`              | Collection, delivery and return change custody with events. Failure and cancellation leave custody with the driver. A held failed delivery stays visible to its driver.                                          |
| `11_immutability.test.sql`         | Update and delete on event and audit tables fail for every role, including `service_role`.                                                                                                                       |
| `12_integration.test.sql`          | Create, replay, conflict, forbidden fields, store permissions, disabled clients, client isolation for status, status mapping, uniqueness under repeated calls.                                                  |
| `13_retention.test.sql`            | Each retention rule at its boundary; legal hold respected; redaction removes PII and keeps the audit skeleton.                                                                                                   |

Concurrency (two sessions verifying a PIN or starting a route at once) cannot be expressed in a single pgTAP session. The design relies on row locks and the partial unique index; a manual two-session script is included in the runbooks and listed as not automated.

Commands, once the tooling exists: `supabase start`, `supabase db reset`, `supabase test db`, `supabase db lint`.

**Not runnable today:** Docker and the Supabase CLI are not installed on the development machine (checked 2026-11-12). Installing them needs the user's consent. Until then the migrations and tests can be written but not executed, and must be reported as not run.

## 12. Risks

| Risk                                                                                      | Mitigation                                                                                                       |
| ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Project collaborators bypass RLS and can call admin functions with any actor ID.          | Few collaborators; runbooks; audit trail. Long-term administrator tooling should authenticate the administrator directly (U6-Q1). |
| Database parameter logging could capture submitted PINs.                                  | Keep `log_statement` off for RPC traffic and do not log function parameters; checked in the runbook. Alternative: route PIN submission through an Edge Function (later). |
| A notification sender crash after claiming leaves a PIN that was never sent.              | The issue stays `pending_send` and unusable; administrators see the job and retry, which supersedes it.         |
| The current app breaks against the renamed columns.                                       | Do not point a live build at this schema before Unit 07.                                                        |
| Tests cannot run locally yet.                                                             | Install Docker and the Supabase CLI with consent, or run in CI.                                                 |

## 13. Design questions for review

Each has a proposal. "Accept" means adopting the proposal as written.

| ID      | Question                                                                 | Proposal                                                                                                                                         |
| ------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| U6-Q1   | How are administrator functions invoked?                                 | From the SQL editor in a non-exposed `app_admin` schema, with an explicit actor that must be an active member. No administrator RPC in the MVP. Administrator and driver accounts are separate users. |
| U6-Q2   | When is the PIN generated?                                               | Only when the email sender claims a job, so the plaintext never rests in the database. "Resend" always issues a new PIN.                         |
| U6-Q3   | When is a PIN requested, and is it required for `en_route`?               | On assignment and on each authorised retry. Reassignment before collection keeps an active PIN. `en_route` is refused until a PIN is ready (D-P4: "valid PIN before dispatch"). |
| U6-Q4   | May a driver go from `en_route` back to `picked_up`?                      | Yes (`driver_pause_route`), so a driver with several packages can switch.                                                                        |
| U6-Q5   | Is custody transfer in the MVP?                                          | No. Post-collection reassignment is blocked (D-S7).                                                                                               |
| U6-Q6   | Who confirms a return to store?                                          | An administrator, through `confirm_return_to_store`, after the store confirms receipt. No driver self-confirmation.                             |
| U6-Q7   | Is `failed` terminal?                                                    | No. Administrators close it by retry or cancellation. Drivers still see failed or cancelled deliveries while they hold the package.             |
| U6-Q8   | Stage rules for driver reasons                                           | As in contract §5.1.                                                                                                                              |
| U6-Q9   | Cancellation reason codes                                                | `customer_cancelled`, `duplicate_order`, `fulfilment_unavailable`, `other` (note required).                                                      |
| U6-Q10  | Maximum note length                                                      | 280 characters for reason notes; 500 for delivery notes.                                                                                          |
| U6-Q11  | Show remaining PIN attempts to the driver?                               | Yes, as a count only.                                                                                                                             |
| U6-Q12  | Per-driver PIN rate limit                                                | 10 failed verifications per rolling hour across all deliveries, configurable.                                                                    |
| U6-Q13  | Administrator read access through the Data API                           | None in the MVP. Administrators read through `app_admin` views in the SQL editor. Revisit with a future administrator app, requiring MFA.       |
| U6-Q14  | Integration credential                                                   | Per-client random key, stored as a SHA-256 hash, checked by an Edge Function with `verify_jwt = false`; server-to-server only.                  |
| U6-Q15  | Statuses shown to the originating application                            | `received`, `assigned`, `out_for_delivery`, `delivered`, `attempt_unsuccessful`, `cancelled` (§8.3).                                             |
| U6-Q16  | Delivery reference and column names                                      | Server-generated `reference` (`ESK-` plus 8 random base-32 characters) replaces `order_number`; `customer_*` becomes `recipient_*`; `driver_id` is not readable by drivers. Unit 07 updates the app. |
| U6-Q17  | Retention scheduling and operational record retention                    | Daily job with `pg_cron`, enabled by the user on the remote project; operation records, closed PIN issues and finished notification jobs kept 30 days. |

Also still open from the contract (§12): D-A3, D-A4, D-A6, D-A7, D-O6, D-O7, D-T7.

## 14. Approval and next steps

1. The user reviews this specification and answers or accepts U6-Q1 to U6-Q17.
2. On approval, this file's status changes to approved, and the answers are recorded in `progress-tracker.md`.
3. Implementation creates `supabase/` as in §10 and §11. Tests are run locally once Docker and the Supabase CLI are available, with consent to install them.
4. The user applies the migrations to a non-production project. Unit 07 then aligns the app.

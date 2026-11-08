# AI Workflow Rules

## Approach

Build this project incrementally with a spec-driven workflow. The context files define what to build (`project-overview.md`), how it fits together (`architecture.md`), how code is written (`code-standards.md`), how it looks (`ui-context.md`) and where the work stands (`progress-tracker.md`). Implement against these files. Do not infer or invent product behaviour.

- Read all six context files and `AGENTS.md` at the start of every session.
- Specs for each unit live in `context/specs/NN-unit-name.md`. The build plan lives in `context/specs/00-build-plan.md` once it exists.
- Implement exactly what the current spec says. No more, no less.
- Before changing files, inspect the existing code and extend it. Do not replace working code to fit a different pattern.

## Scoping Rules

- Work on one unit at a time.
- Prefer small, verifiable increments over large speculative changes.
- Do not combine unrelated system boundaries in one step.
- Do not refactor, rename or reformat code outside the unit's scope.
- Do not add dependencies the unit does not need. Install them with `npx expo install` in the unit that first uses them.
- Do not implement anything listed under **Out of Scope** in `project-overview.md`.

## When to Split Work

Split an implementation step if it combines:

- A service or repository change (`src/services/`) and the screens that use it.
- A Supabase schema assumption change (mappers, domain types) and new UI.
- A new native module or `app.json` permission change and feature logic.
- Design-token changes (`theme.ts`) and feature screen changes.
- Behaviour that is not defined in the context files.

If a change cannot be verified end to end with `npm run validate` and a mock-mode run, the scope is too broad. Split it.

## Handling Missing Requirements

- Do not invent product behaviour, database columns, status transitions, brand colours or copy that changes meaning.
- If a requirement is ambiguous, resolve it in the relevant context file first, then implement.
- If a requirement is missing, add it under **Open Questions** in `progress-tracker.md` and ask the user before continuing.
- If the real Supabase schema differs from `architecture.md`, stop and update `architecture.md` and the mappers in the same unit. Do not silently adapt.
- When an Expo API is uncertain, read the SDK 58 docs instead of guessing.

## Protected Files

Do not modify the following unless explicitly instructed:

- `ios/` and `android/` — never create or edit (Continuous Native Generation).
- `node_modules/` and `package-lock.json` by hand (change dependencies only through `npx expo install` or `npm`).
- `AGENTS.md`, `LICENSE`, `.claude/`, `.vscode/`.
- `context/README.md` — the methodology guide.
- `src/components/ui/theme.ts` colour and typography values — change only for approved brand tokens or a recorded accessibility fix.
- `src/config/env.ts` validation rules — never loosen secret, placeholder or production-mock checks.
- `eas.json` profiles, `app.json` identifiers (`bundleIdentifier`, `package`) and `extra.eas` — change only on instruction.
- `.env` and any real credentials — never read values into output, commit or log them.

## Actions That Need User Consent

- Any EAS command (`login`, `init`, `build`, `submit`, `update`).
- Any change to a real Supabase project, Edge Function, Google Cloud project or other remote resource. Never deploy or modify production resources.
- `git commit`, `git push` or branch operations, unless the user asked for them.
- `npm audit fix`, major-version upgrades or Expo SDK upgrades.
- Deleting user files that were not created in the current task.

## Keeping Docs in Sync

Update the relevant context file in the same unit whenever implementation changes:

- System boundaries, data flow or invariants → `architecture.md`
- Assumed schema, storage or the Edge Function contract → `architecture.md` and `README.md`
- Conventions or tooling → `code-standards.md`
- Tokens, components or layout patterns → `ui-context.md`
- Feature scope → `project-overview.md`
- Environment variables → `.env.example`, `README.md` and `architecture.md`

Update `progress-tracker.md` at the start of a unit (In Progress) and at the end (Completed, Session Notes).

## Before Moving to the Next Unit

1. The unit works end to end within its scope in mock mode, and in live mode if credentials exist.
2. No invariant in `architecture.md` was violated.
3. `npm run validate` passes (type-check, lint, format check, tests).
4. `npx expo-doctor` passes if dependencies or `app.json` changed.
5. New logic has tests; new screens handle loading, empty, error and permission states where they apply.
6. Context files reflect the change, and `progress-tracker.md` records it.
7. The report to the user separates checks that were run from checks that were not run (for example native builds or real backend calls).

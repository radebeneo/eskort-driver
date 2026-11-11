# Code Standards

## General

- Keep modules small and single-purpose. One component, hook, service or store per file.
- Match the structure, naming and patterns of the surrounding code before introducing new ones.
- Fix root causes. Do not layer workarounds, suppress lint rules or loosen types to make a check pass.
- Do not mix concerns: UI in components, data access in services, orchestration in hooks.
- Prefer recommended Expo modules over third-party libraries. Do not add another state-management, data-fetching, styling or backend framework without a recorded decision in `progress-tracker.md`.

## TypeScript

- `strict` is on. Do not weaken `tsconfig.json`.
- No `any`. Use `unknown` for untrusted input and narrow it with the helpers in `src/lib/validation.ts`.
- Model finite sets as `as const` arrays with derived union types and type guards (see `DELIVERY_STATUSES` and `isDeliveryStatus` in `src/types/delivery.ts`).
- Model async UI state as discriminated unions on `status` (`'loading' | 'error' | 'ready'`), not boolean flags.
- Use `type` aliases for data shapes and `interface` for service contracts.
- Use `import type` for type-only imports.
- Domain types use camelCase. Database column names (snake_case) appear only inside mappers.
- Nullable server fields are `T | null`, not optional properties.

## Expo and React Native

- Before touching any Expo, EAS or React Native API, check the SDK 58 docs (`https://docs.expo.dev/versions/v58.0.0/`) or `https://docs.expo.dev/llms.txt`. Do not rely on memory.
- Install packages with `npx expo install <package>`, never `npm install <package>`.
- After adding a package with native code, note that a new development build is required.
- Configure native behaviour (permissions, plugins, bundle IDs) in `app.json`, never in `ios/` or `android/`.
- Read env values only through `src/config/env.ts`.
- Use `StyleSheet.create` for static styles and inline objects only for theme-dependent values.
- Use `FlatList` for lists of records that can grow (such as deliveries). Short, bounded lists inside a card (such as order items) may use `.map`.
- Use the `Fragment` import from React rather than the empty-tag fragment shorthand. The CookieMonster file transport has stripped empty tags before, which broke JSX.
- Fire-and-forget promises in event handlers use `void`, e.g. `onPress={() => void signOut()}`.

## Expo Router

- Every file in `src/app/` is a route. Keep components, hooks and utilities outside `src/app/`.
- Route files only render a feature screen, read params with `useLocalSearchParams`, and set screen options.
- Import `Link`, `router`, `Stack` and `useLocalSearchParams` from `expo-router`.
- Signed-in screens go in `src/app/(app)/`, signed-out screens in `src/app/(auth)/`. Access is switched by `Stack.Protected` in `src/app/_layout.tsx`; do not add manual redirects.

## State

- Auth, session and driver profile: `useAuth()` from `src/providers/auth-provider.tsx` only.
- Services: `useServices()` from `src/providers/services-provider.tsx`.
- Client operational state: Zustand stores in `src/stores/`, one store per concern, named `use<Name>Store`. Store IDs and preferences, never server records.
- Persisted stores use Zustand `persist` with AsyncStorage and validate/clamp persisted values.
- Reset operational stores on sign-out (handled in `AuthProvider`).
- Screen-local UI state uses `useState`.

## Services and Data Access

- Every integration has an interface (`<name>-service.ts` or `<name>-repository.ts`) and implementations named by backend (`supabase-…`, `expo-location-…`, `edge-function-…`, `mock-…`).
- Implementations are created by factory functions (`createSupabaseDeliveryRepository(client)`) and wired only in `src/services/index.ts`.
- Validate every external response with a mapper or parser built on the `read*`/`expectRecord` helpers in `src/lib/validation.ts`. Each returns a domain type or throws `invalidData(context, field)`, an `AppError` with code `validation`.
- Map Supabase/PostgREST errors with `src/services/supabase/postgrest-error.ts`.
- Repositories do not cache. Screens reload through hooks.
- Select explicit columns in Supabase queries; do not use `select('*')` for domain reads.
- New mock implementations go in `src/services/mocks/`, start with the ⚠️ mock header comment, and use fictional data only.

## Error Handling

- Services throw `AppError` (`src/lib/errors.ts`) with a code and a message that is safe to show to a driver. Keep the original error in `details`.
- Convert unknown errors with `toAppError(error, fallbackMessage)`.
- UI shows `error.message`, never raw error objects, stack traces, SQL or config values.
- Hooks expose a `retry`/`reload` function and screens render `ErrorState` with it.
- Never log credentials, tokens, session contents or customer personal data.

## Styling

- Use tokens from `useTheme()` (`colors`, `spacing`, `radii`, `typography`). No hardcoded hex colours, font sizes or spacing values in features.
- Use `Text` with `variant` and `tone` instead of styling raw React Native `Text`.
- Use `Button` variants (`primary`, `secondary`, `danger`, `ghost`) instead of custom pressables for actions.
- Every screen is wrapped in `Screen`. Group related content in `Card`.
- Follow `context/ui-context.md` for all visual decisions.

## Accessibility

- Interactive elements are at least `MIN_TOUCH_TARGET` (48) high.
- Every interactive element has an `accessibilityRole` and a label (`Button` defaults the label to its text).
- Error messages that appear after an action use `accessibilityRole="alert"`.
- Titles and headings use `Text` variants `title`/`heading`, which are exposed as headers.
- Text and background token pairs must keep WCAG AA contrast (4.5:1) in light and dark schemes.
- Add `accessibilityHint` when a control leaves the app or has a non-obvious effect.

## Testing

- Jest with `jest-expo` and React Native Testing Library 14. `render`, `fireEvent` and similar calls are awaited.
- Tests live in `__tests__/` folders next to the code, named `<subject>.test.ts(x)`.
- Unit test pure logic: config parsing, mappers, parsers, validation, formatting, stores.
- Component tests use mock services through `ServicesProvider` (`createMockServices`). Do not hit real Supabase or Google in tests.
- Route-level tests render the real route and layout files with `renderRouter` from `expo-router/testing-library` (see `src/components/__tests__/mock-mode-routes.test.tsx`). `renderRouter` turns on fake timers; restore real timers in `afterEach`.
- ESM-only packages loaded in Jest must be listed in `transformIgnorePatterns` in `package.json` (`standard-navigation` is required by `expo-router`).
- Global mocks go in `jest.setup.js`.
- A bug fix includes a test that fails without the fix where practical.

## Formatting and Linting

- Prettier: single quotes, trailing commas, print width 100, `bracketSameLine`. Run `npm run format`.
- ESLint: `eslint-config-expo/flat` plus `eslint-plugin-prettier`. Do not disable rules inline without a comment explaining why.
- `npm run validate` must pass before work is reported as done.

## File Organization

- `src/app/` — Route files and `_layout.tsx` navigators only.
- `src/features/<feature>/` — `<feature>-screen.tsx` screens, `use-<thing>.ts` hooks, feature components and helpers, `__tests__/`.
- `src/components/ui/` — Design-system primitives, exported from `index.ts`.
- `src/components/states/` — Loading, empty, error, permission-denied states, exported from `index.ts`.
- `src/providers/` — Context providers and their hooks.
- `src/stores/` — `<name>-store.ts` Zustand stores.
- `src/services/<integration>/` — Interface, implementations, mappers/parsers.
- `src/services/mocks/` — Mock implementations and data.
- `src/lib/` — Cross-cutting utilities.
- `src/types/` — Domain types.
- `src/config/` — Env parsing and validation.
- File names are kebab-case. Components and types are PascalCase; functions, hooks and variables are camelCase.
- Import app code with the `@/` alias (`@/components/ui`); use relative imports only within the same folder.

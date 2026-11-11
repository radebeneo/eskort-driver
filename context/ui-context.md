# UI Context

## Theme

Light and dark schemes that follow the device setting (`useColorScheme`). The visual language is a plain, high-contrast utility app for drivers working in a vehicle: neutral backgrounds, white or dark surface cards, one blue accent for actions, and clear status colours. Readability and large touch targets come before decoration.

> These tokens are **neutral placeholders, not Eskort brand assets.** Do not invent Eskort colours, logos or fonts. Replace the values in `src/components/ui/theme.ts` only when approved brand tokens are supplied, and keep WCAG AA contrast.

Use tokens through `useTheme()`. The React Navigation theme in `src/app/_layout.tsx` is derived from the same tokens.

## Colors

All components must use these tokens. No hardcoded hex values in features.

| Role                       | Token            | Light     | Dark      |
| -------------------------- | ---------------- | --------- | --------- |
| Page background            | `background`     | `#F6F7F9` | `#0C111D` |
| Surface (cards, header)    | `surface`        | `#FFFFFF` | `#161B26` |
| Muted surface              | `surfaceMuted`   | `#EEF0F3` | `#1F2532` |
| Border                     | `border`         | `#D0D5DD` | `#333A47` |
| Primary text               | `text`           | `#101828` | `#F5F5F6` |
| Muted text                 | `textMuted`      | `#475467` | `#A4ACB9` |
| Primary accent             | `primary`        | `#1D4ED8` | `#84ADFF` |
| Primary pressed            | `primaryPressed` | `#1E40AF` | `#B2CCFF` |
| Text on primary            | `onPrimary`      | `#FFFFFF` | `#0C111D` |
| Error / destructive        | `danger`         | `#B42318` | `#FDA29B` |
| Text on danger             | `onDanger`       | `#FFFFFF` | `#0C111D` |
| Success                    | `success`        | `#067647` | `#75E0A7` |
| Warning (incl. mock mode)  | `warning`        | `#B54708` | `#FEC84B` |
| Info                       | `info`           | `#1D4ED8` | `#84ADFF` |

`Text` tones map to tokens: `default → text`, `muted → textMuted`, `primary`, `danger`, `success`, `warning`.

## Typography

Platform system font (San Francisco on iOS, Roboto on Android). No custom fonts are loaded.

| Variant      | Size / line height | Weight | Use                                        |
| ------------ | ------------------ | ------ | ------------------------------------------ |
| `title`      | 28 / 34            | 700    | Screen titles (exposed as header)          |
| `heading`    | 20 / 26            | 600    | Card and section headings (exposed as header) |
| `body`       | 16 / 22            | 400    | Default text                               |
| `bodyStrong` | 16 / 22            | 600    | Emphasised values                          |
| `label`      | 15 / 20            | 600    | Buttons, field labels                      |
| `caption`    | 13 / 18            | 400    | Secondary notes, hints                     |

Do not go below `caption` size. Allow system font scaling; do not set `allowFontScaling={false}`.

## Spacing

| Token | Value | Typical use                         |
| ----- | ----- | ----------------------------------- |
| `xs`  | 4     | Icon/text gaps                      |
| `sm`  | 8     | Gaps inside cards and buttons       |
| `md`  | 12    | Between related rows                |
| `lg`  | 16    | Screen padding, card padding, gaps between cards |
| `xl`  | 24    | Section separation                  |
| `xxl` | 32    | Large empty-state spacing           |

## Border Radius

| Context                       | Token  | Value |
| ----------------------------- | ------ | ----- |
| Small inline UI               | `sm`   | 6     |
| Buttons, inputs               | `md`   | 10    |
| Cards, panels                 | `lg`   | 16    |
| Badges, chips                 | `pill` | 999   |

Borders are 1 px on buttons and inputs and hairline on cards.

## Component Library

An in-house design system in `src/components/ui/`, exported from `@/components/ui`. No third-party UI kit. Extend these components instead of styling raw React Native primitives in features.

- `Screen` — Safe-area wrapper (bottom/left/right edges; the header handles the top). Props: `scroll`, `refreshControl`, `padded`, `edges`, `contentStyle`. Default padding and gap are `lg`.
- `Card` — Surface container with hairline border, `lg` radius, `lg` padding, `sm` gap.
- `Text` — Themed text with `variant` and `tone`.
- `Button` — Variants `primary`, `secondary`, `danger`, `ghost`; `loading` shows a spinner and disables the button. Minimum height 48.
- `TextField` — Labelled input with error text; forwards `ref` for focus chaining.
- `InfoRow` — Label/value row for details.
- `SwitchRow` — Labelled switch for preferences.

Reusable states in `src/components/states/` (`@/components/states`):

- `LoadingState` — Spinner with a message.
- `EmptyState` — Title and message, optional action.
- `ErrorState` — Shows an `AppError` message with a retry action; announced as an alert.
- `PermissionDeniedState` — Explains why a permission is needed; offers **ask again** when possible, otherwise **open settings**.

App-wide components: `MockModeBanner` (warning-toned banner shown in mock mode), `MockModeScreenLayout` (navigator `screenLayout` that places the banner once above every screen; `headerless` for stacks without a header), `ConfigErrorScreen`, `HeaderLinkButton`.

## Layout Patterns

- **Navigation**: native stack. The root stack has no header and switches between the `(auth)` and `(app)` groups. The `(app)` stack shows native headers; the deliveries list has a **Profile** header link on the right.
- **Screens**: `Screen` with vertically stacked `Card`s separated by `lg`. One primary action per screen where possible; destructive actions (Sign out) use `danger` and sit at the bottom.
- **Lists**: the deliveries list is a `FlatList` (pull to refresh) with the delivery card as the row and loading/empty/error states in place of the list. Do not nest a `FlatList` in `Screen scroll`. Short, bounded lists inside a card (such as order items) may render with `.map`.
- **Details**: `Screen scroll` with four sections in this order:
  - Order card: order number heading with status badge, scheduled time, last updated.
  - Customer card: name, address, notes, and a secondary **Call customer** button when a phone number exists.
  - Route section: estimate or permission state, plus **Open in Google Maps**.
  - Items card: `quantity × name` lines, or a muted empty message.
- **Forms**: single column, labelled fields, inline field errors, form-level error above the submit button, submit button full width.
- **Mock mode**: `MockModeBanner` is always visible in mock mode and must not be hidden. It is placed once per screen by `MockModeScreenLayout` in `src/app/(auth)/_layout.tsx` and `src/app/(app)/_layout.tsx`: fixed directly below the native header in `(app)`, and at the top of the screen (clearing the status bar) in the headerless `(auth)` stack. It sits outside each screen's scroll view or list, so it does not scroll away and does not affect pull-to-refresh or keyboard avoidance. It covers loading, empty, inactive-account and error states. It renders nothing in live mode. Do not add the banner inside screens or states.
- **Status badges**: pill radius, colour from the status tone mapping in `src/features/deliveries/delivery-status.ts`; always include the text label, never colour alone.

## Icons

No icon library is in use. Prefer text labels. If icons are needed, record a decision in `progress-tracker.md` first. `expo-symbols` (iOS SF Symbols) is installed from the starter but unused, and Android needs a cross-platform choice. Icons must have accessibility labels or be hidden from screen readers when decorative.

## Copy

- Plain, short, driver-facing language. Say what happened and what to do next ("We could not reach the server. Check your connection and try again.").
- Never show technical errors, IDs of internal systems, configuration values or tokens.
- Mock-only content must say it is mock data.

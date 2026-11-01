# MUSNAD-WOW — Shared UI Components V0.6

## Purpose

A controlled and responsive cross-application primitive layer. This iteration **does not** implement Customer, Merchant, or Admin pages. It extends the reviewed V0.5.2 UI baseline without modifying `AppButton`, `Checkbox`, `AnimatedHeart`, `AnimatedBell`, `AnimatedWowIcon`, `@wow/assets` or the approved theme tokens.

## Added components

| Group | Components | Shared contract |
| --- | --- | --- |
| Input | `SearchField`, `TextAreaField`, `SelectField` | Controlled values; caller owns querying, validation and mutations |
| Choices | `SwitchField`, `RadioFieldGroup`, `FilterChip`, `SegmentedTabs` | Caller owns state; accessible tap targets and RTL support |
| Feedback | `InlineNotice`, `ToastBanner`, `ProgressBar`, `Skeleton` | Explicit outcomes, semantic colors, no perpetual animations |
| Workflow | `ConfirmDialog`, `BottomSheet`, `Stepper`, `Pagination` | Explicit open/close, mobile scroll and 48-point actions |
| Data & files | `DataTable`, `FileSelectField` | Horizontal scrolling rather than shrinking table columns; file picker/upload delegated to app feature |

## Contract details and limits

- **The component API is controlled**: props contain actual values and change callbacks. Data access, authorization, storage, subscription and upload logic never belong in `@wow/ui`.
- `DataTable<Row>` takes `columns` with `render`, `rows`, `getRowKey` and an empty label. It is appropriate for *small/medium* views; server-side pagination, sortable/virtualized rows, and wide admin view specialization remain the responsibility of feature owners. It scrolls horizontally on phones.
- `SelectField` uses a native React Native Modal on all platforms; no new picker dependencies. Validate keyboard navigation, focus return and screen reader behavior on physical targets before production.
- `ConfirmDialog` requires parent-managed `visible`, `busy`, `onConfirm`, and `onCancel`. Never display success until the actual backend responds.
- `BottomSheet` has explicit close and native slide transition; **drag-to-dismiss is not implemented** and should not be implied in app UI.
- `ToastBanner` is an *inline* notification with explicit dismissal, **not a global portal/toast queue**. A toast host/queue and timers can be designed separately when user journeys require them.
- `FileSelectField` is only the accessible trigger and list of selected file names. It does not open a picker unless the parent connects `onChooseFiles`; neither upload nor MIME/size checks are implemented here.
- `Skeleton` uses a stable placeholder, intentionally no endless shimmer or animation.
- Motion rules and checkbox remain V0.5.2 / V0.5.1 unchanged.
- The developer-only Gallery is mounted on the existing `/design-preview` route and has no network or real user data.
- Responsive component constraints should be checked at 320, 375, 390, 768, 1024, 1440 CSS pixels on real browsers and native devices; Expo platform-specific modules can be added when implementation genuinely differs, not just because viewport width changes.

## Deliberately not implemented in V0.6

Complex upload/storage flows, datetime/date range selectors, charts, virtualized enterprise tables, advanced popover/focus trap, global toast queue, server-side forms, and app-specific `OfferCard`, `MerchantWorkbench`, `AdminSidebar`. These need actual approved workflow requirements or future app-specific implementations; adding nonfunctional stubs here would be misleading.

## Validation gate

```bash
node scripts/test-ui-v06.cjs
pnpm --filter @wow/ui exec tsc --noEmit
pnpm typecheck
pnpm lint
pnpm test:query
pnpm test:integration
pnpm --filter customer exec expo start --web --clear
```

Preview: `http://localhost:8081/design-preview`. Validate on native and web (light/dark, RTL, screen reader focus, modal dismissal, and responsive behavior). Do not commit/push until reviewed; the PR is still draft.

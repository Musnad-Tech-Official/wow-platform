# WOW Design System — UI Foundation (v1)

This is the approved visual contract for Customer, Merchant and Admin. Build real feature pages using the approved screen designs and reuse the existing shared components. Improve defects or missing states without inventing new product flows.

## Visual direction

- Brand: warm yellow/gold accent with calm neutral surfaces; optimize for a Yemeni local-offers marketplace.
- Language: Arabic-first, RTL content, Tajawal typography, clear numbers and currency units.
- Platforms: Expo React Native and Expo Web. Components should render on mobile and responsive web without browser-only HTML.
- Modes: `light`, `dark`, `system` already exist. Use `ThemeProvider` and `useWowColors()` for JS-driven styles and SVG icons.
- Accessibility: minimum **48-point** interactive target, semantic control labels, clear disabled/loading states, visible text contrast and descriptive errors. Do not rely on color alone to convey status.
- Microcopy: clear Arabic, no fake loading/success when a network operation actually failed. Keep all demo data explicitly labeled.
- No animations or extra dependencies just for decoration; honor existing app infrastructure and avoid placing `nativewind.styled()` wrappers directly on Lucide SVG icons.

## Source of truth

`packages/theme/src/tokens.ts` exports:
- `wowColorSchemes.light` / `.dark`: matching brand/background/surface/foreground/border and success/warning/danger/info/neutral status colors.
- `wowLayoutTokens`: spacing, radius, 48-point minimum touch size, page padding and responsive max content width.
- `wowTypography`: Tajawal font names and size scale.

The original seven NativeWind color variables in `ThemeProvider.tsx` are derived from these tokens. `packages/theme/theme.css` defines the corresponding Tailwind class names. **When extending the CSS color names, update both the CSS mapping and the token/theme-provider values together.** Status components currently use semantic palette values directly, without injecting extra CSS variables.

### Component inventory

Already present:

| Component | Purpose |
| --- | --- |
| `AppText` | Tajawal, Arabic typography |
| `AppButton`, `IconButton` | Primary/secondary interactions |
| `AppInput`, `Checkbox` | Forms |
| `Card`, `Badge`, `Divider` | Surfaces and separators |
| `ThemeSwitcher` | Light/dark/system |
| `AnimatedHeart`, `AnimatedBell` | Existing animated icons |

Added in this foundation:

| Component | Purpose |
| --- | --- |
| `PageScaffold` | Centered responsive scroll layout, consistent horizontal/vertical spacing |
| `PageHeader` | Screen title, optional eyebrow/description/action slot |
| `SectionHeader` | Section title, subtitle, optional labeled action |
| `StatusBadge` | Success/warning/danger/info/neutral, accessible label |
| `MetricCard` | Merchant/Admin KPI card with optional icon and caption |
| `ListRow` | Read-only or pressable list row with leading/trailing slots |
| `DataState` | Shared loading, empty and error states, optional explicit action |

Import all through `@wow/ui`; do not deep-import implementation files from apps. Import palettes/spacing/hooks via `@wow/theme`.

Example:

```tsx
import { useWowColors } from '@wow/theme';
import { PageScaffold, PageHeader, SectionHeader, ListRow, StatusBadge, DataState } from '@wow/ui';

function BusinessList({ businesses, isLoading, error }: {
  businesses: { id: string; name: string }[];
  isLoading: boolean;
  error: unknown;
}) {
  const colors = useWowColors();
  return (
    <PageScaffold>
      <PageHeader title="المتاجر" description="إدارة المتاجر المعتمدة" />
      <SectionHeader title="قائمة المتاجر" />
      {isLoading ? <DataState kind="loading" /> :
        error ? <DataState kind="error" /> :
        businesses.length === 0 ? <DataState kind="empty" /> :
        businesses.map(b => (
          <ListRow
            key={b.id}
            title={b.name}
            trailing={<StatusBadge label="متاح" tone="success" />}
          />
        ))}
    </PageScaffold>
  );
}
```

If `colors` is only needed for an SVG/icon, pass `color={colors.primary}` directly and never pass `className` through a Lucide styled adapter.

### Additional shared controls

The shared library also exports `SearchField`, `TextAreaField`, `SwitchField`, `RadioFieldGroup`, `FilterChip`, `SegmentedTabs`, `SelectField`, `InlineNotice`, `ProgressBar`, `Skeleton`, `ConfirmDialog`, `Pagination`, `DataTable`, `ToastBanner`, `FileSelectField`, `BottomSheet` and `Stepper`. Inspect their actual TypeScript props before use; do not copy legacy examples.

### Semantic color safeguards

Keep the approved primary yellow `#FACC15` and readable `primaryForeground`. Text links, focus rings and selected indicators use `actionForeground`/`focusRing`, not yellow text on a white canvas. Inputs use the semantic `controlBorder`; muted labels require legible contrast in both modes. The source checks cover 44 token contrasts, but visual and assistive-device review is still required.

## Developer-only gallery

From Customer Expo web, navigate directly to:

```text
http://localhost:8081/design-preview
```

`apps/customer/src/app/design-preview.tsx` exercises all added primitives, theme switching, inputs and list actions. It contains only labeled synthetic values and makes **zero** Clerk or Supabase API requests. The route redirects to `/` outside `__DEV__`. It is not part of the product navigation.

This gallery can also be opened via Expo Go's development route if the project launches on a device.

## Page implementation rules

1. Start with `PageScaffold`, `PageHeader` and `SectionHeader`; do not invent new global shells and nav in each package.
2. Preserve semantic status meaning: **submitted/pending = warning**, **approved = success**, **rejected = danger**, **draft = neutral**. A badge is UI only and does not grant permissions.
3. Use `DataState` for loading, errors and empty results. Protected screen states must distinguish **signed-out** vs **loading** vs **permission denied**.
4. Use `@wow/api` typed hooks, never raw restricted tables or hardcoded private Storage URLs. Public discovery remains available to guests.
5. Compose existing components before proposing new dependencies. Avoid unreviewed API changes to shared UI; verify cross-app consumers.
6. Use `minTouchSize`, Tajawal and responsive max-width guidance across all screens. Always set accessible labels on icon-only actions.
7. Dark theme must be checked manually for every new page; do not hardcode colors where semantic tokens exist.
8. Only explicit user actions trigger mutations, and success messages must wait for a confirmed response. Do not auto-retry ambiguous writes.

## Validation

Run `bash scripts/verify-ui-v08.sh` from the repository root. Inspect the developer-only `/design-preview` screen at mobile/tablet/desktop widths, RTL, light/dark/system and keyboard focus. Also validate representative Android/iOS devices, accessibility semantics and reduced motion. A source-level contrast or mocked test is not a device acceptance certificate.

The Stepper number alignment requires cross-platform visual verification in Arabic RTL. Database authorization and Storage security require separate live testing (`docs/database-test-runbook.md`).

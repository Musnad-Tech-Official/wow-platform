# WOW Design System — UI Foundation (v1)

This is the shared **Customer, Merchant and Admin** design contract. It supplements `docs/ui-workstreams.md`; no developer or person is assigned a screen by this document.

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

## Developer-only gallery

From Customer Expo web, navigate directly to:

```text
http://localhost:8081/design-preview
```

`apps/customer/src/app/design-preview.tsx` exercises all added primitives, theme switching, inputs and list actions. It contains only labeled synthetic values and makes **zero** Clerk or Supabase API requests. The route redirects to `/` outside `__DEV__`. It is intentionally not linked from shared navigation; W09 owns integration routes.

This gallery can also be opened via Expo Go's development route if the project launches on a device.

## Rules for W01–W09 page owners

1. Start with `PageScaffold`, `PageHeader` and `SectionHeader`; do not invent new global shells and nav in each package.
2. Preserve semantic status meaning: **submitted/pending = warning**, **approved = success**, **rejected = danger**, **draft = neutral**. A badge is UI only and does not grant permissions.
3. Use `DataState` for loading, errors and empty results. Protected screen states must distinguish **signed-out** vs **loading** vs **permission denied**.
4. Use `@wow/api` typed hooks, never raw restricted tables or hardcoded private Storage URLs. Public discovery remains available to guests.
5. Compose existing components before proposing new dependencies. Shared UI changes require their own small PR, and no other page package should simultaneously edit `packages/ui` or `packages/theme`.
6. Use `minTouchSize`, Tajawal and responsive max-width guidance across all screens. Always set accessible labels on icon-only actions.
7. Dark theme must be checked manually for every new page; do not hardcode colors where semantic tokens exist.
8. Only explicit user actions trigger mutations, and success messages must wait for a confirmed response. Do not auto-retry ambiguous writes.

## Local validation before merge

Run from repository root:

```powershell
pnpm.cmd --filter @wow/ui exec tsc --noEmit
pnpm.cmd typecheck
pnpm.cmd lint
pnpm.cmd test:query
pnpm.cmd test:integration
pnpm.cmd --filter customer start --clear
```

Open the gallery on Expo Web, toggle light/dark/system, trigger the empty/error/loading states, use inputs and buttons, and verify no unexpected runtime warnings. Also verify gallery is not usable as a production page.

**Known integration dependency:** PR #21 fixes the preexisting Customer web Lucide/SSO/RTL warnings. This design-system branch deliberately does not edit those same files. Land and verify that fix independently; otherwise the old Customer home can still crash even when the component gallery code compiles.

Database write/RLS/Storage production tests remain deferred to the pre-release security gate. That deferral does not excuse shipping real customer data before live verification.

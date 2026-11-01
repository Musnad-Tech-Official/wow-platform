# MUSNAD-WOW — shared visual foundation V0.3 (implementation handoff)

This package adds **approved source-derived brand/mascot assets** to `@wow/assets`, plus shared
presentation tokens and basic icon/motion/responsive primitives. It **does not implement** the
52 final screens, nor does it replace the original approved design packages.

## Constraints

- The primary brand yellow is `#FACC15`; navy text is `#0F172D`; Tajawal stays the Arabic font.
- Customer, Merchant and Admin have distinct light canvases; complex offer cards, merchant KPI
  cards, and admin review tables must retain app-specific composition.
- `PageScaffold app="customer|merchant|admin"` uses viewport width, not platform name, to
  adjust padding. Larger responsive layout patterns must be composed at the feature/shell level.
- `WowIcon` uses Lucide React Native without NativeWind SVG wrapping. `AnimatedHeart` and
  `AnimatedBell` use Reanimated with system reduced-motion support; they do **not** write data.
- All artwork is sourced from approved originals; the 13/6/2 illustration groups remain distinct.
- Expo Router route files stay universally defined; web/native variants belong in features
  unless a route also has a platform-neutral fallback per Expo documentation.
- Avoid hard-coded width for mascots; render via Expo Image with `contentFit="contain"`.
- User uploads/offer media/private documents remain in Supabase Storage, not `@wow/assets`.

## Demo and quality gates

Visit Customer Expo `/design-preview` in `__DEV__` only. Exercise button variants,
Heart/Bell, inputs, statuses and illustrative art. Check light/dark/system and widths
320, 375, 430, 768, 1024, 1280, 1440 and 1920. Review RTL and reduced motion.

Run:
```bash
pnpm install
node scripts/test-design-foundation.cjs
pnpm --filter @wow/ui exec tsc --noEmit
pnpm typecheck
pnpm lint
pnpm test:query
pnpm test:integration
pnpm --filter customer exec expo start --web --clear
```

Do not mark PR #22 ready or merge before these finish locally and the UI gallery is reviewed.
Use a development Clerk project and synthetic data only. Keep `.env` out of Git.

## Boundaries

The gallery is not a production screen; do not expose it via navigation. No new
cart/checkout/delivery features are authorized. W00 database/security gate remains separate.

# MUSNAD-WOW — V0.7 Theme Stabilization and Open-Source Compatibility

## Source and scope

Reviewed GitHub branch `feat/shared-ui-foundation` at commit `fbf3b85db6e54857f9aa1487ed787866abb30efb` and the uploaded V0.6 ZIP plus exported planning conversation. This is an **incremental V0.7 patch**, not a replacement for V0.6. It adds no runtime dependency, no SQL/API changes, and no merge.

## Fixed in this patch

- `AppText` resolves semantic foreground colors from `useWowColors()` instead of attaching an unconditional `text-foreground` class that competes with call-site colors. Explicit `tone`, legacy semantic class overrides, and inline `style.color` remain supported. Nonsemantic color utility overrides remain delegated to NativeWind.
- `AppInput` uses JS-driven color, placeholder, background and border tokens in both light/dark themes, including error appearance.
- `Badge` and `ThemeSwitcher` explicitly choose primary-on-primary and surface foreground tokens, avoiding a second conflicting class.
- Removes unused `View` import from `SegmentedTabs`.
- Adds developer-only theme audit at `/design-preview` and Node contrast tests (WCAG AA 4.5:1 for ordinary text across supported semantic pairs).

## Open-source library evaluation

The project **already uses** Lucide React Native (SVG icons) and React Native Reanimated (purposeful mobile/web animations), which are mature open-source foundations. Existing animations and checkbox contracts remain untouched.

- **gluestack-ui v5:** viable candidate for a controlled experiment in accessible select/dialog/popover primitives with the repo's NativeWind 5 RC and Expo 57. It can alter Metro/Babel/CSS/provider config via CLI and must therefore NOT be auto-initialized in the three apps. Test one component in a disposable branch and verify web, Android/iOS, RTL, focus management, and existing CSS variables before adopting it.
- **Animate UI:** its `@animate-ui/react` package requires React DOM/Motion and browser-oriented primitives. Not appropriate as a cross-platform dependency inside `@wow/ui`. Reproduce relevant motion patterns through Reanimated where they materially improve UX; reserve a web-only adaptation for proven web-only needs.
- **React Native Reusables:** possible alternative only if the component version's NativeWind v5 compatibility and implementation quality pass runtime smoke checks.

No new third-party component is claimed to be integrated or verified by this patch. Replacing native Modal implementations with a library before actual platform tests would introduce unacceptable regression risk. This is a deliberate compatibility gate, not a completed library adoption.

## Required local verification

Run from repo root after applying patch:

```bash
node scripts/test-ui-v05.cjs
node scripts/test-ui-v06.cjs
node scripts/test-ui-v07.cjs
pnpm --filter @wow/ui exec tsc --noEmit
pnpm typecheck
pnpm lint
pnpm test:query
pnpm test:integration
pnpm --filter customer exec expo start --web --clear
```

At `/design-preview`, toggle Light/Dark/System; inspect title/body/muted/on-primary/error text, buttons, badges and TextInput value/placeholder. Repeat on Android/iOS (including modal visibility), desktop web and a narrow phone. Verify target sizes, RTL, screen reader reading and focus, and reduced-motion behavior.

**Known limitation:** Automated contrast checks inspect palette tokens. They do not prove visual rendering, library interop, modal focus traps, or physical device behavior. Do not merge PR #22 solely based on these checks.

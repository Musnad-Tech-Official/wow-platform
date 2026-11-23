# Stage 4B — AUD-039: synchronize and persist theme

## Root cause and solution

Previously `ThemeProvider` updated React Native inline color variables when users chose Light/Dark/System, but NativeWind `dark:` styles and web CSS classes did not follow that selection. The preference was held only in React state; restarting the app restored `system` regardless of the user's previous choice.

The shared provider now delays rendering its subtree until a preference has been restored, so no app screen renders with an incorrect saved theme during hydration. The preference key is `wow.theme.mode.v1`; only `light`, `dark` and `system` are accepted, with invalid/missing values falling back to `system`.

- **iOS / Android:** all three apps inject their existing `expo-secure-store` dependency as an optional native preference store; `Appearance.setColorScheme('light'|'dark'|'unspecified')` follows the saved choice and restores system preference as necessary. This is ordinary device-local appearance data, not authentication information.
- **Web:** use browser `localStorage` for the saved preference, set `document.documentElement.classList.toggle('dark', ...)` and its CSS `colorScheme`, and opt into Tailwind v4's class-driven `dark:` variant in shared CSS. The dark root semantic variables mirror the project's approved tokens. This is distinct from native Appearance as required by NativeWind v5.
- All children share one resolved theme via `VariableContextProvider`; one root `View` receives the resolved `dark`/`light` class. Storage failures do not block the app.

The provider accepts `ThemePreferenceStorage` through a prop so the shared package does not import app-owned native modules or alter the lockfile. No secret is persisted.

## Verified and pending

Source readback verified consistent root layout wiring across Customer/Merchant/Admin and added `scripts/test-stage4-theme-persistence.cjs` to the existing shared source gate. The test covers accepted values, system resolution, provider synchronization and CSS contract. Syntax of the Node test file was checked. The actual Admin Playwright script also now asserts saved dark/light across real reloads and the `system` mode following Chromium OS-theme changes; these browser cases are **not yet executed**.

**NOT YET VERIFIED:** Expo web browser reload with stored dark mode; OS system changes under `system`; iOS/Android real theme reload, NativeWind `dark:` styling consistency, accessibility/contrast screenshots, or `pnpm typecheck`. Complete these at the Stage 4 acceptance gate. A syntactically valid source change is not a completed visual acceptance.

References: `https://www.nativewind.dev/v5/core-concepts/dark-mode`; `https://reactnative.dev/docs/appearance`.

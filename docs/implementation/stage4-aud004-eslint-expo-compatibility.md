# Stage 4 prerequisite — AUD-004 Expo/ESLint compatibility

## What is actually known

The WOW workspace currently pins:

- `expo@58.0.26` in Customer, Merchant and Admin.
- `eslint-config-expo@57.0.2` through root `package.json` and the frozen `pnpm-lock.yaml`.
- `eslint@9.39.5`, TypeScript 6.0.3, Node 22, pnpm 10.21.0.
- Flat ESLint setup `eslint.config.cjs` importing `eslint-config-expo/flat`.

The Expo team has published an `eslint-config-expo@58.0.4` release aligned with SDK 58 (see official Expo repository changelog). **This major-version mismatch is a compatibility risk; it is not evidence that current lint fails.**

## Decision and no-change guard

The frozen backlog explicitly requires `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm typecheck` and a confirmed failure before modifying the dependency. Avoid editing `package.json` without regenerating and verifying the complete lockfile; do not manually fabricate dependency snapshots.

If these tests pass with the current pinned 57 config, document the runtime results and evaluate a separately reviewed, lockfile-regenerated 58 upgrade rather than making an unverified mechanical bump. If lint fails due to the Expo config, upgrade root `eslint-config-expo` using the exact pnpm workspace resolver, rebuild the frozen lockfile and rerun full lint/typecheck on the new SHA. Do not use `--no-frozen-lockfile` in CI as a workaround.

## Verification status

**NOT_RUN** on the current merged Stage 4 SHA. The shared `scripts/verify-local-quality.sh all` gate already runs all the required frozen install/type/lint commands; the user-approved process defers full execution to Stage 4 acceptance. No package or lockfile modification was applied in this review.

Sources: `https://github.com/expo/expo/blob/main/packages/eslint-config-expo/CHANGELOG.md` and `https://docs.expo.dev/guides/using-eslint/`.

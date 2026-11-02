# WOW — Engineering Instructions

These instructions apply to all three Expo applications and shared packages.

## Project contracts

- Expo SDK 57, React Native 0.86, TypeScript, pnpm workspaces; use `pnpm install --frozen-lockfile` from the repository root.
- Follow the approved Customer, Merchant and Admin UI reference and `docs/design-system.md`. Arabic-first RTL, Tajawal, responsive Expo/native/web, accessible semantics and 48pt minimum touch targets. Test light, dark and system modes.
- Prefer existing `@wow/ui`, `@wow/theme`, `@wow/assets`, `@wow/api` and `@wow/auth` contracts. Use Expo-version-compatible packages and current SDK documentation.
- New features may introduce purposeful reusable UI components, without changing approved business behavior. Do not use browser-only DOM component libraries in native-shared code.
- Keep app screens in `src/app`, non-route components/hooks in `src/features` or appropriate packages. Keep shared changes narrowly scoped and tested.

## Backend and data safety

- Clerk session identities, PostgreSQL RLS and server-side RPCs are the authorization boundaries. Never authorize an action merely because an Admin screen is open.
- Anonymous discovery uses the public Supabase client; private requests use authenticated session-aware clients. Never share private query caches across account changes.
- All WOW Storage buckets are private. Use the audited media helpers and short-lived signed URLs where permitted; never publish private evidence.
- Never commit credentials, `.env` files, private data, dumps or service-role keys. Do not run mutations on an unverified database environment; schema changes require reviewed SQL and backup/restore evidence.
- The repository's local simulated tests do **not** verify live RLS, grants, Storage isolation, production backups or deployment readiness. Live database testing belongs to `docs/database-test-runbook.md`.

## Verification

Run from repository root:

```bash
pnpm install --frozen-lockfile
bash scripts/verify-ui-v08.sh
```

Also run relevant browser/native smoke checks, including RTL, keyboard focus, screen-reader labels and dark-theme contrast. Treat tests as evidence only for the behavior they actually exercise.

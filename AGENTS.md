# WOW — Engineering Instructions

These instructions apply to all three Expo applications and shared packages.

## Project contracts

- Expo SDK 58, React Native 0.88, TypeScript, pnpm workspaces; use `pnpm install --frozen-lockfile` from the repository root.
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

## Task-specific skills (Codex and Antigravity)

Skills live in `.agents/skills/` and are shared by both agents. Use only those applicable to the files being changed, not all skills on every task:

- When implementing a new or changed screen or shared UI control, follow `wow-screen-fidelity` before finalizing the interface.
- When changing Clerk/Supabase authorization, query clients, RPCs, SQL, RLS or private media, follow `wow-data-security`.
- Before handing off any code changes, follow `wow-change-verification` and report actual test results and remaining manual checks.

Use strong TypeScript types; handle loading/error/empty and unauthorized states explicitly; keep changes small, simple and compatible with existing APIs. Never claim a test passed without running it. If a skill is not loaded automatically, open the matching `SKILL.md` from the repository. Avoid triggering unrelated skills.


### Established upstream engineering skills (read only when relevant)

The following audited upstream guidance is vendored in `.agents/skills/`; use it **only for matching tasks**, together with the WOW-specific skills above:

- `vercel-react-native-skills` for React Native/Expo rendering, list performance, native APIs and animation optimization; avoid introducing libraries or architectural changes merely because an example recommends them.
- `expo-design-system` for maintaining shared theme tokens and auditing design-system drift; **keep existing `@wow/theme`, `@wow/ui`, Tajawal, NativeWind and approved WOW screens**. Do not generate a second token system.
- `supabase-postgres-best-practices` for SQL migrations, PostgreSQL indexes/functions/grants, RLS and performance review; follow `wow-data-security` and the database test runbook for all actual DB environments.

WOW contracts and user-approved decisions take precedence over generic skill examples. Skills guide engineering decisions; they do not authorize installs, migrations, production writes, redesigns or refactors. Open the relevant `SKILL.md` when discovery misses it. Third-party sources and pinned revisions: `.agents/THIRD_PARTY_NOTICES.md`.

## Verification

Run from repository root:

```bash
pnpm install --frozen-lockfile
bash scripts/verify-ui-v08.sh
```

Also run relevant browser/native smoke checks, including RTL, keyboard focus, screen-reader labels and dark-theme contrast. Treat tests as evidence only for the behavior they actually exercise.

# MUSNAD-WOW — Repository Agent Instructions

> Read this before editing any file. This repository serves **Customer**, **Merchant**, and **Admin** as Expo SDK 57/React Native 0.86.3 apps with TypeScript 6, pnpm, `@wow/ui`, `@wow/theme`, Clerk and Supabase. App-level `AGENTS.md` supplements these repo-wide rules.

## 1. Decisions and scope

- Use the approved Customer/Merchant/Admin designs and `docs/design-approval-and-handoff.md` as the visual contract. Build real pages, not another synthetic gallery.
- **W00–W09** are the approved delivery packages in `docs/ui-workstreams.md` and GitHub Issues #10–#19. Do not silently repartition packages or assign developers. An allocation plan will be approved separately.
- Every new developer ChatGPT conversation starts with that developer's **complete assigned roadmap, ordered tasks, dependencies, file ownership and acceptance criteria**, then gives **only the first executable instruction for the first task**. Later commands follow verified results. Conversation branches do not automatically synchronize; GitHub issues/PRs are the shared record.
- UX improvements or new reusable components are allowed when genuinely needed on multiple pages. A shared-component change needs a coordinated, independently reviewed PR and no silent product-behavior deviation.

## 2. Working safely

- Begin from current `main` on a **new short-lived feature branch**; keep a task scoped to its assigned W## issue. Document tests, changed paths and known limitations in its PR. Never merge into `main` without the project owner's explicit approval. Never force-push protected/shared branches.
- Keep feature routes and state within owned feature directories. Changing `packages/ui`, `packages/theme`, `packages/api`, `packages/auth`, `packages/assets`, `_layout.tsx`, navigation or root CI requires coordinated ownership and a separately scoped reviewed PR.
- User data, business approvals, permissions, subscriptions, Storage and RLS are **server-authorized**. No privileged service-role/secret keys, bypasses or test-only elevated permissions in apps. Never commit `.env*`, tokens, database dumps or private evidence.
- W00 / `docs/database-test-runbook.md` controls real multi-role RLS and storage validation. **Never run writes against an unverified staging environment**. Production migration/role changes need backup, SQL review and explicit approval; this repo's mocked tests never certify live RLS.
- Do not invent migration SQL for missing history. Existing deployment, original migrations 001–010 and read-only `010_verify.sql` must be recovered and reconciled before future schema deployment.

## 3. Technical conventions

- Use `pnpm` from the monorepo root and the committed `pnpm-lock.yaml`. Internal packages use `workspace:*`. Use SDK-compatible Expo tooling and current versioned docs before changing Expo APIs.
- Arabic-first RTL; Tajawal; light/dark/system; semantic tokens; responsive web/native; accessible target min 48pt; labels/focus/error states. The primary yellow must not become illegible yellow-on-white text; use theme semantic foregrounds.
- App pages should compose tested `@wow/ui` primitives and only add feature-specific parts when required. Use the existing Lucide React Native/Reanimated foundations; do not import web-only React DOM UI libraries into native-shared code.
- Public anonymous discovery is intentionally separated from authenticated Clerk-backed private queries. Never reuse one customer's query cache after account changes.

## 4. Required verification before PR review

```bash
pnpm install --frozen-lockfile
node scripts/test-engineering-readiness.cjs
bash scripts/verify-ui-v08.sh
```

The combined verification runs V0.5–V0.8 design tests, TypeScript, ESLint, Query and integration guard tests. CI must pass on the PR; **no CI result means not verified**, not an implicit pass. For changed pages, also load Expo web and the relevant native devices at mobile/tablet/desktop widths and light/dark RTL. Accessibility and live Supabase tests remain separate gates.

Read `docs/engineering-readiness.md` and `docs/developer-handoff-protocol.md` for status and handoff. Do not reclassify blockers as resolved without recorded evidence.

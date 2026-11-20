# WOW Platform

WOW (واو) is an Arabic-first local-offers platform built as a pnpm monorepo with three Expo/React Native applications:

| Application | Workspace | Role |
| --- | --- | --- |
| Customer | `apps/customer` | Browse eligible businesses, offers and saved items |
| Merchant | `apps/merchant` | Business verification, branches, offers, staff and billing |
| Admin | `apps/admin` | Authorized merchant, offer, category and complaint review |

The current scope is local offer discovery, merchant operations, subscriptions and moderation. Shopping cart, online checkout and delivery are **not** part of the current accepted release scope.

## Stack and folders

Expo SDK 58 / React Native 0.88 / React 19 / TypeScript / Expo Router / NativeWind 5 RC / TanStack Query / Clerk / Supabase / pnpm 10.

- `packages/api`: typed Supabase RPCs, Clerk-aware query hooks and Storage helpers.
- `packages/auth`: Clerk provider and session integration.
- `packages/ui`: accessible shared native/web UI components.
- `packages/theme`: design tokens, Tajawal, colors and responsive rules.
- `packages/assets`: approved WOW brand/illustration assets.

## Setup

Requirements: Node.js 22, pnpm 10.21.0, Git, and a supported Expo web or native development environment.

```bash
git clone https://github.com/Musnad-Tech-Official/wow-platform.git
cd wow-platform
pnpm install --frozen-lockfile
pnpm --filter customer start
```

Run other applications with `pnpm --filter merchant start` or `pnpm --filter admin start`. Expo also accepts `pnpm --filter customer web`.

Create an ignored `.env.local` in each app that needs backend access using its `.env.example` as a guide. Use only the Clerk **publishable** key and Supabase **publishable/anon** key in `EXPO_PUBLIC_*`; never place a database password or Supabase service-role key in client configuration. The app configuration may require a development Clerk project and separately authorized Supabase environment.

## Verification

```bash
bash scripts/verify-ui-v08.sh
```

This runs UI regression checks, workspace TypeScript and lint, Query and mocked integration checks. GitHub Actions runs the same gate on Pull Requests. These tests are not substitutes for Android/iOS acceptance, rendered accessibility or live Supabase authorization testing.

## Technical references

- [UI and visual contract](docs/design-system.md)
- [Feature package specifications](docs/ui-workstreams.md)
- [Database and RLS/Storage verification](docs/database-test-runbook.md)
- [Integration-test screens](docs/integration-tests.md)
- [Typed API contracts](docs/api-discovery.md)
- [TanStack Query and session safety](docs/tanstack-query.md)
- [Agent coding conventions](AGENTS.md)

API-specific contracts are in `docs/api-*.md`. Approved illustrations and brand assets are tracked in `packages/assets/asset-manifest.json`.

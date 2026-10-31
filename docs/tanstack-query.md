# Shared TanStack Query setup

Screens use hooks from `@wow/api`. Hooks call React-independent API functions,
which use the official Supabase SDK with the existing Clerk access-token
callback. There is no additional authentication provider or backend abstraction.

## Package structure

```text
packages/api/
  package.json
  tsconfig.json
  src/
    index.ts
    users.ts
    businesses.ts
    branches.ts
    supabase/client.ts
    query/
      WowQueryProvider.tsx
      query-client.ts
      query-keys.ts
      native-focus.ts
      use-wow-supabase-client.ts
      hooks/
        use-current-user.ts
        use-businesses.ts
        use-branches.ts
    integration/
      index.ts
      types.ts
      shared.ts
      merchant.ts
      helpers.ts
```

The existing `main` and `types` entries expose `src/index.ts` to Metro and
TypeScript. The provider, client factory, keys, client hook, feature hooks,
API functions, and resource/input types are exported from that entry point.

## Application boundary and cache lifetime

Customer, Merchant, and Admin each mount:

```text
WowAuthProvider
  AppQueryProvider (reads useAuth from @wow/auth)
    WowQueryProvider
      ThemeProvider
        RTL View
          Expo Router Stack
```

The boundary supplies `isAuthReady`, `userId`, `sessionScopeKey`, and `getClient`.
It derives a scope from `[userId, sessionId]` only after Clerk is loaded and
signed in. `@wow/api` has no Clerk SDK imports. Each application owns an
independent provider/cache; nothing persists the query cache to disk.

`WowQueryProvider` keys its internal session provider by the user and session
scope. The internal provider lazily creates its QueryClient with `useState`.
Ordinary rerenders, navigation, and token callback changes preserve that client.
Sign-out, loss of authentication readiness, account changes, and a new session
for the same account replace the subtree and cache before children render.
The old cache is cleared in a microtask after unmount. StrictMode's immediate
effect replay cancels that cleanup so active query observers stay intact.
Session transitions also remount children;
screen-local state should therefore be treated as session-local.

`useWowSupabaseClient` returns a stable `getClient()` accessor. It lazily creates
and memoizes the existing SDK client for the current scope and public
configuration. Query functions, events, and effects can call the accessor;
render functions should not. This keeps the SDK's eager token request outside
React rendering. A ref supplies the latest token callback. It checks
the captured scope both before and after awaiting a token, so an old client
cannot acquire credentials for a different session. Missing public configuration
returns no client; enabled queries report a configuration error through their
normal query state. Only publishable/legacy anon keys are accepted.

The SDK keeps `accessToken: getToken`, `persistSession: false`,
`autoRefreshToken: false`, and `detectSessionInUrl: false`. Clerk remains
responsible for tokens. Tokens never appear in query keys.

The boundary passes that accessor to the provider and context. React 19.2's
development performance profiler traverses
changed object props; exposing the SDK object directly lets that traversal touch
Supabase's protected `auth` proxy and throw. The accessor avoids that traversal
without altering the SDK or disabling profiling.

SDK database retries are disabled (`db.retry: false`) so a failed read uses
TanStack's single retry rather than multiplying it by the SDK retry policy.

## Defaults and app focus

`createWowQueryClient()` returns a new instance with:

| Option | Value |
| --- | --- |
| Query `staleTime` | 60,000 ms |
| Query `gcTime` | 300,000 ms |
| Query `retry` | 1 |
| Mutation `retry` | false |
| `refetchOnReconnect` | true |
| `refetchOnWindowFocus` | true |

Native providers share one reference-counted AppState listener because
TanStack's focus manager is shared within a runtime. It initializes focus from
the current app state, sets focus when the state becomes `active`, and removes
the listener after the last provider unmounts. Web leaves browser focus handling
untouched. This follows the [TanStack React Native guidance](https://tanstack.com/query/v5/docs/framework/react/react-native).

No network monitoring library or native `onlineManager` integration is added.
Native reconnect detection needs that separate setup later.

## Keys and hooks

| Hook | Key / behavior |
| --- | --- |
| `useCurrentUser()` | `['users', 'current', userId]` |
| `useMyBusinesses()` | `['businesses', 'mine', userId]` |
| `useBusiness(businessId)` | `['businesses', 'detail', businessId, userId]` |
| `useBusinessBranches(businessId)` | `['branches', 'business', businessId, userId]` |
| `useCreateBusiness()` | Calls `wow_create_business`; invalidates the user's list and returned business detail |
| `useCreateBranch()` | Calls `wow_create_branch`; invalidates only that business's branches for the user |

All keys come from `wowQueryKeys`. Reads are disabled without a ready session;
business-specific reads additionally require a business ID. Query AbortSignals
reach the SDK, allowing removed session reads to be cancelled. Mutations reject
without an authenticated context and never retry automatically. A write already
sent to the server cannot be assumed cancelled by sign-out.

Current-user reads select `id,account_status` from `public.users` by Clerk user
ID using `maybeSingle()`. An absent webhook-created profile is a successful
`null`, remains stale, and can recover on refocus, reconnect, or explicit
`refetch()`. There is no continuous webhook polling.

Business details currently contain no branch aggregates, so creating a branch
does not invalidate business details. API functions perform SELECTs and secure
RPCs; feature mutations never directly insert protected business/branch rows.

The deployed branch RPC signature and database-generated types are absent from
this checkout. `CreateBranchInput.parameters` accepts additional named `p_*`
arguments. `businessId` and `name` always supply `p_business_id` and `p_name`
and cannot be overridden by that map. Both creation RPCs must return a scalar
UUID. Required extra branch parameters must match the deployed RPC.

## Screen usage

```tsx
import {
  useCurrentUser,
  useMyBusinesses,
  useCreateBusiness,
  useBusinessBranches,
  useCreateBranch,
} from '@wow/api';

// Inside a component under the existing application provider:
const profile = useCurrentUser();
const businesses = useMyBusinesses();
const createBusiness = useCreateBusiness();
const branches = useBusinessBranches(selectedBusinessId);
const createBranch = useCreateBranch();

// From an explicit submit action:
await createBusiness.mutateAsync({ name: 'My business', description: null });
await createBranch.mutateAsync({ businessId: selectedBusinessId, name: 'Main' });
```

These return standard TanStack Query results (`data`, `error`, `isPending`,
`isFetching`, `refetch`, and mutation methods). A disabled query is pending but
not fetching; gate signed-out UI using existing authentication state.

## Verification

```sh
pnpm typecheck
pnpm lint
pnpm test:query
pnpm test:integration
```

The query suite compiles the actual package and uses real React, TanStack Query,
and Supabase SDK instances with local HTTP doubles and a substituted AppState.
It checks exports, dependency identity, independent/stable caches, session
replacement, StrictMode, query gating, profile absence, token callback refresh,
RPC bodies, targeted invalidation, no mutation retries, cancellation, and focus
listener cleanup. These tests do not contact Clerk or Supabase Cloud.

Use the existing [integration screens](integration-tests.md) for live webhook,
RPC, authentication, and RLS verification with configured test accounts. No
database tables, policies, webhook handlers, secret keys, custom backend,
production screens, persistence, or hosted CI are added by this setup.

## Implementation changes

Most of the requested structure, functions, hooks, keys, defaults, native focus
handling, and layout integration already existed and were retained.

New file:

- `docs/tanstack-query.md`: structure, setup, usage, behavior, and verification report.

Modified files:

- `packages/api/src/query/WowQueryProvider.tsx`: inject the SDK accessor and make
  cache disposal safe across StrictMode effect replay.
- `packages/api/src/query/use-wow-supabase-client.ts`: return a stable accessor,
  create the SDK client outside render, preserve refreshed token callbacks, and
  reject access from a previous session.
- `packages/api/src/supabase/client.ts`: disable SDK database retries so TanStack
  owns the query retry count; preserve Third-Party Auth configuration.
- `apps/customer/src/app/_layout.tsx`, `apps/merchant/src/app/_layout.tsx`, and
  `apps/admin/src/app/_layout.tsx`: supply the accessor to the shared provider.
- `apps/customer/nativewind-env.d.ts`, `apps/merchant/nativewind-env.d.ts`, and
  `apps/admin/nativewind-env.d.ts`: declare CSS imports required by TypeScript 6
  to check the existing layout imports.
- `scripts/test-query.cjs`: support Windows junctions; let Node exit without
  waiting for five-minute cache GC timers; extend real SDK/provider regressions.

No package manifests, lockfile entries, Metro configuration, authentication
provider, navigation structure, fonts, splash behavior, RTL setup, database
definitions, or existing integration screens were changed.

## Local validation results (2026-10-31)

| Check | Result |
| --- | --- |
| Root `typecheck` | Passed: Expo route declarations/guards, API, Customer, Merchant, Admin |
| Standalone `@wow/ui` typecheck | Passed |
| Shared auth/theme types | Checked through the app/UI TypeScript import graphs; no standalone configs exist |
| Workspace ESLint (`apps packages`) | Passed, no errors or warnings |
| Query regressions | 15 passed |
| Existing integration regressions | 19 passed; local guards/diagnostics only |
| API entry point and hook exports | Passed through compiled package and app TypeScript checks |
| Workspace dependency identity | All apps resolve the same React 19.2.3 as API/React Query; all API imports resolve React Query 5.105.0 |
| Loaded Metro configs | All three include shared workspace folders and normal hierarchical resolution |
| Android JavaScript exports | Passed for Customer (4,138 modules), Merchant (4,137), and Admin (4,137); bytecode and minification disabled for this resolution check |
| Static web export | All three Metro server bundles compiled; HTML export stopped at the existing missing Clerk publishable-key check |
| Git whitespace check | Passed |

The checkout initially had no `node_modules` and no pnpm executable on PATH.
Dependencies were restored using cached pnpm 10.30.3 and `install
--frozen-lockfile --ignore-scripts`; the incomplete offline store required
fetching existing locked packages. No dependency was added or upgraded, and
TanStack Query was not installed separately in any application.

Android resolution was checked in each app with `expo export --platform android
--no-bytecode --no-minify --output-dir dist/query-verify-android --max-workers 1`.
These exports used offline mode and did not execute an authenticated session or
compile a native binary. Generated output stays in each app's ignored `dist/`.

Live Clerk/Supabase authentication, webhook delivery, deployed RPC signatures,
RLS, device lifecycle events, browser interaction, and native binary builds
were not tested. The AppState tests substitute native events locally. Public
environment configuration and real test accounts are needed for live checks.

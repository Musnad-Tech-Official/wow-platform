# Development integration tests

Customer, merchant, and admin each expose `/integration-test` through their
development home screen. The navigator, route component, and shared screen all
guard access with `__DEV__`.

## Setup

Install dependencies with `pnpm install`. Configure these public variables in
the `.env` file of each app you want to run:

```dotenv
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_clerk_publishable_key
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_KEY=sb_publishable_your_supabase_public_key
```

A legacy Supabase `anon` JWT also works. Secret keys and `service_role` JWTs are
rejected by the test screen. Configure the deployed Supabase project to accept
the Clerk session JWT, and enable the Google or Facebook sign-in flow in Clerk.

Start an app, for example `pnpm --filter merchant start`, and open its integration
screen. The screen uses the actual configured backend; opening it does not run
tests or create records.

## Shared tests

| Test | Checks |
| --- | --- |
| A — Clerk session | Clerk is loaded, signed in, and returns a token. |
| B — Supabase authentication | `wow_test_auth` confirms the current Clerk ID and authenticated database/JWT roles. |
| C — Read current user | `users` returns exactly the current profile's `id` and `account_status`. |
| D — Cross-user RLS | A known existing second profile is invisible to this account. |
| E — Client write protection | Updating the current profile to its existing status is denied or filtered. |
| F — Anonymous access | A separate client without a Clerk token is denied or returns zero user rows. |

For D, first verify the second profile with its own real session on this screen,
or confirm its existence through trusted database inspection. An invented user
ID cannot demonstrate isolation. A missing own profile is skipped because
webhook synchronization or SELECT policies may explain its absence.

The deployed `wow_test_auth` RPC must return an object (or one-row array) with
`authenticated: true`, `clerk_user_id` matching the current account, and both
`database_role` and `jwt_role` equal to `authenticated`. SQL definitions are not
included in this checkout.

## Merchant workflow

1. As the owner, run Merchant A to create one identifiable draft business, then
   Merchant B to verify ownership and active owner membership.
2. Run Merchant C and D to create two draft branches. The first must remain the
   sole primary branch.
3. Sign out using the screen's controls and sign in as a different real account.
   Run Merchant E to check business isolation, then Merchant F to attempt branch
   creation as the non-owner.
4. Sign back in as the owner and rerun Merchant F. A denial alone leaves this
   check skipped; the owner must also confirm no branch with that attempt's
   unique name exists.
5. Merchant G independently checks whether direct business insertion is denied.

The workflow calls the deployed `wow_create_business` and `wow_create_branch`
RPCs, which must return scalar UUIDs. The Migration 002 branch RPC requires
`p_business_id`, `p_name`, `p_city`, and `p_address_line`; the optional
fields are `p_district`, `p_latitude`, and `p_longitude`.
The development integration screen supplies `p_business_id` and `p_name`
automatically and accepts the remaining named `p_*` arguments as a JSON object.
For example: `{ "p_city": "Taiz", "p_address_line": "Market Street 1" }`.
The screen is a diagnostics UI, not the app's production branch-create form.

Every state-changing test requires its own confirmation. `Run All Safe Tests`
only runs read-only checks. Created UUIDs and ownership evidence stay in memory
across account switches and `Clear Results`; captured fixtures are reused.
Leaving the screen or reloading loses that evidence, so copy fixture IDs first
and review existing records before starting another run. Cleanup must use a
trusted administrative process; the screen does not delete records.

Transport failures can leave a write committed without a response. Such
outcomes appear in `unresolvedWrites` and block another creation attempt while
this screen remains mounted. Direct inserts also retain `directAttemptId`, and
unauthorized branch attempts retain their unique name, for backend inspection.
A successful unauthorized or direct write is a failure and blocks further
attempts. Structured SQL/PostgREST rejections retain diagnostics and permit deliberate
reruns.

## Results and local verification

Each result records its account, duration, and redacted error details. Results
from a previous account remain labeled with that account. Tokens, keys, emails,
and failing-row contents are redacted. No test result is implied before execution.

The admin app runs ordinary session, own-profile, and RLS checks. Listing all
users, merchant approval, status changes, and privileged cleanup are explicitly
skipped until an admin authorization backend exists.

```bash
pnpm lint
pnpm typecheck
pnpm test:integration
```

Type checking regenerates Expo route declarations for all three apps and checks
the integration routes and production guards. The local regression suite checks
guards, diagnostics, redaction, and write-retry behavior without connecting to
Supabase. These checks do not establish live Clerk, webhook, RPC, or RLS behavior;
run the screen with real test accounts to verify those integrations.

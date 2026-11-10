# Merchant batch 01 — authentication and integration verification

Target: existing PR #49, MER-02-04 / MER-02-05 / MER-03 / MER-04. Do not expand into unrelated app architecture.

## PR quality gate (safe, deterministic)

`bash scripts/verify-ui-v08.sh` runs the existing merchant batch and source suites plus `node --experimental-strip-types scripts/test-merchant-access-boundary.cjs`. The new test executes the actual pure TypeScript access rule under Node 22 and checks that `/`, `/offers`, review and status routes use its authentication gate. It requires no cloud credentials or writes.

The merchant entrypoint gate allows content for a loaded authenticated session, renders loading while Clerk initializes, and denies guests. The existing `preview=1` fixtures are allowed only in development. RLS remains the mandatory server-side boundary. No attempt is made to infer an admin or merchant role from a user's email or metadata.

## Real browser guest smoke (optional, no writes)

Run the merchant Expo web app with normal **public** development environment variables and Playwright Chromium installed. Then use:

```sh
WOW_MERCHANT_WEB_URL=http://127.0.0.1:8081 node scripts/test-merchant-guest-playwright.cjs
```

The suite visits `/`, `/offers`, `/business/onboarding/review` and `/business/onboarding/status` without preview fixtures, checks for the signed-out warning, and rejects unexpected write attempts. It does not authenticate and **must not be described as signed-in E2E**. A remote guest URL requires an explicit opt-in (`WOW_ALLOW_REMOTE_GUEST_TEST=1`).

## Cloud Clerk -> Supabase RLS HTTP (separate, manually approved job)

The manually invoked `.github/workflows/merchant-live-e2e.yml` reads an existing development fixture only. Configure the protected `wow-merchant-e2e` GitHub Environment with:

- Variables: `WOW_E2E_SUPABASE_URL`, `WOW_E2E_SUPABASE_PUBLISHABLE_KEY`.
- Short-lived secrets: `WOW_E2E_OWNER_JWT`, `WOW_E2E_NONOWNER_JWT`, `WOW_E2E_ADMIN_CANDIDATE_JWT`.
- Inputs: existing development `owner_business_id` and `owner_branch_id`, prepared through an authorized session. The owner must be able to read them. The second account must not.

Do not use a `service_role` key, fake user identity, or copy these JWTs into the repository. Tokens expire quickly, so configure/reissue just before explicitly triggering the job. The job fails early if a credential or fixture is missing; it must never print token values. Its tests verify authenticated own-profile reads and cross-account denies for profile/business/branch, and that the nominal admin candidate has no admin membership. **These are read-only HTTP/RLS tests, not browser E2E or mutation tests.**

Creating/updating/deleting real merchant records, document uploads, final qualification submissions, and browser login through Clerk are NOT established by this batch of tests. They require an approved disposable test fixture, permitted write operations and an actual authenticated browser session. Do not represent these as passed if they have not run.

## Security and cleanup

No fixture is created by either new suite. Do not commit storage state, session tokens, Clerk secret keys or any test user credentials. Keep PR #49 open and do not run Git commits, pushes or remote migrations without separate authorization. Logs should report outcomes, never credentials or protected rows.

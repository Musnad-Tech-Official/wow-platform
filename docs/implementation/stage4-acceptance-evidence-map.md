# WOW — Stage 4 acceptance and outstanding evidence

**State:** IMPLEMENTATION IN PROGRESS / ACCEPTANCE NOT RUN. Never represent merged source patches, transaction-scoped SQL cases or GitHub's runner-admission failures as a full Stage 4 pass. This contract consolidates the frozen Stage 3 backlog; it does not close previously unverified criteria.

## 1. Foundation and automated gates (4-PREREQ)

**AUD-001 — Blocked, not passed.** Private GitHub-hosted runner assignment still fails with `runner_id=0` before any steps. Verified again on the post-PR-83 `main` run `45096827257` (2026-11-23): main verification failed before a Runner was allocated; all dependent jobs, including the new Customer web test, were skipped. See [issue #64](https://github.com/Musnad-Tech-Official/wow-platform/issues/64). Use local QA until the external allocation issue is resolved.

**AUD-002 — Source gate updated; runtime not run.** Shared static gate now covers the available Customer regressions. `scripts/verify-local-quality.sh web/all` and CI include a **real Customer Expo Web export**, development and production, with Chromium deep-link/onboarding/asset-404 checks. Merchant and Admin browser suites, native bundles and source gates remain. Some real Clerk/Storage/role tests intentionally require separate trusted fixtures; do not silently treat absence as PASS.

**AUD-004 — Compatibility unresolved.** The apps use Expo 58 while root uses eslint-config-expo 57.0.2. This is a version mismatch, not proof of a runtime failure. Run a frozen install and actual lint/typecheck on the same SHA. See `docs/implementation/stage4-aud004-eslint-expo-compatibility.md`. No lockfile-only or untested dependency bump allowed.

## 2. Database, RLS and authorization (4A and 4C)

The audited RLS and business-category/trial patches have been applied to the original WOW **development** Supabase and tracked by exact migration version. Successful transactional PostgreSQL tests are documented in the respective `docs/sql/` fixtures and `docs/implementation/` records.

- **AUD-015, AUD-021, AUD-022:** per-branch media/draft ownership and save-scope SQL protection updated. Still require real authenticated Clerk JWT + private Storage GET/LIST/signed URL negative matrix, cross-employee branch tests, and concurrent save testing.
- **AUD-043, AUD-016:** Admin evidence-viewer projection and Merchant owner-only direct business SELECT deployed. Still require actual PostgREST requests with staff/reviewer/viewer identity tokens and no private field leakage.
- **AUD-017, AUD-018:** approved-business category assignment checks applied; slug/sort-order constraints confirmed present. UI invalid-input behavior and boundary HTTP response remain to be tested.
- **AUD-019:** complaint waiting state requires a proprietor request. End-to-end Admin waiting → Merchant response still unverified.
- **AUD-034:** public discovery rechecks active category, active parent and business assignment. 8/8 real PostgreSQL transaction cases passed before and after deployment. Browser/guest REST request remains unverified.
- **AUD-038:** trial activation requires an eligible offer, an unpaused approved business/branch and valid category assignment, without circularly requiring its own entitlement. 10/10 real PostgreSQL transaction cases passed before and after deployment; no permanent test rows. Real owner JWT and browser flow remain unverified.

**Never replay already applied migrations** merely to make the status green. Revalidate by reading the database migration history and role-specific requests.

## 3. UI, navigation, OAuth and responsive behavior (4B)

Source changes have been reviewed/merged for **AUD-008, AUD-011, AUD-039, AUD-046, AUD-047, AUD-048, AUD-052, AUD-054, AUD-056, AUD-061 and AUD-062**. Required end-to-end evidence includes:

- Customer sign-up/sign-in cancellation/recovery → guest → discovery, refresh/back, private-tab safeguards, real return URL intent, and Query caches after switching Clerk sessions (AUD-008/046).
- Admin role lookup 500/timeout vs 403 denial; repeated same-screen navigation; fake preview parameter denied in production; no raw OAuth errors in Merchant/Admin (AUD-011/047/056).
- Merchant two authorized businesses, unauthorized or missing `businessId`, route/URL/picker consistency, session switching, back/refresh; desktop widths 390/600/1024/1440/1920 (AUD-048/061/062).
- All three real Expo Web exports, unknown-ID deep links, browser reload and production-style SPA history rewrite returning HTTP 200 for app routes but 404 for missing assets. Production hosting provider is **not yet selected**, so deployed HTTP acceptance is still open (AUD-052).
- Google/Facebook callback popup completion and cancellation, native deep links and signed-in sessions in Clerk Development; role authorization remains server-side (AUD-054/056). Three native return URLs have been inspected in Clerk but **real callback sessions are not yet tested**.
- Browser/Android/iOS Light/Dark/System persistence, CSS/NativeWind dark utility consistency, screenshots, text contrast and accessibility (AUD-039/062). Admin browser test now includes persistence over reload and simulated OS appearance changes.

**AUD-059 / Product decision D-02 remains OPEN:** WOW Development Clerk has Google/Facebook OAuth **and** password/email-code methods enabled, with pre-existing accounts relying on those methods. The Customer recovery description was corrected; **no account or Clerk setting was changed**. Do not disable methods without an approved recovery/migration policy and live authentication acceptance.

## 4. End-of-stage acceptance procedure (approved testing cadence)

Do not request repeated full test runs after every development commit. At the **end of Stage 4**, on a clean clone of the exact current `main`:

1. Use Node.js 22 and pnpm 10.21.0. Confirm `node -v` and `pnpm -v`.
2. `git pull --ff-only origin main`
3. `bash scripts/verify-local-quality.sh all`
4. Retain the SHA, exit status, timestamped private report under `~/wow-qa-reports/`, and the browser visual screenshots. A code change after the run invalidates that report.
5. Separately collect real Clerk/Supabase signed-JWT, private Storage/RLS, production-style deep link, authenticated flows, Android/iOS devices, RTL/keyboard/screen reader evidence. A result not executed is `NOT_RUN`, never `PASS`.
6. Resolve any failures at their actual root cause, rerun on the new SHA, and record a **GO/NO-GO** for this stage only when all mandatory evidence and D-02 decision are satisfied.

**Current disposition: NO-GO for Stage 4 acceptance (not a halt to source development).** We have intentionally not run the comprehensive workspace/Expo/Playwright/native test suite on the current revision. Do not label a merged PR or a passed transactional SQL role test as functional release approval.

Stage 5 and later stages have their own frozen backlog gates and must not be declared complete as a side effect of Stage 4 source changes.

# WOW — Stage 4 acceptance and outstanding evidence

**State:** SOURCE AND PUBLIC CI VERIFIED / COMPREHENSIVE ACCEPTANCE DEFERRED TO STAGE 6 BY OWNER. See [updated gate and transfer register](stage4-stage6-acceptance-transfer-20261124.md) for the binding schedule, all 25 AUD items, and unresolved implementation/security exceptions. Never represent merged source patches, transaction-scoped SQL cases or GitHub's runner-admission failures as a full Stage 4 pass. This contract consolidates the frozen Stage 3 backlog; it does not close previously unverified criteria.

## 1. Foundation and automated gates (4-PREREQ)

**AUD-001 — Runner admission resolved.** Repository is public; hosted runners executed successfully. See [issue #64](https://github.com/Musnad-Tech-Official/wow-platform/issues/64). If visibility returns to private, recheck runner eligibility.

**AUD-002 — Public CI runtime verified; live identity tests remain open.** Shared static gate now covers the available Customer regressions. `scripts/verify-local-quality.sh web/all` and CI include a **real Customer Expo Web export**, development and production, with Chromium deep-link/onboarding/asset-404 checks. Merchant and Admin browser suites, native bundles and source gates passed on main `36befc0` ([run 45450157212](https://github.com/Musnad-Tech-Official/wow-platform/actions/runs/45450157212)) and the PR #94 merge candidate ([run 45450406321](https://github.com/Musnad-Tech-Official/wow-platform/actions/runs/45450406321)). This does not prove physical device or real OAuth acceptance. Some real Clerk/Storage/role tests intentionally require separate trusted fixtures; do not silently treat absence as PASS.

**AUD-004 — Required frozen install/lint/typecheck checks passed.** The Expo 58 / eslint-config-expo 57.0.2 version mismatch remains a tracked compatibility risk; no dependency upgrade without reviewed resolver and lockfile verification. See `docs/implementation/stage4-aud004-eslint-expo-compatibility.md`. No lockfile-only or untested dependency bump allowed.

## 2. Database, RLS and authorization (4A and 4C)

The audited RLS and business-category/trial patches have been applied to the original WOW **development** Supabase and tracked by exact migration version. Successful transactional PostgreSQL tests are documented in the respective `docs/sql/` fixtures and `docs/implementation/` records.

- **AUD-015, AUD-021, AUD-022:** per-branch media/draft ownership and save-scope SQL protection updated. Still require real authenticated Clerk JWT + private Storage GET/LIST/signed URL negative matrix, cross-employee branch tests, and concurrent save testing.
- **AUD-043, AUD-016:** Admin evidence-viewer projection and Merchant owner-only direct business SELECT deployed. Still require actual PostgREST requests with staff/reviewer/viewer identity tokens and no private field leakage.
- **AUD-017, AUD-018:** approved-business category assignment checks applied; slug/sort-order constraints confirmed present. UI invalid-input behavior and boundary HTTP response remain to be tested.
- **AUD-019:** complaint waiting state requires a proprietor request. End-to-end Admin waiting → Merchant response still unverified.
- **AUD-034:** public discovery rechecks active category, active parent and business assignment. 8/8 real PostgreSQL transaction cases passed before and after deployment. Browser/guest REST request remains unverified.
- **AUD-038:** trial activation requires an eligible offer, an unpaused approved business/branch and valid category assignment, without circularly requiring its own entitlement. 10/10 real PostgreSQL transaction cases passed before and after deployment; no permanent test rows. Real owner JWT and browser flow remain unverified.

### 2026-11-24 live Development SQL regression

Six earlier transaction-scoped suites passed: AUD-016 (8), AUD-017 (8), AUD-019 (6), AUD-034 (8), AUD-038 (10), AUD-043 (16), total **56/56**. AUD-018 was subsequently verified with 10/10 transactional boundary cases, for a total of **66/66** across seven suites. AUD-019 and AUD-043 used randomized synthetic owners and businesses rather than an existing business; the same fixture isolation is now in the repository. Every suite ended with ROLLBACK; follow-up count of matching synthetic test users was zero. These tests exercise SQL behavior with simulated claims, not signed Clerk JWTs or Storage HTTP.

**Never replay already applied migrations** merely to make the status green. Revalidate by reading the database migration history and role-specific requests.

## 3. UI, navigation, OAuth and responsive behavior (4B)

Source changes have been reviewed/merged for **AUD-008, AUD-011, AUD-039, AUD-046, AUD-047, AUD-048, AUD-052, AUD-054, AUD-056, AUD-061 and AUD-062**. Required end-to-end evidence includes:

- Customer sign-up/sign-in cancellation/recovery → guest → discovery, refresh/back, private-tab safeguards, real return URL intent, and Query caches after switching Clerk sessions (AUD-008/046).
- Admin role lookup 500/timeout vs 403 denial; repeated same-screen navigation; fake preview parameter denied in production; no raw OAuth errors in Merchant/Admin (AUD-011/047/056).
- Merchant two authorized businesses, unauthorized or missing `businessId`, route/URL/picker consistency, session switching, back/refresh; desktop widths 390/600/1024/1440/1920 (AUD-048/061/062).
- All three real Expo Web exports, unknown-ID deep links, browser reload and production-style SPA history rewrite returning HTTP 200 for app routes but 404 for missing assets. Production hosting provider is **not yet selected**, so deployed HTTP acceptance is still open (AUD-052).
- Google/Facebook callback popup completion and cancellation, native deep links and signed-in sessions in Clerk Development; role authorization remains server-side (AUD-054/056). Three native return URLs have been inspected in Clerk but **real callback sessions are not yet tested**.
- Browser/Android/iOS Light/Dark/System persistence, CSS/NativeWind dark utility consistency, screenshots, text contrast and accessibility (AUD-039/062). Admin browser test now includes persistence over reload and simulated OS appearance changes.

**AUD-059 implementation remains OPEN; D-02 product policy is approved:** WOW Development Clerk has Google/Facebook OAuth **and** password/email-code methods enabled, with pre-existing accounts relying on those methods. The Customer recovery description was corrected. PR #94 removed hardcoded live QA sign-in configuration from current source and isolated the manual live-auth workflow. Clerk settings are unchanged. Historical exposure remediation and replacement isolated fixtures remain required; do not use historical fixtures. Do not disable methods without a verified recovery/migration path and live authentication acceptance. Coordinate the cutover with Stage 6, as recorded in the updated transfer register.

## 4. End-of-stage acceptance procedure (approved testing cadence)

Per the current owner-approved direct workflow, use GitHub Actions for implementation and test/fix cycles; retain exact SHA evidence and rerun the affected gates after fixes. The local quality script remains an equivalent diagnostic option, not the primary execution route. At acceptance:

1. Use Node.js 22 and pnpm 10.21.0. Confirm `node -v` and `pnpm -v`.
2. `git pull --ff-only origin main`
3. `bash scripts/verify-local-quality.sh all`
4. Retain the SHA, exit status, timestamped private report under `~/wow-qa-reports/`, and the browser visual screenshots. A code change after the run invalidates that report.
5. Stage 6 collects the remaining real Clerk/Supabase signed-JWT, private Storage/RLS, production-like deep link, authenticated flows, device, RTL/keyboard/screen reader evidence. Actual release hosting belongs to Stage 7. A result not executed is `NOT_RUN`, never `PASS`.
6. Resolve failures at their actual root cause. Apply the revised Stage 4 implementation gate separately from Stage 6 acceptance, retaining all deferred criteria and current security exceptions.

**Current disposition: public CI and tested SQL gates PASS; Stage 4 implementation/security exceptions tracked; Stage 6 comprehensive acceptance NOT_RUN.** The latest merged baseline 17c3257 passed run 45453598835. Live identity, Storage HTTP, actual hosting and device acceptance remain incomplete under the revised schedule. Do not label a merged PR or a passed transactional SQL role test as functional release approval.

Stage 5 and later stages have their own frozen backlog gates and must not be declared complete as a side effect of Stage 4 source changes.

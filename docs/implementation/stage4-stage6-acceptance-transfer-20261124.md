# Stage 4 implementation gate / Stage 6 deferred acceptance register

Date: 2026-11-24. Owner approved rescheduling the remaining comprehensive E2E, signed identity, Storage and security integration tests to Stage 6. This is a timing change, not a waiver or an assertion of PASS. Continue direct implementation and CI in GitHub; do not expand the permanent E2E infrastructure now. Original frozen AUD identifiers and acceptance criteria remain authoritative.

## Verified baseline

Main `17c3257210d1a11446024b2a4534d63b47fe2ecd`, [CI run 45453598835](https://github.com/Musnad-Tech-Official/wow-platform/actions/runs/45453598835): public CI passed; live authenticated job skipped. Six Android/iOS JS exports are not signed native builds or physical device tests. Seven Stage 4 database migrations are recorded. Seven SQL suites rerun in rollback transactions: 016=8, 017=8, 018=10, 019=6, 034=8, 038=10, 043=16 (66/66). Zero residual synthetic users/categories checked. Prior offer-scope suite recorded 21 SQL assertions; not newly rerun here.

## Stage 4 inventory and outstanding evidence

| AUD | Implementation / evidence | Remaining acceptance |
|---|---|---|
| 001 | Runner admission resolved, issue #64 closed | Recheck if visibility changes |
| 002 | Public CI gates executed successfully | Stage 6 real identity and security coverage; no silent skips |
| 004 | Frozen install, lint, typecheck passed; dependency version mismatch tracked | No mechanical dependency bump |
| 008 | Separate query keys implemented; query gate passed | Stage 6 account-switch/cache isolation |
| 011 | Admin role lookup error handling implemented | Stage 6 actual role/timeout/403 flows |
| 015 | Branch-scoped media migration applied; prior SQL evidence | Stage 6 signed Storage GET/LIST/sign, role matrix |
| 016 | Owner-only raw SELECT and redacted projection, 8 SQL cases | Stage 6 real JWT and HTTP projection |
| 017 | Category assignment guards, 8 SQL cases | Stage 6 UI/HTTP boundary behavior |
| 018 | Existing constraints verified, 10 SQL cases; no migration | Stage 6 UI/HTTP error presentation |
| 019 | Waiting/request/response rule, 6 SQL cases | Stage 6 end-to-end complaint flow |
| 021 | Branch-scoped offer evidence migration; prior SQL evidence | Stage 6 signed identity evidence read/write |
| 022 | Creator/branch draft save guard; prior SQL evidence | Stage 6 concurrent and signed API save/rollback |
| 034 | Discovery category rechecks, 8 SQL cases | Stage 6 guest REST/browser flow |
| 038 | Trial eligibility checks, 10 SQL cases | Stage 6 signed owner/browser flow |
| 039 | Theme persistence and NativeWind selector corrected; web and native JS build gates | Stage 6 actual device/visual theme regression |
| 043 | Evidence viewer redaction and conflict guard, 16 SQL cases | Stage 6 signed reviewer/viewer/conflict HTTP and Storage |
| 046 | Recovery guest transition source and browser gate | Stage 6 real auth cancel/return/logout regression |
| 047 | Current-route history guard implemented | Stage 6 authenticated navigation history |
| 048 | Business URL/session context implemented | Stage 6 two-business and session-switch flow |
| 052 | SPA output and browser routing gates | Stage 6 production-like deep-link test; Stage 7 actual chosen hosting |
| 054 | OAuth callback completion and native redirect registrations | Stage 6 Google/Facebook real flows; Stage 7 production domains |
| 056 | Sanitized OAuth error handling implemented | Stage 6 real provider/network error paths |
| 059 | Product policy D-02 approved: Google/Facebook launch sign-in; safe source recovery copy. Live Development provider settings not aligned yet | See explicit cutover dependency below; NOT closed |
| 061 | Merchant wide-layout foundation and browser suite | Stage 6 full screen/device coverage |
| 062 | Shared 600/1024/1440 breakpoints implemented | Stage 6 remaining exact boundary/RTL/dark/device cases |

## Binding constraints

- Stage 4 implementation and critical security remediation still apply. Do not declare full Stage 4 acceptance or production GO. Remaining comprehensive tests are explicitly assigned to Stage 6; never count them as PASS.
- AUD-059: D-02 is approved, not a pending product choice. Keep development email/password methods until a verified existing-account transition is available. Actual provider cutover must be coordinated with Stage 6 safe linking/recovery and signed-session regression; retain a rollback and preserve Clerk subject IDs. Stage 7 production config remains separate. This timing dependency is an implementation exception needed to avoid locking out users, not a change to the Google/Facebook product policy. Do not disable methods simply to clear a gate.
- Known historical credential exposure is NOT a deferred E2E test. Three historical QA profiles were suspended in Supabase, scoped SQL access checks passed, and hardcoded sign-in fixtures were removed from current source. Clerk identities/sessions are not yet revoked and historical exposure review is incomplete. The connector has no supported ban/revoke or secret-write action; complete the provider-side containment via authorized administration. Do not reactivate old fixtures or grant privileged access to replacements before protected setup.
- Stage 6 must provide an isolated test-data and secret lifecycle, real Clerk and Google/Facebook flows, cross-role API and Storage tests, and durable evidence of outcomes/cleanup. Protected CI setup is not yet provisioned. Stage 7 addresses release environment, actual hosting, signed builds and release operations; Stage 8 requires final approval.
- No deployment to production authorized.

## Gate disposition

Public CI and recorded SQL foundation evidence pass within their tested scope. Stage 4 closure requires checking outstanding critical implementation/security work; deferred tests are not a reason to rebuild the E2E system now. The Stage 5 development handoff is separate from Stage 6 acceptance and must not be described as full product readiness.

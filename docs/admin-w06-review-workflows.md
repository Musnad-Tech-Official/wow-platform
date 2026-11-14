# WOW Admin Batch 02 — W06 Review Workflows

**Branch:** `feat/admin-batch-02-w06-review-workflows`
**Base:** `cab711be9a202f8bab379a7382f5f1734bbd7b13`
**Visual direction:** Approved Admin 17-screen gallery from the owner-provided MUSNAD_WOW documentation (ADM-03, ADM-04, ADM-10), Arabic RTL / Tajawal / official WOW shell.
**Stage:** Functional implementation on review branch. Not approved for merge.

## Implemented screens and live API contracts

| UI | Route | Server-backed contract |
| --- | --- | --- |
| ADM-03 Merchant/branch verification queue | `/verifications` | `wow_admin_list_business_verifications` (status, pagination) |
| ADM-04 Verification review workspace | `/verification/[id]` | `wow_admin_get_business_verification`; `wow_admin_decide_business_verification` |
| Approved merchant/branch profile change queue | `/profile-revisions` | `wow_admin_list_profile_revisions`; `wow_admin_decide_profile_revision` |
| ADM-10 Subscription/payment review | `/payments` | `wow_admin_list_subscription_payments`; `wow_admin_decide_subscription_payment` |

The list APIs were verified to exist in the connected `wow-platform` Supabase project's catalog, using read-only SQL. These UI pages **never** fall back to fabricated production records, do not call restricted tables directly, and do not expose raw private evidence Storage keys as public URLs.

**Important coverage boundary:** ADM-03's complete merchant activity registry, ownership/representative-transfer review, and verified logo/cover review are *not* supplied by the current contracts. The interface must not pretend these workflows are complete. Likewise ADM-10 covers subscription payment review, not all commercial agreements and exemptions (ADM-11).

## Authorization boundary

- The existing Admin entry guard verifies an active admin session through `wow_admin_list_business_verifications` but returns no granular role.
- Batch 02 adds a read-only query for `wow_admin_get_effective_role()`, a proposed minimal RPC that returns only the authenticated current admin's verified role.
- **Deployed 2026-11-14:** `wow_admin_get_effective_role()` now exists. Verified reviewers can receive an effective role, but actual app access and decision controls still require valid Clerk sessions and successful API calls; do not claim UI end-to-end coverage.
- UI decision components additionally check that the selected item is in a submitted state, enforce reason lengths, and require a separate confirmation before invoking existing `@wow/api` mutation hooks.
- **ADM-04 approval now requires genuine evidence review:** the application generates 60-second temporary signed URLs through existing private Storage RLS for a server-verified reviewer. Only allowlisted business-scoped keys can be signed, and an explicit reviewer attestation is required. If role verification, evidence signing, or media review fails, approval remains disabled. This Storage path still requires staging tests with real authorized reviewers.
- **Profile-change approval requires published-baseline comparison:** the SQL proposal also includes `wow_admin_get_profile_revision_context`, a minimal authenticated current-state projection, and the UI displays current and candidate values side-by-side. Approval is blocked if this RPC fails, mismatches the selected revision, or candidate fields fall outside the allowlist. Rejection is separately available to verified reviewers.
- The existing DB already verifies server role and most business affiliation conflicts inside internal routines. A read-only catalog audit identified that verification decisions check owner conflict but not an active employee/affiliate conflict, unlike profile revision and payment decisions.
- **Deployed migration:** `supabase/migrations/20261114202307_admin_w06_role_profile_context_employee_conflict.sql` contains the audited employee-conflict fix and both RPCs. Supabase confirms deployment as migration `20261114202307`. The `docs/sql/...-proposal.sql` copy is historical; do not apply it again.

## Remaining real-session and UI validation before acceptance

1. **Completed:** verify the migration is recorded on the correct pre-launch primary database and function grants match the intended rules.
2. **Completed:** SQL-layer role, active-employee, business-owner, viewer, revoked-user and independent super-admin tests in rollback-only transactions. **Pending:** rerun through real authenticated Clerk sessions and application APIs.
3. Test real independent admin (viewer, reviewer, super_admin) and unauthorized user identities. Confirm only reviewer/super_admin see and can submit decisions.
4. Test same-business proprietor and active employee admin (both denied) for verification, profile revisions and payments; verify aborted decisions did not change status or audit rows.
5. Test the payment note boundary (10–1500 characters), independent settlement evidence and pending-paid subscription state; never activate entitlement from a merchant-provided reference alone.
6. Test profile revision rejection reason (5–2000 chars), approved business/branch precondition and unknown patch/media fields. Confirm published baseline matches the selected revision. Test private verification media signing for authorized independent reviewer and deny viewer, owner-affiliated admin, guest and unrelated business; never disclose private evidence keys in UI, logs or persistent storage.
7. Repeat with revoked role, expired Clerk session, forbidden cross-account objects and browser navigation to the new W06 routes.
8. Reconcile screenshots of the W06 pages against approved ADM-03/04/10 gallery and inspect Android/iOS RTL with realistic staging fixtures before visual acceptance.

## Verification evidence

- `pnpm test:admin-batch-02` runs source-invariant checks; these are not live authorization tests.
- `WOW quality gates` on the W06 branch runs workspace TypeScript, lint, existing UI/Query/integration regression suites, plus browser guest-route and production-preview checks.
- SQL is deployed and DB-level simulated-authority checks passed; **no completed real Clerk-authenticated end-to-end application write-path result is claimed**.
- No PR/merge to `main` until backend security and visual acceptance.


## 2026-11-14 deployment update — latest status

The pre-deployment transaction-only tests established the previous employee-affiliation vulnerability and validated the proposed change. The owner subsequently reported creating a local PostgreSQL custom-format backup and a successful `pg_restore --file NUL` archive check. The backup has **not** been restored to a separate database.

The W06 schema change was then deployed permanently on the primary Supabase project via recorded migration `20261114202307_admin_w06_role_profile_context_employee_conflict`. Database catalog/grant checks passed. Synthetic authenticated-role test cases for viewer, reviewer, super_admin, non-admin, revoked admin, owner and active employee all passed, and every synthetic record and decision was rolled back. See `docs/w06-primary-db-live-migration-verification-2026-11-14.md`.

Do not mistake these SQL tests for real Clerk/HTTP/Storage or UI tests. Reconcile the branch with `main`, finish real-session and screen verification, then seek owner approval before merge.

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
- **The RPC has not been deployed.** Until a separately reviewed SQL rollout, the role is `null` and buttons for review decisions remain disabled.
- UI decision components additionally check that the selected item is in a submitted state, enforce reason lengths, and require a separate confirmation before invoking existing `@wow/api` mutation hooks.
- **ADM-04 approval now requires genuine evidence review:** the application generates 60-second temporary signed URLs through existing private Storage RLS for a server-verified reviewer. Only allowlisted business-scoped keys can be signed, and an explicit reviewer attestation is required. If role verification, evidence signing, or media review fails, approval remains disabled. This Storage path still requires staging tests with real authorized reviewers.
- **Profile-change approval requires published-baseline comparison:** the SQL proposal also includes `wow_admin_get_profile_revision_context`, a minimal authenticated current-state projection, and the UI displays current and candidate values side-by-side. Approval is blocked if this RPC fails, mismatches the selected revision, or candidate fields fall outside the allowlist. Rejection is separately available to verified reviewers.
- The existing DB already verifies server role and most business affiliation conflicts inside internal routines. A read-only catalog audit identified that verification decisions check owner conflict but not an active employee/affiliate conflict, unlike profile revision and payment decisions.
- `docs/sql/w06-admin-review-security-staging-proposal.sql` fixes that omission, defines the effective-role RPC, and adds the allowlisted published-profile baseline read RPC. It is *deliberately not* in `supabase/migrations` and **has not been applied to the connected database**. Confirm an isolated staging database and review the original source, backups and rollout plan first.

## Required staging validation before enabling decisions

1. Reconcile SQL migration history and identify staging vs production.
2. Review the SQL proposal, deploy in isolated staging, verify grants and function search paths with read-only catalog checks.
3. Test real independent admin (viewer, reviewer, super_admin) and unauthorized user identities. Confirm only reviewer/super_admin see and can submit decisions.
4. Test same-business proprietor and active employee admin (both denied) for verification, profile revisions and payments; verify aborted decisions did not change status or audit rows.
5. Test the payment note boundary (10–1500 characters), independent settlement evidence and pending-paid subscription state; never activate entitlement from a merchant-provided reference alone.
6. Test profile revision rejection reason (5–2000 chars), approved business/branch precondition and unknown patch/media fields. Confirm published baseline matches the selected revision. Test private verification media signing for authorized independent reviewer and deny viewer, owner-affiliated admin, guest and unrelated business; never disclose private evidence keys in UI, logs or persistent storage.
7. Repeat with revoked role, expired Clerk session, forbidden cross-account objects and browser navigation to the new W06 routes.
8. Reconcile screenshots of the W06 pages against approved ADM-03/04/10 gallery and inspect Android/iOS RTL with realistic staging fixtures before visual acceptance.

## Verification evidence

- `pnpm test:admin-batch-02` runs source-invariant checks; these are not live authorization tests.
- `WOW quality gates` on the W06 branch runs workspace TypeScript, lint, existing UI/Query/integration regression suites, plus browser guest-route and production-preview checks.
- Because the SQL is not deployed, currently no successful real admin write-path end-to-end result is claimed.
- No PR/merge to `main` until backend security and visual acceptance.


## 2026-11-14 status update — primary DB transactional verification

The owner authorized isolated, transaction-rolled-back tests on the pre-launch primary database instead of provisioning Staging now. These tests **did not** permanently deploy W06 RPCs. The active-employee conflict was reproduced against the original decision function and blocked by the proposed correction. Permission checks were executed within the same transaction; all temporary DDL and data were rolled back. A targeted schema rollback file was tested and preserved at `docs/sql/w06-admin-review-security-targeted-rollback.sql`.

**Release gate remains closed:** the connected Supabase organization is on Free and has no automatic daily database backups. No complete restorable external dump has been verified. See `docs/w06-database-backup-release-gate.md` before creating a tracked migration, deploying permanently, running real Clerk-authenticated end-to-end tests, or merging this branch. The earlier recommendation to use isolated staging is superseded for transient tests only, not for the backup requirement.

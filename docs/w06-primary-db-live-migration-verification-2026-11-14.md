# W06 — Live database migration and verification (2026-11-14)

## Target and release record

- Database: connected Supabase project `wow-platform`, ref `jfqmdnffqwkqevdhmtfi`.
- Migration: **`20261114202307_admin_w06_role_profile_context_employee_conflict`** — confirmed in Supabase migration history.
- Repository source: `supabase/migrations/20261114202307_admin_w06_role_profile_context_employee_conflict.sql` on `feat/admin-batch-02-w06-review-workflows`. The exact DDL submitted to Supabase was saved under this migration name.
- Before deployment: 17 recorded migrations; after deployment: **18**.
- No permanent data inserts, updates, or deletes were part of this migration. New function definitions and function privileges **were** deployed permanently.
- Feature branch is **not merged** into `main`.

## Pre-deployment safety

The owner reported creating a local `pg_dump` custom-format database archive on Windows, using PostgreSQL 18.6 against a PostgreSQL 17.11 database.

- File name: `wow_20261114_231035.dump`
- Reported size: **905,256 bytes**
- Archive TOC: **1,311 entries**
- Owner reported the full `pg_restore --file NUL` archive read check returned **PASSED**.
- The archive was **not uploaded**, so its contents and data fidelity could not be independently checked here.
- **No actual restore into a second database was performed.** Availability of a fully restorable environment remains unverified.
- Custom Postgres roles and stored binary Storage files are not covered by a normal single-database `pg_dump`. Keep the archive private/off GitHub.
- Pre-deployment schema-only rollback had been verified within a transaction; see `docs/sql/w06-admin-review-security-targeted-rollback.sql`.

## Post-deployment catalog results

| Assertion | Result |
| --- | --- |
| `public.wow_admin_get_effective_role()` exists with SECURITY INVOKER | PASS |
| `public.wow_admin_get_profile_revision_context(uuid)` exists with SECURITY INVOKER | PASS |
| Both wrappers: `anon EXECUTE = false` | PASS |
| Both wrappers: `authenticated EXECUTE = true` | PASS |
| Both private helper functions exist with restricted anonymous execution | PASS |
| Verification decision function includes active business-member conflict guard | PASS |
| Supabase migrations now include deployment version | PASS |

## Transactional authorization regression on deployed functions

Using **synthetic database users and locally supplied transaction-scoped JWT claims** with `SET LOCAL ROLE authenticated`, not real Clerk-signed sessions:

- Reviewer can retrieve effective role `reviewer`.
- Viewer can retrieve `viewer` but is denied verification decision.
- Super admin can retrieve `super_admin` and, when independent of the merchant, approve a verification with a matching audit event.
- Active employee in the merchant business is denied that merchant's verification decision.
- Business owner with reviewer role is denied reviewing their own merchant.
- Revoked administrator and unrelated user cannot query an effective admin role.
- Unrelated user cannot obtain profile-revision current-state context.
- Authorized reviewer obtains only allowlisted published baseline fields from a submitted business profile revision.
- All fixtures, status changes and audit writes were executed in a single **`BEGIN … ROLLBACK`** transaction.
- Explicit follow-up counts found **0** remaining fixture users, admin memberships, businesses, verification cases, profile revisions, or audit decisions.

A first test query directly read a restricted table while impersonating `authenticated`; this correctly failed with permission denied. The test was corrected so direct table assertions run after `RESET ROLE`. The corrected test passed.

## Security advisor review

Supabase security advisors reported the prior warning categories (21 RLS-without-policy findings, 5 anonymous PUBLIC SECURITY DEFINER warnings, 17 authenticated SECURITY DEFINER warnings). No new finding directly named either of the two new public wrapper RPCs. Existing warnings must be independently reviewed, especially intentional anonymous search endpoints.

## Limitations and remaining W06 work

1. **Real Clerk-signed user sessions** and the deployed app's HTTP/Storage integration have not been tested. Synthetic claims in SQL do not prove end-to-end auth behavior.
2. UI evidence review and short-lived signed media permissions, payment review, profile revision decision, cross-account access and revoked Clerk sessions still need app-level verification.
3. The `main` branch diverges from the W06 feature branch. Reconcile before PR/merge; do not merge without owner approval.
4. Visual signoff against approved ADM-03/04/10 designs and Android/iOS RTL checks remain pending.
5. Database archive read-check is verified only by the owner's report; full restoration has not been rehearsed.

**Status:** W06 SQL deployed and verified at database layer; complete end-to-end and UI acceptance **NOT claimed**.

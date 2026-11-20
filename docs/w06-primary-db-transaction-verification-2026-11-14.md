# W06 — Primary Supabase transaction-only verification (2026-11-14)

> **Historical pre-deployment snapshot.** W06 was subsequently deployed on the same date under migration `20261114202307`. For current status see `docs/w06-primary-db-live-migration-verification-2026-11-14.md`.

## Scope and boundary

Target: **wow-platform** Supabase database. No persistent data, function or permission changes were deployed. All test DDL and test records were executed in a **single explicit transaction ending with ROLLBACK**. The user authorized isolated testing in the pre-launch primary database.

## Preflight

- The database was reachable; 17 migrations were registered.
- `wow_private.admin_decide_verification_internal` exists in the live database.
- The deployed function rejects business owners but **does not** check `public.business_members` for active staff belonging to the same business.
- Neither `public.wow_admin_get_effective_role()` nor `public.wow_admin_get_profile_revision_context(uuid)` existed in the deployed catalog.
- The original proposal at `docs/sql/w06-admin-review-security-staging-proposal.sql` had two malformed `AS $` delimiters and their closers. They have been corrected in the branch.
- Live database had 0 verification cases and 0 profile revision requests at the time of the test.

## Controlled test results

| Test | Observed result |
| --- | --- |
| SQL transaction + ROLLBACK | PASS |
| Corrected SQL can be created within a transaction | PASS |
| New public wrappers run as SECURITY INVOKER | PASS |
| `anon` lacks EXECUTE on both proposed wrappers | PASS |
| `authenticated` has EXECUTE on the wrappers | PASS |
| Synthetic non-admin caller is refused by both wrappers | PASS |
| Reproduce active-employee conflict against current verification decision function | **CONFIRMED VULNERABILITY**: synthetic reviewer with an active employee membership was allowed to approve a synthetic verification |
| Apply corrected function *within the same transaction*, then retry | **PASS**: the same reviewer was rejected with SQLSTATE 42501 |
| Forbidden decision leaves request in submitted state with no decision audit event | PASS |
| Roll back test data and function definitions | PASS |
| Post-rollback counts: test users, admin memberships, business, verification and decision events | All 0 |
| Post-rollback catalog: new wrappers, employee guard | Absent; live schema unchanged |

The synthetic admin and merchant identities were database-only fixtures, using locally configured claims during testing. **This is not yet an end-to-end test with signed Clerk JWTs or native/mobile apps.**

## Deployment status

**NOT DEPLOYED.** The valid SQL proposal is prepared on the feature branch, not under migrations. The current live verification function still has the active-employee conflict.

Before a permanent production-schema change:
1. Verify that a usable database backup/snapshot or an equivalent tested rollback path exists.
2. Reconcile the migration source with the 17 recorded versions and create one tracked deployment migration.
3. Apply the migration in a controlled manner; verify its catalog definitions and grants.
4. Run signed-in viewer/reviewer/super_admin, anonymous, owner and active-employee cases through the real API and confirm end-to-end UI behavior.
5. Review any relevant Supabase security advisory exceptions, particularly `SECURITY DEFINER` functions explicitly exposed for public discovery.

## Repository note

The administration feature branch is not merged. Do not merge or activate admin review decisions before the security fix is deployed and verified. Do not mistake this rollback rehearsal for permanent remediation or a complete database backup.

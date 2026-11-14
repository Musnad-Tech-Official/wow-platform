# W06 — Storage evidence read authorization repair

## Discovered issue

While verifying the administrator's ability to review private merchant qualification evidence, a direct read-only SQL call to `wow_private.can_read_wow_object(text,text)` raised PostgreSQL error `42883`:

`function wow_private.is_catalog_reviewer() does not exist`.

The preexisting migration `20261113192750_merchant_final_8_revisions_complaints.sql` defines the Storage access predicate with a reference to `wow_private.is_catalog_reviewer()`, but the connected database had no such function.

**Impact:** Storage access policy `wow_storage_read_owner_or_reviewer` delegates the object signing/read authorization check to that predicate. Without the referenced function, private Storage `object.sign` and authenticated reads can fail for relevant buckets. This was a database contract defect; it is separate from the W06 merchant verification decision conflict guard.

## Minimal remediation

Created a private **SECURITY INVOKER** helper that delegates reviewer permission exclusively to the already deployed `wow_private.has_admin_permission(true)` contract. That existing contract checks the authenticated JWT subject, active admin membership, reviewer/super_admin role, and active nondeleted user.

Revoked EXECUTE on the new private helper from `PUBLIC`, `anon` and `authenticated`; the existing `SECURITY DEFINER` Storage policy helper remains its server-side caller. No new public REST RPC or Storage bucket policy was introduced, and no table records were changed.

- Applied Supabase migration: `20261114212527_w06_storage_reviewer_role_helper_restore`
- Source file: `supabase/migrations/20261114212527_w06_storage_reviewer_role_helper_restore.sql`
- Test query: `docs/sql/w06-storage-reviewer-permission-smoke.sql`

## Test evidence

- Initial call reproduced PostgreSQL `42883` against the missing helper.
- Rehearsed the helper with `CREATE FUNCTION` inside `BEGIN … ROLLBACK`.
- The test matrix uses a synthetic business owner with an active `owner` membership, an unrelated active reviewer, an active employee who is also an admin reviewer of that business, a viewer, an unrelated guest, and a revoked reviewer.
- Expected Storage predicate result: **allow** owner and independent reviewer; **deny** employee-reviewer conflict, viewer, guest and revoked reviewer.
- All six scenarios passed in the rollback rehearsal, including checks that neither `anon` nor `authenticated` can invoke the internal helper directly.
- Applied the migration; verified the function catalog, invoker mode, lack of direct client-role EXECUTE, and migration history increasing to **19**.
- Repeated all six cases against the **deployed function**, with explicit transaction rollback; **passed**.
- Follow-up found **0** test users and **0** test businesses.

## Validation boundary

These are PostgreSQL function/predicate tests with synthetic session JWT claims. They do **not** prove that the Supabase Storage HTTP API successfully generates a signed URL for a real object and a genuinely signed Clerk session. The pre-launch Storage bucket held no uploaded objects during the earlier inventory. Application E2E for a real reviewer, a real evidence object, short-lived signed URLs and viewer/owner/employee denial remains a separate release gate.

The primary database is a Supabase Free project. The owner holds a local custom-format `pg_dump` archive made before the W06 deploy; the archive read check passed by owner's report, but no full restoration to an isolated database was verified. The new repair is reproducible from the recorded migrations.

No Admin code or database change in this work authorizes merging PR #55 before visual acceptance and true Clerk/Storage E2E.

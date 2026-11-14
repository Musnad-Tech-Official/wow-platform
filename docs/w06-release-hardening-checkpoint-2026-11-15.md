# W06 release-hardening checkpoint — 15 November 2026

## Scope

This checkpoint supplements the signed-in Clerk W06 acceptance report. It covers a **real deployed database change** to private business-media read authorization and **SQL-layer** payment decision tests. It does not claim that W06 is fully production ready.

**Environment:** Supabase `wow-platform` (the only pre-launch database). The feature branch is `feat/admin-w06-main-sync-review-20261114`, PR #55 **DRAFT**; no merge to main.

## A. Payment decision and audit — PASSED (rollback-only)

Source: `docs/sql/w06-billing-decision-transaction-smoke.sql`.

A controlled PostgreSQL transaction inserted synthetic users, reviewer/viewer/revoked roles, two isolated businesses, one pending paid subscription per business (honoring `business_subscriptions_one_pending_paid_idx`), and two submitted payment records. Using transaction-scoped authenticated JWT claims, the test verified:

- Deny owner-reviewer, affiliated active employee-reviewer, viewer, and revoked reviewer (SQLSTATE 42501).
- Deny undocumented review note shorter than 10 characters (SQLSTATE 22023).
- Deny approval if submitted amount does not match immutable plan snapshot (SQLSTATE 22023).
- Allow independent reviewer to **reject** a synthetic payment without activating its subscription.
- Allow independent reviewer to **approve** a matching synthetic payment, activate its subscription and write the expected billing audit event.
- Exactly two correct payment events in `wow_private.billing_events`.

All records, grants, subscription transitions and billing events were wrapped in explicit `BEGIN … ROLLBACK`; the subsequent live catalog check found **0** synthetic users, businesses or payments. **No external payment provider was contacted, no real funds were transferred and no actual entitlement was left active.**

The first fixture attempt correctly failed a unique constraint because it tried three pending paid subscriptions for one business. The fixture was redesigned using two separate businesses, and the corrected test passed.

## B. Private staged business-media authorization — FIXED AND DEPLOYED

The previous deployed `wow_private.can_read_wow_object(text,text)` contained:

```sql
WHEN 'wow-business-media' THEN
  RETURN true;
```

Once the user was authenticated and provided any syntactically valid key, this branch did not verify whether they owned or were authorized to review that business. The `wow-business-media` bucket is **PRIVATE**, and the approved `docs/api-storage-media.md` contract explicitly states it is a *staging area*, not public discovery media. No Storage objects existed at the time of remediation, so this was a latent access-control gap. It should not be confused with a confirmed leak of a real uploaded file.

The replacement now validates the path (business UUID, Clerk user identifier and image filename) and permits only an active owner of the named business or an independent authorized reviewer. An active staff member who is also a platform reviewer cannot review media for their employing business. All other Storage bucket logic remains unchanged.

- Reproduced baseline overbroad read predicate with a synthetic unrelated authenticated user.
- Tested the minimal replacement in a rolled-back transaction for owner, independent reviewer, affiliated reviewer, viewer and unrelated guest. All five expected decisions passed.
- Rehearsed a targeted rollback that restored the exact original function definition inside a transaction.
- Permanently deployed recorded migration **`20261114223935_w06_private_business_media_read_role_guard`**.
- Saved matching source under `supabase/migrations/20261114223935_w06_private_business_media_read_role_guard.sql`.
- Saved undo at `docs/sql/w06-business-media-read-targeted-rollback.sql` (WARNING: undo reintroduces the broad read).
- Re-ran **five-role business-media and verification-evidence permission tests after deployment** in a rolled-back transaction. All passed.
- Follow-up verified **0** test users, **0** test businesses, **0** test payments, **0** Storage objects.

No new Storage policy, object, client-side service key, direct table write or business-data update was introduced by the deployed migration. Supabase security advisor warning categories did not increase.

## C. Remaining gates

1. Test real Clerk JWT **Storage HTTP upload and sign** on an actual disposable object through the Storage API. There is currently **no authenticated DELETE policy** for `storage.objects`; therefore do not upload an object solely for testing until a safely scoped API cleanup pathway is approved. Never delete only its SQL metadata, as binary objects would remain in underlying Storage.
2. Real mobile Android and iOS authorized reviewer UX, RTL/keyboard/screen-reader states, and original approved UI artwork comparison.
3. Independent profile revision and payment decision **application-level** tests with real signed sessions; database-level payment logic above is proven, not the end-to-end user interaction.
4. Reconcile deployed migration history and back up the database **again** after recent fixes. The last owner-reported archive predates them, and full restore has not been rehearsed.
5. Finish W07/W08 Admin workflows and W09 acceptance. Obtain owner authorization before PR #55 merge.

**Status:** W06 payment decision SQL verification PASSED; private business-media access FIXED; actual Storage HTTP file signing remains UNVERIFIED; W06 not approved or merged.

# Stage 4A — Offer authorization regression matrix (AUD-015 / AUD-021 / AUD-022)

**Source baseline:** `main` `75c095929b19bac3259fd51a7bdb3a323e7ca0eb` (verified 2026-11-22).  
**Code branch:** `fix/stage4-security-offer-scope-20261122`.  
**Environment:** Authorized deployment completed to the connected Supabase project `jfqmdnffqwkqevdhmtfi` (migration version `20261122175254`); 21 transaction-scoped SQL regression assertions passed before deployment, and all temporary fixture rows rolled back. No separate staging project was used.  
**Status:** SQL migration applied; 21 transactional role/branch authorization assertions PASS; post-apply function, grants and anonymous denial checks PASS. HTTP / signed Storage objects / CI / full E2E remain **NOT_RUN**; findings are not fully closed.

## Test setup (isolated staging only)

Provision a dedicated isolated Supabase database and Clerk development test identities; do not use a real account or production data. Required roles: business owner, employee A with `can_draft` and assignment only to branch A, employee B assigned only to branch B, another employee assigned both branches, a reviewer without membership/conflict, and viewer/anonymous. Include a valid offer draft by employee A, a draft by employee B, a cross-branch version, a version with zero branches, and private offer media / offer-evidence objects with known keys. Use JWT-authenticated PostgREST/RPC/Storage endpoints. Start from known database and Storage snapshots; ensure rollback/cleanup succeeds. Do not run potentially destructive tests on the connected Supabase environment.

## Acceptance cases

| Case | Actor / action | Required outcome |
|---|---|---|
| A15-01 | Owner reads private media for their own offer | Allowed (subject to active account and business ownership) |
| A15-02 | Employee A reads media of draft with branch A only | Allowed if active and authorized for drafting |
| A15-03 | Employee A knows media key for version linked to branch B | **Denied** for GET/LIST/sign; no redirect or signed URL |
| A15-04 | Employee A reads a version linked to branches A+B | **Denied** unless explicitly assigned to every included branch |
| A15-05 | Independent reviewer accesses media for authorized review | Allowed as authorized; member-conflicted reviewer denied |
| A15-06 | Anonymous / viewer attempts private draft media access | Denied; public live image signing via the separate policy must still work |
| A21-01 | Employee A reads evidence draft of their own version scoped to A | Allowed |
| A21-02 | Employee A reads evidence of version scoped to B | **Denied** (403/42501 or sanitized forbidden response) |
| A21-03 | Employee A saves evidence of version scoped to B or created by employee B | **Denied** and existing evidence metadata unchanged |
| A21-04 | Owner saves/reopens authorized draft evidence | Allowed; no cross-business document key accepted |
| A22-01 | Employee A saves their own branch-A draft | Allowed; contents and associations persist |
| A22-02 | Employee A saves a draft version created by employee B | **Denied**; original rows/media unchanged |
| A22-03 | Employee A supplies branch B in the payload | **Denied** even when the existing version has no branches |
| A22-04 | Employee A supplies branches A and B | **Denied atomically**; no partial replacement |
| A22-05 | Employee A attempts to start a first draft on employee B's offer | **Denied** |
| A22-06 | Owner edits an authorized business draft | Allowed; prior working flows remain valid |
| A22-07 | Revoke branch A between sessions and repeat evidence/media/save | Access removed; no stale authorization |
| A22-08 | Two simultaneous saves / failed save / retry | No unauthorized partial state; verify transaction rollback and future AUD-027 idempotency separately |

## Evidence required before merge

1. **Completed:** Original database migration `20261122175254`, drift preflight, 21 rollback-protected SQL behavioral assertions and post-apply grant/definition checks. Future test runs should use separate disposable fixtures, if available.
2. Positive and negative JWT/RPC and Storage tests with HTTP status, request identity/branch, and SQL assertions of unchanged records after each denied mutation.
3. Re-run of migration-dependent regressions on customer public media, merchant offer editor, reviewer evidence, and role changes.
4. CI pass on exact head SHA, actual logs, and reviewer approval; `main` currently fails before steps, and the root cause has not been confirmed.
5. **Completed:** Owner authorized the original database change on 2026-11-22. Previous function sources are preserved in `docs/implementation/rollbacks/stage4-offer-auth-prechange-rollback.sql`; transactional fixtures were rolled back with zero residual rows. This is not a full database backup.

**Do not classify SQL pass as proof of end-to-end access isolation.** External authenticated Storage/API and app tests are still pending. Public launch stays NO-GO until the full stage 6/7/8 gates pass.

## Executable staging HTTP regression (not yet run)

A guarded Node.js runner is committed as `scripts/test-stage4-offer-scope-staging.cjs` (Node 22, native `fetch`; no new dependencies). It **refuses** the known connected production project `jfqmdnffqwkqevdhmtfi` and requires an explicit disposable-staging confirmation.

Provision separate, disposable staging accounts and fixtures **before** setting these environment variables:

| Variable | Required fixture |
|---|---|
| `WOW_STAGE4_SUPABASE_URL`, `WOW_STAGE4_PUBLISHABLE_KEY` | **Isolated** Supabase project (never the connected production project) and its public API key |
| `WOW_STAGE4_ISOLATED_STAGING` | Exact value `I_CONFIRM_DISPOSABLE_STAGING` |
| `WOW_STAGE4_OWNER_JWT` | Valid short-lived JWT for the owner of business B |
| `WOW_STAGE4_EMPLOYEE_A_JWT` | JWT for employee A, assigned only to branch A and allowed to draft |
| `WOW_STAGE4_EMPLOYEE_B_JWT` | JWT for employee B, assigned only to branch B |
| `WOW_STAGE4_OFFER_A_ID` | Offer having a readable evidence draft belonging to A |
| `WOW_STAGE4_OFFER_B_ID` | Offer having a readable evidence draft belonging to B (not A) |
| `WOW_STAGE4_OFFER_B_WITH_DRAFT_ID` | Offer with an existing editable draft created by B |
| `WOW_STAGE4_PRIVATE_B_MEDIA_KEY` | **Existing** private media object under branch B's offer version; owner can sign this key |
| `WOW_STAGE4_EMP_A_DRAFT_ID` | Existing editable offer draft created by A |
| `WOW_STAGE4_FOREIGN_BRANCH_ID` | Branch B ID, *not* assigned to employee A |
| `WOW_STAGE4_VALID_DRAFT_JSON` | Complete, schema-valid draft payload containing at least one valid item and a branches array |

Run manually from the repo root on the staging machine after migration and fixture setup:

```bash
node --check scripts/test-stage4-offer-scope-staging.cjs
node scripts/test-stage4-offer-scope-staging.cjs
```

All test cases must report `PASS`, with `failed=0` and `notRun=0`. Any missing fixture blocks the suite; no unauthorized HTTP request is treated as successful merely because a non-auth SQL validation failed. The test asserts SQLSTATE `42501` on denied RPC operations, and verifies unchanged evidence after a denied write. It first confirms an existing object can be signed by its owner before interpreting a denied Storage sign request. **Do not save JWTs in GitHub, job logs, or artifacts.**

This runner covers part of the acceptance matrix only; it is **not** a replacement for actual Storage GET/LIST, direct SQL/RLS checks, concurrency, positive owner/reviewer operations, app E2E or rollback. Record all as `NOT_RUN` until individually executed.

## Change-control / migration drift

The migration contains a preflight `stage4_drift_guard` with exact baseline hashes of four inspected functions. Any source drift causes a hard failure rather than silently overwriting concurrent changes. Only rerun a reviewed migration against a matching baseline; never remove the guard to bypass an unexpected failure. A fresh reconciliation of branch code and database function definitions is required if drift is detected.

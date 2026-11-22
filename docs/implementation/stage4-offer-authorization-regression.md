# Stage 4A — Offer authorization regression matrix (AUD-015 / AUD-021 / AUD-022)

**Source baseline:** `main` `75c095929b19bac3259fd51a7bdb3a323e7ca0eb` (verified 2026-11-22).  
**Code branch:** `fix/stage4-security-offer-scope-20261122`.  
**Environment:** The connected Supabase project `jfqmdnffqwkqevdhmtfi` remains unchanged; no staging database or disposable fixtures have been provisioned.  
**Status:** CODE PREPARED, STATICALLY CHECKED; DB / HTTP / Storage / CI verification **NOT_RUN**. No finding is CLOSED.

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

1. A dedicated staging reference, migration transaction/DDL success, plus verification that the definitions and `EXECUTE` grants match the reviewed branch.
2. Positive and negative JWT/RPC and Storage tests with HTTP status, request identity/branch, and SQL assertions of unchanged records after each denied mutation.
3. Re-run of migration-dependent regressions on customer public media, merchant offer editor, reviewer evidence, and role changes.
4. CI pass on exact head SHA, actual logs, and reviewer approval; `main` currently fails before steps, and the root cause has not been confirmed.
5. Backup/rollback instructions, cleanup results, and explicit approval before any change to the connected production database.

**Do not classify passing string/source checks as proof of access isolation.** Public launch stays NO-GO until the full stage 6/7/8 gates pass.

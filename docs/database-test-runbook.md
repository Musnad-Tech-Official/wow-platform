# WOW — Database Test Runbook (Migration 010 and Live RLS)

**Purpose:** test the *deployed* Supabase project, not just JavaScript wrappers. **Priority: W00** ([Issue #10](https://github.com/Musnad-Tech-Official/wow-platform/issues/10)). The test can be claimed and performed by **any** available developer and must pass before release or real customer evidence uploads.

**Current evidence:** Local `typecheck`, `lint`, 36 Query tests, and 19 local integration guard tests passed on the Migration 009 PR. These tests use mocked client/HTTP behavior. **No live Supabase results have been recorded or verified in this repo.**

## Phase A — read-only SQL structural audit (run now)

The already-reviewed source package `WOW_Migration_010_Package.zip` includes `010_verify.sql`. **This is the read-only script** that contains seven audit blocks, including a nine-row pass/fail checklist. It has zero INSERT/UPDATE/DELETE statements. It is distinct from `010_database_hardening.sql`, which is a migration and **must not** be run as a test.

1. Open the intended Supabase project and verify its project identity/environment. Prefer an isolated **staging** project/branch for any later writes. If using production, Phase A is read-only.
2. Supabase Dashboard → **SQL Editor** → New query. Paste the **entire original, unchanged `010_verify.sql`**, then Run. Do not copy a modified fragment from a chat, and do not run `010_database_hardening.sql`.
3. Capture the complete results from **all seven audit blocks**. Some SQL editors only display the **last SELECT result** after a multi-statement run; in that case execute the seven SELECT blocks separately, in order, without altering them. Record which project/environment and date produced them. Do not expose any tokens, secrets, individual user identities or private file paths.
4. First result: exactly **9** metric rows. Required: `actual = expected = 1` and `passed = true` for all:
   - `offers_policy`
   - `versions_policy`
   - `branches_policy`
   - `branch_guard_trigger_delete`
   - `scoped_version_helper`
   - `scoped_offer_media_helper`
   - `scoped_offer_upload_helper`
   - `scoped_media_attach`
   - `scoped_offer_pause`
5. Then review **all** offer table RLS policies, including unexpected extra **PERMISSIVE** policies that may bypass hardening. Merely seeing the three expected named policies is insufficient.
6. Verify grants: relevant offer tables have RLS enabled, expected authenticated SELECT access, no unexpected anonymous raw SELECT and **no authenticated raw INSERT/UPDATE/DELETE**. Check SQL results table by table, not just an aggregate pass flag.
7. Inspect all `SECURITY DEFINER` public/private functions, effective EXECUTE grants and safe function `search_path`; unexpected anonymous EXECUTE or insecure search path needs human code review.
8. Review **every** `storage.objects` policy, not only WOW-named ones. Confirm all five WOW buckets remain private with expected size/MIME limits, and that `subscription_payments_proof_disabled_ck` remains present and fail-closed.
9. Review admin role-count output. **Do not export administrator account identifiers** or private member details.

**Stop on any failed/missing required structural check.** Do not automatically run or patch database migrations without a backup, separately reviewed SQL, and explicit authorized approval.

### Report after Phase A

| Section | Required evidence | Status |
| --- | --- | --- |
| A1: Nine checks | 9 rows all passed=true | NOT RUN |
| A2: All offer policies | Full table + unexpected PERMISSIVE policy review | NOT RUN |
| A3: Offer grants & RLS | Per-table privilege and enabled RLS outputs | NOT RUN |
| A4: SECURITY DEFINER | Functions, settings, anon/authenticated execute | NOT RUN |
| A5: Storage policies and buckets | All policies; five private WOW buckets | NOT RUN |
| A6: Payment proof constraint | Explicit constraint definition | NOT RUN |
| A7: Admin member counts | Aggregated counts only | NOT RUN |

**Phase A pass is necessary but NOT sufficient for production.**

## Phase B — live authenticated role-matrix (use staging/synthetic data)

Run the existing developer-only `/integration-test` screens in Customer, Merchant and Admin for the identity, profile and basic business/branch tests in `docs/integration-tests.md`. For further branch/offer/Storage assertions that the screens do not cover, create a dedicated controlled test harness in **a separate reviewed PR** or use safe manual probes with test identities. Do not make test-only privileged bypasses in mobile clients.

Required roles: real anonymous visitor; registered customer A and B; verified business owner; separately authorized employee with **all** branches; partial-branch employee; unrelated/unassigned employee; revoked employee; independent authorized admin; affiliated admin (must be denied conflicted review).

| Scenario | Expected result |
| --- | --- |
| Guest public discovery | Only currently eligible approved businesses/offers, never private drafts |
| Guest private user data or private media | Denied |
| User A reads User B profile/favorites/complaints | Denied; account switch clears cache |
| Owner reads own business/branches/team | Allowed within own business only |
| Unrelated merchant reads/writes target business | Denied |
| Partial-branch employee reads multi-branch offer/version/items/media | Denied under Migration 010's all-branches scope |
| Employee deletes an unassigned offer branch association | Denied atomically; no partial change |
| Revoked/suspended employee accesses business | Denied |
| Independent admin reviews matching merchant/offer/payment | Allowed only for explicitly granted permissions |
| Affiliated admin tries to approve own business | Denied |
| Unpaid/pending payment without entitlement | Not discoverable solely from payment submission |
| Expired/paused offer | Excluded from public discovery |
| Valid customer-owned evidence upload in correct private bucket | Allowed using synthetic images/PDFs |
| Cross-account or anonymous private evidence upload/read | Denied |
| Live offer media signing | Allowed only for eligible offer/media; short expiry |
| Payment proof upload | Denied (feature intentionally disabled) |

For every action record the user role, target business/branch, HTTP/SQL outcome, expected/actual, timestamp, and PASS/FAIL/SKIPPED. **Do not guess** that a permission is safe when an expected fixture/second account does not exist; mark SKIPPED.

**Safety guard:** Since the database may be shared with real users, do not create, delete or mutate business/customer/payment records in production merely to test. Use a staging clone or isolated disposable records with explicit authorized approval; use synthetic evidence, never real IDs/proof documents. Confirm recovery/backups before migration or destructive tests.

## Phase C — release gate

Only after Phase A AND the required Phase B/Storage tests pass may the team consider live production release, with backups/restore, privacy and admin MFA controls separately verified. **UI work with mocks may start now in parallel** under `docs/ui-workstreams.md`; a green UI build does not lift this gate.

## How to run safely without a direct database connection from ChatGPT

Use the unchanged `010_verify.sql` in Supabase SQL Editor and share **sanitized seven result sections** here. An installed Supabase integration can be used for read-only SQL only when its actions are actually exposed and the target project is confirmed. Installation alone does not establish a successful SQL execution. Do not share `service_role` keys, DB passwords, SQL editor access tokens, Clerk session tokens, or personally identifying rows.

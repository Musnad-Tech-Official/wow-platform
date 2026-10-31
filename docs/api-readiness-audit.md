# WOW API Readiness & Migration 010 Security Handoff

**Snapshot:** October 31, 2026. This is a development handoff and evidence inventory, **not** a certification of database security or launch readiness. The API baseline at `main` includes PRs #1–#8 through `fc2585da78adfc390e276e1fc42125c392a8777a`. No new SQL or production configuration changes are made by this document.

## 1. Scope and status

| Layer | Evidence and status |
| --- | --- |
| Core Clerk-aware Supabase/React Query | Implemented; session isolation regression tests locally passed |
| Migration 002: businesses, branches | API and RPC wrappers implemented; local mocked tests passed |
| Migration 003: business verification | Six RPC wrappers implemented; local mocked tests passed |
| Migration 004: offers and review | Seven RPC wrappers implemented; local mocked tests passed |
| Migration 005: favorites, ratings and complaints | Thirteen RPC wrappers implemented; local mocked tests passed |
| Migration 006: merchant billing and trials | Ten RPC wrappers implemented; local mocked tests passed |
| Migration 007: public discovery and categories | Six RPC wrappers implemented; local mocked tests passed; anonymous client separated from Clerk |
| Migration 008: Storage/media | Three RPC wrappers and upload helpers implemented; mocked Storage tests passed |
| Migration 009: merchant operations | Nine RPC wrappers implemented; local mocked tests passed |
| Migration 010: database hardening | **Server-side migration, no new public RPC. Production deployment and runtime RLS verification NOT confirmed by repository checks** |

Local verification reported by the developer on the PR #8 head: `pnpm.cmd typecheck` **passed**, `pnpm.cmd lint` **passed**, `pnpm.cmd test:query` **36/36 passed**, `pnpm.cmd test:integration` **19/19 passed**. The latter is a local guard/diagnostics suite, **not** a live integration test. The user has previously reported Migrations 001–010 as applied on Supabase Cloud, but neither deployment record nor `010_verify.sql` results were independently retrieved here.

The original Migration 010 source archive includes `010_database_hardening.sql`, `010_verify.sql` and `010_README.md`. Its README was drafted while the migration was **not yet deployed**. This historical archive status does not prove present deployment status; request current SQL verification results rather than inferring deployment from the archive.

**Source availability:** As of this snapshot the GitHub checkout does not contain versioned SQL migration files. Keep the exact reviewed SQL and read-only verification scripts under version control in a separate, reviewed change before future database deployments. Never commit credentials, production database dumps or private evidence.

## 2. Migration 010 — exact structural verification

Run the existing **read-only** `010_verify.sql` from the source package against the intended Supabase database. It reports nine required `checks` rows; each must have `actual = expected = 1` and `passed = true`:

1. `offers_policy`: offer SELECT uses scoped `can_read_offer(id)`.
2. `versions_policy`: version SELECT uses `can_read_offer_version(id)`.
3. `branches_policy`: offer branch SELECT uses `can_read_branch(business_id, branch_id)`.
4. `branch_guard_trigger_delete`: branch association guard includes DELETE.
5. `scoped_version_helper`: version access requires all assigned branches; no partial disclosure.
6. `scoped_offer_media_helper`: Storage read helper uses version scope.
7. `scoped_offer_upload_helper`: Storage write helper uses version scope.
8. `scoped_media_attach`: offer attachment checks version scope.
9. `scoped_offer_pause`: changing offer availability checks version scope.

**Do not stop at nine green rows.** Review all other result grids in `010_verify.sql`: offer table SELECT/INSERT/UPDATE/DELETE grants and RLS status, **all** permissive policies (not just expected names), the `SECURITY DEFINER` function inventory and `search_path` settings, Storage policies and bucket privacy/MIME limits, disabled payment-proof constraint, and active admin-role counts. An additional permissive RLS policy can silently bypass the new predicate.

Do **not** re-run `010_database_hardening.sql` merely as a smoke test. For any missing migration, obtain a restorable backup or staging clone, review the exact source and execute it once transactionally with explicit owner approval. The review above is read-only; it does not change Production.

## 3. Live environment tests still required before real accounts/uploads/launch

Use test identities and synthetic content first. Capture **PASS / FAIL / SKIPPED** separately with evidence, role, time and target environment.

- **Authentication:** real Clerk session, token refresh, account switch, webhook-created profile, profile absence, suspended users, anonymous denial of private data.
- **RLS and branch scope:** owner; assigned employee; employee assigned only one branch of a multi-branch offer; unassigned/revoked employee; unrelated merchant; independent admin. Verify offers, offer versions, items, attributes, media and branch links. Test both allowed and denied reads/writes.
- **Mutation denial and atomicity:** employee DELETE of unassigned offer branch association must fail and roll back; scoped global offer pause; rejected/draft/approved version transitions; reviewer conflict of interest.
- **Storage:** owner/merchant/complainant uploads to allowed paths; attempted uploads by others; denied evidence reads; anonymous public image access only while offer is eligible; short-lived signed URL expiration; MIME and file-size limits; orphan-object cleanup policy.
- **Billing:** once-only trial, approved business + live offer eligibility, request/payment still pending before independent review, no client payment-proof upload, correct subscription expiry and public visibility.
- **Operational:** true admin MFA and scoped access, backup+restore proof, migration rollback/recovery plan, privacy/retention rules, incident/reviewer audit, device/network failure and retry ambiguity.

The existing `/integration-test` developer-only screens cover a **subset** of the above (session/profile/RLS and basic merchant create/branch tests). Do not label the full migration verification complete because these screens or mocked tests pass.

## 4. Known boundaries and documentation gaps

- `docs/tanstack-query.md` and `docs/integration-tests.md` contain foundation-era examples that predate the fixed `wow_create_branch(p_business_id,p_name,p_city,p_address_line,...)` contract. Use the current TypeScript inputs in `packages/api/src/branches.ts`; review older examples before copying them.
- The `wow-business-media` bucket is private staging, **not** a completed public logo/cover publishing workflow.
- Payment proof upload remains disabled by SQL; do not add a client upload without a separate security-approved schema change.
- The public offer image allowlist is not a public URL. Never use `getPublicUrl()` for private Storage.
- An offer draft's media associations may be replaced by `wow_save_offer_draft`; save full draft **before** attaching images.
- Migration 010 intentionally restricts employees with partial branch assignments; UI must not fetch alternative privileged reads.
- The approved first release targets offer discovery, merchant workflows and moderation; no cart/checkout, customer wallet/delivery or payment-gateway API has been implemented or approved as part of this API milestone. Those are possible later product expansions, not implied features of Migrations 001–010.
- Product analysis describes an admin **web** interface, while this repository currently contains `apps/admin` as an Expo app. Confirm its web deployment/UI target during design integration; do not assume the existence of an entirely separate Next.js admin.

## 5. Development handoff decision

**Approved for parallel UI development against mocked/demo data and current typed `@wow/api` exports**, with feature isolation and local `typecheck`, `lint`, `test:query`, `test:integration` gates.

**Not approved as production-ready** until the live database audit and cross-account tests above pass. The unfinished live checks do not need to block isolated page implementation with mocks; they **do** block real customer evidence, unrestricted access and public launch.

See `docs/ui-workstreams.md` for conflict-minimizing assignments. The shared API is a controlled surface; change its contracts through a dedicated reviewed PR rather than uncoordinated page work.

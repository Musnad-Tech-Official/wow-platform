# Engineering Readiness — Verified Inventory and Remaining Gates

**Date:** 2026-11-02  
**Branch:** `chore/engineering-readiness-cde`  
**Scope:** C (Git/CI), D (Supabase/Staging preflight), E (agents and three-developer handoff). This is a **preparation report**, not permission to change live schemas or assign developers.

## Executive outcome

The approved design and shared UI v0.5–v0.8 have passed the owner's latest local static, typecheck, lint, 36 Query and 19 mocked integration checks. This pass does **not** prove live Clerk roles, RLS, private Storage, physical device QA or backup/recovery. We can prepare the team and allow mocked, feature-scoped UI work after allocation; **live environment security and staging must remain a W00 blocking gate before real user data, payment evidence or release**.

## C — Repository and CI

Prior to this branch: `main` had `pnpm-lock.yaml` and reproducible local `scripts/verify-ui-v08.sh` but no `.github/workflows` directory or root `AGENTS.md`.

Added:
- `.github/workflows/ci.yml`: no-secret, read-only GitHub Actions on PR to `main`, push to `main`, or manual dispatch. Node 22, pinned pnpm 10.21.0, `pnpm install --frozen-lockfile`, readiness contract check, all v0.5–v0.8 UI, TypeScript, lint, Query/integration guards.
- `scripts/test-engineering-readiness.cjs`: source and configuration consistency; no external network and no database connection.
- `AGENTS.md`: root-wide technical ownership and safety rules.
- `docs/developer-handoff-protocol.md`: parent-to-three-conversation handoff semantics.

**CI evidence:** GitHub Actions [run #41365050732](https://github.com/Musnad-Tech-Official/wow-platform/actions/runs/41365050732) **PASSED** on PR #27: frozen pnpm install, readiness contract tests and full UI/typecheck/lint/Query/integration guard suite. After owner-approved merge, verify the first `main` push run as well. Repository branch protection and required checks require repository owner/admin configuration. The GitHub connector does not establish those protections just by adding the workflow. Do not auto-merge a PR just because local checks pass.

## D — Read-only live Supabase preflight

Using the connected Supabase project named **wow-platform** (project reference `jfqmdnffqwkqevdhmtfi`) as of 2026-11-02, with **read-only catalog SQL** and advisors only:

| Observation | Evidence |
| --- | --- |
| Project state | ACTIVE_HEALTHY; PostgreSQL 17 |
| `public` | 25 ordinary/partitioned tables, **25 RLS enabled**, 0 disabled |
| `wow_private` | 7 tables, **7 RLS enabled**, 0 disabled |
| Storage | Five `wow-*` buckets exist, all `public = false`, with file limits and MIME restrictions |
| Supabase migration-history API | Returned an **empty migrations list**. Read-only SQL also found **no `supabase_migrations.schema_migrations` relation** in this database; recover and reconcile the migration source/history before any deployment |
| Supabase development branches | **0 branches reported** |
| Visible connected projects | This project's name is `wow-platform`; the other listed project is `Musnad Tech Website`. No separate WOW staging project was identified from these listings |
| Security advisor | 19 `rls_enabled_no_policy` INFO findings; this may intentionally indicate RPC-only tables and requires role-by-role review, not automatic policy additions |
| Security advisor | 5 `anon_security_definer_function_executable` WARN and 5 `authenticated_security_definer_function_executable` WARN for potentially intentional public discovery RPCs; inspect grants and function bodies before deciding |
| Additional catalog inspection | 85 SECURITY DEFINER functions in `public`/`wow_private`; **6 executable by anon** (five public discovery RPCs, plus `wow_private.is_public_offer_object`); schema exposure and effective grants must be reviewed, not assumed exploitable |
| Offer RLS policy inspection | Six offer-related SELECT policies exist, **all PERMISSIVE**. This is not in itself a security failure, but unexpected permissive combinations and their predicates require the original `010_verify.sql` and real-role testing |
| Payment proof safety | `subscription_payments_proof_disabled_ck` constraint is present (definition and actual denial remain to be verified) |
| Performance advisor | 39 unindexed foreign-key INFO, 4 `auth_rls_initplan` WARN and 43 unused-index INFO findings; triage before production performance claims |

RLS enabled is **not a proof of correct isolation**; `SECURITY DEFINER` exposure requires special scrutiny. No SQL migration was applied, no authenticated private data inspected, no backup or privilege changed, and no paid staging branch was created. The environment's production/staging classification is still unverified.

**Next safety sequence for W00:**

1. Confirm which Supabase project is production vs staging, and identify an isolated synthetic-data staging project/branch with explicit budget/permission approval if needed.
2. Recover the exact, previously reviewed migration SQL 001–010, including `010_verify.sql`. The source files were **not in `main`** at this review. Do not reconstruct or reapply them from memory.
3. Run the unchanged original `010_verify.sql` (seven result sets, nine mandatory checks) on the intended environment; capture a redacted evidence report. The supplementary `docs/sql/w00-readonly-inventory.sql` only inventories catalogs and **does not replace** this verification.
4. Review unexpected permissive policies, function `EXECUTE` grants, `search_path`, Storage object policies, payment-proof write block and admin conflicts, then test real role matrices with synthetic data **in staging**.
5. Validate backups and restore, migration history reconciliation, Clerk JWT integration, audit/retention and authorized admin controls before any private customer data or release.

**Blocking issues:** staging not verified, migration source/history not reconciled, live multi-account RLS and Storage tests not run, security advisor WARN items not triaged, backups/restore not proven.

## E — Agents and repeatable developer setup

The new root `AGENTS.md` governs app-specific guides and `docs/agent-skills.md` records version-specific tool selection and capability dependencies. Existing app AGENTS retain Expo best practices, now explicitly linked to the root policy. `docs/developer-handoff-protocol.md` captures the approved opening behavior: a **complete assigned roadmap first**, then only the **first command for the first task**, with later commands dependent on results.

**Still awaiting owner decision:** three developers' complete assignment across existing W00–W09 packages; unique ownership of common code; when feature branches and conversation branches are actually opened. No allocations are created in this readiness PR.

## Acceptance and status

| Gate | Status |
| --- | --- |
| UI/design baseline and local test evidence | PASS (owner's local log) |
| CI workflow source and repo contracts | PR #27 GitHub Actions PASSED (run #41365050732); first main-branch run pending owner-approved merge |
| Branch protection / required reviews | OWNER CONFIGURATION PENDING |
| Supabase schema inventory | READ-ONLY INSPECTED |
| Staging environment identified | NOT VERIFIED |
| Version-controlled original migrations | MISSING FROM REPOSITORY |
| W00 real multi-role RLS/Storage, security-advisor remediation and recovery | OPEN — release blocker |
| Root agent instructions and handoff playbook | PREPARED — awaiting owner allocation approval |

### Remediation references

- [Supabase Managing Environments](https://supabase.com/docs/guides/deployment/managing-environments)
- [Supabase Security Advisors](https://supabase.com/docs/guides/database/database-linter)
- [Anonymous EXECUTE on SECURITY DEFINER](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable)
- [Authenticated EXECUTE on SECURITY DEFINER](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable)
- [RLS enabled without policies](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy)
- [RLS initplan performance](https://supabase.com/docs/guides/database/database-linter?lint=0003_auth_rls_initplan)

**This document deliberately separates observed facts from unresolved acceptance checks.** Do not treat CI preparation or read-only metadata as W00 completion.

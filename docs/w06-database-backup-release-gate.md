# W06 — Backup and migration status (2026-11-14)

## Original deployment gate

The project `wow-platform` uses Supabase Free and does not have automatic daily database backups. Previously W06 deployment was blocked pending a user-managed backup. This document reflects the **updated** status after that backup was created and the SQL migration deployed.

## User-reported database archive

- Archive: `wow_20261114_231035.dump` (kept privately on the owner's Windows machine).
- Size: **905,256 bytes**; custom-format `pg_dump` archive with **1,311 TOC entries**.
- Source: PostgreSQL 17.11; dumped using `pg_dump` 18.6.
- Owner reported `pg_restore --file NUL` returned **PASSED**.
- The archive was not transferred here and has **not been restored** into a separate database; full data recoverability was not independently verified.
- A normal database dump does not include binary Storage object contents or cluster-level custom role passwords; preserve related resources and credentials separately when needed.
- Store the archive privately, not in GitHub or an exposed cloud directory.

## Permanent W06 migration — applied

The owner explicitly authorized moving forward after the archive check. Supabase recorded migration:

`20261114202307_admin_w06_role_profile_context_employee_conflict`

Matching GitHub source:
`supabase/migrations/20261114202307_admin_w06_role_profile_context_employee_conflict.sql`

Results:
- Active-business-employee conflict blocked in verification decisions.
- Minimal admin effective-role and published-profile revision context RPCs deployed.
- Anonymous EXECUTE denied on the public RPCs; signed-in role still verified internally.
- Full schema/grant catalog checks and rollback-only synthetic authorization cases passed.
- All test records removed by `ROLLBACK`; no regular data changed by the migration.
- The schema-only undo SQL was separately rehearsed and is at `docs/sql/w06-admin-review-security-targeted-rollback.sql`. Undoing W06 removes functions depended upon by Admin UI, so do not apply it casually.

## Outstanding gates

- Real, signed Clerk session and application HTTP RPC tests (rather than synthetic database JWT claims).
- Storage evidence signing permissions, independent payment decision and profile-revision decision tests.
- Visual QA for ADM-03/04/10 and RTL across web/Android/iOS.
- Rebase/reconcile W06 feature branch against current `main`, run CI, seek owner approval for merge.
- Optional but recommended: independent full restore rehearsal of the local database backup before release.

Full test record: `docs/w06-primary-db-live-migration-verification-2026-11-14.md`.

**State:** SQL deployed; end-to-end feature acceptance and merge still pending.

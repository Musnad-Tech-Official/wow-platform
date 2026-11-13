# W06 — Primary database deployment gate (14 November 2026)

## Confirmed environment

- Supabase project: `wow-platform`.
- Organization subscription: **Free**. Automatic daily database backups are **not included** on this plan.
- Deployed database migration history: **17 versions**, latest `20261113204859_merchant_delegate_business_scope`.
- The owner approved pre-launch testing against the primary database with isolated synthetic data.
- The proposed W06 RPCs and employee-conflict fix **are not yet deployed**.
- W06 API/schema rehearsals were carried out with explicit `BEGIN … ROLLBACK`, including a full replay of a synthetic active-employee conflict. The test left zero synthetic records and no new functions.
- Targeted *schema rollback* for the newly proposed W06 functions is saved and rehearsed: `docs/sql/w06-admin-review-security-targeted-rollback.sql`. This is **not** a complete database backup.

## Why deployment is blocked

Supabase Free plan does not provide automatic daily backups. The GitHub proposal, migration sources and targeted rollback cannot substitute for a verified full database backup.

**Do not apply the proposal permanently or enable live Admin decisions before a usable database backup exists.**

## Backup path

Use an authorized computer with a supported database dump tool. Official Supabase guides for CLI backups currently require **Supabase CLI and Docker Desktop**, and explain how to obtain the project's database connection information securely via Dashboard → Connect.

1. Confirm the project being backed up is `wow-platform` rather than another Supabase project.
2. Export **schema, data and custom roles**, preferably as separately verifiable files following the official Supabase backup/restore guide. Verify file sizes and nonempty content.
3. Account for storage objects separately: a database backup contains storage *metadata*, not the contents of files stored through Storage.
4. Keep any backup **outside** the repository, outside project source folders, and outside public cloud links. Never commit it to Git or paste passwords, tokens, or connection strings in chat.
5. Validate restoration to a disposable, isolated PostgreSQL/Supabase environment where practical. If a restore rehearsal cannot be performed, record that limitation; file presence alone is not proof of recoverability.

Supabase references:
- https://supabase.com/docs/guides/platform/backups
- https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore
- https://supabase.com/docs/reference/cli/introduction

## Deployment sequence (only after backup validation)

1. Reconcile repository migrations against all 17 deployed migration records; the admin feature branch currently contains unrelated historical changes and must be reconciled with current `main` prior to merge.
2. Generate a new migration in the actual repo with a version-compatible `supabase migration new` command, and copy only the vetted W06 DDL from `docs/sql/w06-admin-review-security-staging-proposal.sql`.
3. Review access checks for Clerk JWT / effective admin roles and SQL `SECURITY DEFINER` boundaries.
4. Apply as a single tracked migration to the explicitly identified `wow-platform` project.
5. Verify the resulting function definitions and `EXECUTE` grants, plus authenticated and unauthorized API behavior.
6. Validate real Clerk-signed viewer/reviewer/super_admin accounts, owner, active employee, revoked admin and guest. Verify status and audit rows are unchanged on denied actions. Confirm private evidence links are short-lived and scoped.
7. Review updated Supabase security advisors. Do not assume all linter warnings indicate vulnerabilities; confirm intended public discovery RPCs.
8. Run mobile/web admin review UX checks and existing quality gates. Reconcile W06 branch with `main` before PR.
9. Use the targeted rollback script **only** when reverting a faulty W06 deployment with dependencies reviewed. It removes the proposed RPCs, so Admin review UI will not function afterwards.

## Release state

- `W06_TRANSIENT_TESTS`: PASSED
- `W06_TARGETED_ROLLBACK_REHEARSAL`: PASSED
- `W06_FULL_RESTORABLE_DATABASE_BACKUP`: **NOT VERIFIED / BLOCKED**
- `W06_PERMANENT_DATABASE_MIGRATION`: NOT APPLIED
- `W06_LIVE_CLERK_ADMIN_END_TO_END`: NOT RUN
- `W06_MERGE_APPROVAL`: NOT GRANTED

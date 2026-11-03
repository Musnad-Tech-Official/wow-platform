---
name: wow-data-security
description: Use when changing WOW code or SQL touching Clerk sessions, Supabase clients/RPCs, PostgreSQL row-level security, role permissions, Storage uploads, private media or account-scoped caches.
---

# WOW data and authorization safety

1. Identify data owner, actor roles and requested action; preserve existing Clerk → Supabase session boundary and authorization on the server. UI visibility is not an access control.
2. Reuse typed `@wow/api` contracts; do not silently replace RPC calls with direct writes or introduce client `service_role`, secret keys, raw private Storage URLs, or cross-user cache reuse.
3. Check account-switch cache invalidation and states for anonymous, expired and unauthorized users. Treat partial branch permissions, revoked staff and affiliated admins as denied unless the deployed backend explicitly allows the action.
4. For SQL/RLS/grants/functions/Storage policy changes, inspect original migrations and affected policies, triggers and `SECURITY DEFINER` privileges. Never apply migrations, mutate production or run synthetic writes without confirmed staging, backup/recovery evidence and explicit authorization. See `docs/database-test-runbook.md`.
5. Run relevant local checks; propose real role-matrix tests with synthetic accounts/evidence for staging. Distinguish mocked PASS from live RLS/Storage PASS, FAIL and SKIPPED; do not infer permissions from source alone.
6. Report security impact, files changed, access-matrix checks performed and any unverified live authorization assumptions. Never include credentials, PII or private evidence in logs or Git.

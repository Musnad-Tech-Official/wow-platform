-- W06 read-only database catalog verification (PostgreSQL 17+).
-- Safe to run on the pre-launch wow-platform database after the tracked migration.
-- Does not perform any DDL, DML, role impersonation, or cleanup.
WITH expected AS (
  SELECT
    to_regprocedure('public.wow_admin_get_effective_role()') AS role_rpc,
    to_regprocedure('public.wow_admin_get_profile_revision_context(uuid)') AS baseline_rpc,
    to_regprocedure('wow_private.admin_decide_verification_checked_internal(uuid,text,text,uuid,jsonb)') AS decision_fn
)
SELECT
  (SELECT COUNT(*) = 1 FROM supabase_migrations.schema_migrations WHERE version = '20261114202307')
    AS migration_recorded,
  (role_rpc IS NOT NULL) AS effective_role_rpc_exists,
  (baseline_rpc IS NOT NULL) AS profile_baseline_rpc_exists,
  (role_rpc IS NOT NULL AND NOT has_function_privilege('anon',role_rpc,'EXECUTE')) AS effective_role_anon_denied,
  (baseline_rpc IS NOT NULL AND NOT has_function_privilege('anon',baseline_rpc,'EXECUTE')) AS baseline_anon_denied,
  (role_rpc IS NOT NULL AND has_function_privilege('authenticated',role_rpc,'EXECUTE')) AS effective_role_authenticated_granted,
  (baseline_rpc IS NOT NULL AND has_function_privilege('authenticated',baseline_rpc,'EXECUTE')) AS baseline_authenticated_granted,
  (decision_fn IS NOT NULL AND pg_get_functiondef(decision_fn) LIKE '%m.status = ''active''%')
    AS active_business_staff_conflict_enforced,
  (SELECT COUNT(*) = 0 FROM public.users WHERE id LIKE 'w06_live_auth_%') AS zero_synthetic_user_rows,
  (SELECT COUNT(*) = 0 FROM public.business_verifications WHERE id='76060000-0000-4000-8000-000000000003'::uuid) AS zero_synthetic_case_rows
FROM expected;

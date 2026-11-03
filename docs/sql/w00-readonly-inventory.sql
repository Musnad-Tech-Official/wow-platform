-- MUSNAD-WOW W00 — READ-ONLY catalog inventory, NOT a migration.
-- Run only after checking the intended project identity. Do not use this script
-- as a substitute for the original, unchanged Migration 010 010_verify.sql.
-- Every statement is SELECT-only; do not include private user rows or secrets
-- when sharing results. No writes or DDL occur.

-- A1: table RLS coverage in application schemas.
SELECT n.nspname AS schema_name,
       count(*) FILTER (WHERE c.relkind IN ('r','p')) AS table_count,
       count(*) FILTER (WHERE c.relkind IN ('r','p') AND c.relrowsecurity) AS rls_enabled,
       count(*) FILTER (WHERE c.relkind IN ('r','p') AND NOT c.relrowsecurity) AS rls_disabled
FROM pg_catalog.pg_class c
JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname IN ('public','wow_private')
GROUP BY n.nspname
ORDER BY n.nspname;

-- A2: table-policy inventory; a zero-policy RLS table may be deliberately RPC-only.
SELECT c.relname AS table_name, n.nspname AS schema_name,
       c.relrowsecurity AS rls_enabled,
       count(pol.policyname) AS policy_count
FROM pg_catalog.pg_class c
JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
LEFT JOIN pg_catalog.pg_policies pol
  ON pol.schemaname=n.nspname AND pol.tablename=c.relname
WHERE n.nspname IN ('public','wow_private') AND c.relkind IN ('r','p')
GROUP BY c.relname,n.nspname,c.relrowsecurity
ORDER BY n.nspname,c.relname;

-- A3: inspect all storage policies and offer policies, including unexpected
-- permissive policies (RLS enabled by itself is NOT authorization proof).
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_catalog.pg_policies
WHERE (schemaname='storage' AND tablename='objects')
   OR (schemaname='public' AND tablename LIKE 'offer%')
ORDER BY schemaname,tablename,policyname;

-- A4: privileges and security context for explicitly privileged functions.
SELECT n.nspname AS schema_name, p.proname AS function_name,
       pg_catalog.pg_get_function_identity_arguments(p.oid) AS argument_signature,
       p.prosecdef AS security_definer,
       pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE') AS anon_can_execute,
       pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE') AS authenticated_can_execute,
       p.proconfig AS function_settings
FROM pg_catalog.pg_proc p
JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname IN ('public','wow_private') AND p.prosecdef
ORDER BY n.nspname,p.proname;

-- A5: bucket visibility and configured file restrictions (no storage objects).
SELECT name, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE name LIKE 'wow-%'
ORDER BY name;

-- A6: expected payment-proof write-block constraint presence, not its semantics.
SELECT n.nspname AS schema_name, c.relname AS table_name, co.conname AS constraint_name,
       pg_catalog.pg_get_constraintdef(co.oid) AS constraint_definition
FROM pg_catalog.pg_constraint co
JOIN pg_catalog.pg_class c ON c.oid=co.conrelid
JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relname='subscription_payments'
  AND co.conname='subscription_payments_proof_disabled_ck';

-- A7: test whether migration-history relation exists. A relation's presence
-- alone does not attest that original migrations 001-010 are recovered.
SELECT pg_catalog.to_regclass('supabase_migrations.schema_migrations') IS NOT NULL
       AS migration_history_relation_exists;

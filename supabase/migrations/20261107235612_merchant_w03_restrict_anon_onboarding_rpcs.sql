-- Migration: 20261107235612_merchant_w03_restrict_anon_onboarding_rpcs.sql
-- Purpose: Restrict execution of merchant onboarding public RPCs exclusively to authenticated users.
--
-- RATIONALE:
-- In PostgreSQL / Supabase, REVOKE ... FROM PUBLIC does not always remove an explicit GRANT TO anon
-- if anon was previously granted directly or through default PostgREST role assignments.
-- This migration authoritatively and idempotently revokes EXECUTE on all merchant onboarding public RPCs
-- from both PUBLIC and anon, granting EXECUTE strictly to authenticated and service_role.
-- Unrelated public discovery functions (such as wow_public_list_categories) remain unaffected.

-- 1. Step 1 (MER-02-01) RPCs
REVOKE ALL PRIVILEGES ON FUNCTION "public"."wow_create_business_with_category"("text", "uuid", "text") FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION "public"."wow_create_business_with_category"("text", "uuid", "text") TO authenticated, service_role;

REVOKE ALL PRIVILEGES ON FUNCTION "public"."wow_update_business_draft"("uuid", "text", "uuid", "text") FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION "public"."wow_update_business_draft"("uuid", "text", "uuid", "text") TO authenticated, service_role;

-- 2. Step 2 (MER-02-02) RPCs
REVOKE ALL PRIVILEGES ON FUNCTION "public"."wow_save_business_representative_draft"("uuid", "text", "text", "text", "text", integer, "text") FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION "public"."wow_save_business_representative_draft"("uuid", "text", "text", "text", "text", integer, "text") TO authenticated, service_role;

REVOKE ALL PRIVILEGES ON FUNCTION "public"."wow_get_business_representative_draft"("uuid") FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION "public"."wow_get_business_representative_draft"("uuid") TO authenticated, service_role;

-- 3. Step 3 (MER-02-03) & Baseline Branch RPCs
REVOKE ALL PRIVILEGES ON FUNCTION "public"."wow_create_branch"("uuid", "text", "text", "text", "text", numeric, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION "public"."wow_create_branch"("uuid", "text", "text", "text", "text", numeric, numeric) TO authenticated, service_role;

REVOKE ALL PRIVILEGES ON FUNCTION "public"."wow_update_merchant_draft"("uuid", "uuid", "jsonb") FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION "public"."wow_update_merchant_draft"("uuid", "uuid", "jsonb") TO authenticated, service_role;

REVOKE ALL PRIVILEGES ON FUNCTION "public"."wow_delete_draft_branch"("uuid", "uuid") FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION "public"."wow_delete_draft_branch"("uuid", "uuid") TO authenticated, service_role;

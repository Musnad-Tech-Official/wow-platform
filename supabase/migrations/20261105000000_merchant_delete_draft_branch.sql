-- Migration: 20261105000000_merchant_delete_draft_branch.sql
-- Additive migration for W03.3 (MER-02-03): Merchant Onboarding Step 3 - Delete Draft Branch RPC
-- Adds public.wow_delete_draft_branch and wow_private.delete_draft_branch_internal.
-- Strictly scoped to eligible draft/rejected non-primary branches owned by the authenticated caller.
-- Defensive verification ensures zero references in verifications, offers, team assignments, or profile revisions.

-- 0. Expand wow_private.merchant_operation_events constraint to permit branch_draft_delete
-- Source Rationale:
-- 1. 'business_create' was introduced in migration 20261103000000_merchant_requested_category.sql (line 118)
--    during wow_private.create_business_with_category_internal, inserting into merchant_operation_events.
-- 2. 'business_representative_draft_update' was introduced in migration 20261104000000_merchant_representative_draft.sql
--    (line 167) during wow_private.save_representative_draft_internal, inserting into merchant_operation_events.
-- 3. 'branch_draft_delete' is introduced in the current migration for wow_private.delete_draft_branch_internal.
-- The baseline CHECK constraint (merchant_operation_events_operation_check) omitted these operations,
-- which would cause any runtime insertion with these operation strings to fail with check constraint violation 23514.
-- This migration authoritatively harmonizes the constraint to include all three verified operations.
DO $$
BEGIN
  ALTER TABLE "wow_private"."merchant_operation_events"
    DROP CONSTRAINT IF EXISTS "merchant_operation_events_operation_check";

  ALTER TABLE "wow_private"."merchant_operation_events"
    ADD CONSTRAINT "merchant_operation_events_operation_check"
    CHECK (operation = ANY (ARRAY[
      'employee_grant'::text,
      'employee_update'::text,
      'employee_revoke'::text,
      'business_pause'::text,
      'branch_pause'::text,
      'business_draft_update'::text,
      'branch_draft_update'::text,
      'profile_revision_submit'::text,
      'profile_revision_approve'::text,
      'profile_revision_reject'::text,
      'business_create'::text,
      'business_representative_draft_update'::text,
      'branch_draft_delete'::text
    ]));
END $$;

-- 1. Internal RPC: wow_private.delete_draft_branch_internal
CREATE OR REPLACE FUNCTION "wow_private"."delete_draft_branch_internal"(
  "p_business_id" "uuid",
  "p_branch_id" "uuid"
) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_actor TEXT := (SELECT auth.jwt() ->> 'sub');
  v_bs TEXT;
  v_br_status TEXT;
  v_is_primary BOOLEAN;
BEGIN
  -- Authenticated caller required
  IF (SELECT auth.jwt() ->> 'role') IS DISTINCT FROM 'authenticated'
     OR v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required'
      USING ERRCODE = '42501';
  END IF;

  -- Active synced user profile required
  IF NOT EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = v_actor
      AND u.account_status = 'active'
      AND u.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Active synced profile required'
      USING ERRCODE = '42501';
  END IF;

  -- Verify business ownership and lock business record
  SELECT status INTO v_bs
  FROM public.businesses
  WHERE id = p_business_id
  FOR UPDATE;

  IF v_bs IS NULL OR NOT wow_private.is_business_owner(p_business_id) THEN
    RAISE EXCEPTION 'Active owner required'
      USING ERRCODE = '42501';
  END IF;

  IF v_bs NOT IN ('draft', 'rejected') THEN
    RAISE EXCEPTION 'Only draft/rejected businesses may delete branches'
      USING ERRCODE = '22023';
  END IF;

  -- Lock branch record and verify existence and scope
  SELECT is_primary, status
  INTO v_is_primary, v_br_status
  FROM public.business_branches
  WHERE id = p_branch_id
    AND business_id = p_business_id
  FOR UPDATE;

  IF v_br_status IS NULL THEN
    -- Branch does not exist for this business; return false idempotently
    RETURN false;
  END IF;

  -- Guard: Primary branch can never be deleted through this workflow
  IF v_is_primary THEN
    RAISE EXCEPTION 'Primary branch cannot be deleted'
      USING ERRCODE = '22023';
  END IF;

  -- Guard: Only draft or rejected branches can be deleted directly
  IF v_br_status NOT IN ('draft', 'rejected') THEN
    RAISE EXCEPTION 'Only draft/rejected branches may be deleted'
      USING ERRCODE = '22023';
  END IF;

  -- Defensive reference checks (safe failure instead of cascading deletion)
  IF EXISTS (
    SELECT 1
    FROM public.business_verifications
    WHERE business_id = p_business_id
      AND branch_id = p_branch_id
  ) THEN
    RAISE EXCEPTION 'Cannot delete branch referenced in verification requests'
      USING ERRCODE = '23503';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.offer_branches
    WHERE business_id = p_business_id
      AND branch_id = p_branch_id
  ) THEN
    RAISE EXCEPTION 'Cannot delete branch associated with offer versions'
      USING ERRCODE = '23503';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.business_member_branches
    WHERE business_id = p_business_id
      AND branch_id = p_branch_id
  ) THEN
    RAISE EXCEPTION 'Cannot delete branch with assigned team members'
      USING ERRCODE = '23503';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.business_profile_revisions
    WHERE business_id = p_business_id
      AND branch_id = p_branch_id
  ) THEN
    RAISE EXCEPTION 'Cannot delete branch with pending profile revisions'
      USING ERRCODE = '23503';
  END IF;

  -- Execute deletion
  DELETE FROM public.business_branches
  WHERE id = p_branch_id
    AND business_id = p_business_id;

  -- Record audit event in merchant_operation_events
  INSERT INTO wow_private.merchant_operation_events(
    business_id,
    actor_user_id,
    operation,
    target_id,
    metadata
  ) VALUES (
    p_business_id,
    v_actor,
    'branch_draft_delete',
    p_branch_id::text,
    jsonb_build_object('deleted_at', now())
  );

  RETURN true;
END;
$$;

ALTER FUNCTION "wow_private"."delete_draft_branch_internal"("p_business_id" "uuid", "p_branch_id" "uuid") OWNER TO "postgres";

REVOKE ALL PRIVILEGES ON FUNCTION "wow_private"."delete_draft_branch_internal"("p_business_id" "uuid", "p_branch_id" "uuid") FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION "wow_private"."delete_draft_branch_internal"("p_business_id" "uuid", "p_branch_id" "uuid") TO service_role;

-- 2. Public API RPC: public.wow_delete_draft_branch
CREATE OR REPLACE FUNCTION "public"."wow_delete_draft_branch"(
  "p_business_id" "uuid",
  "p_branch_id" "uuid"
) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  RETURN wow_private.delete_draft_branch_internal(p_business_id, p_branch_id);
END;
$$;

ALTER FUNCTION "public"."wow_delete_draft_branch"("p_business_id" "uuid", "p_branch_id" "uuid") OWNER TO "postgres";

REVOKE ALL PRIVILEGES ON FUNCTION "public"."wow_delete_draft_branch"("p_business_id" "uuid", "p_branch_id" "uuid") FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION "public"."wow_delete_draft_branch"("p_business_id" "uuid", "p_branch_id" "uuid") TO authenticated;
GRANT EXECUTE ON FUNCTION "public"."wow_delete_draft_branch"("p_business_id" "uuid", "p_branch_id" "uuid") TO service_role;

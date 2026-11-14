-- W06 Admin batch 02: minimal privileged admin role and published profile
-- context RPCs; prevent admins reviewing an employer business.
-- Reviewed against live wow-platform DB on 2026-11-14.
-- Backup taken externally and archive read tested; full restore not rehearsed.
-- Schema-only rollback: docs/sql/w06-admin-review-security-targeted-rollback.sql
-- No data changes are introduced by this migration.

SET lock_timeout = '5s';
SET statement_timeout = '25s';

CREATE OR REPLACE FUNCTION wow_private.admin_effective_role_internal()
RETURNS text
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_role text;
  v_subject text := (SELECT auth.jwt() ->> 'sub');
BEGIN
  IF v_subject IS NULL OR wow_private.has_admin_permission(false) IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'Platform admin access required' USING ERRCODE = '42501';
  END IF;

  SELECT a.role INTO v_role FROM wow_private.admin_members a
  WHERE a.user_id = v_subject AND a.is_active;

  IF v_role NOT IN ('super_admin','reviewer','viewer') OR v_role IS NULL THEN
    RAISE EXCEPTION 'No authorized role' USING ERRCODE = '42501';
  END IF;
  RETURN v_role;
END;
$$;

REVOKE ALL ON FUNCTION wow_private.admin_effective_role_internal() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION wow_private.admin_effective_role_internal() TO authenticated;

CREATE OR REPLACE FUNCTION public.wow_admin_get_effective_role()
RETURNS text
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT wow_private.admin_effective_role_internal();
$$;

REVOKE ALL ON FUNCTION public.wow_admin_get_effective_role() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.wow_admin_get_effective_role() TO authenticated;

-- Minimal, admin-only published-state comparison for submitted profile revisions.
-- It returns only allowlisted baseline fields; no owner identity, evidence paths,
-- private notes, or raw table projections.
CREATE OR REPLACE FUNCTION wow_private.admin_profile_revision_context_internal(p_revision_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = ''
AS $w06safe$
DECLARE
  v_business uuid;
  v_branch uuid;
  v_current jsonb;
BEGIN
  IF wow_private.has_admin_permission(false) IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'Platform admin access required' USING ERRCODE = '42501';
  END IF;

  SELECT r.business_id, r.branch_id INTO v_business, v_branch
  FROM public.business_profile_revisions r WHERE r.id = p_revision_id;
  IF v_business IS NULL THEN RETURN NULL; END IF;

  IF v_branch IS NULL THEN
    SELECT jsonb_build_object(
      'name', b.name,
      'description', b.description,
      'contact_phone', b.contact_phone
    ) INTO v_current
    FROM public.businesses b WHERE b.id = v_business;
  ELSE
    SELECT jsonb_build_object(
      'name', br.name,
      'city', br.city,
      'district', br.district,
      'address_line', br.address_line,
      'latitude', br.latitude,
      'longitude', br.longitude
    ) INTO v_current
    FROM public.business_branches br
    WHERE br.id = v_branch AND br.business_id = v_business;
  END IF;

  IF v_current IS NULL THEN RETURN NULL; END IF;

  RETURN jsonb_build_object(
    'revision_id', p_revision_id,
    'business_id', v_business,
    'branch_id', v_branch,
    'current', v_current
  );
END;
$w06safe$;

REVOKE ALL ON FUNCTION wow_private.admin_profile_revision_context_internal(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION wow_private.admin_profile_revision_context_internal(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.wow_admin_get_profile_revision_context(p_revision_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path = ''
AS $w06safe$
  SELECT wow_private.admin_profile_revision_context_internal(p_revision_id);
$w06safe$;

REVOKE ALL ON FUNCTION public.wow_admin_get_profile_revision_context(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.wow_admin_get_profile_revision_context(uuid) TO authenticated;

-- Preserve all existing preconditions, locks, reasons, audit writes and status
-- updates, adding only the active business membership conflict.
CREATE OR REPLACE FUNCTION wow_private.admin_decide_verification_internal(p_verification_id uuid, p_decision text, p_reason text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_reviewer TEXT := (SELECT auth.jwt() ->> 'sub');
  v_business_id UUID;
  v_branch_id UUID;
  v_request_type TEXT;
  v_case_status TEXT;
  v_business_status TEXT;
  v_branch_status TEXT;
  v_reason TEXT := NULLIF(btrim(p_reason), '');
BEGIN
  IF wow_private.has_admin_permission(true) IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'Review permission required' USING ERRCODE = '42501';
  END IF;
  IF p_decision NOT IN ('approved', 'rejected', 'needs_info')
     OR p_decision IS NULL THEN
    RAISE EXCEPTION 'Invalid decision' USING ERRCODE = '22023';
  END IF;
  IF (p_decision <> 'approved' AND
      (v_reason IS NULL OR char_length(v_reason) NOT BETWEEN 5 AND 2000))
     OR (v_reason IS NOT NULL AND char_length(v_reason) > 2000) THEN
    RAISE EXCEPTION 'Decision reason is required for rejection and needs_info'
      USING ERRCODE = '22023';
  END IF;

  -- Lock in the same order as submission: business, branch, case.
  SELECT v.business_id, v.branch_id INTO v_business_id, v_branch_id
  FROM public.business_verifications v WHERE v.id = p_verification_id;
  IF v_business_id IS NULL THEN
    RAISE EXCEPTION 'Verification not found' USING ERRCODE = '22023';
  END IF;
  SELECT b.status INTO v_business_status
  FROM public.businesses b WHERE b.id = v_business_id FOR UPDATE;
  SELECT br.status INTO v_branch_status
  FROM public.business_branches br
  WHERE br.business_id = v_business_id AND br.id = v_branch_id FOR UPDATE;
  SELECT v.request_type, v.status INTO v_request_type, v_case_status
  FROM public.business_verifications v WHERE v.id = p_verification_id FOR UPDATE;

  -- Independent review: nobody can approve/reject their own business.
  IF EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = v_business_id AND b.owner_user_id = v_reviewer
  ) OR EXISTS (
    SELECT 1 FROM public.business_members m
    WHERE m.business_id = v_business_id
      AND m.user_id = v_reviewer
      AND m.status = 'active'
  ) THEN
    RAISE EXCEPTION 'A business owner or active staff member cannot review their own qualification'
      USING ERRCODE = '42501';
  END IF;

  IF v_case_status <> 'submitted' THEN
    RAISE EXCEPTION 'Only submitted verifications may be reviewed'
      USING ERRCODE = '22023';
  END IF;
  IF v_branch_status <> 'pending_review'
     OR (v_request_type = 'initial' AND v_business_status <> 'pending_review')
     OR (v_request_type = 'branch_addition' AND v_business_status <> 'approved')
     OR v_request_type NOT IN ('initial', 'branch_addition') THEN
    RAISE EXCEPTION 'Verification target is not in the required review state'
      USING ERRCODE = '22023';
  END IF;

  INSERT INTO wow_private.verification_decisions (
    verification_id, reviewer_user_id, decision, from_status,
    business_status_before, branch_status_before, reason
  ) VALUES (
    p_verification_id, v_reviewer, p_decision, v_case_status,
    v_business_status, v_branch_status, v_reason
  );

  UPDATE public.business_verifications
  SET status = p_decision,
      reviewed_by_user_id = v_reviewer,
      merchant_feedback = v_reason,
      decided_at = CASE WHEN p_decision = 'needs_info' THEN NULL ELSE now() END
  WHERE id = p_verification_id;

  IF p_decision IN ('approved', 'rejected') THEN
    UPDATE public.business_branches SET
      status = p_decision,
      approved_at = CASE WHEN p_decision = 'approved' THEN now() ELSE NULL END
    WHERE id = v_branch_id AND business_id = v_business_id;
    IF v_request_type = 'initial' THEN
      UPDATE public.businesses SET
        status = p_decision,
        reviewed_at = now(),
        approved_at = CASE WHEN p_decision = 'approved' THEN now() ELSE NULL END
      WHERE id = v_business_id;
    END IF;
  END IF;
  RETURN p_verification_id;
END;
$function$
;

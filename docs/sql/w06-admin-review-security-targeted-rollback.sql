-- W06 targeted schema rollback; not a full database backup.
-- Reverses the W06 newly introduced RPCs and restores the captured
-- live verification decision function as inspected on 2026-11-14.
-- DO NOT RUN unless W06 deployment must be reverted, after validating dependencies.
-- Preserves application data; no DELETE/TRUNCATE is performed.
-- REVIEW OWNER / GRANTS at rollback time.
DROP FUNCTION IF EXISTS public.wow_admin_get_profile_revision_context(uuid);
DROP FUNCTION IF EXISTS public.wow_admin_get_effective_role();
DROP FUNCTION IF EXISTS wow_private.admin_profile_revision_context_internal(uuid);
DROP FUNCTION IF EXISTS wow_private.admin_effective_role_internal();

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
  ) THEN
    RAISE EXCEPTION 'A business owner cannot review their own qualification'
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
$function$;

-- Original live signature ACL: {postgres=X/postgres,authenticated=X/postgres}
REVOKE ALL ON FUNCTION wow_private.admin_decide_verification_internal(uuid,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION wow_private.admin_decide_verification_internal(uuid,text,text) TO authenticated;

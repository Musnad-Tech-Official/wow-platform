-- Stage 5C: captured Development function definitions before migration.
-- Review before use; restoring legacy approval removes the new evidence-acknowledgment guard.
BEGIN;
CREATE OR REPLACE FUNCTION wow_private.admin_decide_profile_revision_internal(p_revision_id uuid, p_decision text, p_reason text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_business UUID;v_branch UUID;v_patch JSONB;v_status TEXT;
  v_bs TEXT;v_br TEXT;v_reviewer TEXT:=(SELECT auth.jwt()->>'sub');
  v_reason TEXT:=NULLIF(btrim(p_reason),'');
BEGIN
  IF NOT wow_private.has_admin_permission(true) THEN
    RAISE EXCEPTION 'Reviewer authorization required' USING ERRCODE='42501';
  END IF;
  IF p_decision IS NULL OR p_decision NOT IN ('approved','rejected')
    OR (p_decision='rejected' AND (v_reason IS NULL OR length(v_reason) NOT BETWEEN 5 AND 2000))
    OR length(v_reason)>2000 THEN
    RAISE EXCEPTION 'Invalid decision/reason' USING ERRCODE='22023';
  END IF;
  -- Parent lock first, then revision (consistent with merchant submit).
  SELECT business_id INTO v_business FROM public.business_profile_revisions
    WHERE id=p_revision_id;
  IF v_business IS NULL THEN
    RAISE EXCEPTION 'Revision not found' USING ERRCODE='22023';
  END IF;
  SELECT status INTO v_bs FROM public.businesses WHERE id=v_business FOR UPDATE;
  SELECT branch_id,patch,status INTO v_branch,v_patch,v_status
    FROM public.business_profile_revisions WHERE id=p_revision_id FOR UPDATE;
  IF v_status<>'submitted' OR v_bs<>'approved' THEN
    RAISE EXCEPTION 'Only submitted revisions on approved businesses may be reviewed'
      USING ERRCODE='22023';
  END IF;
  IF v_branch IS NOT NULL THEN
    SELECT status INTO v_br FROM public.business_branches
      WHERE id=v_branch AND business_id=v_business FOR UPDATE;
    IF v_br<>'approved' THEN
      RAISE EXCEPTION 'Target branch is no longer approved' USING ERRCODE='22023';
    END IF;
  END IF;
  IF EXISTS (SELECT 1 FROM public.businesses b
    WHERE b.id=v_business AND b.owner_user_id=v_reviewer)
     OR EXISTS (SELECT 1 FROM public.business_members m
       WHERE m.business_id=v_business AND m.user_id=v_reviewer AND m.status='active') THEN
    RAISE EXCEPTION 'Cannot review own or affiliated business' USING ERRCODE='42501';
  END IF;
  IF p_decision='approved' THEN
    PERFORM wow_private.apply_merchant_profile_patch(v_business,v_branch,v_patch);
  END IF;
  UPDATE public.business_profile_revisions SET status=p_decision,
    reviewed_by_user_id=v_reviewer,review_reason=v_reason,decided_at=now()
    WHERE id=p_revision_id;
  INSERT INTO wow_private.merchant_operation_events(
    business_id,actor_user_id,operation,target_id,metadata
  ) VALUES(v_business,v_reviewer,
    CASE WHEN p_decision='approved' THEN 'profile_revision_approve' ELSE 'profile_revision_reject' END,
    p_revision_id::text,jsonb_build_object('reason',v_reason,'branch_id',v_branch));
  RETURN p_revision_id;
END; $function$
;

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

CREATE OR REPLACE FUNCTION wow_private.admin_get_verification_internal(p_verification_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_result JSONB;
BEGIN
  IF wow_private.has_admin_permission(false) IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'Platform admin access required' USING ERRCODE = '42501';
  END IF;
  SELECT jsonb_build_object(
    'id', v.id, 'business_id', v.business_id, 'branch_id', v.branch_id,
    'business_name', b.name, 'request_type', v.request_type,
    'status', v.status, 'requested_by_user_id', v.requested_by_user_id,
    'reviewed_by_user_id', v.reviewed_by_user_id,
    'evidence_refs', v.evidence_refs,
    'private_notes', v.private_notes,
    'merchant_feedback', v.merchant_feedback,
    'submitted_at', v.submitted_at, 'decided_at', v.decided_at,
    'submission_history', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', s.id, 'submitted_by_user_id', s.submitted_by_user_id,
        'evidence_refs', s.evidence_refs, 'created_at', s.created_at
      ) ORDER BY s.created_at, s.id)
      FROM wow_private.verification_submissions s
      WHERE s.verification_id = v.id
    ), '[]'::jsonb),
    'decision_history', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', d.id, 'reviewer_user_id', d.reviewer_user_id,
        'decision', d.decision, 'from_status', d.from_status,
        'business_status_before', d.business_status_before,
        'branch_status_before', d.branch_status_before,
        'reason', d.reason, 'created_at', d.created_at
      ) ORDER BY d.created_at, d.id)
      FROM wow_private.verification_decisions d
      WHERE d.verification_id = v.id
    ), '[]'::jsonb)
  ) INTO v_result
  FROM public.business_verifications v
  JOIN public.businesses b ON b.id = v.business_id
  WHERE v.id = p_verification_id;
  RETURN v_result;
END;
$function$
;

CREATE OR REPLACE FUNCTION wow_private.admin_list_profile_revisions_internal(p_limit integer, p_offset integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_result JSONB;
BEGIN
  IF NOT wow_private.has_admin_permission(false) THEN
    RAISE EXCEPTION 'Platform admin required' USING ERRCODE='42501';
  END IF;
  IF p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 100
     OR p_offset IS NULL OR p_offset NOT BETWEEN 0 AND 10000 THEN
    RAISE EXCEPTION 'Invalid pagination' USING ERRCODE='22023';
  END IF;
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id',r.id,'business_id',r.business_id,'branch_id',r.branch_id,
    'patch',r.patch,'status',r.status,'created_at',r.created_at
  ) ORDER BY r.created_at,r.id),'[]'::jsonb) INTO v_result
  FROM (SELECT * FROM public.business_profile_revisions
    WHERE status='submitted' ORDER BY created_at,id LIMIT p_limit OFFSET p_offset) r;
  RETURN v_result;
END; $function$
;

CREATE OR REPLACE FUNCTION wow_private.admin_profile_revision_context_internal(p_revision_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$
;
DROP FUNCTION IF EXISTS public.wow_admin_decide_business_verification_checked(uuid,text,text,uuid,jsonb);
DROP FUNCTION IF EXISTS wow_private.admin_decide_verification_checked_internal(uuid,text,text,uuid,jsonb);
COMMIT;

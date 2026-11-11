-- Revalidate business category and required private proof at final approval,
-- not only at submission. Submitted evidence remains version-immutable.
CREATE OR REPLACE FUNCTION wow_private.admin_decide_offer_internal(p_version_id uuid, p_decision text, p_reason text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_offer UUID;v_business UUID;v_current UUID;v_reviewer TEXT:=(SELECT auth.jwt()->>'sub');
  v_status TEXT;v_offer_status TEXT;v_reason TEXT:=NULLIF(btrim(p_reason),'');
BEGIN
  IF NOT wow_private.has_admin_permission(true) THEN
    RAISE EXCEPTION 'Review permission required' USING ERRCODE = '42501';
  END IF;
  IF p_decision IS NULL OR p_decision NOT IN ('approved','rejected','needs_info')
    OR (p_decision <> 'approved' AND (v_reason IS NULL OR char_length(v_reason) NOT BETWEEN 5 AND 2000))
    OR (v_reason IS NOT NULL AND char_length(v_reason)>2000) THEN
    RAISE EXCEPTION 'Invalid offer decision or missing reason' USING ERRCODE='22023';
  END IF;
  -- Lock parent before version, consistently with merchant RPCs.
  SELECT offer_id INTO v_offer FROM public.offer_versions WHERE id=p_version_id;
  IF v_offer IS NULL THEN
    RAISE EXCEPTION 'Offer version not found' USING ERRCODE='22023';
  END IF;
  SELECT business_id,current_version_id,status INTO v_business,v_current,v_offer_status
    FROM public.offers WHERE id=v_offer FOR UPDATE;
  SELECT review_status INTO v_status FROM public.offer_versions
    WHERE id=p_version_id AND offer_id=v_offer FOR UPDATE;
  IF v_status <> 'pending' THEN
    RAISE EXCEPTION 'Only pending versions can be reviewed' USING ERRCODE='22023';
  END IF;
  IF EXISTS (SELECT 1 FROM public.businesses WHERE id=v_business AND owner_user_id=v_reviewer)
     OR EXISTS (SELECT 1 FROM public.business_members
       WHERE business_id=v_business AND user_id=v_reviewer AND status='active') THEN
    RAISE EXCEPTION 'Cannot review own or affiliated business' USING ERRCODE='42501';
  END IF;
  IF p_decision='approved' THEN
    -- Submitted data may no longer be eligible by the time it is reviewed.
    IF NOT EXISTS (
      SELECT 1 FROM public.offer_versions v
      JOIN public.business_categories bc ON bc.business_id=v_business AND bc.category_id=v.category_id
      JOIN public.categories cat ON cat.id=bc.category_id AND cat.is_active
      WHERE v.id=p_version_id AND v.business_id=v_business
    ) THEN
      RAISE EXCEPTION 'Offer category is no longer approved for this business' USING ERRCODE='22023';
    END IF;
    IF EXISTS (
      SELECT 1 FROM public.offer_versions v WHERE v.id=p_version_id
        AND (v.original_price IS NOT NULL OR v.is_clearance)
    ) AND NOT EXISTS (
      SELECT 1 FROM wow_private.offer_evidence_drafts e WHERE e.offer_version_id=p_version_id
        AND jsonb_array_length(e.documents)>0
        AND NOT EXISTS (
          SELECT 1 FROM jsonb_array_elements(e.documents) item
          WHERE NOT EXISTS (
            SELECT 1 FROM storage.objects obj WHERE obj.bucket_id='wow-verification-evidence'
              AND obj.name=item->>'storageKey'
          )
        )
    ) THEN
      RAISE EXCEPTION 'Required offer evidence missing or unavailable at review' USING ERRCODE='22023';
    END IF;
    IF NOT EXISTS(SELECT 1 FROM public.businesses WHERE id=v_business AND status='approved')
       OR EXISTS (
         SELECT 1 FROM public.offer_branches ob
         JOIN public.business_branches b ON b.id=ob.branch_id
         WHERE ob.offer_version_id=p_version_id
           AND (b.status<>'approved' OR b.business_id<>v_business)
       ) THEN
      RAISE EXCEPTION 'Business and branches must still be approved' USING ERRCODE='22023';
    END IF;
  END IF;
  INSERT INTO public.offer_reviews(offer_version_id,reviewer_user_id,decision,reason,previous_status)
    VALUES (p_version_id,v_reviewer,p_decision,v_reason,v_status);
  IF p_decision='approved' THEN
    UPDATE public.offer_versions SET review_status='approved',approved_at=now()
      WHERE id=p_version_id;
    UPDATE public.offers SET current_version_id=p_version_id,
      merchant_available=(SELECT merchant_available_requested FROM public.offer_versions WHERE id=p_version_id),
      status=CASE WHEN v_offer_status='paused' THEN 'paused' ELSE 'active' END
      WHERE id=v_offer;
  ELSE
    -- needs_info is represented as rejected draft submission with preserved review history.
    -- Merchant prepares a NEW draft revision; original submission is immutable.
    UPDATE public.offer_versions SET review_status='rejected'
      WHERE id=p_version_id;
    IF v_current IS NULL THEN
      UPDATE public.offers SET status='draft' WHERE id=v_offer;
    END IF;
  END IF;
  RETURN p_version_id;
END;
$function$;

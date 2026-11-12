-- Availability is a per-version editor choice, applied only when that
-- version is approved. This avoids changing live visibility while a revision
-- is merely a draft or under review.
ALTER TABLE public.offer_versions
  ADD COLUMN IF NOT EXISTS merchant_available_requested boolean NOT NULL DEFAULT true;

CREATE OR REPLACE FUNCTION wow_private.save_offer_draft_internal(p_offer_id uuid, p_payload jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_business_id UUID;
  v_version_id UUID;
  v_next_no INTEGER;
  v_user_id TEXT := (SELECT auth.jwt() ->> 'sub');
  v_item JSONB;
  v_attribute JSONB;
  v_branch JSONB;
  v_item_id UUID;
  v_branch_id UUID;
  v_category_id UUID;
  v_i INTEGER := 0;
  v_j INTEGER;
  v_allowed_keys TEXT[] := ARRAY[
    'title','description','offer_kind','category_id','is_clearance','merchant_available_requested','original_price','final_price',
    'currency','benefit_details','mandatory_fees','terms',
    'stock_or_condition_notice','starts_at','ends_at','items','branches'
  ];
BEGIN
  IF p_payload IS NULL OR jsonb_typeof(p_payload) <> 'object' THEN
    RAISE EXCEPTION 'Draft payload must be an object' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (
    SELECT 1 FROM jsonb_object_keys(p_payload) AS x(k)
    WHERE NOT (x.k = ANY(v_allowed_keys))
  ) THEN
    RAISE EXCEPTION 'Unknown draft field' USING ERRCODE = '22023';
  END IF;
  IF jsonb_typeof(p_payload->'items') IS DISTINCT FROM 'array'
     OR jsonb_typeof(p_payload->'branches') IS DISTINCT FROM 'array'
     OR jsonb_array_length(p_payload->'items') NOT BETWEEN 1 AND 50
     OR jsonb_array_length(p_payload->'branches') NOT BETWEEN 0 AND 50 THEN
    RAISE EXCEPTION 'Draft requires 1-50 items and 0-50 branches' USING ERRCODE = '22023';
  END IF;
  SELECT business_id INTO v_business_id
    FROM public.offers WHERE id = p_offer_id FOR UPDATE;
  IF v_business_id IS NULL
     OR NOT wow_private.can_manage_offer_business(v_business_id,'draft') THEN
    RAISE EXCEPTION 'Offer drafting permission required' USING ERRCODE = '42501';
  END IF;

  -- Validate category if supplied
  IF p_payload ? 'category_id' AND NULLIF(btrim(p_payload->>'category_id'),'') IS NOT NULL THEN
    v_category_id := (p_payload->>'category_id')::UUID;
    IF NOT EXISTS (
      SELECT 1 FROM public.categories c
      WHERE c.id = v_category_id AND c.is_active
        AND EXISTS (
          SELECT 1 FROM public.business_categories bc
          WHERE bc.business_id = v_business_id AND bc.category_id = c.id
        )
    ) THEN
      RAISE EXCEPTION 'Category not found or inactive' USING ERRCODE = '22023';
    END IF;
  ELSE
    v_category_id := NULL;
  END IF;

  SELECT id INTO v_version_id FROM public.offer_versions
    WHERE offer_id = p_offer_id AND review_status = 'draft' FOR UPDATE;
  IF v_version_id IS NULL THEN
    SELECT COALESCE(MAX(version_no),0) + 1 INTO v_next_no
    FROM public.offer_versions WHERE offer_id = p_offer_id;
    INSERT INTO public.offer_versions(business_id,offer_id,version_no,created_by_user_id)
      VALUES (v_business_id,p_offer_id,v_next_no,v_user_id) RETURNING id INTO v_version_id;
  ELSE
    -- Delete descendants first, and then replace draft content.
    DELETE FROM public.offer_item_attributes a USING public.offer_items i
      WHERE a.offer_item_id = i.id AND i.offer_version_id = v_version_id;
    DELETE FROM public.offer_media WHERE offer_version_id = v_version_id;
    DELETE FROM public.offer_items WHERE offer_version_id = v_version_id;
    DELETE FROM public.offer_branches WHERE offer_version_id = v_version_id;
  END IF;

  UPDATE public.offer_versions SET
    title = NULLIF(btrim(p_payload->>'title'),''),
    description = NULLIF(btrim(p_payload->>'description'),''),
    offer_kind = NULLIF(btrim(p_payload->>'offer_kind'),''),
    category_id = v_category_id,
    is_clearance = COALESCE((p_payload->>'is_clearance')::boolean, false),
    merchant_available_requested = COALESCE((p_payload->>'merchant_available_requested')::boolean, true),
    original_price = NULLIF(p_payload->>'original_price','')::NUMERIC,
    final_price = NULLIF(p_payload->>'final_price','')::NUMERIC,
    currency = NULLIF(btrim(p_payload->>'currency'),''),
    benefit_details = NULLIF(btrim(p_payload->>'benefit_details'),''),
    mandatory_fees = NULLIF(btrim(p_payload->>'mandatory_fees'),''),
    terms = NULLIF(btrim(p_payload->>'terms'),''),
    stock_or_condition_notice = NULLIF(btrim(p_payload->>'stock_or_condition_notice'),''),
    starts_at = NULLIF(p_payload->>'starts_at','')::TIMESTAMPTZ,
    ends_at = NULLIF(p_payload->>'ends_at','')::TIMESTAMPTZ
  WHERE id = v_version_id;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_payload->'items') LOOP
    IF jsonb_typeof(v_item) <> 'object'
       OR (v_item->>'name') IS NULL
       OR (v_item->>'item_type') IS NULL
       OR (v_item ? 'attributes' AND jsonb_typeof(v_item->'attributes') <> 'array') THEN
      RAISE EXCEPTION 'Invalid offer item' USING ERRCODE = '22023';
    END IF;
    IF (v_item ? 'attributes') AND jsonb_array_length(v_item->'attributes') > 20 THEN
      RAISE EXCEPTION 'Too many item attributes' USING ERRCODE = '22023';
    END IF;
    INSERT INTO public.offer_items(
      offer_version_id,item_type,name,description,brand,model,
      quantity,unit,reference_value,sort_order
    ) VALUES (
      v_version_id,v_item->>'item_type',btrim(v_item->>'name'),
      NULLIF(btrim(v_item->>'description'),''),NULLIF(btrim(v_item->>'brand'),''),
      NULLIF(btrim(v_item->>'model'),''),
      COALESCE(NULLIF(v_item->>'quantity','')::NUMERIC,1),
      COALESCE(NULLIF(btrim(v_item->>'unit'),''),'piece'),
      NULLIF(v_item->>'reference_value','')::NUMERIC,v_i
    ) RETURNING id INTO v_item_id;
    v_j := 0;
    FOR v_attribute IN
      SELECT value FROM jsonb_array_elements(COALESCE(v_item->'attributes','[]'::jsonb))
    LOOP
      IF jsonb_typeof(v_attribute) <> 'object' THEN
        RAISE EXCEPTION 'Invalid item attribute' USING ERRCODE = '22023';
      END IF;
      INSERT INTO public.offer_item_attributes(offer_item_id,name,value,sort_order)
      VALUES (v_item_id,btrim(v_attribute->>'name'),btrim(v_attribute->>'value'),v_j);
      v_j := v_j + 1;
    END LOOP;
    v_i := v_i + 1;
  END LOOP;

  FOR v_branch IN SELECT value FROM jsonb_array_elements(p_payload->'branches') LOOP
    IF jsonb_typeof(v_branch) <> 'string' THEN
      RAISE EXCEPTION 'Branch IDs must be strings' USING ERRCODE = '22023';
    END IF;
    v_branch_id := (v_branch #>> '{}')::UUID;
    IF NOT EXISTS (
      SELECT 1 FROM public.business_branches b
      WHERE b.id = v_branch_id AND b.business_id = v_business_id
    ) THEN
      RAISE EXCEPTION 'Branch does not belong to offer business' USING ERRCODE = '42501';
    END IF;
    INSERT INTO public.offer_branches(business_id,offer_version_id,branch_id)
      VALUES(v_business_id,v_version_id,v_branch_id);
  END LOOP;
  RETURN v_version_id;
END;
$function$;

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

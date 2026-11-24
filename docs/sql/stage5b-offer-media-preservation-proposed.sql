-- AUD-032. Preserve existing authorization and all draft field constraints.
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
    -- Only an owner can start a draft on an offer created by someone else.
    IF NOT wow_private.is_business_owner(v_business_id)
       AND NOT EXISTS (
         SELECT 1 FROM public.offers o
         WHERE o.id = p_offer_id AND o.created_by_user_id = v_user_id
       ) THEN
      RAISE EXCEPTION 'Offer creator permission required' USING ERRCODE = '42501';
    END IF;
    SELECT COALESCE(MAX(version_no),0) + 1 INTO v_next_no
    FROM public.offer_versions WHERE offer_id = p_offer_id;
    INSERT INTO public.offer_versions(business_id,offer_id,version_no,created_by_user_id)
      VALUES (v_business_id,p_offer_id,v_next_no,v_user_id) RETURNING id INTO v_version_id;
  ELSE
    IF NOT wow_private.can_edit_offer_draft_version(v_version_id) THEN
      RAISE EXCEPTION 'Offer draft ownership or branch scope denied' USING ERRCODE = '42501';
    END IF;
    -- Delete descendants first, and then replace draft content.
    DELETE FROM public.offer_item_attributes a USING public.offer_items i
      WHERE a.offer_item_id = i.id AND i.offer_version_id = v_version_id;
    -- Version-wide images survive edits. Preserve stable item slots and reject removal
    -- of a slot that still owns media, rather than silently deleting or reassigning it.
    IF EXISTS (SELECT 1 FROM public.offer_items i WHERE i.offer_version_id=v_version_id GROUP BY i.sort_order HAVING count(*)>1)
      OR EXISTS (SELECT 1 FROM public.offer_media m JOIN public.offer_items i ON i.id=m.offer_item_id
        WHERE m.offer_version_id=v_version_id AND i.sort_order>=jsonb_array_length(p_payload->'items')) THEN
      RAISE EXCEPTION 'Cannot remove or ambiguously replace an item with attached media' USING ERRCODE='22023';
    END IF;
    DELETE FROM public.offer_items WHERE offer_version_id=v_version_id AND sort_order>=jsonb_array_length(p_payload->'items');
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
    SELECT i.id INTO v_item_id FROM public.offer_items i WHERE i.offer_version_id=v_version_id AND i.sort_order=v_i;
    IF v_item_id IS NULL THEN
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
    ELSE
      UPDATE public.offer_items SET item_type=v_item->>'item_type',name=btrim(v_item->>'name'),
        description=NULLIF(btrim(v_item->>'description'),''),brand=NULLIF(btrim(v_item->>'brand'),''),
        model=NULLIF(btrim(v_item->>'model'),''),quantity=COALESCE(NULLIF(v_item->>'quantity','')::numeric,1),
        unit=COALESCE(NULLIF(btrim(v_item->>'unit'),''),'piece'),reference_value=NULLIF(v_item->>'reference_value','')::numeric
      WHERE id=v_item_id AND offer_version_id=v_version_id;
    END IF;
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
    IF NOT wow_private.is_business_owner(v_business_id)
       AND NOT EXISTS (
         SELECT 1
         FROM public.business_members m
         JOIN public.business_member_branches mba
           ON mba.business_id = m.business_id AND mba.member_id = m.id
         WHERE m.business_id = v_business_id
           AND m.user_id = v_user_id
           AND m.role = 'employee' AND m.status = 'active'
           AND m.can_draft
           AND mba.branch_id = v_branch_id
       ) THEN
      RAISE EXCEPTION 'Employee is not assigned to offer branch' USING ERRCODE = '42501';
    END IF;
    INSERT INTO public.offer_branches(business_id,offer_version_id,branch_id)
      VALUES(v_business_id,v_version_id,v_branch_id);
  END LOOP;
  RETURN v_version_id;
END;
$function$;

CREATE OR REPLACE FUNCTION wow_private.attach_offer_media_internal(p_version_id uuid, p_storage_key text, p_item_id uuid, p_alt_text text, p_is_cover boolean, p_sort_order integer)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_user TEXT:=wow_private.storage_active_user_id();
  v_business UUID; v_media UUID; v_prefix TEXT;
BEGIN
  SELECT v.business_id INTO v_business FROM public.offer_versions v
    WHERE v.id=p_version_id AND v.review_status='draft' FOR UPDATE;
  IF v_business IS NULL
     OR NOT wow_private.can_manage_offer_business(v_business,'draft')
     OR NOT wow_private.can_read_offer_version(p_version_id) THEN
    RAISE EXCEPTION 'Editable offer version required' USING ERRCODE='42501';
  END IF;
  v_prefix:=v_business::text || '/' || p_version_id::text || '/' || v_user || '/';
  IF v_user IS NULL OR p_storage_key IS NULL
      OR left(p_storage_key,length(v_prefix)) IS DISTINCT FROM v_prefix
      OR NOT wow_private.storage_safe_key(p_storage_key,false)
      OR NOT EXISTS (SELECT 1 FROM storage.objects obj
        WHERE obj.bucket_id='wow-offer-media' AND obj.name=p_storage_key)
      OR p_is_cover IS NULL OR p_sort_order NOT BETWEEN 0 AND 99
      OR (p_alt_text IS NOT NULL AND char_length(p_alt_text)>250)
      OR (p_item_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.offer_items i
         WHERE i.id=p_item_id AND i.offer_version_id=p_version_id)) THEN
    RAISE EXCEPTION 'Invalid uploaded image reference' USING ERRCODE='22023';
  END IF;
  INSERT INTO public.offer_media(offer_version_id,offer_item_id,
    storage_key,alt_text,is_cover,sort_order)
  VALUES(p_version_id,p_item_id,p_storage_key,p_alt_text,p_is_cover,p_sort_order)
  ON CONFLICT(offer_version_id,storage_key) DO NOTHING RETURNING id INTO v_media;
  IF v_media IS NULL THEN
    SELECT id INTO v_media FROM public.offer_media WHERE offer_version_id=p_version_id AND storage_key=p_storage_key
      AND offer_item_id IS NOT DISTINCT FROM p_item_id AND alt_text IS NOT DISTINCT FROM p_alt_text
      AND is_cover=p_is_cover AND sort_order=p_sort_order;
    IF v_media IS NULL THEN RAISE EXCEPTION 'Existing attachment metadata differs' USING ERRCODE='22023'; END IF;
  END IF;
  RETURN v_media;
END;
$function$;

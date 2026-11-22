-- MUSNAD-WOW stage 4A: AUD-015, AUD-021, AUD-022.
-- Prepared from live pg_get_functiondef on 2026-11-22, reference main 75c095929b19bac3259fd51a7bdb3a323e7ca0eb.
-- Authorized by project owner for original database deployment on 2026-11-22.
-- Predeployment SQL verification: 21 transactional JWT/branch tests passed; the transaction
-- was rolled back and original definitions/row counts were rechecked.
-- This does not establish HTTP/Storage/E2E acceptance; keep those gates open.
-- This migration only tightens authorized private-object reads and draft writes.
-- Public live offer imagery remains governed by the separate is_public_offer_object Storage policy.

-- Fail closed if any baseline function changed since the 2026-11-22 read-only audit.
-- Prevents an old CREATE OR REPLACE definition overwriting another maintainer's changes.
DO $stage4_drift_guard$
BEGIN
  IF md5(pg_get_functiondef(to_regprocedure('wow_private.can_read_wow_object(text,text)')::oid))
      IS DISTINCT FROM '85c99e204788800863a27f9058138205' THEN
    RAISE EXCEPTION 'Stage4 authorization baseline drift: %', 'wow_private.can_read_wow_object(text,text)'
      USING ERRCODE = '55000';
  END IF;
  IF md5(pg_get_functiondef(to_regprocedure('wow_private.get_offer_evidence_draft_internal(uuid)')::oid))
      IS DISTINCT FROM '15a97f77933faef7b99db61f424b86b8' THEN
    RAISE EXCEPTION 'Stage4 authorization baseline drift: %', 'wow_private.get_offer_evidence_draft_internal(uuid)'
      USING ERRCODE = '55000';
  END IF;
  IF md5(pg_get_functiondef(to_regprocedure('wow_private.save_offer_draft_internal(uuid,jsonb)')::oid))
      IS DISTINCT FROM 'a9bf640701d9d461073da178cf087889' THEN
    RAISE EXCEPTION 'Stage4 authorization baseline drift: %', 'wow_private.save_offer_draft_internal(uuid,jsonb)'
      USING ERRCODE = '55000';
  END IF;
  IF md5(pg_get_functiondef(to_regprocedure('wow_private.save_offer_evidence_draft_internal(uuid,jsonb)')::oid))
      IS DISTINCT FROM '58882a8fc841d477f413a472200998b2' THEN
    RAISE EXCEPTION 'Stage4 authorization baseline drift: %', 'wow_private.save_offer_evidence_draft_internal(uuid,jsonb)'
      USING ERRCODE = '55000';
  END IF;
END;
$stage4_drift_guard$;

CREATE OR REPLACE FUNCTION wow_private.can_edit_offer_draft_version(p_offer_version_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT (SELECT auth.jwt()->>'role') = 'authenticated'
    AND EXISTS (
      SELECT 1
      FROM public.offer_versions v
      JOIN public.offers o ON o.id = v.offer_id AND o.business_id = v.business_id
      JOIN public.business_members m ON m.business_id = v.business_id
      JOIN public.users u ON u.id = m.user_id
      WHERE v.id = p_offer_version_id
        AND v.review_status = 'draft'
        AND m.user_id = (SELECT auth.jwt()->>'sub')
        AND m.status = 'active'
        AND u.account_status = 'active'
        AND u.deleted_at IS NULL
        AND wow_private.can_manage_offer_business(v.business_id,'draft')
        AND (
          (m.role = 'owner' AND wow_private.is_business_owner(v.business_id))
          OR (
            m.role = 'employee'
            AND v.created_by_user_id = m.user_id
            AND NOT EXISTS (
              SELECT 1 FROM public.offer_branches ob
              WHERE ob.offer_version_id = v.id
                AND NOT EXISTS (
                  SELECT 1 FROM public.business_member_branches mba
                  WHERE mba.business_id = v.business_id
                    AND mba.member_id = m.id
                    AND mba.branch_id = ob.branch_id
                )
            )
          )
        )
    );
$function$;
REVOKE ALL ON FUNCTION wow_private.can_edit_offer_draft_version(uuid)
  FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION wow_private.can_read_wow_object(p_bucket text, p_key text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_user TEXT := wow_private.storage_active_user_id();
  v_parts TEXT[] := string_to_array(p_key,'/');
  v_business UUID;
  v_version UUID;
  v_complaint UUID;
  v_is_reviewer BOOLEAN := wow_private.is_catalog_reviewer();
BEGIN
  IF v_user IS NULL OR NOT wow_private.storage_safe_key(
    p_key,p_bucket IN ('wow-verification-evidence','wow-complaint-evidence')
  ) THEN RETURN false; END IF;

  CASE p_bucket
    WHEN 'wow-business-media' THEN
      -- Private staging files: owner or an independent platform reviewer only.
      IF cardinality(v_parts)<>3 OR
         v_parts[1] !~ '^[0-9a-f-]{36}$' OR
         v_parts[2] !~ '^[A-Za-z0-9_-]{3,128}$' OR
         v_parts[3] !~ '^[a-f0-9]{48}[.](jpg|jpeg|png|webp)$'
      THEN RETURN false; END IF;
      v_business:=v_parts[1]::uuid;
      RETURN (wow_private.is_business_owner(v_business)
        OR (v_is_reviewer AND NOT wow_private.is_business_member(v_business)));

    WHEN 'wow-offer-media' THEN
      IF cardinality(v_parts)<>4 OR
         v_parts[1] !~ '^[0-9a-f-]{36}$' OR
         v_parts[2] !~ '^[0-9a-f-]{36}$' THEN RETURN false; END IF;
      v_business:=v_parts[1]::UUID;
      v_version:=v_parts[2]::UUID;
      RETURN EXISTS (
        SELECT 1 FROM public.offer_versions v
        JOIN public.offers o ON o.id=v.offer_id
        WHERE v.id=v_version AND v.business_id=v_business
          AND (
            wow_private.is_business_owner(v_business)
            OR (
              wow_private.can_manage_offer_business(v_business,'draft')
              AND wow_private.can_read_offer_version(v.id)
            )
            OR (v_is_reviewer AND NOT wow_private.is_business_member(v_business))
          )
      );

    WHEN 'wow-verification-evidence' THEN
      IF cardinality(v_parts)<>4 OR
         v_parts[1] NOT IN ('business-verifications','offer-verifications') OR
         v_parts[2] !~ '^[0-9a-f-]{36}$' THEN RETURN false; END IF;
      v_business:=v_parts[2]::UUID;
      IF v_parts[1]='offer-verifications' THEN
        RETURN (v_parts[3]=v_user AND wow_private.can_manage_offer_business(v_business,'draft'))
          OR (v_is_reviewer AND NOT wow_private.is_business_member(v_business))
          OR (v_parts[3]=v_user AND EXISTS (
            SELECT 1 FROM public.offer_version_evidence e
            JOIN public.offers o ON o.id=e.offer_id
            WHERE o.business_id=v_business
              AND e.documents @> jsonb_build_array(jsonb_build_object('storageKey',p_key))
          ));
      END IF;
      RETURN (v_parts[3]=v_user AND wow_private.is_business_owner(v_business))
        OR (v_is_reviewer AND NOT wow_private.is_business_member(v_business));

    WHEN 'wow-complaint-evidence' THEN
      IF cardinality(v_parts)<>4 OR v_parts[1]<>'complaints' OR
         v_parts[3] !~ '^[0-9a-f-]{36}$' THEN RETURN false; END IF;
      v_complaint:=v_parts[3]::UUID;
      RETURN EXISTS (SELECT 1 FROM public.complaints c
        JOIN public.offers o ON o.id=c.offer_id
        WHERE c.id=v_complaint
          AND ((c.user_id=v_user AND v_parts[2]=v_user)
          OR (wow_private.is_business_owner(o.business_id) AND v_parts[2]=v_user)
          OR (v_is_reviewer AND NOT wow_private.is_business_member(o.business_id))));

    ELSE RETURN false;
  END CASE;
EXCEPTION WHEN invalid_text_representation THEN
  RETURN false;
END;
$function$;

CREATE OR REPLACE FUNCTION wow_private.get_offer_evidence_draft_internal(p_offer_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_actor TEXT := (SELECT auth.jwt() ->> 'sub');
  v_business UUID;
  v_docs JSONB;
  v_version UUID;
BEGIN
  IF (SELECT auth.jwt() ->> 'role') IS DISTINCT FROM 'authenticated'
     OR v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;
  SELECT business_id INTO v_business FROM public.offers WHERE id = p_offer_id;
  IF v_business IS NULL OR NOT wow_private.can_manage_offer_business(v_business, 'draft') THEN
    RAISE EXCEPTION 'Offer drafting permission required' USING ERRCODE = '42501';
  END IF;
  SELECT v.id INTO v_version
    FROM public.offer_versions v WHERE v.offer_id = p_offer_id
    ORDER BY (v.review_status = 'draft') DESC, v.version_no DESC
    LIMIT 1;
  IF v_version IS NOT NULL
     AND NOT wow_private.can_read_offer_version(v_version) THEN
    RAISE EXCEPTION 'Offer version reading permission required' USING ERRCODE = '42501';
  END IF;
  SELECT documents INTO v_docs FROM wow_private.offer_evidence_drafts
    WHERE offer_version_id = v_version;
  RETURN COALESCE(v_docs, '[]'::jsonb);
END;
$function$;

CREATE OR REPLACE FUNCTION wow_private.save_offer_evidence_draft_internal(p_offer_id uuid, p_documents jsonb)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_actor TEXT := (SELECT auth.jwt() ->> 'sub');
  v_business UUID;
  v_status TEXT;
  v_version UUID;
  v_doc JSONB;
  v_key TEXT;
  v_name TEXT;
  v_mime TEXT;
  v_size NUMERIC;
  v_primary BOOLEAN;
  v_keys TEXT[] := ARRAY[]::TEXT[];
  v_sanitized JSONB := '[]'::JSONB;
BEGIN
  IF (SELECT auth.jwt() ->> 'role') IS DISTINCT FROM 'authenticated'
     OR v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;
  SELECT business_id, status INTO v_business, v_status FROM public.offers WHERE id = p_offer_id FOR UPDATE;
  IF v_business IS NULL OR NOT wow_private.can_manage_offer_business(v_business, 'draft') THEN
    RAISE EXCEPTION 'Offer drafting permission required' USING ERRCODE = '42501';
  END IF;
  -- Evidence must belong to a specific, editable draft version. Submitted
  -- evidence is immutable and remains attached to its reviewed version.
  SELECT id INTO v_version FROM public.offer_versions
    WHERE offer_id = p_offer_id AND review_status = 'draft' FOR UPDATE;
  IF v_version IS NULL THEN
    RAISE EXCEPTION 'Offer evidence requires an editable draft version' USING ERRCODE = '22023';
  END IF;
  IF NOT wow_private.can_edit_offer_draft_version(v_version) THEN
    RAISE EXCEPTION 'Offer draft ownership or branch scope denied' USING ERRCODE = '42501';
  END IF;
  IF p_documents IS NULL OR jsonb_typeof(p_documents) IS DISTINCT FROM 'array'
     OR jsonb_array_length(p_documents) > 12 THEN
    RAISE EXCEPTION 'Expected an array of at most 12 evidence documents' USING ERRCODE = '22023';
  END IF;

  FOR v_doc IN SELECT value FROM jsonb_array_elements(p_documents)
  LOOP
    IF jsonb_typeof(v_doc) IS DISTINCT FROM 'object' THEN
      RAISE EXCEPTION 'Invalid evidence record' USING ERRCODE = '22023';
    END IF;
    v_key := v_doc ->> 'storageKey';
    v_name := v_doc ->> 'name';
    v_mime := v_doc ->> 'mimeType';
    IF v_key IS NULL OR v_key = '' OR v_key = ANY(v_keys)
       OR v_name IS NULL OR char_length(btrim(v_name)) NOT BETWEEN 1 AND 255
       OR v_mime IS NULL OR v_mime NOT IN ('application/pdf', 'image/jpeg', 'image/png')
       OR jsonb_typeof(v_doc -> 'size') IS DISTINCT FROM 'number' THEN
      RAISE EXCEPTION 'Invalid or repeated evidence document metadata' USING ERRCODE = '22023';
    END IF;
    v_size := (v_doc ->> 'size')::NUMERIC;
    IF v_size < 1 OR v_size > 10485760 OR v_size <> trunc(v_size) THEN
      RAISE EXCEPTION 'Invalid evidence document size' USING ERRCODE = '22023';
    END IF;
    v_primary := COALESCE((v_doc ->> 'isPrimaryRequirement')::BOOLEAN, false);
    v_keys := array_append(v_keys, v_key);
    v_sanitized := v_sanitized || jsonb_build_array(jsonb_build_object(
      'storageKey', v_key,
      'name', btrim(v_name),
      'size', v_size::INTEGER,
      'mimeType', v_mime,
      'isPrimaryRequirement', v_primary
    ));
  END LOOP;

  IF array_length(v_keys, 1) > 0 THEN
    -- Verify every key belongs to the authenticated uploader, matches the
    -- business and exists in private Storage. Metadata alone is not proof.
    PERFORM wow_private.validate_offer_evidence_refs(to_jsonb(v_keys), v_business, v_actor);
  END IF;

  INSERT INTO wow_private.offer_evidence_drafts
    (offer_version_id, offer_id, documents, updated_by_user_id, updated_at)
  VALUES (v_version, p_offer_id, v_sanitized, v_actor, now())
  ON CONFLICT (offer_version_id) DO UPDATE SET
    documents = EXCLUDED.documents,
    updated_by_user_id = EXCLUDED.updated_by_user_id,
    updated_at = now();

  RETURN true;
END;
$function$;

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

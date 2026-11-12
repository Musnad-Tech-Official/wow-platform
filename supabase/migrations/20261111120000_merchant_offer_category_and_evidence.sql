-- Migration: 20261111120000_merchant_offer_category_and_evidence.sql
-- Adds category_id to public.offer_versions and implements private offer evidence drafts.

-- 1. Schema: Add category_id to public.offer_versions
ALTER TABLE "public"."offer_versions"
  ADD COLUMN IF NOT EXISTS "category_id" "uuid" REFERENCES "public"."categories"("id") ON DELETE RESTRICT;
ALTER TABLE "public"."offer_versions"
  ADD COLUMN IF NOT EXISTS "is_clearance" boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "offer_versions_category_id_idx"
  ON "public"."offer_versions"("category_id");

-- 2. Schema: wow_private.offer_evidence_drafts
CREATE TABLE IF NOT EXISTS "wow_private"."offer_evidence_drafts" (
  "offer_version_id" "uuid" PRIMARY KEY REFERENCES "public"."offer_versions"("id") ON DELETE CASCADE,
  "offer_id" "uuid" NOT NULL REFERENCES "public"."offers"("id") ON DELETE CASCADE,
  "documents" "jsonb" NOT NULL DEFAULT '[]'::jsonb,
  "updated_by_user_id" "text" NOT NULL,
  "updated_at" timestamp with time zone NOT NULL DEFAULT "now"(),
  CONSTRAINT "offer_evidence_drafts_shape_ck" CHECK (
    ("jsonb_typeof"("documents") = 'array'::"text") AND ("jsonb_array_length"("documents") <= 12)
  )
);

CREATE INDEX IF NOT EXISTS "offer_evidence_drafts_offer_id_idx"
  ON "wow_private"."offer_evidence_drafts"("offer_id");
ALTER TABLE "wow_private"."offer_evidence_drafts" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "wow_private"."offer_evidence_drafts" FROM PUBLIC, anon, authenticated;

-- 3. Update wow_private.save_offer_draft_internal to accept category_id
CREATE OR REPLACE FUNCTION "wow_private"."save_offer_draft_internal"("p_offer_id" "uuid", "p_payload" "jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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
    'title','description','offer_kind','category_id','is_clearance','original_price','final_price',
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
$$;

-- 4. Internal and Public RPCs for Offer Evidence Drafts
CREATE OR REPLACE FUNCTION "wow_private"."get_offer_evidence_draft_internal"("p_offer_id" "uuid")
RETURNS "jsonb" LANGUAGE "plpgsql" STABLE SECURITY DEFINER SET "search_path" TO ''
AS $$
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
  SELECT documents INTO v_docs FROM wow_private.offer_evidence_drafts
    WHERE offer_version_id = v_version;
  RETURN COALESCE(v_docs, '[]'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION "wow_private"."save_offer_evidence_draft_internal"(
  "p_offer_id" "uuid",
  "p_documents" "jsonb"
)
RETURNS boolean LANGUAGE "plpgsql" SECURITY DEFINER SET "search_path" TO ''
AS $$
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
    PERFORM wow_private.validate_evidence_refs(to_jsonb(v_keys), v_business, v_actor);
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
$$;

REVOKE ALL ON FUNCTION "wow_private"."get_offer_evidence_draft_internal"("uuid") FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION "wow_private"."save_offer_evidence_draft_internal"("uuid", "jsonb") FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION "public"."wow_get_offer_evidence_draft"("p_offer_id" "uuid")
RETURNS "jsonb" LANGUAGE "sql" SECURITY DEFINER SET "search_path" TO ''
AS $$
  SELECT wow_private.get_offer_evidence_draft_internal(p_offer_id);
$$;

CREATE OR REPLACE FUNCTION "public"."wow_save_offer_evidence_draft"("p_offer_id" "uuid", "p_documents" "jsonb")
RETURNS boolean LANGUAGE "sql" SECURITY DEFINER SET "search_path" TO ''
AS $$
  SELECT wow_private.save_offer_evidence_draft_internal(p_offer_id, p_documents);
$$;

REVOKE ALL ON FUNCTION "public"."wow_get_offer_evidence_draft"("uuid") FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION "public"."wow_save_offer_evidence_draft"("uuid", "jsonb") FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION "public"."wow_get_offer_evidence_draft"("uuid") TO "authenticated";
GRANT EXECUTE ON FUNCTION "public"."wow_save_offer_evidence_draft"("uuid", "jsonb") TO "authenticated";


-- 5. Admin review includes private evidence for that exact offer version.
-- The existing internal review function performs admin authorization.
CREATE OR REPLACE FUNCTION public.wow_admin_get_offer_review(p_version_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO ''
AS $$
DECLARE
  v_review jsonb;
  v_evidence jsonb;
BEGIN
  v_review := wow_private.admin_get_offer_review_internal(p_version_id);
  IF v_review IS NULL THEN RETURN NULL; END IF;
  SELECT documents INTO v_evidence FROM wow_private.offer_evidence_drafts
    WHERE offer_version_id = p_version_id;
  RETURN v_review || jsonb_build_object(
    'private_evidence', COALESCE(v_evidence, '[]'::jsonb));
END;
$$;
REVOKE ALL ON FUNCTION public.wow_admin_get_offer_review(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.wow_admin_get_offer_review(uuid) TO authenticated;

-- 6. Server-side submission must enforce approved category and evidence.
-- Drafts may remain incomplete; submission may not.
CREATE OR REPLACE FUNCTION wow_private.submit_offer_internal(p_offer_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $$
DECLARE
  v_business uuid;
  v_version uuid;
BEGIN
  SELECT business_id INTO v_business FROM public.offers
    WHERE id = p_offer_id FOR UPDATE;
  IF v_business IS NULL OR NOT wow_private.can_manage_offer_business(v_business,'submit') THEN
    RAISE EXCEPTION 'Offer submission permission required' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.businesses WHERE id=v_business AND status='approved'
  ) THEN
    RAISE EXCEPTION 'Business must be approved to submit offers' USING ERRCODE = '22023';
  END IF;
  SELECT id INTO v_version FROM public.offer_versions
    WHERE offer_id=p_offer_id AND review_status='draft' FOR UPDATE;
  IF v_version IS NULL OR EXISTS (
    SELECT 1 FROM public.offer_versions WHERE offer_id=p_offer_id AND review_status='pending'
  ) THEN
    RAISE EXCEPTION 'One completed draft and no pending review required' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.offer_versions v
    JOIN public.business_categories bc
      ON bc.business_id=v_business AND bc.category_id=v.category_id
    JOIN public.categories c ON c.id=bc.category_id AND c.is_active
    WHERE v.id=v_version AND v.title IS NOT NULL AND v.offer_kind IS NOT NULL
      AND v.category_id IS NOT NULL AND v.final_price IS NOT NULL
      AND v.currency IS NOT NULL AND v.starts_at IS NOT NULL AND v.ends_at IS NOT NULL
      AND v.ends_at > v.starts_at
      AND (v.original_price IS NULL OR v.original_price >= v.final_price)
  ) OR NOT EXISTS (
    SELECT 1 FROM public.offer_items WHERE offer_version_id=v_version
  ) OR NOT EXISTS (
    SELECT 1 FROM public.offer_branches WHERE offer_version_id=v_version
  ) OR EXISTS (
    SELECT 1 FROM public.offer_branches ob
    JOIN public.business_branches b ON b.id=ob.branch_id
    WHERE ob.offer_version_id=v_version
      AND (b.business_id<>v_business OR b.status <> 'approved')
  ) THEN
    RAISE EXCEPTION 'Incomplete offer, unapproved category or unapproved branch' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.offer_versions v WHERE v.id=v_version
      AND (v.original_price IS NOT NULL OR v.is_clearance)
  ) AND NOT EXISTS (
    SELECT 1 FROM wow_private.offer_evidence_drafts e WHERE e.offer_version_id=v_version
      AND jsonb_array_length(e.documents) > 0
  ) THEN
    RAISE EXCEPTION 'Evidence required for reference price or clearance claim' USING ERRCODE = '22023';
  END IF;
  UPDATE public.offer_versions SET review_status='pending', submitted_at=now()
    WHERE id=v_version;
  -- A revised submission does not hide the previously approved version.
  IF NOT EXISTS (
    SELECT 1 FROM public.offers WHERE id=p_offer_id AND current_version_id IS NOT NULL
  ) THEN
    UPDATE public.offers SET status='pending' WHERE id=p_offer_id;
  END IF;
  RETURN v_version;
END;
$$;

-- 7. Merchant may choose only categories approved for the current business.
CREATE OR REPLACE FUNCTION public.wow_get_offer_eligible_categories(p_business_id uuid)
RETURNS TABLE(id uuid, name_ar text, name_en text, parent_id uuid)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO ''
AS $$
BEGIN
  IF p_business_id IS NULL OR NOT wow_private.can_manage_offer_business(p_business_id,'draft') THEN
    RAISE EXCEPTION 'Offer drafting permission required' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
    SELECT c.id, c.name_ar::text, c.name_en::text, c.parent_id
    FROM public.business_categories bc
    JOIN public.categories c ON c.id=bc.category_id
    WHERE bc.business_id=p_business_id AND c.is_active
    ORDER BY c.sort_order, c.name_ar;
END;
$$;
REVOKE ALL ON FUNCTION public.wow_get_offer_eligible_categories(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.wow_get_offer_eligible_categories(uuid) TO authenticated;

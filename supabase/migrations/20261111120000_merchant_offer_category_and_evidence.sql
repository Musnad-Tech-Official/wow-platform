-- Migration: 20261111120000_merchant_offer_category_and_evidence.sql
-- Adds category_id to public.offer_versions and implements private offer evidence drafts.

-- 1. Schema: Add category_id to public.offer_versions
ALTER TABLE "public"."offer_versions"
  ADD COLUMN IF NOT EXISTS "category_id" "uuid" REFERENCES "public"."categories"("id") ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS "offer_versions_category_id_idx"
  ON "public"."offer_versions"("category_id");

-- 2. Schema: wow_private.offer_evidence_drafts
CREATE TABLE IF NOT EXISTS "wow_private"."offer_evidence_drafts" (
  "offer_id" "uuid" PRIMARY KEY REFERENCES "public"."offers"("id") ON DELETE CASCADE,
  "documents" "jsonb" NOT NULL DEFAULT '[]'::jsonb,
  "updated_by_user_id" "text" NOT NULL,
  "updated_at" timestamp with time zone NOT NULL DEFAULT "now"(),
  CONSTRAINT "offer_evidence_drafts_shape_ck" CHECK (
    ("jsonb_typeof"("documents") = 'array'::"text") AND ("jsonb_array_length"("documents") <= 12)
  )
);

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
    'title','description','offer_kind','category_id','original_price','final_price',
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
     OR jsonb_array_length(p_payload->'branches') NOT BETWEEN 1 AND 50 THEN
    RAISE EXCEPTION 'Draft requires 1-50 items and 1-50 branches' USING ERRCODE = '22023';
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
BEGIN
  IF (SELECT auth.jwt() ->> 'role') IS DISTINCT FROM 'authenticated'
     OR v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;
  SELECT business_id INTO v_business FROM public.offers WHERE id = p_offer_id;
  IF v_business IS NULL OR NOT wow_private.can_manage_offer_business(v_business, 'draft') THEN
    RAISE EXCEPTION 'Offer drafting permission required' USING ERRCODE = '42501';
  END IF;
  SELECT documents INTO v_docs FROM wow_private.offer_evidence_drafts WHERE offer_id = p_offer_id;
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
  IF v_status IS NULL OR v_status NOT IN ('draft', 'pending', 'active', 'paused') THEN
    RAISE EXCEPTION 'Invalid offer status for evidence attachment' USING ERRCODE = '22023';
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

  INSERT INTO wow_private.offer_evidence_drafts
    (offer_id, documents, updated_by_user_id, updated_at)
  VALUES (p_offer_id, v_sanitized, v_actor, now())
  ON CONFLICT (offer_id) DO UPDATE SET
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

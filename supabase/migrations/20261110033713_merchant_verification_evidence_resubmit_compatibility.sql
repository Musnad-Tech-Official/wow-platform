-- Align owner-only document drafts with the representative upload MIME set
-- and permit supplemental evidence when an initial verification needs more information.
CREATE OR REPLACE FUNCTION wow_private.save_business_verification_draft_evidence_internal(p_business_id uuid, p_documents jsonb)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_actor text := (SELECT auth.jwt() ->> 'sub');
  v_status text;
  v_doc jsonb;
  v_key text;
  v_name text;
  v_mime text;
  v_size numeric;
  v_primary boolean;
  v_keys text[] := ARRAY[]::text[];
  v_sanitized jsonb := '[]'::jsonb;
BEGIN
  IF (SELECT auth.jwt() ->> 'role') IS DISTINCT FROM 'authenticated'
    OR v_actor IS NULL
    OR NOT wow_private.is_business_owner(p_business_id)
  THEN
    RAISE EXCEPTION 'Owner authorization required' USING ERRCODE='42501';
  END IF;
  SELECT status INTO v_status FROM public.businesses WHERE id=p_business_id FOR UPDATE;
  IF v_status IS NULL OR (
    v_status NOT IN ('draft','rejected') AND NOT (
      v_status='pending_review' AND EXISTS (
        SELECT 1 FROM public.business_verifications v
        WHERE v.business_id=p_business_id AND v.request_type='initial' AND v.status='needs_info'
      )
    )
  ) THEN
    RAISE EXCEPTION 'Evidence drafts require a draft or rejected business' USING ERRCODE='22023';
  END IF;
  IF p_documents IS NULL OR jsonb_typeof(p_documents) IS DISTINCT FROM 'array'
    OR jsonb_array_length(p_documents) > 12 THEN
    RAISE EXCEPTION 'Expected an array of at most 12 evidence documents' USING ERRCODE='22023';
  END IF;

  FOR v_doc IN SELECT value FROM jsonb_array_elements(p_documents)
  LOOP
    IF jsonb_typeof(v_doc) IS DISTINCT FROM 'object' THEN
      RAISE EXCEPTION 'Invalid evidence record' USING ERRCODE='22023';
    END IF;
    v_key := v_doc ->> 'storageKey';
    v_name := v_doc ->> 'name';
    v_mime := v_doc ->> 'mimeType';
    IF v_key IS NULL OR v_key='' OR v_key=ANY(v_keys)
      OR v_name IS NULL OR char_length(btrim(v_name)) NOT BETWEEN 1 AND 255
      OR v_mime IS NULL OR v_mime NOT IN ('application/pdf','image/jpeg','image/png','image/webp')
      OR jsonb_typeof(v_doc -> 'size') IS DISTINCT FROM 'number'
      OR jsonb_typeof(v_doc -> 'isPrimaryRequirement') IS DISTINCT FROM 'boolean' THEN
      RAISE EXCEPTION 'Invalid or repeated evidence document metadata' USING ERRCODE='22023';
    END IF;
    v_size := (v_doc ->> 'size')::numeric;
    IF v_size < 1 OR v_size > 10485760 OR v_size <> trunc(v_size) THEN
      RAISE EXCEPTION 'Invalid evidence document size' USING ERRCODE='22023';
    END IF;
    v_primary := (v_doc ->> 'isPrimaryRequirement')::boolean;
    v_keys := array_append(v_keys, v_key);
    v_sanitized := v_sanitized || jsonb_build_array(jsonb_build_object(
      'storageKey', v_key,
      'name', btrim(v_name),
      'size', v_size::integer,
      'mimeType', v_mime,
      'isPrimaryRequirement', v_primary
    ));
  END LOOP;

  IF array_length(v_keys,1) > 0 THEN
    -- Validate ownership prefix, safe object key AND actual Storage object existence.
    PERFORM wow_private.validate_evidence_refs(to_jsonb(v_keys), p_business_id, v_actor);
  END IF;

  INSERT INTO wow_private.business_verification_evidence_drafts
    (business_id, documents, updated_by_user_id, updated_at)
  VALUES (p_business_id, v_sanitized, v_actor, now())
  ON CONFLICT (business_id) DO UPDATE SET
    documents=EXCLUDED.documents, updated_by_user_id=EXCLUDED.updated_by_user_id, updated_at=now();
  RETURN true;
END;
$function$


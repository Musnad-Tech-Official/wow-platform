-- Extend the existing *private* verification bucket with a separate
-- namespace for offer claims. Business identity evidence ACL stays owner-only.
-- Employee offer permissions apply only under offer-verifications.
-- Actual object references must be validated before the reviewer can access them.

CREATE OR REPLACE FUNCTION wow_private.can_upload_wow_object(p_bucket text, p_key text)
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
BEGIN
  IF v_user IS NULL OR NOT wow_private.storage_safe_key(
    p_key,p_bucket IN ('wow-verification-evidence','wow-complaint-evidence')
  ) THEN RETURN false; END IF;

  CASE p_bucket
    WHEN 'wow-business-media' THEN
      IF cardinality(v_parts)<>3 OR v_parts[2]<>v_user OR
         v_parts[1] !~ '^[0-9a-f-]{36}$' THEN RETURN false; END IF;
      v_business:=v_parts[1]::UUID;
      RETURN wow_private.is_business_owner(v_business);

    WHEN 'wow-offer-media' THEN
      IF cardinality(v_parts)<>4 OR v_parts[3]<>v_user OR
         v_parts[1] !~ '^[0-9a-f-]{36}$' OR
         v_parts[2] !~ '^[0-9a-f-]{36}$' THEN RETURN false; END IF;
      v_business:=v_parts[1]::UUID;
      v_version:=v_parts[2]::UUID;
      RETURN wow_private.can_manage_offer_business(v_business,'draft')
        AND EXISTS (SELECT 1 FROM public.offer_versions v
          WHERE v.id=v_version AND v.business_id=v_business
            AND v.review_status='draft'
            AND wow_private.can_read_offer_version(v.id));

    WHEN 'wow-verification-evidence' THEN
      IF cardinality(v_parts)<>4 OR
         v_parts[1] NOT IN ('business-verifications','offer-verifications') OR
         v_parts[3]<>v_user OR v_parts[2] !~ '^[0-9a-f-]{36}$' THEN
        RETURN false; END IF;
      v_business:=v_parts[2]::UUID;
      IF v_parts[1]='offer-verifications' THEN
        RETURN wow_private.can_manage_offer_business(v_business,'draft');
      END IF;
      RETURN wow_private.is_business_owner(v_business);

    WHEN 'wow-complaint-evidence' THEN
      IF cardinality(v_parts)<>4 OR v_parts[1]<>'complaints' OR
         v_parts[2]<>v_user OR v_parts[3] !~ '^[0-9a-f-]{36}$' THEN
        RETURN false; END IF;
      v_complaint:=v_parts[3]::UUID;
      RETURN EXISTS (SELECT 1 FROM public.complaints c
        WHERE c.id=v_complaint AND c.user_id=v_user AND c.status<>'closed');

    ELSE RETURN false; -- includes payment proof bucket
  END CASE;
EXCEPTION WHEN invalid_text_representation THEN
  RETURN false;
END;
$function$;


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
  v_is_reviewer BOOLEAN;
BEGIN
  IF v_user IS NULL OR NOT wow_private.storage_safe_key(
      p_key,p_bucket IN ('wow-verification-evidence','wow-complaint-evidence')
    ) THEN RETURN false; END IF;
  v_is_reviewer:=wow_private.has_admin_permission(true);

  CASE p_bucket
    WHEN 'wow-business-media' THEN
      IF cardinality(v_parts)<>3 OR v_parts[1] !~ '^[0-9a-f-]{36}$' THEN
        RETURN false; END IF;
      v_business:=v_parts[1]::UUID;
      RETURN wow_private.is_business_member(v_business) OR v_is_reviewer;

    WHEN 'wow-offer-media' THEN
      IF cardinality(v_parts)<>4 OR v_parts[1] !~ '^[0-9a-f-]{36}$' OR
         v_parts[2] !~ '^[0-9a-f-]{36}$' THEN RETURN false; END IF;
      v_business:=v_parts[1]::UUID;
      v_version:=v_parts[2]::UUID;
      RETURN (EXISTS (SELECT 1 FROM public.offer_versions v
        WHERE v.id=v_version AND v.business_id=v_business)
        AND (wow_private.can_read_offer_version(v_version) OR v_is_reviewer));

    WHEN 'wow-verification-evidence' THEN
      IF cardinality(v_parts)<>4 OR
         v_parts[1] NOT IN ('business-verifications','offer-verifications') OR
         v_parts[2] !~ '^[0-9a-f-]{36}$' THEN RETURN false; END IF;
      v_business:=v_parts[2]::UUID;
      IF v_parts[1]='offer-verifications' THEN
        RETURN (v_parts[3]=v_user AND
          wow_private.can_manage_offer_business(v_business,'draft'))
        OR (v_is_reviewer AND NOT wow_private.is_business_member(v_business)
          AND EXISTS (
            SELECT 1 FROM wow_private.offer_evidence_drafts e
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
          AND (c.user_id=v_user AND v_parts[2]=v_user
          OR (v_is_reviewer AND NOT wow_private.is_business_member(o.business_id))));

    ELSE RETURN false;
  END CASE;
EXCEPTION WHEN invalid_text_representation THEN
  RETURN false;
END;
$function$;


CREATE OR REPLACE FUNCTION wow_private.validate_offer_evidence_refs(
  p_refs jsonb, p_business_id uuid, p_user_id text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $$
DECLARE
  v_entry jsonb;
  v_key text;
  v_prefix text := 'offer-verifications/' || p_business_id::text || '/' || p_user_id || '/';
BEGIN
  IF p_refs IS NULL OR jsonb_typeof(p_refs) IS DISTINCT FROM 'array'
      OR jsonb_array_length(p_refs) NOT BETWEEN 1 AND 12 THEN
    RAISE EXCEPTION 'Between 1 and 12 offer evidence keys required' USING ERRCODE='22023';
  END IF;
  FOR v_entry IN SELECT value FROM jsonb_array_elements(p_refs) LOOP
    IF jsonb_typeof(v_entry) IS DISTINCT FROM 'string' THEN
      RAISE EXCEPTION 'Offer evidence reference must be a string' USING ERRCODE='22023';
    END IF;
    v_key := v_entry #>> '{}';
    IF left(v_key,length(v_prefix)) IS DISTINCT FROM v_prefix
      OR NOT wow_private.storage_safe_key(v_key,true)
      OR NOT EXISTS (
        SELECT 1 FROM storage.objects obj
        WHERE obj.bucket_id='wow-verification-evidence' AND obj.name=v_key
      ) THEN
      RAISE EXCEPTION 'Invalid, foreign or missing offer evidence object' USING ERRCODE='22023';
    END IF;
  END LOOP;
END;
$$;
REVOKE ALL ON FUNCTION wow_private.validate_offer_evidence_refs(jsonb,uuid,text)
  FROM PUBLIC, anon, authenticated;

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


CREATE OR REPLACE FUNCTION public.wow_get_offer_review_notes(p_version_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO ''
AS $$
DECLARE v_notes jsonb;
BEGIN
  IF p_version_id IS NULL OR NOT wow_private.can_read_offer_version(p_version_id) THEN
    RAISE EXCEPTION 'Offer review access required' USING ERRCODE='42501';
  END IF;
  SELECT COALESCE(
    jsonb_agg(jsonb_build_object(
      'decision',decision, 'reason',reason, 'createdAt',created_at
    ) ORDER BY created_at DESC), '[]'::jsonb)
  INTO v_notes
  FROM public.offer_reviews WHERE offer_version_id=p_version_id;
  RETURN v_notes;
END;
$$;
REVOKE ALL ON FUNCTION public.wow_get_offer_review_notes(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.wow_get_offer_review_notes(uuid) TO authenticated;

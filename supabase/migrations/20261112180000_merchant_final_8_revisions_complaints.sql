-- Migration: 20261112180000_merchant_final_8_revisions_complaints.sql
-- Description: Supports merchant profile media revisions, merchant sanitized complaint detail, and response evidence attachments.
-- Author: WOW Engineering

BEGIN;

-- 1. Profile patch validation: Allow logo_url and cover_url in business profile patch.
CREATE OR REPLACE FUNCTION "wow_private"."validate_merchant_profile_patch"("p_patch" "jsonb", "p_branch" boolean) RETURNS "void"
    LANGUAGE "plpgsql" IMMUTABLE
    SET "search_path" TO ''
    AS $$
DECLARE v_key TEXT; v_value TEXT;
BEGIN
  IF p_patch IS NULL OR jsonb_typeof(p_patch)<>'object' OR p_patch='{}'::jsonb THEN
    RAISE EXCEPTION 'Nonempty profile patch object required' USING ERRCODE='22023';
  END IF;
  FOR v_key IN SELECT jsonb_object_keys(p_patch) LOOP
    IF (p_branch AND v_key NOT IN ('name','city','district','address_line','latitude','longitude'))
       OR (NOT p_branch AND v_key NOT IN ('name','description','contact_phone','logo_url','cover_url')) THEN
      RAISE EXCEPTION 'Unsupported profile field: %',v_key USING ERRCODE='22023';
    END IF;
    IF v_key IN ('latitude','longitude') THEN
      IF jsonb_typeof(p_patch->v_key) NOT IN ('number','null') THEN
        RAISE EXCEPTION 'Coordinates must be numeric or null' USING ERRCODE='22023';
      END IF;
      CONTINUE;
    END IF;
    IF jsonb_typeof(p_patch->v_key) NOT IN ('string','null') THEN
      RAISE EXCEPTION 'Profile text fields must be strings or null' USING ERRCODE='22023';
    END IF;
    v_value:=p_patch->>v_key;
    IF (v_key='name' AND (v_value IS NULL OR length(btrim(v_value)) NOT BETWEEN 2 AND 120))
      OR (v_key='city' AND (v_value IS NULL OR length(btrim(v_value)) NOT BETWEEN 2 AND 120))
      OR (v_key='address_line' AND (v_value IS NULL OR length(btrim(v_value)) NOT BETWEEN 5 AND 500))
      OR (v_key='district' AND length(v_value)>120)
      OR (v_key='description' AND length(v_value)>1200)
      OR (v_key='contact_phone' AND length(v_value)>35)
      OR (v_key='logo_url' AND length(v_value)>2048)
      OR (v_key='cover_url' AND length(v_value)>2048) THEN
      RAISE EXCEPTION 'Invalid profile field length/value: %',v_key USING ERRCODE='22023';
    END IF;
  END LOOP;
END; $$;

-- 2. Apply profile patch: Persist logo_url and cover_url on approved revision application.
CREATE OR REPLACE FUNCTION "wow_private"."apply_merchant_profile_patch"("p_business_id" "uuid", "p_branch_id" "uuid", "p_patch" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE v_lat NUMERIC;v_lon NUMERIC;
BEGIN
  PERFORM wow_private.validate_merchant_profile_patch(p_patch,p_branch_id IS NOT NULL);
  IF p_branch_id IS NULL THEN
    UPDATE public.businesses b SET
      name=CASE WHEN p_patch?'name' THEN btrim(p_patch->>'name') ELSE b.name END,
      description=CASE WHEN p_patch?'description' THEN NULLIF(btrim(p_patch->>'description'),'') ELSE b.description END,
      contact_phone=CASE WHEN p_patch?'contact_phone' THEN NULLIF(btrim(p_patch->>'contact_phone'),'') ELSE b.contact_phone END,
      logo_url=CASE WHEN p_patch?'logo_url' THEN NULLIF(btrim(p_patch->>'logo_url'),'') ELSE b.logo_url END,
      cover_url=CASE WHEN p_patch?'cover_url' THEN NULLIF(btrim(p_patch->>'cover_url'),'') ELSE b.cover_url END
    WHERE b.id=p_business_id;
  ELSE
    SELECT CASE WHEN p_patch?'latitude' THEN (p_patch->>'latitude')::numeric ELSE latitude END,
           CASE WHEN p_patch?'longitude' THEN (p_patch->>'longitude')::numeric ELSE longitude END
    INTO v_lat,v_lon FROM public.business_branches
    WHERE id=p_branch_id AND business_id=p_business_id FOR UPDATE;
    IF (v_lat IS NULL) <> (v_lon IS NULL) THEN
      RAISE EXCEPTION 'Latitude and longitude must be set/cleared together' USING ERRCODE='22023';
    END IF;
    UPDATE public.business_branches br SET
      name=CASE WHEN p_patch?'name' THEN btrim(p_patch->>'name') ELSE br.name END,
      city=CASE WHEN p_patch?'city' THEN btrim(p_patch->>'city') ELSE br.city END,
      district=CASE WHEN p_patch?'district' THEN NULLIF(btrim(p_patch->>'district'),'') ELSE br.district END,
      address_line=CASE WHEN p_patch?'address_line' THEN btrim(p_patch->>'address_line') ELSE br.address_line END,
      latitude=v_lat,
      longitude=v_lon
    WHERE br.id=p_branch_id AND br.business_id=p_business_id;
  END IF;
END; $$;

-- 3. Storage ACL extensions for merchant complaint evidence upload and read.
CREATE OR REPLACE FUNCTION "wow_private"."can_upload_wow_object"("p_bucket" text, "p_key" text)
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
        JOIN public.offers o ON o.id=c.offer_id
        WHERE c.id=v_complaint AND c.status<>'closed'
          AND (c.user_id=v_user OR wow_private.is_business_owner(o.business_id)));

    ELSE RETURN false;
  END CASE;
EXCEPTION WHEN invalid_text_representation THEN
  RETURN false;
END;
$function$;

CREATE OR REPLACE FUNCTION "wow_private"."can_read_wow_object"("p_bucket" text, "p_key" text)
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
      RETURN true;

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
            (v.review_status='approved' AND o.status IN ('published','paused'))
            OR wow_private.can_manage_offer_business(v_business,'draft')
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

-- 4. Merchant complaint response with optional evidence attachments.
CREATE OR REPLACE FUNCTION "wow_private"."merchant_respond_complaint_internal"(
  "p_complaint_id" "uuid",
  "p_message" "text",
  "p_evidence_keys" "jsonb" DEFAULT '[]'::"jsonb"
) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_user TEXT;
  v_business UUID;
  v_status TEXT;
  v_update UUID;
  v_prefix TEXT;
  v_entry JSONB;
  v_key TEXT;
  v_seen_keys TEXT[] := '{}';
BEGIN
  v_user := wow_private.current_active_customer_id();
  SELECT o.business_id, c.status INTO v_business, v_status
  FROM public.complaints c JOIN public.offers o ON o.id=c.offer_id
  WHERE c.id=p_complaint_id FOR UPDATE OF c;
  IF v_business IS NULL OR NOT wow_private.is_business_owner(v_business) THEN
    RAISE EXCEPTION 'Active business owner required' USING ERRCODE='42501';
  END IF;
  IF v_status='closed' THEN
    RAISE EXCEPTION 'Closed complaint cannot receive proprietor responses'
      USING ERRCODE='22023';
  END IF;
  -- A proprietor may respond only to an unanswered, explicitly proprietor-visible
  -- request for information. The complaint row is locked above to serialize replies.
  IF v_status <> 'waiting' OR NOT EXISTS (
    SELECT 1 FROM public.complaint_updates req
    WHERE req.complaint_id=p_complaint_id
      AND req.kind='request_info'
      AND req.visibility='proprietor_safe'
      AND NOT EXISTS (
        SELECT 1 FROM public.complaint_updates done
        WHERE done.complaint_id=req.complaint_id
          AND done.kind='merchant_response'
          AND done.author_user_id=v_user
          AND done.created_at >= req.created_at
      )
  ) THEN
    RAISE EXCEPTION 'No unanswered administrative request for proprietor'
      USING ERRCODE='22023';
  END IF;
  IF p_message IS NULL OR char_length(btrim(p_message)) NOT BETWEEN 5 AND 3000 THEN
    RAISE EXCEPTION 'Response must contain 5–3000 characters' USING ERRCODE='22023';
  END IF;
  IF p_evidence_keys IS NOT NULL THEN
    IF jsonb_typeof(p_evidence_keys) <> 'array' THEN
      RAISE EXCEPTION 'Evidence keys must be a JSON array' USING ERRCODE='22023';
    END IF;
    IF jsonb_array_length(p_evidence_keys) > 8 THEN
      RAISE EXCEPTION 'Maximum of 8 evidence attachments permitted' USING ERRCODE='22023';
    END IF;
    v_prefix := 'complaints/' || v_user || '/' || p_complaint_id::text || '/';
    FOR v_entry IN SELECT value FROM jsonb_array_elements(p_evidence_keys) LOOP
      IF jsonb_typeof(v_entry) <> 'string' THEN
        RAISE EXCEPTION 'Evidence key must be a string' USING ERRCODE='22023';
      END IF;
      v_key := v_entry #>> '{}';
      IF left(v_key, length(v_prefix)) IS DISTINCT FROM v_prefix
         OR NOT wow_private.storage_safe_key(v_key, true)
         OR NOT EXISTS (
           SELECT 1 FROM storage.objects obj
           WHERE obj.bucket_id = 'wow-complaint-evidence' AND obj.name = v_key
         ) THEN
        RAISE EXCEPTION 'Invalid, foreign, or missing complaint evidence object' USING ERRCODE='22023';
      END IF;
      IF v_key = ANY(v_seen_keys) THEN
        RAISE EXCEPTION 'Duplicate evidence attachment key' USING ERRCODE='22023';
      END IF;
      v_seen_keys := array_append(v_seen_keys, v_key);
    END LOOP;
  END IF;

  INSERT INTO public.complaint_updates(
    complaint_id,author_user_id,kind,message,visibility,private_evidence_keys
  ) VALUES (
    p_complaint_id,
    v_user,
    'merchant_response',
    btrim(p_message),
    'admin_only',
    COALESCE(p_evidence_keys, '[]'::jsonb)
  )
  RETURNING id INTO v_update;
  RETURN v_update;
END;
$$;

CREATE OR REPLACE FUNCTION "public"."wow_merchant_respond_complaint"(
  "p_complaint_id" "uuid",
  "p_message" "text",
  "p_evidence_keys" "jsonb" DEFAULT '[]'::"jsonb"
) RETURNS "uuid"
    LANGUAGE "sql"
    SET "search_path" TO ''
    AS $$
  SELECT wow_private.merchant_respond_complaint_internal(p_complaint_id, p_message, p_evidence_keys);
$$;

CREATE OR REPLACE FUNCTION "public"."wow_merchant_respond_complaint"(
  "p_complaint_id" "uuid",
  "p_message" "text"
) RETURNS "uuid"
    LANGUAGE "sql"
    SET "search_path" TO ''
    AS $$
  SELECT wow_private.merchant_respond_complaint_internal(p_complaint_id, p_message, '[]'::jsonb);
$$;

REVOKE ALL ON FUNCTION "public"."wow_merchant_respond_complaint"("p_complaint_id" "uuid", "p_message" "text", "p_evidence_keys" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."wow_merchant_respond_complaint"("p_complaint_id" "uuid", "p_message" "text", "p_evidence_keys" "jsonb") TO "service_role";
GRANT ALL ON FUNCTION "public"."wow_merchant_respond_complaint"("p_complaint_id" "uuid", "p_message" "text", "p_evidence_keys" "jsonb") TO "authenticated";

-- 4. Merchant-safe complaint detail RPC (sanitized case view, strictly zero customer identity leakage).
CREATE OR REPLACE FUNCTION "wow_private"."merchant_get_complaint_internal"("p_complaint_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_user TEXT;
  v_business UUID;
  v_branch UUID;
  v_is_owner BOOLEAN;
  v_is_delegate BOOLEAN := false;
  v_result JSONB;
BEGIN
  v_user := wow_private.current_active_customer_id();

  SELECT o.business_id, c.branch_id INTO v_business, v_branch
  FROM public.complaints c JOIN public.offers o ON o.id=c.offer_id
  WHERE c.id=p_complaint_id;

  IF v_business IS NULL THEN
    RETURN NULL;
  END IF;

  v_is_owner := wow_private.is_business_owner(v_business);

  IF NOT v_is_owner THEN
    -- Check if user is a member with access to this branch
    IF v_branch IS NOT NULL THEN
      SELECT EXISTS (
        SELECT 1 FROM public.business_members m
        JOIN public.business_member_branches b ON b.member_id = m.id
        WHERE m.business_id = v_business AND m.user_id = v_user
          AND m.status = 'active' AND b.branch_id = v_branch
      ) INTO v_is_delegate;
    END IF;

    IF NOT v_is_delegate THEN
      RETURN NULL; -- Fail closed, no existence leakage
    END IF;
  END IF;

  SELECT jsonb_build_object(
    'id', c.id,
    'offer_id', c.offer_id,
    'offer_title', COALESCE(v.title, ''),
    'offer_version_id', c.offer_version_id,
    'branch_id', c.branch_id,
    'branch_name', COALESCE(br.name, ''),
    'complaint_type', c.complaint_type,
    -- Customer-authored free text may contain contact details or identifying
    -- material, so never expose it through the merchant-safe projection.
    'description', 'تُعرض الوقائع المسموح بها من خلال طلب الإدارة فقط.',
    'incident_at', c.incident_at,
    'status', c.status,
    'public_outcome', c.public_outcome,
    'created_at', c.created_at,
    'closed_at', c.closed_at,
    'is_owner', v_is_owner,
    'updates', CASE WHEN v_is_owner THEN
      COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'id', u.id,
          'kind', u.kind,
          'message', u.message,
          'visibility', u.visibility,
          'created_at', u.created_at,
          'private_evidence_keys', CASE
            WHEN u.kind='merchant_response' AND u.author_user_id=v_user
              THEN u.private_evidence_keys
            ELSE '[]'::jsonb END
        ) ORDER BY u.created_at, u.id)
        FROM public.complaint_updates u
        WHERE u.complaint_id = c.id
          AND (
            (u.visibility='proprietor_safe' AND u.kind IN ('request_info', 'decision', 'status'))
            OR (u.visibility='admin_only' AND u.kind='merchant_response'
                AND u.author_user_id=v_user)
          )
      ), '[]'::jsonb)
    ELSE '[]'::jsonb END
  ) INTO v_result
  FROM public.complaints c
  JOIN public.offers o ON o.id = c.offer_id
  LEFT JOIN public.offer_versions v ON v.id = c.offer_version_id
  LEFT JOIN public.business_branches br ON br.id = c.branch_id
  WHERE c.id = p_complaint_id;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION "public"."wow_merchant_get_complaint"("p_complaint_id" "uuid") RETURNS "jsonb"
    LANGUAGE "sql" STABLE
    SET "search_path" TO ''
    AS $$
  SELECT wow_private.merchant_get_complaint_internal(p_complaint_id);
$$;

REVOKE ALL ON FUNCTION "public"."wow_merchant_get_complaint"("p_complaint_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."wow_merchant_get_complaint"("p_complaint_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."wow_merchant_get_complaint"("p_complaint_id" "uuid") TO "authenticated";

COMMIT;

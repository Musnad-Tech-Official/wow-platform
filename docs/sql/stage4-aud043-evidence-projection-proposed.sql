-- AUD-043: reviewer-only, conflict-free access to private evidence paths.
-- SQL hardening for existing owner-authorized 2026-11-22 stage 4 implementation.
-- Abort if reviewed baseline definitions have changed.
DO $stage4_evidence_guard$
BEGIN
  IF md5(pg_get_functiondef(to_regprocedure('public.wow_admin_get_offer_review(uuid)')::oid)) IS DISTINCT FROM '8263247eda7cddd10ba588f578d4dd9f' THEN
    RAISE EXCEPTION 'AUD-043 baseline drift: public.wow_admin_get_offer_review' USING ERRCODE='55000';
  END IF;
  IF md5(pg_get_functiondef(to_regprocedure('wow_private.admin_get_complaint_internal(uuid)')::oid)) IS DISTINCT FROM '23c4976c1bb9845a1a7b8cf48a7e20a3' THEN
    RAISE EXCEPTION 'AUD-043 baseline drift: wow_private.admin_get_complaint_internal' USING ERRCODE='55000';
  END IF;
  IF md5(pg_get_functiondef(to_regprocedure('wow_private.admin_get_offer_review_internal(uuid)')::oid)) IS DISTINCT FROM 'b68aac7411c12f74409dd76ba18f9476' THEN
    RAISE EXCEPTION 'AUD-043 baseline drift: wow_private.admin_get_offer_review_internal' USING ERRCODE='55000';
  END IF;
END;
$stage4_evidence_guard$;

CREATE OR REPLACE FUNCTION wow_private.admin_get_offer_review_internal(p_version_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_data JSONB;
BEGIN
  IF NOT wow_private.has_admin_permission(false) THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE='42501';
  END IF;
  SELECT jsonb_build_object(
    'version',to_jsonb(v),
    'business',jsonb_build_object('id',b.id,'name',b.name,'status',b.status),
    'offer',jsonb_build_object('id',o.id,'status',o.status,
      'current_version_id',o.current_version_id,'merchant_available',o.merchant_available),
    'items',COALESCE((
      SELECT jsonb_agg(to_jsonb(i)||jsonb_build_object(
        'attributes',COALESCE((SELECT jsonb_agg(to_jsonb(a) ORDER BY a.sort_order)
          FROM public.offer_item_attributes a WHERE a.offer_item_id=i.id),'[]'::jsonb)
      ) ORDER BY i.sort_order) FROM public.offer_items i
      WHERE i.offer_version_id=v.id
    ),'[]'::jsonb),
    'branches',COALESCE((
      SELECT jsonb_agg(jsonb_build_object('id',br.id,'name',br.name,
        'status',br.status,'city',br.city))
      FROM public.offer_branches ob JOIN public.business_branches br ON br.id=ob.branch_id
      WHERE ob.offer_version_id=v.id
    ),'[]'::jsonb),
    'media',COALESCE((SELECT jsonb_agg(to_jsonb(m) ORDER BY m.sort_order)
      FROM public.offer_media m WHERE m.offer_version_id=v.id),'[]'::jsonb),
    'reviews',COALESCE((SELECT jsonb_agg(to_jsonb(r) ORDER BY r.created_at)
      FROM public.offer_reviews r WHERE r.offer_version_id=v.id),'[]'::jsonb)
  ) INTO v_data
  FROM public.offer_versions v
  JOIN public.offers o ON o.id=v.offer_id
  JOIN public.businesses b ON b.id=o.business_id
  WHERE v.id=p_version_id;
  -- A viewer or an administrator affiliated with this business must never
  -- receive private Storage object keys through an internal or public RPC.
  IF v_data IS NOT NULL AND NOT (
      wow_private.has_admin_permission(true)
      AND NOT wow_private.is_business_member((v_data #>> '{business,id}')::uuid)
      AND NOT wow_private.is_business_owner((v_data #>> '{business,id}')::uuid)
    ) THEN
    v_data := jsonb_set(v_data, '{media}', COALESCE((
      SELECT jsonb_agg(m - 'storage_key' ORDER BY ord)
      FROM jsonb_array_elements(COALESCE(v_data -> 'media', '[]'::jsonb))
        WITH ORDINALITY AS item(m,ord)
    ), '[]'::jsonb), true);
  END IF;
  RETURN v_data;
END;
$function$;

CREATE OR REPLACE FUNCTION public.wow_admin_get_offer_review(p_version_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_review jsonb;
  v_evidence jsonb;
  v_business_id uuid;
BEGIN
  v_review := wow_private.admin_get_offer_review_internal(p_version_id);
  IF v_review IS NULL THEN RETURN NULL; END IF;
  SELECT documents INTO v_evidence FROM wow_private.offer_evidence_drafts
    WHERE offer_version_id = p_version_id;
  v_business_id := (v_review #>> '{business,id}')::uuid;
  IF NOT (
      wow_private.has_admin_permission(true)
      AND NOT wow_private.is_business_member(v_business_id)
      AND NOT wow_private.is_business_owner(v_business_id)
    ) THEN
    -- Preserve counts, file names, sizes and MIME metadata, not usable object keys.
    SELECT COALESCE(jsonb_agg(e - 'storageKey' ORDER BY ord), '[]'::jsonb)
      INTO v_evidence
      FROM jsonb_array_elements(COALESCE(v_evidence,'[]'::jsonb))
        WITH ORDINALITY AS doc(e,ord);
  END IF;
  RETURN v_review || jsonb_build_object(
    'private_evidence', COALESCE(v_evidence, '[]'::jsonb));
END;
$function$;

CREATE OR REPLACE FUNCTION wow_private.admin_get_complaint_internal(p_complaint_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_result JSONB;
BEGIN
  IF NOT wow_private.has_admin_permission(false) THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE='42501';
  END IF;
  SELECT jsonb_build_object(
    'complaint',to_jsonb(c),
    'updates',COALESCE((SELECT jsonb_agg(to_jsonb(u) ORDER BY u.created_at,u.id)
      FROM public.complaint_updates u WHERE u.complaint_id=c.id),'[]'::jsonb)
  ) INTO v_result FROM public.complaints c WHERE c.id=p_complaint_id;
  IF v_result IS NOT NULL AND NOT (
      wow_private.has_admin_permission(true)
      AND NOT EXISTS (
        SELECT 1
        FROM public.offers o
        WHERE o.id = (v_result #>> '{complaint,offer_id}')::uuid
          AND (wow_private.is_business_member(o.business_id)
               OR wow_private.is_business_owner(o.business_id))
      )
    ) THEN
    v_result := jsonb_set(v_result, '{complaint}',
      (v_result -> 'complaint' - 'private_evidence_keys') ||
        jsonb_build_object('private_evidence_count',
          CASE WHEN jsonb_typeof(v_result #> '{complaint,private_evidence_keys}') = 'array'
            THEN jsonb_array_length(v_result #> '{complaint,private_evidence_keys}')
            ELSE 0 END),
      true);
    v_result := jsonb_set(v_result, '{updates}', COALESCE((
      SELECT jsonb_agg(
        (u - 'private_evidence_keys') ||
        jsonb_build_object('private_evidence_count',
          CASE WHEN jsonb_typeof(u -> 'private_evidence_keys') = 'array'
            THEN jsonb_array_length(u -> 'private_evidence_keys')
            ELSE 0 END)
        ORDER BY ord
      )
      FROM jsonb_array_elements(COALESCE(v_result -> 'updates', '[]'::jsonb))
        WITH ORDINALITY AS upd(u,ord)
    ), '[]'::jsonb), true);
  END IF;
  RETURN v_result;
END;
$function$;

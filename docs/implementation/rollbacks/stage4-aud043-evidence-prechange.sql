-- Function-definition-only recovery snapshot; not a full database backup.
-- Use only if specifically directed during an operational rollback.

CREATE OR REPLACE FUNCTION public.wow_admin_get_offer_review(p_version_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
  RETURN v_result;
END;
$function$;

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
  RETURN v_data;
END;
$function$;

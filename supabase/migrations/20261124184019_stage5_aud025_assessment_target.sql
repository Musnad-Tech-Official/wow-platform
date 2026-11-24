-- AUD-025: action-specific, minimal read model. Never broaden public discovery.
CREATE FUNCTION wow_private.customer_get_assessment_offer_internal(p_offer_id uuid,p_purpose text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO ''
AS $function$
DECLARE v_result jsonb;
BEGIN
  PERFORM wow_private.current_active_customer_id();
  IF p_purpose IS NULL OR p_purpose NOT IN ('rating','complaint') THEN
    RAISE EXCEPTION 'Invalid assessment purpose' USING ERRCODE='22023';
  END IF;
  SELECT jsonb_build_object(
    'id',o.id,'offer_version_id',v.id,'title',v.title,
    'business',jsonb_build_object('name',b.name),
    'branches',CASE WHEN p_purpose='complaint' THEN COALESCE((
       SELECT jsonb_agg(jsonb_build_object('id',br.id,'name',br.name,'city',br.city) ORDER BY br.id)
       FROM public.offer_branches ob JOIN public.business_branches br
         ON br.id=ob.branch_id AND br.business_id=ob.business_id
       WHERE ob.offer_version_id=v.id AND ob.business_id=o.business_id
    ),'[]'::jsonb) ELSE '[]'::jsonb END)
  INTO v_result
  FROM public.offers o
  JOIN public.offer_versions v ON v.id=o.current_version_id AND v.offer_id=o.id AND v.business_id=o.business_id
  JOIN public.businesses b ON b.id=o.business_id
  WHERE o.id=p_offer_id AND v.review_status='approved'
    AND (p_purpose='complaint' OR (
      b.status='approved' AND v.starts_at IS NOT NULL AND v.ends_at IS NOT NULL
      AND now()>=v.starts_at AND now()<=v.ends_at+INTERVAL '14 days'
      AND EXISTS(SELECT 1 FROM public.offer_branches ob
        JOIN public.business_branches br ON br.id=ob.branch_id AND br.business_id=ob.business_id
        WHERE ob.offer_version_id=v.id AND ob.business_id=o.business_id AND br.status='approved')
    ));
  RETURN v_result;
END;
$function$;

CREATE FUNCTION public.wow_customer_get_assessment_offer(p_offer_id uuid,p_purpose text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path TO ''
AS $function$
 SELECT wow_private.customer_get_assessment_offer_internal(p_offer_id,p_purpose);
$function$;

REVOKE ALL ON FUNCTION wow_private.customer_get_assessment_offer_internal(uuid,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.wow_customer_get_assessment_offer(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION wow_private.customer_get_assessment_offer_internal(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.wow_customer_get_assessment_offer(uuid,text) TO authenticated;

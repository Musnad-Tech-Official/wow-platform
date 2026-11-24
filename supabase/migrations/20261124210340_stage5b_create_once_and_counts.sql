-- Stage 5B AUD-027/045: retry-safe creation and unpaginated authorized counts.
CREATE OR REPLACE FUNCTION wow_private.create_offer_once_internal(p_business_id uuid,p_request_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor text:=wow_private.current_active_customer_id();
BEGIN
 IF p_request_id IS NULL THEN RAISE EXCEPTION 'Request ID required' USING ERRCODE='22023'; END IF;
 IF NOT wow_private.can_manage_offer_business(p_business_id,'draft') THEN
   RAISE EXCEPTION 'Offer drafting permission required' USING ERRCODE='42501';
 END IF;
 INSERT INTO public.offers(id,business_id,created_by_user_id)
 VALUES(p_request_id,p_business_id,actor) ON CONFLICT(id) DO NOTHING;
 IF NOT EXISTS(SELECT 1 FROM public.offers WHERE id=p_request_id AND business_id=p_business_id AND created_by_user_id=actor) THEN
   RAISE EXCEPTION 'Offer request conflict' USING ERRCODE='42501';
 END IF;
 RETURN p_request_id;
END; $$;
CREATE OR REPLACE FUNCTION public.wow_create_offer_once(p_business_id uuid,p_request_id uuid)
RETURNS uuid LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$
 SELECT wow_private.create_offer_once_internal(p_business_id,p_request_id);
$$;
CREATE OR REPLACE FUNCTION wow_private.merchant_complaint_counts_internal(p_business_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE actor text:=wow_private.current_active_customer_id(); own boolean:=wow_private.is_business_owner(p_business_id); result jsonb;
BEGIN
 IF NOT own AND NOT EXISTS(SELECT 1 FROM public.business_members m WHERE m.business_id=p_business_id AND m.user_id=actor AND m.status='active' AND m.can_monitor IS TRUE) THEN
   RAISE EXCEPTION 'Business owner or authorized branch monitor required' USING ERRCODE='42501';
 END IF;
 SELECT jsonb_build_object('totalCount',count(*),'openCount',count(*) FILTER(WHERE c.status IN ('new','investigating','waiting')),'closedCount',count(*) FILTER(WHERE c.status='closed')) INTO result
 FROM public.complaints c JOIN public.offers o ON o.id=c.offer_id
 WHERE o.business_id=p_business_id AND (own OR EXISTS(
 SELECT 1 FROM public.business_members m JOIN public.business_member_branches scope ON scope.member_id=m.id AND scope.business_id=p_business_id
 WHERE m.business_id=p_business_id AND m.user_id=actor AND m.status='active' AND m.can_monitor IS TRUE AND scope.branch_id=c.branch_id));
 RETURN result;
END; $$;
CREATE OR REPLACE FUNCTION public.wow_merchant_complaint_counts(p_business_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
 SELECT wow_private.merchant_complaint_counts_internal(p_business_id);
$$;
REVOKE ALL ON FUNCTION wow_private.create_offer_once_internal(uuid,uuid),public.wow_create_offer_once(uuid,uuid),wow_private.merchant_complaint_counts_internal(uuid),public.wow_merchant_complaint_counts(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION wow_private.create_offer_once_internal(uuid,uuid),public.wow_create_offer_once(uuid,uuid),wow_private.merchant_complaint_counts_internal(uuid),public.wow_merchant_complaint_counts(uuid) TO authenticated;

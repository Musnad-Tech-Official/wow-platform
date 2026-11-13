-- Merchant navigation scope for owners and independently authenticated delegates.
-- Delegates only see approved activities with active branch-scoped permissions.
CREATE OR REPLACE FUNCTION wow_private.merchant_list_accessible_businesses_internal()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO ''
AS $merchant_access$
DECLARE v_actor text; v_result jsonb;
BEGIN
  v_actor := wow_private.current_active_customer_id();
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', x.id, 'name', x.name, 'status', x.status,
      'owner_user_id', CASE WHEN x.owner_user_id=v_actor THEN v_actor ELSE '' END,
      'description', CASE WHEN x.owner_user_id=v_actor OR x.status='approved' THEN x.description ELSE NULL END,
      'contact_phone', CASE WHEN x.owner_user_id=v_actor THEN x.contact_phone ELSE NULL END,
      'logo_url', CASE WHEN x.owner_user_id=v_actor THEN x.logo_url ELSE NULL END,
      'cover_url', CASE WHEN x.owner_user_id=v_actor THEN x.cover_url ELSE NULL END,
      'requested_category_id', CASE WHEN x.owner_user_id=v_actor THEN x.requested_category_id ELSE NULL END
    ) ORDER BY x.name,x.id),'[]'::jsonb)
    INTO v_result
  FROM (
    SELECT b.id,b.name,b.status,b.owner_user_id,b.description,b.contact_phone,
      b.logo_url,b.cover_url,b.requested_category_id
    FROM public.businesses b
    WHERE b.owner_user_id=v_actor OR
      (b.status='approved' AND EXISTS (
        SELECT 1 FROM public.business_members m
        WHERE m.business_id=b.id AND m.user_id=v_actor AND m.status='active'
          AND (m.can_monitor OR m.can_draft OR m.can_submit OR m.can_pause)
          AND EXISTS (
            SELECT 1 FROM public.business_member_branches mb
            JOIN public.business_branches br ON br.id=mb.branch_id AND br.business_id=b.id
            WHERE mb.member_id=m.id AND mb.business_id=b.id AND br.status='approved'
          )
      ))
  ) x;
  RETURN v_result;
END;
$merchant_access$;
CREATE OR REPLACE FUNCTION public.wow_merchant_list_accessible_businesses()
RETURNS jsonb LANGUAGE sql SET search_path TO ''
AS $merchant_access_api$
  SELECT wow_private.merchant_list_accessible_businesses_internal();
$merchant_access_api$;
REVOKE ALL ON FUNCTION public.wow_merchant_list_accessible_businesses() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.wow_merchant_list_accessible_businesses() TO authenticated,service_role;
REVOKE ALL ON FUNCTION wow_private.merchant_list_accessible_businesses_internal() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION wow_private.merchant_list_accessible_businesses_internal() TO authenticated,service_role;

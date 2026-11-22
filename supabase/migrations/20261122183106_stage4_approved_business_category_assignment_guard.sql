-- AUD-017: prevent removing all categories, missing primary or assigning to unapproved business.
DO $stage4_category_drift$
BEGIN
  IF md5(pg_get_functiondef('wow_private.admin_set_business_categories_internal(uuid,uuid[],uuid,text)'::regprocedure))
    IS DISTINCT FROM 'faf7bb3b1c1fc437fe91ecad3efca16a' THEN
    RAISE EXCEPTION 'AUD-017 function baseline drift' USING ERRCODE='55000';
  END IF;
END;
$stage4_category_drift$;
CREATE OR REPLACE FUNCTION wow_private.admin_set_business_categories_internal(p_business_id uuid, p_category_ids uuid[], p_primary_category_id uuid, p_reason text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_actor TEXT;
  v_old_ids UUID[];
  v_old_primary UUID;
BEGIN
  v_actor := wow_private.assert_billing_admin(false,p_business_id);
  IF p_category_ids IS NULL OR cardinality(p_category_ids) NOT BETWEEN 1 AND 12
    OR p_reason IS NULL OR char_length(btrim(p_reason)) NOT BETWEEN 10 AND 1000
    OR p_primary_category_id IS NULL OR NOT (p_primary_category_id = ANY(p_category_ids))
    OR EXISTS (SELECT 1 FROM unnest(p_category_ids) AS x(id) WHERE x.id IS NULL)
    OR (SELECT count(*) FROM unnest(p_category_ids) AS x(id)) <>
       (SELECT count(DISTINCT x.id) FROM unnest(p_category_ids) AS x(id)) THEN
    RAISE EXCEPTION 'Invalid business categories or reason' USING ERRCODE='22023';
  END IF;
  -- Serialize category replacements per business. No client can directly write.
  PERFORM 1 FROM public.businesses b WHERE b.id=p_business_id AND b.status='approved' FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Approved business required for category assignments' USING ERRCODE='22023';
  END IF;
  IF EXISTS (
    SELECT 1 FROM unnest(p_category_ids) AS x(id)
    WHERE NOT EXISTS (SELECT 1 FROM public.categories c
      WHERE c.id=x.id AND c.is_active)
  ) THEN
    RAISE EXCEPTION 'All assigned categories must be active' USING ERRCODE='22023';
  END IF;
  SELECT COALESCE(array_agg(bc.category_id ORDER BY bc.category_id), ARRAY[]::UUID[]),
         (array_agg(bc.category_id) FILTER (WHERE bc.is_primary))[1]
    INTO v_old_ids,v_old_primary
  FROM public.business_categories bc WHERE bc.business_id=p_business_id;

  DELETE FROM public.business_categories WHERE business_id=p_business_id;
  INSERT INTO public.business_categories(
    business_id,category_id,is_primary,approved_by_user_id
  )
  SELECT p_business_id, x.id,
    (p_primary_category_id IS NOT NULL AND x.id=p_primary_category_id), v_actor
  FROM unnest(p_category_ids) AS x(id);

  INSERT INTO wow_private.category_assignment_events(
    business_id,actor_user_id,old_category_ids,new_category_ids,
    old_primary_id,new_primary_id,reason
  ) VALUES (
    p_business_id,v_actor,v_old_ids,
    (SELECT COALESCE(array_agg(x.id ORDER BY x.id),ARRAY[]::UUID[])
     FROM unnest(p_category_ids) AS x(id)),
    v_old_primary,p_primary_category_id,btrim(p_reason)
  );
  RETURN p_business_id;
END;
$function$;

-- W07 read-only administrative category catalog and business assignment search.
-- No direct SELECT grants on categories or business_categories.
-- Each SECURITY DEFINER RPC validates an active Clerk-authenticated admin.
CREATE OR REPLACE FUNCTION public.wow_admin_list_categories()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $w07_categories$
BEGIN
  IF NOT wow_private.has_admin_permission(false) THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;
  RETURN (SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id',c.id,'parent_id',c.parent_id,'slug',c.slug,
    'name_ar',c.name_ar,'name_en',c.name_en,
    'sort_order',c.sort_order,'is_active',c.is_active
  ) ORDER BY c.sort_order,c.name_ar,c.id),'[]'::jsonb)
  FROM public.categories c);
END;
$w07_categories$;
REVOKE ALL ON FUNCTION public.wow_admin_list_categories() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.wow_admin_list_categories() TO authenticated;

CREATE OR REPLACE FUNCTION public.wow_admin_search_business_categories(
  p_query text DEFAULT '', p_limit integer DEFAULT 30
)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $w07_business_categories$
DECLARE v_search text := btrim(COALESCE(p_query,''));
BEGIN
  IF NOT wow_private.has_admin_permission(false) THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;
  IF char_length(v_search)>100 OR p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 50 THEN
    RAISE EXCEPTION 'Invalid category business search' USING ERRCODE='22023';
  END IF;
  RETURN (SELECT COALESCE(jsonb_agg(to_jsonb(t) - 'created_at'
    ORDER BY t.created_at DESC,t.business_id),'[]'::jsonb)
    FROM (
      SELECT b.id AS business_id,b.name AS business_name,b.status AS business_status,
        b.created_at,
        COALESCE((SELECT array_agg(bc.category_id ORDER BY bc.category_id)
                  FROM public.business_categories bc WHERE bc.business_id=b.id),ARRAY[]::uuid[]) AS category_ids,
        (SELECT bc.category_id FROM public.business_categories bc
         WHERE bc.business_id=b.id AND bc.is_primary LIMIT 1) AS primary_category_id
      FROM public.businesses b
      WHERE v_search='' OR strpos(lower(b.name),lower(v_search))>0 OR b.id::text=v_search
      ORDER BY b.created_at DESC,b.id LIMIT p_limit
    ) t);
END;
$w07_business_categories$;
REVOKE ALL ON FUNCTION public.wow_admin_search_business_categories(text,integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.wow_admin_search_business_categories(text,integer) TO authenticated;

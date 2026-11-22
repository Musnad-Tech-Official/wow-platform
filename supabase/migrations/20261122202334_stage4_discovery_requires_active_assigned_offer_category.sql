-- AUD-034: discovery must stop exposing previously approved offers when
-- the offer category or its approved business-category assignment is revoked.
-- This is a proposal; apply with a real Supabase version only after a
-- rollback-scoped authorization matrix succeeds.
DO $aud034_guard$
DECLARE v_hash text;
BEGIN
  SELECT md5(pg_get_functiondef(p.oid)) INTO v_hash
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='wow_private' AND p.proname='discoverable_offer_branches'
    AND p.pronargs=0;
  IF v_hash IS DISTINCT FROM 'be3990c250576bcb75c269adcf50fc5b' THEN
    RAISE EXCEPTION 'AUD-034 source drift: expected %, found %',
      'be3990c250576bcb75c269adcf50fc5b', v_hash
      USING ERRCODE='55000';
  END IF;
END;
$aud034_guard$;

CREATE OR REPLACE FUNCTION wow_private.discoverable_offer_branches()
RETURNS TABLE(
  offer_id uuid,
  version_id uuid,
  business_id uuid,
  branch_id uuid,
  starts_at timestamptz,
  ends_at timestamptz,
  original_price numeric,
  final_price numeric,
  discount_percent numeric
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $aud034$
  SELECT o.id,v.id,o.business_id,br.id,v.starts_at,v.ends_at,
    v.original_price,v.final_price,
    CASE WHEN v.original_price>0 AND v.final_price<v.original_price
      THEN round(((v.original_price-v.final_price)*100/v.original_price)::numeric,2)
      ELSE 0::numeric END
  FROM public.offers o
  JOIN public.businesses b ON b.id=o.business_id
  JOIN public.offer_versions v ON v.id=o.current_version_id
    AND v.offer_id=o.id AND v.business_id=o.business_id
  JOIN public.offer_branches ob ON ob.offer_version_id=v.id AND ob.business_id=o.business_id
  JOIN public.business_branches br ON br.id=ob.branch_id AND br.business_id=o.business_id
  WHERE b.status='approved' AND b.is_paused=false
    AND br.status='approved' AND br.is_paused=false
    AND o.status='active' AND o.merchant_available IS TRUE
    AND v.review_status='approved' AND v.approved_at IS NOT NULL
    AND v.starts_at<=now() AND v.ends_at>now()
    AND wow_private.has_publication_entitlement(o.business_id)
    -- Offer-category approval is rechecked on every public read, not only
    -- when the offer version was initially approved.
    AND EXISTS (
      SELECT 1
      FROM public.business_categories bc
      JOIN public.categories c ON c.id=bc.category_id
      WHERE bc.business_id=o.business_id AND bc.category_id=v.category_id
        AND c.is_active IS TRUE
        AND (
          c.parent_id IS NULL
          OR EXISTS (
            SELECT 1 FROM public.categories parent
            WHERE parent.id=c.parent_id AND parent.is_active IS TRUE
          )
        )
    );
$aud034$;

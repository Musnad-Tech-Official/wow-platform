-- AUD-019: prevent waiting without proprietor-visible request_info.
-- Dedicated request workflow writes both the request_info update and waiting state.
DO $stage4_complaint_drift$
BEGIN
  IF md5(pg_get_functiondef('wow_private.admin_update_complaint_internal(uuid,text,text,text)'::regprocedure))
      IS DISTINCT FROM '9fe46f7f1448909a91288ee24df48edc' THEN
    RAISE EXCEPTION 'AUD-019 baseline drift' USING ERRCODE='55000';
  END IF;
END;
$stage4_complaint_drift$;
CREATE OR REPLACE FUNCTION wow_private.admin_update_complaint_internal(p_complaint_id uuid, p_status text, p_note text, p_public_outcome text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_reviewer TEXT; v_before TEXT; v_business UUID; v_outcome TEXT;
BEGIN
  IF NOT wow_private.has_admin_permission(true) THEN
    RAISE EXCEPTION 'Admin review permission required' USING ERRCODE='42501';
  END IF;
  v_reviewer := wow_private.current_active_customer_id();
  -- The waiting state must be paired with a proprietor-visible request_info
  -- record. The dedicated wow_admin_request_merchant_response RPC does both
  -- atomically and enforces conflict-of-interest and duplicate-request guards.
  -- This generic status RPC may only set investigating or closed.
  IF p_status = 'waiting' THEN
    RAISE EXCEPTION 'Use the proprietor request workflow to set waiting'
      USING ERRCODE='22023';
  END IF;
  IF p_status IS NULL OR p_status NOT IN ('investigating','closed')
     OR p_note IS NULL OR char_length(btrim(p_note)) NOT BETWEEN 5 AND 3000 THEN
    RAISE EXCEPTION 'Valid status and an internal note are required' USING ERRCODE='22023';
  END IF;
  SELECT c.status,o.business_id INTO v_before,v_business
  FROM public.complaints c JOIN public.offers o ON o.id=c.offer_id
  WHERE c.id=p_complaint_id FOR UPDATE OF c;
  IF v_before IS NULL OR v_before='closed' THEN
    RAISE EXCEPTION 'Complaint missing or already closed' USING ERRCODE='22023';
  END IF;
  IF EXISTS (SELECT 1 FROM public.business_members m
      WHERE m.business_id=v_business AND m.user_id=v_reviewer AND m.status='active')
     OR EXISTS (SELECT 1 FROM public.businesses b
                 WHERE b.id=v_business AND b.owner_user_id=v_reviewer) THEN
    RAISE EXCEPTION 'Cannot decide complaints involving affiliated businesses'
      USING ERRCODE='42501';
  END IF;
  IF p_status='closed' THEN
    IF p_public_outcome IS NULL OR
       char_length(btrim(p_public_outcome)) NOT BETWEEN 5 AND 2000 THEN
      RAISE EXCEPTION 'Customer-safe outcome is required when closing'
        USING ERRCODE='22023';
    END IF;
    v_outcome := btrim(p_public_outcome);
  ELSIF p_public_outcome IS NOT NULL THEN
    RAISE EXCEPTION 'Public outcome can only be set on closure' USING ERRCODE='22023';
  END IF;
  UPDATE public.complaints SET status=p_status,
    public_outcome=v_outcome,
    closed_at=CASE WHEN p_status='closed' THEN now() ELSE NULL END
  WHERE id=p_complaint_id;
  INSERT INTO public.complaint_updates(
    complaint_id,author_user_id,kind,message,visibility
  ) VALUES (
    p_complaint_id,v_reviewer,
    CASE WHEN p_status='closed' THEN 'decision' ELSE 'status' END,
    btrim(p_note),'admin_only'
  );
  RETURN p_complaint_id;
END;
$function$;

-- AUD-038: do not consume a 30-day trial when approved business/branch
-- is paused, or an approved offer has lost its publication category.
-- Existing trial IDs remain idempotent and are never extended/reset.
DO $aud038_guard$
DECLARE v_hash text;
BEGIN
  SELECT md5(pg_get_functiondef(p.oid)) INTO v_hash
  FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='wow_private' AND p.proname='activate_business_trial_internal'
    AND p.pronargs=1;
  IF v_hash IS DISTINCT FROM '76abcc20a5b8102edfd3b78e0bedd92b' THEN
    RAISE EXCEPTION 'AUD-038 activation source drift: expected 76abcc20..., found %',v_hash
      USING ERRCODE='55000';
  END IF;
END;
$aud038_guard$;

CREATE OR REPLACE FUNCTION wow_private.activate_business_trial_internal(p_business_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $aud038$
DECLARE
  v_actor text;
  v_existing uuid;
  v_id uuid;
  v_time timestamptz := now();
BEGIN
  v_actor := wow_private.assert_billing_owner(p_business_id);
  PERFORM 1 FROM public.businesses WHERE id=p_business_id FOR UPDATE;
  SELECT s.id INTO v_existing FROM public.business_subscriptions s
    WHERE s.business_id=p_business_id AND s.kind='trial';
  -- Never consume a second trial or refresh an existing trial's deadline.
  IF v_existing IS NOT NULL THEN RETURN v_existing; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id=p_business_id AND b.status='approved' AND b.is_paused IS FALSE
  ) THEN
    RAISE EXCEPTION 'An approved, unpaused business is required to start trial'
      USING ERRCODE='22023';
  END IF;

  -- Require an offer that WOULD be eligible for public discovery once this
  -- trial creates the publication entitlement. Do not check entitlement here
  -- because that would create a circular dependency on the trial itself.
  IF NOT EXISTS (
    SELECT 1 FROM public.offers o
    JOIN public.offer_versions v
      ON v.id=o.current_version_id AND v.offer_id=o.id
        AND v.business_id=o.business_id
    JOIN public.offer_branches ob
      ON ob.offer_version_id=v.id AND ob.business_id=o.business_id
    JOIN public.business_branches br
      ON br.id=ob.branch_id AND br.business_id=o.business_id
    WHERE o.business_id=p_business_id
      AND o.status='active' AND o.merchant_available IS TRUE
      AND v.review_status='approved' AND v.approved_at IS NOT NULL
      AND v.starts_at<=v_time AND v.ends_at>v_time
      AND br.status='approved' AND br.is_paused IS FALSE
      AND EXISTS (
        SELECT 1 FROM public.business_categories bc
        JOIN public.categories c ON c.id=bc.category_id
        WHERE bc.business_id=o.business_id
          AND bc.category_id=v.category_id
          AND c.is_active IS TRUE
          AND (
            c.parent_id IS NULL
            OR EXISTS (
              SELECT 1 FROM public.categories parent
              WHERE parent.id=c.parent_id AND parent.is_active IS TRUE
            )
          )
      )
  ) THEN
    RAISE EXCEPTION 'A currently discoverable approved offer on an unpaused approved branch and active assigned category is required to start trial'
      USING ERRCODE='22023';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.business_subscriptions s
    WHERE s.business_id=p_business_id AND s.status='active'
      AND s.starts_at<=v_time AND s.ends_at>v_time
  ) THEN
    RAISE EXCEPTION 'Another active subscription already exists' USING ERRCODE='22023';
  END IF;

  INSERT INTO public.business_subscriptions(
    business_id,kind,status,starts_at,ends_at,requested_by_user_id
  ) VALUES (
    p_business_id,'trial','active',v_time,v_time+interval '30 days',v_actor
  ) RETURNING id INTO v_id;
  INSERT INTO wow_private.billing_events(business_id,actor_user_id,action,target_type,target_id)
    VALUES(p_business_id,v_actor,'trial_activated','subscription',v_id);
  RETURN v_id;
END;
$aud038$;

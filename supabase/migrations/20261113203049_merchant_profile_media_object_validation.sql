CREATE OR REPLACE FUNCTION wow_private.submit_profile_revision_internal(p_business_id uuid, p_branch_id uuid, p_patch jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_bs TEXT;v_br TEXT;v_id UUID;v_actor TEXT:=(SELECT auth.jwt()->>'sub'); v_media_field text; v_media_key text;
BEGIN
  SELECT status INTO v_bs FROM public.businesses WHERE id=p_business_id FOR UPDATE;
  IF v_bs IS NULL OR NOT wow_private.is_business_owner(p_business_id)
     OR v_bs<>'approved' THEN
    RAISE EXCEPTION 'Approved business owner required' USING ERRCODE='42501';
  END IF;
  IF p_branch_id IS NOT NULL THEN
    SELECT status INTO v_br FROM public.business_branches
      WHERE id=p_branch_id AND business_id=p_business_id FOR UPDATE;
    IF v_br IS DISTINCT FROM 'approved' THEN
      RAISE EXCEPTION 'Branch must be approved for profile revision' USING ERRCODE='22023';
    END IF;
  END IF;
  PERFORM wow_private.validate_merchant_profile_patch(p_patch,p_branch_id IS NOT NULL);
  IF p_branch_id IS NULL THEN
    FOREACH v_media_field IN ARRAY ARRAY['logo_url','cover_url'] LOOP
      IF p_patch ? v_media_field AND p_patch->>v_media_field IS NOT NULL THEN
        v_media_key:=p_patch->>v_media_field;
        IF v_media_key !~ ('^' || p_business_id::text || '/' || v_actor || '/[a-f0-9]{48}[.](jpg|png|webp)$') THEN
          RAISE EXCEPTION 'Business image key must belong to the requesting owner and activity'
            USING ERRCODE='22023';
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM storage.objects o
          WHERE o.bucket_id='wow-business-media' AND o.name=v_media_key
            AND o.metadata->>'mimetype' IN ('image/jpeg','image/png','image/webp')
            AND CASE WHEN (o.metadata->>'size') ~ '^[0-9]{1,9}$'
              THEN (o.metadata->>'size')::bigint BETWEEN 1 AND 5242880
              ELSE false END
        ) THEN
          RAISE EXCEPTION 'Referenced business image not in authorized private Storage'
            USING ERRCODE='22023';
        END IF;
      END IF;
    END LOOP;
  END IF;

  INSERT INTO public.business_profile_revisions(
    business_id,branch_id,patch,requested_by_user_id
  ) VALUES (p_business_id,p_branch_id,p_patch,v_actor) RETURNING id INTO v_id;
  INSERT INTO wow_private.merchant_operation_events(business_id,actor_user_id,operation,target_id,metadata)
  VALUES(p_business_id,v_actor,'profile_revision_submit',v_id::text,
    jsonb_build_object('branch_id',p_branch_id,'changed_fields',
      (SELECT jsonb_agg(x.k ORDER BY x.k) FROM jsonb_object_keys(p_patch) AS x(k))));
  RETURN v_id;
END; $function$
;

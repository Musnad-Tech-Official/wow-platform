-- Recorded on wow-platform Supabase as migration 20261114223935.
-- Restrict private wow-business-media signed reads to an active owner of the
-- named business or a non-affiliated reviewer/super_admin.
-- Preserve the original Storage RLS wrappers, permissions and unrelated bucket logic.
-- Source generated from live pg_get_functiondef after successful deployment.
-- Tested with five synthetic roles in docs/sql/w06-private-business-media-role-smoke.sql.
-- No Storage API files were created; targeted rollback at
-- docs/sql/w06-business-media-read-targeted-rollback.sql.

CREATE OR REPLACE FUNCTION wow_private.can_read_wow_object(p_bucket text, p_key text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_user TEXT := wow_private.storage_active_user_id();
  v_parts TEXT[] := string_to_array(p_key,'/');
  v_business UUID;
  v_version UUID;
  v_complaint UUID;
  v_is_reviewer BOOLEAN := wow_private.is_catalog_reviewer();
BEGIN
  IF v_user IS NULL OR NOT wow_private.storage_safe_key(
    p_key,p_bucket IN ('wow-verification-evidence','wow-complaint-evidence')
  ) THEN RETURN false; END IF;

  CASE p_bucket
    WHEN 'wow-business-media' THEN
      -- Private staging files: owner or an independent platform reviewer only.
      IF cardinality(v_parts)<>3 OR
         v_parts[1] !~ '^[0-9a-f-]{36}$' OR
         v_parts[2] !~ '^[A-Za-z0-9_-]{3,128}$' OR
         v_parts[3] !~ '^[a-f0-9]{48}[.](jpg|jpeg|png|webp)$'
      THEN RETURN false; END IF;
      v_business:=v_parts[1]::uuid;
      RETURN (wow_private.is_business_owner(v_business)
        OR (v_is_reviewer AND NOT wow_private.is_business_member(v_business)));

    WHEN 'wow-offer-media' THEN
      IF cardinality(v_parts)<>4 OR
         v_parts[1] !~ '^[0-9a-f-]{36}$' OR
         v_parts[2] !~ '^[0-9a-f-]{36}$' THEN RETURN false; END IF;
      v_business:=v_parts[1]::UUID;
      v_version:=v_parts[2]::UUID;
      RETURN EXISTS (
        SELECT 1 FROM public.offer_versions v
        JOIN public.offers o ON o.id=v.offer_id
        WHERE v.id=v_version AND v.business_id=v_business
          AND (
            (v.review_status='approved' AND o.status IN ('published','paused'))
            OR wow_private.can_manage_offer_business(v_business,'draft')
            OR (v_is_reviewer AND NOT wow_private.is_business_member(v_business))
          )
      );

    WHEN 'wow-verification-evidence' THEN
      IF cardinality(v_parts)<>4 OR
         v_parts[1] NOT IN ('business-verifications','offer-verifications') OR
         v_parts[2] !~ '^[0-9a-f-]{36}$' THEN RETURN false; END IF;
      v_business:=v_parts[2]::UUID;
      IF v_parts[1]='offer-verifications' THEN
        RETURN (v_parts[3]=v_user AND wow_private.can_manage_offer_business(v_business,'draft'))
          OR (v_is_reviewer AND NOT wow_private.is_business_member(v_business))
          OR (v_parts[3]=v_user AND EXISTS (
            SELECT 1 FROM public.offer_version_evidence e
            JOIN public.offers o ON o.id=e.offer_id
            WHERE o.business_id=v_business
              AND e.documents @> jsonb_build_array(jsonb_build_object('storageKey',p_key))
          ));
      END IF;
      RETURN (v_parts[3]=v_user AND wow_private.is_business_owner(v_business))
        OR (v_is_reviewer AND NOT wow_private.is_business_member(v_business));

    WHEN 'wow-complaint-evidence' THEN
      IF cardinality(v_parts)<>4 OR v_parts[1]<>'complaints' OR
         v_parts[3] !~ '^[0-9a-f-]{36}$' THEN RETURN false; END IF;
      v_complaint:=v_parts[3]::UUID;
      RETURN EXISTS (SELECT 1 FROM public.complaints c
        JOIN public.offers o ON o.id=c.offer_id
        WHERE c.id=v_complaint
          AND ((c.user_id=v_user AND v_parts[2]=v_user)
          OR (wow_private.is_business_owner(o.business_id) AND v_parts[2]=v_user)
          OR (v_is_reviewer AND NOT wow_private.is_business_member(o.business_id))));

    ELSE RETURN false;
  END CASE;
EXCEPTION WHEN invalid_text_representation THEN
  RETURN false;
END;
$function$;

-- Migration: 20261103000000_merchant_requested_category.sql
-- Additive migration for W03.1 (MER-02-01): Merchant Business Onboarding Step 1
-- Adds requested_category_id to public.businesses and atomic draft create/update RPCs.
-- Preserves existing baseline W00 migrations and RPC contracts.

-- 1. Schema: Add requested_category_id to public.businesses
ALTER TABLE "public"."businesses"
  ADD COLUMN IF NOT EXISTS "requested_category_id" "uuid"
  REFERENCES "public"."categories"("id") ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "businesses_requested_category_id_idx"
  ON "public"."businesses"("requested_category_id");

-- 2. Internal RPC: wow_private.create_business_with_category_internal
-- Private routine owned by postgres, NOT granted to authenticated.
CREATE OR REPLACE FUNCTION "wow_private"."create_business_with_category_internal"(
  "p_name" "text",
  "p_requested_category_id" "uuid" DEFAULT NULL::"uuid",
  "p_description" "text" DEFAULT NULL::"text"
) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_user_id TEXT := (SELECT auth.jwt() ->> 'sub');
  v_business_id UUID;
BEGIN
  IF (SELECT auth.jwt() ->> 'role') IS DISTINCT FROM 'authenticated'
     OR v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required'
      USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = v_user_id
      AND u.account_status = 'active'
      AND u.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Active synced profile required'
      USING ERRCODE = '42501';
  END IF;

  IF p_name IS NULL
     OR char_length(btrim(p_name)) NOT BETWEEN 2 AND 120
     OR (
       p_description IS NOT NULL
       AND char_length(p_description) > 1200
     ) THEN
    RAISE EXCEPTION 'Invalid business profile'
      USING ERRCODE = '22023';
  END IF;

  IF p_requested_category_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.categories c
    WHERE c.id = p_requested_category_id
      AND c.is_active = true
      AND (c.parent_id IS NULL OR EXISTS (
        SELECT 1 FROM public.categories parent
        WHERE parent.id = c.parent_id AND parent.is_active = true
      ))
  ) THEN
    RAISE EXCEPTION 'Invalid category'
      USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.businesses (
    owner_user_id,
    name,
    description,
    requested_category_id,
    status
  )
  VALUES (
    v_user_id,
    btrim(p_name),
    NULLIF(btrim(p_description), ''),
    p_requested_category_id,
    'draft'
  )
  RETURNING id INTO v_business_id;

  INSERT INTO public.business_members (
    business_id,
    user_id,
    role,
    status,
    can_draft,
    can_submit,
    can_pause,
    can_monitor,
    granted_by_user_id
  )
  VALUES (
    v_business_id,
    v_user_id,
    'owner',
    'active',
    true,
    true,
    true,
    true,
    v_user_id
  );

  INSERT INTO wow_private.merchant_operation_events(
    business_id,
    actor_user_id,
    operation,
    target_id,
    metadata
  )
  VALUES (
    v_business_id,
    v_user_id,
    'business_create',
    v_business_id::text,
    jsonb_build_object(
      'name', btrim(p_name),
      'requested_category_id', p_requested_category_id
    )
  );

  RETURN v_business_id;
END;
$$;

ALTER FUNCTION "wow_private"."create_business_with_category_internal"("p_name" "text", "p_requested_category_id" "uuid", "p_description" "text") OWNER TO "postgres";
REVOKE ALL ON FUNCTION "wow_private"."create_business_with_category_internal"("p_name" "text", "p_requested_category_id" "uuid", "p_description" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "wow_private"."create_business_with_category_internal"("p_name" "text", "p_requested_category_id" "uuid", "p_description" "text") TO "service_role";

-- 3. Public RPC: wow_create_business_with_category
-- Narrow public entrypoint; SECURITY DEFINER ensures caller doesn't need direct wow_private access.
CREATE OR REPLACE FUNCTION "public"."wow_create_business_with_category"(
  "p_name" "text",
  "p_requested_category_id" "uuid" DEFAULT NULL::"uuid",
  "p_description" "text" DEFAULT NULL::"text"
) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  RETURN wow_private.create_business_with_category_internal(
    p_name,
    p_requested_category_id,
    p_description
  );
END;
$$;

ALTER FUNCTION "public"."wow_create_business_with_category"("p_name" "text", "p_requested_category_id" "uuid", "p_description" "text") OWNER TO "postgres";
REVOKE ALL ON FUNCTION "public"."wow_create_business_with_category"("p_name" "text", "p_requested_category_id" "uuid", "p_description" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."wow_create_business_with_category"("p_name" "text", "p_requested_category_id" "uuid", "p_description" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."wow_create_business_with_category"("p_name" "text", "p_requested_category_id" "uuid", "p_description" "text") TO "authenticated";

-- 4. Internal RPC: wow_private.update_business_draft_internal
-- Private routine owned by postgres, NOT granted to authenticated.
CREATE OR REPLACE FUNCTION "wow_private"."update_business_draft_internal"(
  "p_business_id" "uuid",
  "p_name" "text",
  "p_requested_category_id" "uuid" DEFAULT NULL::"uuid",
  "p_description" "text" DEFAULT NULL::"text"
) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_bs TEXT;
  v_actor TEXT := (SELECT auth.jwt() ->> 'sub');
BEGIN
  IF (SELECT auth.jwt() ->> 'role') IS DISTINCT FROM 'authenticated'
     OR v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required'
      USING ERRCODE = '42501';
  END IF;

  SELECT status INTO v_bs FROM public.businesses WHERE id = p_business_id FOR UPDATE;
  IF v_bs IS NULL OR NOT wow_private.is_business_owner(p_business_id) THEN
    RAISE EXCEPTION 'Active owner required' USING ERRCODE = '42501';
  END IF;

  IF v_bs NOT IN ('draft', 'rejected') THEN
    RAISE EXCEPTION 'Only draft/rejected businesses may be edited directly' USING ERRCODE = '22023';
  END IF;

  IF p_name IS NULL
     OR char_length(btrim(p_name)) NOT BETWEEN 2 AND 120
     OR (
       p_description IS NOT NULL
       AND char_length(p_description) > 1200
     ) THEN
    RAISE EXCEPTION 'Invalid business profile'
      USING ERRCODE = '22023';
  END IF;

  IF p_requested_category_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.categories c
    WHERE c.id = p_requested_category_id
      AND c.is_active = true
      AND (c.parent_id IS NULL OR EXISTS (
        SELECT 1 FROM public.categories parent
        WHERE parent.id = c.parent_id AND parent.is_active = true
      ))
  ) THEN
    RAISE EXCEPTION 'Invalid category'
      USING ERRCODE = '22023';
  END IF;

  UPDATE public.businesses b SET
    name = btrim(p_name),
    description = NULLIF(btrim(p_description), ''),
    requested_category_id = p_requested_category_id,
    updated_at = now()
  WHERE b.id = p_business_id;

  INSERT INTO wow_private.merchant_operation_events(
    business_id,
    actor_user_id,
    operation,
    target_id,
    metadata
  )
  VALUES (
    p_business_id,
    v_actor,
    'business_draft_update',
    p_business_id::text,
    jsonb_build_object(
      'name', btrim(p_name),
      'requested_category_id', p_requested_category_id
    )
  );

  RETURN true;
END;
$$;

ALTER FUNCTION "wow_private"."update_business_draft_internal"("p_business_id" "uuid", "p_name" "text", "p_requested_category_id" "uuid", "p_description" "text") OWNER TO "postgres";
REVOKE ALL ON FUNCTION "wow_private"."update_business_draft_internal"("p_business_id" "uuid", "p_name" "text", "p_requested_category_id" "uuid", "p_description" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "wow_private"."update_business_draft_internal"("p_business_id" "uuid", "p_name" "text", "p_requested_category_id" "uuid", "p_description" "text") TO "service_role";

-- 5. Public RPC: wow_update_business_draft
-- Narrow public entrypoint; SECURITY DEFINER ensures caller doesn't need direct wow_private access.
CREATE OR REPLACE FUNCTION "public"."wow_update_business_draft"(
  "p_business_id" "uuid",
  "p_name" "text",
  "p_requested_category_id" "uuid" DEFAULT NULL::"uuid",
  "p_description" "text" DEFAULT NULL::"text"
) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  RETURN wow_private.update_business_draft_internal(
    p_business_id,
    p_name,
    p_requested_category_id,
    p_description
  );
END;
$$;

ALTER FUNCTION "public"."wow_update_business_draft"("p_business_id" "uuid", "p_name" "text", "p_requested_category_id" "uuid", "p_description" "text") OWNER TO "postgres";
REVOKE ALL ON FUNCTION "public"."wow_update_business_draft"("p_business_id" "uuid", "p_name" "text", "p_requested_category_id" "uuid", "p_description" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."wow_update_business_draft"("p_business_id" "uuid", "p_name" "text", "p_requested_category_id" "uuid", "p_description" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."wow_update_business_draft"("p_business_id" "uuid", "p_name" "text", "p_requested_category_id" "uuid", "p_description" "text") TO "authenticated";

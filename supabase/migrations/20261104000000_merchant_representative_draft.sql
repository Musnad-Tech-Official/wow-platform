-- Migration: 20261104000000_merchant_representative_draft.sql
-- Additive migration for W03.2 (MER-02-02): Merchant Onboarding Step 2 - Authorized Representative Draft
-- Adds public.business_representative_drafts table, RLS, indexes, and atomic save/read RPCs.
-- Preserves existing baseline W00 and W03.1 migrations and RPC contracts.

-- 1. Table: public.business_representative_drafts
CREATE TABLE IF NOT EXISTS "public"."business_representative_drafts" (
    "business_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "role" "text" NOT NULL,
    "evidence_storage_key" "text",
    "evidence_file_name" "text",
    "evidence_file_size" integer,
    "evidence_content_type" "text",
    "updated_by_user_id" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "business_representative_drafts_pkey" PRIMARY KEY ("business_id"),
    CONSTRAINT "business_representative_drafts_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE CASCADE,
    CONSTRAINT "business_representative_drafts_user_id_fkey" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id"),
    CONSTRAINT "business_representative_drafts_name_check" CHECK ((char_length(btrim("name")) >= 2) AND (char_length(btrim("name")) <= 120)),
    CONSTRAINT "business_representative_drafts_role_check" CHECK ("role" IN ('owner', 'authorized_representative', 'legal_agent', 'manager')),
    CONSTRAINT "business_representative_drafts_evidence_key_check" CHECK (("evidence_storage_key" IS NULL) OR ((char_length("evidence_storage_key") <= 512) AND ("evidence_storage_key" ~ '^business-verifications/'))),
    CONSTRAINT "business_representative_drafts_file_name_check" CHECK (("evidence_file_name" IS NULL) OR (char_length("evidence_file_name") <= 255)),
    CONSTRAINT "business_representative_drafts_file_size_check" CHECK (("evidence_file_size" IS NULL) OR (("evidence_file_size" > 0) AND ("evidence_file_size" <= 10485760))),
    CONSTRAINT "business_representative_drafts_content_type_check" CHECK (("evidence_content_type" IS NULL) OR ("evidence_content_type" IN ('application/pdf', 'image/jpeg', 'image/png', 'image/webp')))
);

ALTER TABLE "public"."business_representative_drafts" OWNER TO "postgres";

CREATE INDEX IF NOT EXISTS "business_representative_drafts_updated_by_idx"
  ON "public"."business_representative_drafts"("updated_by_user_id");

-- 2. RLS Policies
ALTER TABLE "public"."business_representative_drafts" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "business_representative_drafts_owner_select"
  ON "public"."business_representative_drafts"
  FOR SELECT
  TO authenticated
  USING (
    wow_private.is_business_owner("business_id")
    OR wow_private.has_admin_permission(true)
  );

REVOKE ALL PRIVILEGES ON TABLE "public"."business_representative_drafts" FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE "public"."business_representative_drafts" TO authenticated;
GRANT ALL ON TABLE "public"."business_representative_drafts" TO service_role;

-- 3. Internal RPC: wow_private.save_business_representative_draft_internal
CREATE OR REPLACE FUNCTION "wow_private"."save_business_representative_draft_internal"(
  "p_business_id" "uuid",
  "p_name" "text",
  "p_role" "text",
  "p_evidence_storage_key" "text" DEFAULT NULL::"text",
  "p_evidence_file_name" "text" DEFAULT NULL::"text",
  "p_evidence_file_size" integer DEFAULT NULL::integer,
  "p_evidence_content_type" "text" DEFAULT NULL::"text"
) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_actor TEXT := (SELECT auth.jwt() ->> 'sub');
  v_bs TEXT;
BEGIN
  IF (SELECT auth.jwt() ->> 'role') IS DISTINCT FROM 'authenticated'
     OR v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required'
      USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = v_actor
      AND u.account_status = 'active'
      AND u.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Active synced profile required'
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
     OR char_length(btrim(p_name)) NOT BETWEEN 2 AND 120 THEN
    RAISE EXCEPTION 'Invalid representative name'
      USING ERRCODE = '22023';
  END IF;

  IF p_role IS NULL
     OR p_role NOT IN ('owner', 'authorized_representative', 'legal_agent', 'manager') THEN
    RAISE EXCEPTION 'Invalid representative role'
      USING ERRCODE = '22023';
  END IF;

  IF p_evidence_storage_key IS NOT NULL THEN
    IF NOT (
      p_evidence_storage_key LIKE 'business-verifications/' || p_business_id || '/' || v_actor || '/%'
      AND char_length(p_evidence_storage_key) <= 512
    ) THEN
      RAISE EXCEPTION 'Invalid evidence storage path'
        USING ERRCODE = '22023';
    END IF;

    IF p_evidence_file_size IS NOT NULL AND (p_evidence_file_size < 1 OR p_evidence_file_size > 10485760) THEN
      RAISE EXCEPTION 'Invalid evidence file size'
        USING ERRCODE = '22023';
    END IF;

    IF p_evidence_content_type IS NOT NULL AND p_evidence_content_type NOT IN ('application/pdf', 'image/jpeg', 'image/png', 'image/webp') THEN
      RAISE EXCEPTION 'Invalid evidence content type'
        USING ERRCODE = '22023';
    END IF;
  END IF;

  INSERT INTO public.business_representative_drafts (
    business_id,
    name,
    role,
    evidence_storage_key,
    evidence_file_name,
    evidence_file_size,
    evidence_content_type,
    updated_by_user_id,
    updated_at
  )
  VALUES (
    p_business_id,
    btrim(p_name),
    p_role,
    p_evidence_storage_key,
    NULLIF(btrim(p_evidence_file_name), ''),
    p_evidence_file_size,
    p_evidence_content_type,
    v_actor,
    now()
  )
  ON CONFLICT (business_id) DO UPDATE SET
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    evidence_storage_key = EXCLUDED.evidence_storage_key,
    evidence_file_name = EXCLUDED.evidence_file_name,
    evidence_file_size = EXCLUDED.evidence_file_size,
    evidence_content_type = EXCLUDED.evidence_content_type,
    updated_by_user_id = EXCLUDED.updated_by_user_id,
    updated_at = now();

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
    'business_representative_draft_update',
    p_business_id::text,
    jsonb_build_object(
      'name', btrim(p_name),
      'role', p_role,
      'has_evidence', p_evidence_storage_key IS NOT NULL
    )
  );

  RETURN true;
END;
$$;

ALTER FUNCTION "wow_private"."save_business_representative_draft_internal"("p_business_id" "uuid", "p_name" "text", "p_role" "text", "p_evidence_storage_key" "text", "p_evidence_file_name" "text", "p_evidence_file_size" integer, "p_evidence_content_type" "text") OWNER TO "postgres";
REVOKE ALL ON FUNCTION "wow_private"."save_business_representative_draft_internal"("p_business_id" "uuid", "p_name" "text", "p_role" "text", "p_evidence_storage_key" "text", "p_evidence_file_name" "text", "p_evidence_file_size" integer, "p_evidence_content_type" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "wow_private"."save_business_representative_draft_internal"("p_business_id" "uuid", "p_name" "text", "p_role" "text", "p_evidence_storage_key" "text", "p_evidence_file_name" "text", "p_evidence_file_size" integer, "p_evidence_content_type" "text") TO "service_role";

-- 4. Public RPC: wow_save_business_representative_draft
CREATE OR REPLACE FUNCTION "public"."wow_save_business_representative_draft"(
  "p_business_id" "uuid",
  "p_name" "text",
  "p_role" "text",
  "p_evidence_storage_key" "text" DEFAULT NULL::"text",
  "p_evidence_file_name" "text" DEFAULT NULL::"text",
  "p_evidence_file_size" integer DEFAULT NULL::integer,
  "p_evidence_content_type" "text" DEFAULT NULL::"text"
) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  RETURN wow_private.save_business_representative_draft_internal(
    p_business_id,
    p_name,
    p_role,
    p_evidence_storage_key,
    p_evidence_file_name,
    p_evidence_file_size,
    p_evidence_content_type
  );
END;
$$;

ALTER FUNCTION "public"."wow_save_business_representative_draft"("p_business_id" "uuid", "p_name" "text", "p_role" "text", "p_evidence_storage_key" "text", "p_evidence_file_name" "text", "p_evidence_file_size" integer, "p_evidence_content_type" "text") OWNER TO "postgres";
REVOKE ALL ON FUNCTION "public"."wow_save_business_representative_draft"("p_business_id" "uuid", "p_name" "text", "p_role" "text", "p_evidence_storage_key" "text", "p_evidence_file_name" "text", "p_evidence_file_size" integer, "p_evidence_content_type" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."wow_save_business_representative_draft"("p_business_id" "uuid", "p_name" "text", "p_role" "text", "p_evidence_storage_key" "text", "p_evidence_file_name" "text", "p_evidence_file_size" integer, "p_evidence_content_type" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."wow_save_business_representative_draft"("p_business_id" "uuid", "p_name" "text", "p_role" "text", "p_evidence_storage_key" "text", "p_evidence_file_name" "text", "p_evidence_file_size" integer, "p_evidence_content_type" "text") TO "authenticated";

-- 5. Public RPC: wow_get_business_representative_draft
CREATE OR REPLACE FUNCTION "public"."wow_get_business_representative_draft"(
  "p_business_id" "uuid"
) RETURNS jsonb
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_actor TEXT := (SELECT auth.jwt() ->> 'sub');
  v_result jsonb;
BEGIN
  IF (SELECT auth.jwt() ->> 'role') IS DISTINCT FROM 'authenticated'
     OR v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required'
      USING ERRCODE = '42501';
  END IF;

  IF NOT (wow_private.is_business_owner(p_business_id) OR wow_private.has_admin_permission(true)) THEN
    RAISE EXCEPTION 'Access denied'
      USING ERRCODE = '42501';
  END IF;

  SELECT jsonb_build_object(
    'business_id', d.business_id,
    'name', d.name,
    'role', d.role,
    'evidence_storage_key', d.evidence_storage_key,
    'evidence_file_name', d.evidence_file_name,
    'evidence_file_size', d.evidence_file_size,
    'evidence_content_type', d.evidence_content_type,
    'updated_at', d.updated_at
  ) INTO v_result
  FROM public.business_representative_drafts d
  WHERE d.business_id = p_business_id;

  RETURN v_result;
END;
$$;

ALTER FUNCTION "public"."wow_get_business_representative_draft"("p_business_id" "uuid") OWNER TO "postgres";
REVOKE ALL ON FUNCTION "public"."wow_get_business_representative_draft"("p_business_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."wow_get_business_representative_draft"("p_business_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."wow_get_business_representative_draft"("p_business_id" "uuid") TO "authenticated";

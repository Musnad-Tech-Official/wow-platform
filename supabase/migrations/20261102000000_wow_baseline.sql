


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE SCHEMA IF NOT EXISTS "wow_private";


ALTER SCHEMA "wow_private" OWNER TO "postgres";


CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."sync_clerk_user"("p_event_id" "text", "p_event_type" "text", "p_user_id" "text", "p_event_at" timestamp with time zone, "p_clerk_updated_at" timestamp with time zone, "p_email" "text", "p_full_name" "text", "p_avatar_url" "text") RETURNS "text"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
DECLARE
  v_affected INTEGER;
BEGIN

  -- Validate the incoming event.
  IF NULLIF(p_event_id, '') IS NULL
     OR NULLIF(p_user_id, '') IS NULL
     OR p_event_at IS NULL
     OR p_event_type NOT IN (
       'user.created',
       'user.updated',
       'user.deleted'
     )
  THEN
    RAISE EXCEPTION 'Invalid Clerk webhook event';
  END IF;

  -- Serialize events for the same Clerk user.
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_user_id, 0)
  );

  -- -----------------------------------------------
  -- DELETE: keep a tombstone to block late events.
  -- -----------------------------------------------
  IF p_event_type = 'user.deleted' THEN

    INSERT INTO public.users (
      id,
      account_status,
      deleted_at,
      clerk_event_at
    )
    VALUES (
      p_user_id,
      'deleted',
      p_event_at,
      p_event_at
    )
    ON CONFLICT (id)
    DO UPDATE SET
      account_status = 'deleted',
      deleted_at = EXCLUDED.deleted_at,
      clerk_event_at = EXCLUDED.clerk_event_at,
      email = NULL,
      full_name = NULL,
      avatar_url = NULL,
      updated_at = now()
    WHERE public.users.deleted_at IS NULL
      AND (
        public.users.clerk_event_at IS NULL
        OR public.users.clerk_event_at <=
           EXCLUDED.clerk_event_at
      );

    GET DIAGNOSTICS v_affected = ROW_COUNT;

    IF v_affected = 0 THEN
      RETURN 'ignored_stale_or_deleted';
    END IF;

    RETURN 'deleted';
  END IF;

  -- -----------------------------------------------
  -- CREATE / UPDATE: same idempotent upsert.
  -- -----------------------------------------------
  INSERT INTO public.users (
    id,
    email,
    full_name,
    avatar_url,
    clerk_updated_at,
    clerk_event_at
  )
  VALUES (
    p_user_id,
    p_email,
    p_full_name,
    p_avatar_url,
    p_clerk_updated_at,
    p_event_at
  )
  ON CONFLICT (id)
  DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    avatar_url = EXCLUDED.avatar_url,
    clerk_updated_at = EXCLUDED.clerk_updated_at,
    clerk_event_at = EXCLUDED.clerk_event_at,
    updated_at = now()
  WHERE public.users.deleted_at IS NULL
    AND (
      public.users.clerk_event_at IS NULL
      OR public.users.clerk_event_at <
         EXCLUDED.clerk_event_at
    );

  GET DIAGNOSTICS v_affected = ROW_COUNT;

  IF v_affected = 0 THEN
    RETURN 'ignored_duplicate_or_stale';
  END IF;

  RETURN 'upserted';

END;
$$;


ALTER FUNCTION "public"."sync_clerk_user"("p_event_id" "text", "p_event_type" "text", "p_user_id" "text", "p_event_at" timestamp with time zone, "p_clerk_updated_at" timestamp with time zone, "p_email" "text", "p_full_name" "text", "p_avatar_url" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."wow_activate_business_trial"("p_business_id" "uuid") RETURNS "uuid"
    LANGUAGE "sql"
    SET "search_path" TO ''
    AS $$
  SELECT wow_private.activate_business_trial_internal(p_business_id);
$$;


ALTER FUNCTION "public"."wow_activate_business_trial"("p_business_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."wow_admin_configure_subscription_plan"("p_code" "text", "p_price" numeric, "p_currency" "text", "p_duration_days" integer, "p_feature_limits" "jsonb", "p_active" boolean) RETURNS "uuid"
    LANGUAGE "sql"
    SET "search_path" TO ''
    AS $$
  SELECT wow_private.admin_configure_subscription_plan_internal(
    p_code,p_price,p_currency,p_duration_days,p_feature_limits,p_active
  );
$$;


ALTER FUNCTION "public"."wow_admin_configure_subscription_plan"("p_code" "text", "p_price" numeric, "p_currency" "text", "p_duration_days" integer, "p_feature_limits" "jsonb", "p_active" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."wow_admin_create_commercial_agreement"("p_business_id" "uuid", "p_agreement_type" "text", "p_grants_publication" boolean, "p_starts_at" timestamp with time zone, "p_ends_at" timestamp with time zone, "p_terms_snapshot" "jsonb", "p_reason" "text") RETURNS "uuid"
    LANGUAGE "sql"
    SET "search_path" TO ''
    AS $$
  SELECT wow_private.admin_create_commercial_agreement_internal(
    p_business_id,p_agreement_type,p_grants_publication,p_starts_at,
    p_ends_at,p_terms_snapshot,p_reason
  );
$$;


ALTER FUNCTION "public"."wow_admin_create_commercial_agreement"("p_business_id" "uuid", "p_agreement_type" "text", "p_grants_publication" boolean, "p_starts_at" timestamp with time zone, "p_ends_at" timestamp with time zone, "p_terms_snapshot" "jsonb", "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."wow_admin_decide_business_verification"("p_verification_id" "uuid", "p_decision" "text", "p_reason" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "sql"
    SET "search_path" TO ''
    AS $$
  SELECT wow_private.admin_decide_verification_internal(
    p_verification_id, p_decision, p_reason
  );
$$;


ALTER FUNCTION "public"."wow_admin_decide_business_verification"("p_verification_id" "uuid", "p_decision" "text", "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."wow_admin_decide_offer"("p_version_id" "uuid", "p_decision" "text", "p_reason" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "sql"
    SET "search_path" TO ''
    AS $$
  SELECT wow_private.admin_decide_offer_internal(p_version_id,p_decision,p_reason);
$$;


ALTER FUNCTION "public"."wow_admin_decide_offer"("p_version_id" "uuid", "p_decision" "text", "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."wow_admin_decide_profile_revision"("p_revision_id" "uuid", "p_decision" "text", "p_reason" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "sql"
    SET "search_path" TO ''
    AS $$
 SELECT wow_private.admin_decide_profile_revision_internal(p_revision_id,p_decision,p_reason);
$$;


ALTER FUNCTION "public"."wow_admin_decide_profile_revision"("p_revision_id" "uuid", "p_decision" "text", "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."wow_admin_decide_subscription_payment"("p_payment_id" "uuid", "p_approve" boolean, "p_note" "text") RETURNS "uuid"
    LANGUAGE "sql"
    SET "search_path" TO ''
    AS $$
  SELECT wow_private.admin_decide_subscription_payment_internal(p_payment_id,p_approve,p_note);
$$;


ALTER FUNCTION "public"."wow_admin_decide_subscription_payment"("p_payment_id" "uuid", "p_approve" boolean, "p_note" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."wow_admin_get_business_verification"("p_verification_id" "uuid") RETURNS "jsonb"
    LANGUAGE "sql" STABLE
    SET "search_path" TO ''
    AS $$
  SELECT wow_private.admin_get_verification_internal(p_verification_id);
$$;


ALTER FUNCTION "public"."wow_admin_get_business_verification"("p_verification_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."wow_admin_get_complaint"("p_complaint_id" "uuid") RETURNS "jsonb"
    LANGUAGE "sql" STABLE
    SET "search_path" TO ''
    AS $$
  SELECT wow_private.admin_get_complaint_internal(p_complaint_id);
$$;


ALTER FUNCTION "public"."wow_admin_get_complaint"("p_complaint_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."wow_admin_get_offer_review"("p_version_id" "uuid") RETURNS "jsonb"
    LANGUAGE "sql" STABLE
    SET "search_path" TO ''
    AS $$
  SELECT wow_private.admin_get_offer_review_internal(p_version_id);
$$;


ALTER FUNCTION "public"."wow_admin_get_offer_review"("p_version_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."wow_admin_list_business_verifications"("p_status" "text" DEFAULT 'submitted'::"text", "p_limit" integer DEFAULT 50, "p_offset" integer DEFAULT 0) RETURNS TABLE("id" "uuid", "business_id" "uuid", "business_name" "text", "branch_id" "uuid", "request_type" "text", "status" "text", "submitted_at" timestamp with time zone)
    LANGUAGE "sql" STABLE
    SET "search_path" TO ''
    AS $$
  SELECT * FROM wow_private.admin_list_verifications_internal(p_status, p_limit, p_offset);
$$;


ALTER FUNCTION "public"."wow_admin_list_business_verifications"("p_status" "text", "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."wow_admin_list_complaints"("p_status" "text" DEFAULT NULL::"text", "p_limit" integer DEFAULT 50, "p_offset" integer DEFAULT 0) RETURNS "jsonb"
    LANGUAGE "sql" STABLE
    SET "search_path" TO ''
    AS $$
  SELECT wow_private.admin_list_complaints_internal(p_status,p_limit,p_offset);
$$;


ALTER FUNCTION "public"."wow_admin_list_complaints"("p_status" "text", "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."wow_admin_list_pending_offers"("p_limit" integer DEFAULT 50, "p_offset" integer DEFAULT 0) RETURNS "jsonb"
    LANGUAGE "sql" STABLE
    SET "search_path" TO ''
    AS $$
  SELECT wow_private.admin_list_pending_offers_internal(p_limit,p_offset);
$$;


ALTER FUNCTION "public"."wow_admin_list_pending_offers"("p_limit" integer, "p_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."wow_admin_list_profile_revisions"("p_limit" integer DEFAULT 50, "p_offset" integer DEFAULT 0) RETURNS "jsonb"
    LANGUAGE "sql" STABLE
    SET "search_path" TO ''
    AS $$
 SELECT wow_private.admin_list_profile_revisions_internal(p_limit,p_offset);
$$;


ALTER FUNCTION "public"."wow_admin_list_profile_revisions"("p_limit" integer, "p_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."wow_admin_list_ratings"("p_moderation_status" "text" DEFAULT NULL::"text", "p_limit" integer DEFAULT 50, "p_offset" integer DEFAULT 0) RETURNS "jsonb"
    LANGUAGE "sql" STABLE
    SET "search_path" TO ''
    AS $$
  SELECT wow_private.admin_list_ratings_internal(p_moderation_status,p_limit,p_offset);
$$;


ALTER FUNCTION "public"."wow_admin_list_ratings"("p_moderation_status" "text", "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."wow_admin_list_subscription_payments"("p_status" "text" DEFAULT NULL::"text", "p_limit" integer DEFAULT 50, "p_offset" integer DEFAULT 0) RETURNS "jsonb"
    LANGUAGE "sql"
    SET "search_path" TO ''
    AS $$
  SELECT wow_private.admin_list_subscription_payments_internal(p_status,p_limit,p_offset);
$$;


ALTER FUNCTION "public"."wow_admin_list_subscription_payments"("p_status" "text", "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."wow_admin_moderate_rating"("p_rating_id" "uuid", "p_status" "text", "p_reason" "text") RETURNS "uuid"
    LANGUAGE "sql"
    SET "search_path" TO ''
    AS $$
  SELECT wow_private.admin_moderate_rating_internal(p_rating_id,p_status,p_reason);
$$;


ALTER FUNCTION "public"."wow_admin_moderate_rating"("p_rating_id" "uuid", "p_status" "text", "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."wow_admin_revoke_commercial_agreement"("p_agreement_id" "uuid", "p_reason" "text") RETURNS "uuid"
    LANGUAGE "sql"
    SET "search_path" TO ''
    AS $$
  SELECT wow_private.admin_revoke_commercial_agreement_internal(p_agreement_id,p_reason);
$$;


ALTER FUNCTION "public"."wow_admin_revoke_commercial_agreement"("p_agreement_id" "uuid", "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."wow_admin_set_business_categories"("p_business_id" "uuid", "p_category_ids" "uuid"[], "p_primary_category_id" "uuid" DEFAULT NULL::"uuid", "p_reason" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "sql"
    SET "search_path" TO ''
    AS $$
  SELECT wow_private.admin_set_business_categories_internal(
    p_business_id,p_category_ids,p_primary_category_id,p_reason
  );
$$;


ALTER FUNCTION "public"."wow_admin_set_business_categories"("p_business_id" "uuid", "p_category_ids" "uuid"[], "p_primary_category_id" "uuid", "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."wow_admin_update_complaint"("p_complaint_id" "uuid", "p_status" "text", "p_note" "text", "p_public_outcome" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "sql"
    SET "search_path" TO ''
    AS $$
  SELECT wow_private.admin_update_complaint_internal(
    p_complaint_id,p_status,p_note,p_public_outcome
  );
$$;


ALTER FUNCTION "public"."wow_admin_update_complaint"("p_complaint_id" "uuid", "p_status" "text", "p_note" "text", "p_public_outcome" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."wow_admin_upsert_category"("p_id" "uuid" DEFAULT NULL::"uuid", "p_slug" "text" DEFAULT NULL::"text", "p_name_ar" "text" DEFAULT NULL::"text", "p_name_en" "text" DEFAULT NULL::"text", "p_parent_id" "uuid" DEFAULT NULL::"uuid", "p_sort_order" integer DEFAULT 0, "p_is_active" boolean DEFAULT false) RETURNS "uuid"
    LANGUAGE "sql"
    SET "search_path" TO ''
    AS $$
  SELECT wow_private.admin_upsert_category_internal(
    p_id,p_slug,p_name_ar,p_name_en,p_parent_id,p_sort_order,p_is_active
  );
$$;


ALTER FUNCTION "public"."wow_admin_upsert_category"("p_id" "uuid", "p_slug" "text", "p_name_ar" "text", "p_name_en" "text", "p_parent_id" "uuid", "p_sort_order" integer, "p_is_active" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."wow_attach_complaint_evidence"("p_complaint_id" "uuid", "p_storage_key" "text") RETURNS boolean
    LANGUAGE "sql"
    SET "search_path" TO ''
    AS $$
  SELECT wow_private.attach_complaint_evidence_internal(p_complaint_id,p_storage_key);
$$;


ALTER FUNCTION "public"."wow_attach_complaint_evidence"("p_complaint_id" "uuid", "p_storage_key" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."wow_attach_offer_media"("p_version_id" "uuid", "p_storage_key" "text", "p_item_id" "uuid" DEFAULT NULL::"uuid", "p_alt_text" "text" DEFAULT NULL::"text", "p_is_cover" boolean DEFAULT false, "p_sort_order" integer DEFAULT 0) RETURNS "uuid"
    LANGUAGE "sql"
    SET "search_path" TO ''
    AS $$
  SELECT wow_private.attach_offer_media_internal(
    p_version_id,p_storage_key,p_item_id,p_alt_text,p_is_cover,p_sort_order);
$$;


ALTER FUNCTION "public"."wow_attach_offer_media"("p_version_id" "uuid", "p_storage_key" "text", "p_item_id" "uuid", "p_alt_text" "text", "p_is_cover" boolean, "p_sort_order" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."wow_create_branch"("p_business_id" "uuid", "p_name" "text", "p_city" "text", "p_address_line" "text", "p_district" "text" DEFAULT NULL::"text", "p_latitude" numeric DEFAULT NULL::numeric, "p_longitude" numeric DEFAULT NULL::numeric) RETURNS "uuid"
    LANGUAGE "sql"
    SET "search_path" TO ''
    AS $$
  SELECT wow_private.create_branch_internal(
    p_business_id,
    p_name,
    p_city,
    p_address_line,
    p_district,
    p_latitude,
    p_longitude
  );
$$;


ALTER FUNCTION "public"."wow_create_branch"("p_business_id" "uuid", "p_name" "text", "p_city" "text", "p_address_line" "text", "p_district" "text", "p_latitude" numeric, "p_longitude" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."wow_create_business"("p_name" "text", "p_description" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "sql"
    SET "search_path" TO ''
    AS $$
  SELECT wow_private.create_business_internal(
    p_name,
    p_description
  );
$$;


ALTER FUNCTION "public"."wow_create_business"("p_name" "text", "p_description" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."wow_create_offer"("p_business_id" "uuid") RETURNS "uuid"
    LANGUAGE "sql"
    SET "search_path" TO ''
    AS $$
  SELECT wow_private.create_offer_internal(p_business_id);
$$;


ALTER FUNCTION "public"."wow_create_offer"("p_business_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."wow_get_business_billing"("p_business_id" "uuid") RETURNS "jsonb"
    LANGUAGE "sql"
    SET "search_path" TO ''
    AS $$
  SELECT wow_private.get_business_billing_internal(p_business_id);
$$;


ALTER FUNCTION "public"."wow_get_business_billing"("p_business_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."wow_get_business_complaints"("p_business_id" "uuid", "p_limit" integer DEFAULT 50, "p_offset" integer DEFAULT 0) RETURNS "jsonb"
    LANGUAGE "sql" STABLE
    SET "search_path" TO ''
    AS $$
  SELECT wow_private.merchant_complaints_internal(p_business_id,p_limit,p_offset);
$$;


ALTER FUNCTION "public"."wow_get_business_complaints"("p_business_id" "uuid", "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."wow_get_my_business_verifications"("p_business_id" "uuid") RETURNS TABLE("id" "uuid", "branch_id" "uuid", "request_type" "text", "status" "text", "submitted_at" timestamp with time zone, "decided_at" timestamp with time zone, "merchant_feedback" "text", "created_at" timestamp with time zone)
    LANGUAGE "sql" STABLE
    SET "search_path" TO ''
    AS $$
  SELECT * FROM wow_private.my_verifications_internal(p_business_id);
$$;


ALTER FUNCTION "public"."wow_get_my_business_verifications"("p_business_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."wow_get_my_complaints"("p_limit" integer DEFAULT 50, "p_offset" integer DEFAULT 0) RETURNS "jsonb"
    LANGUAGE "sql" STABLE
    SET "search_path" TO ''
    AS $$
  SELECT wow_private.my_complaints_internal(p_limit,p_offset);
$$;


ALTER FUNCTION "public"."wow_get_my_complaints"("p_limit" integer, "p_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."wow_get_my_ratings"("p_limit" integer DEFAULT 50, "p_offset" integer DEFAULT 0) RETURNS "jsonb"
    LANGUAGE "sql" STABLE
    SET "search_path" TO ''
    AS $$
  SELECT wow_private.my_ratings_internal(p_limit,p_offset);
$$;


ALTER FUNCTION "public"."wow_get_my_ratings"("p_limit" integer, "p_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."wow_list_business_team"("p_business_id" "uuid") RETURNS "jsonb"
    LANGUAGE "sql" STABLE
    SET "search_path" TO ''
    AS $$
  SELECT wow_private.list_business_team_internal(p_business_id);
$$;


ALTER FUNCTION "public"."wow_list_business_team"("p_business_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."wow_list_my_profile_revisions"("p_business_id" "uuid") RETURNS "jsonb"
    LANGUAGE "sql" STABLE
    SET "search_path" TO ''
    AS $$
 SELECT wow_private.list_my_profile_revisions_internal(p_business_id);
$$;


ALTER FUNCTION "public"."wow_list_my_profile_revisions"("p_business_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."wow_list_subscription_plans"() RETURNS "jsonb"
    LANGUAGE "sql"
    SET "search_path" TO ''
    AS $$
  SELECT wow_private.list_subscription_plans_internal();
$$;


ALTER FUNCTION "public"."wow_list_subscription_plans"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."wow_merchant_respond_complaint"("p_complaint_id" "uuid", "p_message" "text") RETURNS "uuid"
    LANGUAGE "sql"
    SET "search_path" TO ''
    AS $$
  SELECT wow_private.merchant_respond_complaint_internal(p_complaint_id,p_message);
$$;


ALTER FUNCTION "public"."wow_merchant_respond_complaint"("p_complaint_id" "uuid", "p_message" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."wow_public_get_business"("p_business_id" "uuid") RETURNS "jsonb"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  SELECT wow_private.public_get_business_internal(p_business_id);
$$;


ALTER FUNCTION "public"."wow_public_get_business"("p_business_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."wow_public_get_offer"("p_offer_id" "uuid") RETURNS "jsonb"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  SELECT wow_private.public_get_offer_internal(p_offer_id);
$$;


ALTER FUNCTION "public"."wow_public_get_offer"("p_offer_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."wow_public_get_offer_media"("p_offer_id" "uuid") RETURNS "jsonb"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  SELECT wow_private.public_offer_media_internal(p_offer_id);
$$;


ALTER FUNCTION "public"."wow_public_get_offer_media"("p_offer_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."wow_public_list_categories"() RETURNS "jsonb"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  SELECT wow_private.public_list_categories_internal();
$$;


ALTER FUNCTION "public"."wow_public_list_categories"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."wow_public_search_businesses"("p_query" "text" DEFAULT NULL::"text", "p_city" "text" DEFAULT NULL::"text", "p_district" "text" DEFAULT NULL::"text", "p_category_id" "uuid" DEFAULT NULL::"uuid", "p_sort" "text" DEFAULT 'recent'::"text", "p_limit" integer DEFAULT 20, "p_offset" integer DEFAULT 0) RETURNS "jsonb"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  SELECT wow_private.public_search_businesses_internal(
    p_query, p_city, p_district, p_category_id, p_sort, p_limit, p_offset
  );
$$;


ALTER FUNCTION "public"."wow_public_search_businesses"("p_query" "text", "p_city" "text", "p_district" "text", "p_category_id" "uuid", "p_sort" "text", "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."wow_rate_offer"("p_offer_id" "uuid", "p_conformity" "text", "p_experience_stars" smallint DEFAULT NULL::smallint) RETURNS "uuid"
    LANGUAGE "sql"
    SET "search_path" TO ''
    AS $$
  SELECT wow_private.rate_offer_internal(p_offer_id,p_conformity,p_experience_stars);
$$;


ALTER FUNCTION "public"."wow_rate_offer"("p_offer_id" "uuid", "p_conformity" "text", "p_experience_stars" smallint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."wow_request_paid_subscription"("p_business_id" "uuid", "p_plan_code" "text") RETURNS "uuid"
    LANGUAGE "sql"
    SET "search_path" TO ''
    AS $$
  SELECT wow_private.request_paid_subscription_internal(p_business_id,p_plan_code);
$$;


ALTER FUNCTION "public"."wow_request_paid_subscription"("p_business_id" "uuid", "p_plan_code" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."wow_resubmit_business_verification"("p_verification_id" "uuid", "p_evidence_refs" "jsonb") RETURNS "uuid"
    LANGUAGE "sql"
    SET "search_path" TO ''
    AS $$
  SELECT wow_private.resubmit_verification_internal(p_verification_id, p_evidence_refs);
$$;


ALTER FUNCTION "public"."wow_resubmit_business_verification"("p_verification_id" "uuid", "p_evidence_refs" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."wow_save_offer_draft"("p_offer_id" "uuid", "p_payload" "jsonb") RETURNS "uuid"
    LANGUAGE "sql"
    SET "search_path" TO ''
    AS $$
  SELECT wow_private.save_offer_draft_internal(p_offer_id,p_payload);
$$;


ALTER FUNCTION "public"."wow_save_offer_draft"("p_offer_id" "uuid", "p_payload" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."wow_set_branch_pause"("p_branch_id" "uuid", "p_pause" boolean) RETURNS boolean
    LANGUAGE "sql"
    SET "search_path" TO ''
    AS $$
  SELECT wow_private.set_branch_pause_internal(p_branch_id,p_pause);
$$;


ALTER FUNCTION "public"."wow_set_branch_pause"("p_branch_id" "uuid", "p_pause" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."wow_set_business_pause"("p_business_id" "uuid", "p_pause" boolean) RETURNS boolean
    LANGUAGE "sql"
    SET "search_path" TO ''
    AS $$
  SELECT wow_private.set_business_pause_internal(p_business_id,p_pause);
$$;


ALTER FUNCTION "public"."wow_set_business_pause"("p_business_id" "uuid", "p_pause" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."wow_set_employee_access"("p_business_id" "uuid", "p_user_id" "text", "p_action" "text", "p_permissions" "jsonb" DEFAULT NULL::"jsonb", "p_branch_ids" "uuid"[] DEFAULT NULL::"uuid"[]) RETURNS "uuid"
    LANGUAGE "sql"
    SET "search_path" TO ''
    AS $$
  SELECT wow_private.set_employee_access_internal(
    p_business_id,p_user_id,p_action,p_permissions,p_branch_ids);
$$;


ALTER FUNCTION "public"."wow_set_employee_access"("p_business_id" "uuid", "p_user_id" "text", "p_action" "text", "p_permissions" "jsonb", "p_branch_ids" "uuid"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."wow_set_offer_availability"("p_offer_id" "uuid", "p_available" boolean, "p_paused" boolean) RETURNS "uuid"
    LANGUAGE "sql"
    SET "search_path" TO ''
    AS $$
  SELECT wow_private.set_offer_availability_internal(p_offer_id,p_available,p_paused);
$$;


ALTER FUNCTION "public"."wow_set_offer_availability"("p_offer_id" "uuid", "p_available" boolean, "p_paused" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."wow_set_saved_business"("p_business_id" "uuid", "p_save" boolean) RETURNS boolean
    LANGUAGE "sql"
    SET "search_path" TO ''
    AS $$
  SELECT wow_private.save_business_internal(p_business_id,p_save);
$$;


ALTER FUNCTION "public"."wow_set_saved_business"("p_business_id" "uuid", "p_save" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."wow_set_saved_offer"("p_offer_id" "uuid", "p_save" boolean) RETURNS boolean
    LANGUAGE "sql"
    SET "search_path" TO ''
    AS $$
  SELECT wow_private.save_offer_internal(p_offer_id,p_save);
$$;


ALTER FUNCTION "public"."wow_set_saved_offer"("p_offer_id" "uuid", "p_save" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."wow_submit_business_verification"("p_business_id" "uuid", "p_branch_id" "uuid", "p_request_type" "text", "p_evidence_refs" "jsonb") RETURNS "uuid"
    LANGUAGE "sql"
    SET "search_path" TO ''
    AS $$
  SELECT wow_private.submit_verification_internal(
    p_business_id, p_branch_id, p_request_type, p_evidence_refs
  );
$$;


ALTER FUNCTION "public"."wow_submit_business_verification"("p_business_id" "uuid", "p_branch_id" "uuid", "p_request_type" "text", "p_evidence_refs" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."wow_submit_complaint"("p_offer_id" "uuid", "p_complaint_type" "text", "p_description" "text", "p_offer_version_id" "uuid" DEFAULT NULL::"uuid", "p_branch_id" "uuid" DEFAULT NULL::"uuid", "p_incident_at" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_private_evidence_keys" "jsonb" DEFAULT '[]'::"jsonb") RETURNS "uuid"
    LANGUAGE "sql"
    SET "search_path" TO ''
    AS $$
  SELECT wow_private.submit_complaint_internal(
    p_offer_id,p_offer_version_id,p_branch_id,p_complaint_type,
    p_description,p_incident_at,p_private_evidence_keys
  );
$$;


ALTER FUNCTION "public"."wow_submit_complaint"("p_offer_id" "uuid", "p_complaint_type" "text", "p_description" "text", "p_offer_version_id" "uuid", "p_branch_id" "uuid", "p_incident_at" timestamp with time zone, "p_private_evidence_keys" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."wow_submit_offer"("p_offer_id" "uuid") RETURNS "uuid"
    LANGUAGE "sql"
    SET "search_path" TO ''
    AS $$
  SELECT wow_private.submit_offer_internal(p_offer_id);
$$;


ALTER FUNCTION "public"."wow_submit_offer"("p_offer_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."wow_submit_profile_revision"("p_business_id" "uuid", "p_branch_id" "uuid", "p_patch" "jsonb") RETURNS "uuid"
    LANGUAGE "sql"
    SET "search_path" TO ''
    AS $$
 SELECT wow_private.submit_profile_revision_internal(p_business_id,p_branch_id,p_patch);
$$;


ALTER FUNCTION "public"."wow_submit_profile_revision"("p_business_id" "uuid", "p_branch_id" "uuid", "p_patch" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."wow_submit_subscription_payment"("p_subscription_id" "uuid", "p_method" "text", "p_reference" "text") RETURNS "uuid"
    LANGUAGE "sql"
    SET "search_path" TO ''
    AS $$
  SELECT wow_private.submit_subscription_payment_internal(p_subscription_id,p_method,p_reference);
$$;


ALTER FUNCTION "public"."wow_submit_subscription_payment"("p_subscription_id" "uuid", "p_method" "text", "p_reference" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."wow_test_auth"() RETURNS "jsonb"
    LANGUAGE "sql" STABLE
    SET "search_path" TO ''
    AS $$
  SELECT jsonb_build_object(
    'clerk_user_id', auth.jwt() ->> 'sub',
    'database_role', auth.role(),
    'jwt_role', auth.jwt() ->> 'role',
    'authenticated',
      auth.role() = 'authenticated'
  );
$$;


ALTER FUNCTION "public"."wow_test_auth"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."wow_update_merchant_draft"("p_business_id" "uuid", "p_branch_id" "uuid", "p_patch" "jsonb") RETURNS boolean
    LANGUAGE "sql"
    SET "search_path" TO ''
    AS $$
 SELECT wow_private.update_merchant_draft_internal(p_business_id,p_branch_id,p_patch);
$$;


ALTER FUNCTION "public"."wow_update_merchant_draft"("p_business_id" "uuid", "p_branch_id" "uuid", "p_patch" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "wow_private"."activate_business_trial_internal"("p_business_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE v_actor TEXT; v_existing UUID; v_id UUID; v_time TIMESTAMPTZ := now();
BEGIN
  v_actor := wow_private.assert_billing_owner(p_business_id);
  PERFORM 1 FROM public.businesses WHERE id=p_business_id FOR UPDATE;
  SELECT s.id INTO v_existing FROM public.business_subscriptions s
    WHERE s.business_id=p_business_id AND s.kind='trial';
  -- An existing trial is never extended/reset; even a second invocation after
  -- expiration returns the original trial id.
  IF v_existing IS NOT NULL THEN RETURN v_existing; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.businesses b
      WHERE b.id=p_business_id AND b.status='approved') THEN
    RAISE EXCEPTION 'Verified business required' USING ERRCODE='22023';
  END IF;
  -- The clock begins only when an approved, currently live, merchant-available
  -- offer is ready on at least one approved branch of this business.
  IF NOT EXISTS (
    SELECT 1 FROM public.offers o
    JOIN public.offer_versions v ON v.id=o.current_version_id AND v.offer_id=o.id
    JOIN public.offer_branches ob ON ob.offer_version_id=v.id AND ob.business_id=o.business_id
    JOIN public.business_branches br ON br.id=ob.branch_id AND br.business_id=o.business_id
    WHERE o.business_id=p_business_id AND o.status='active' AND o.merchant_available
      AND v.review_status='approved' AND v.starts_at<=v_time AND v.ends_at>v_time
      AND br.status='approved'
  ) THEN
    RAISE EXCEPTION 'An approved live offer on an approved branch is required to start trial'
      USING ERRCODE='22023';
  END IF;
  IF EXISTS (SELECT 1 FROM public.business_subscriptions s
     WHERE s.business_id=p_business_id AND s.status='active'
       AND s.starts_at<=v_time AND s.ends_at>v_time) THEN
    RAISE EXCEPTION 'Another active subscription already exists' USING ERRCODE='22023';
  END IF;
  INSERT INTO public.business_subscriptions(
    business_id,kind,status,starts_at,ends_at,requested_by_user_id
  ) VALUES (p_business_id,'trial','active',v_time,v_time+INTERVAL '30 days',v_actor)
  RETURNING id INTO v_id;
  INSERT INTO wow_private.billing_events(business_id,actor_user_id,action,target_type,target_id)
  VALUES (p_business_id,v_actor,'trial_activated','subscription',v_id);
  RETURN v_id;
END;
$$;


ALTER FUNCTION "wow_private"."activate_business_trial_internal"("p_business_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "wow_private"."admin_configure_subscription_plan_internal"("p_code" "text", "p_price" numeric, "p_currency" "text", "p_duration_days" integer, "p_feature_limits" "jsonb", "p_active" boolean) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $_$
DECLARE v_actor TEXT; v_id UUID; v_code TEXT := upper(btrim(p_code));
BEGIN
  v_actor := wow_private.assert_billing_admin(true);
  IF v_code NOT IN ('BASIC','ADVANCED') OR p_active IS NULL
    OR p_feature_limits IS NULL OR jsonb_typeof(p_feature_limits)<>'object'
    OR (p_price IS NOT NULL AND (p_price<=0 OR p_price>999999999999.99))
    OR (p_currency IS NOT NULL AND p_currency !~ '^[A-Z]{3}$')
    OR (p_duration_days IS NOT NULL AND p_duration_days NOT BETWEEN 1 AND 366)
    OR (p_active AND (p_price IS NULL OR p_currency IS NULL OR p_duration_days IS NULL)) THEN
    RAISE EXCEPTION 'Invalid or incomplete plan configuration' USING ERRCODE='22023';
  END IF;
  UPDATE public.subscription_plans SET
    price=p_price,currency=p_currency,duration_days=p_duration_days,
    feature_limits=p_feature_limits,is_active=p_active
  WHERE code=v_code RETURNING id INTO v_id;
  IF v_id IS NULL THEN RAISE EXCEPTION 'Unknown plan' USING ERRCODE='22023'; END IF;
  INSERT INTO wow_private.billing_events(actor_user_id,action,target_type,target_id,details)
  VALUES(v_actor,'plan_configured','plan',v_id,
    jsonb_build_object('code',v_code,'active',p_active));
  RETURN v_id;
END;
$_$;


ALTER FUNCTION "wow_private"."admin_configure_subscription_plan_internal"("p_code" "text", "p_price" numeric, "p_currency" "text", "p_duration_days" integer, "p_feature_limits" "jsonb", "p_active" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "wow_private"."admin_create_commercial_agreement_internal"("p_business_id" "uuid", "p_agreement_type" "text", "p_grants_publication" boolean, "p_starts_at" timestamp with time zone, "p_ends_at" timestamp with time zone, "p_terms_snapshot" "jsonb", "p_reason" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE v_actor TEXT; v_id UUID;
BEGIN
  v_actor := wow_private.assert_billing_admin(true,p_business_id);
  IF p_business_id IS NULL OR NOT EXISTS(SELECT 1 FROM public.businesses WHERE id=p_business_id)
    OR p_agreement_type IS NULL OR p_agreement_type NOT IN ('exemption','partnership','other')
    OR p_grants_publication IS NULL
    OR (p_grants_publication AND p_agreement_type NOT IN ('exemption','partnership'))
    OR p_starts_at IS NULL OR (p_ends_at IS NOT NULL AND p_ends_at<=p_starts_at)
    OR p_terms_snapshot IS NULL OR jsonb_typeof(p_terms_snapshot)<>'object'
    OR p_reason IS NULL OR char_length(btrim(p_reason)) NOT BETWEEN 10 AND 1000 THEN
    RAISE EXCEPTION 'Invalid commercial agreement' USING ERRCODE='22023';
  END IF;
  PERFORM 1 FROM public.businesses WHERE id=p_business_id FOR UPDATE;
  INSERT INTO public.commercial_agreements(
    business_id,agreement_type,grants_publication,starts_at,ends_at,
    terms_snapshot,reason,approved_by_user_id
  ) VALUES (
    p_business_id,p_agreement_type,p_grants_publication,p_starts_at,p_ends_at,
    p_terms_snapshot,btrim(p_reason),v_actor
  ) RETURNING id INTO v_id;
  INSERT INTO wow_private.billing_events(business_id,actor_user_id,action,target_type,target_id)
  VALUES(p_business_id,v_actor,'agreement_approved','agreement',v_id);
  RETURN v_id;
END;
$$;


ALTER FUNCTION "wow_private"."admin_create_commercial_agreement_internal"("p_business_id" "uuid", "p_agreement_type" "text", "p_grants_publication" boolean, "p_starts_at" timestamp with time zone, "p_ends_at" timestamp with time zone, "p_terms_snapshot" "jsonb", "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "wow_private"."admin_decide_offer_internal"("p_version_id" "uuid", "p_decision" "text", "p_reason" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_offer UUID;v_business UUID;v_current UUID;v_reviewer TEXT:=(SELECT auth.jwt()->>'sub');
  v_status TEXT;v_offer_status TEXT;v_reason TEXT:=NULLIF(btrim(p_reason),'');
BEGIN
  IF NOT wow_private.has_admin_permission(true) THEN
    RAISE EXCEPTION 'Review permission required' USING ERRCODE = '42501';
  END IF;
  IF p_decision IS NULL OR p_decision NOT IN ('approved','rejected','needs_info')
    OR (p_decision <> 'approved' AND (v_reason IS NULL OR char_length(v_reason) NOT BETWEEN 5 AND 2000))
    OR (v_reason IS NOT NULL AND char_length(v_reason)>2000) THEN
    RAISE EXCEPTION 'Invalid offer decision or missing reason' USING ERRCODE='22023';
  END IF;
  -- Lock parent before version, consistently with merchant RPCs.
  SELECT offer_id INTO v_offer FROM public.offer_versions WHERE id=p_version_id;
  IF v_offer IS NULL THEN
    RAISE EXCEPTION 'Offer version not found' USING ERRCODE='22023';
  END IF;
  SELECT business_id,current_version_id,status INTO v_business,v_current,v_offer_status
    FROM public.offers WHERE id=v_offer FOR UPDATE;
  SELECT review_status INTO v_status FROM public.offer_versions
    WHERE id=p_version_id AND offer_id=v_offer FOR UPDATE;
  IF v_status <> 'pending' THEN
    RAISE EXCEPTION 'Only pending versions can be reviewed' USING ERRCODE='22023';
  END IF;
  IF EXISTS (SELECT 1 FROM public.businesses WHERE id=v_business AND owner_user_id=v_reviewer)
     OR EXISTS (SELECT 1 FROM public.business_members
       WHERE business_id=v_business AND user_id=v_reviewer AND status='active') THEN
    RAISE EXCEPTION 'Cannot review own or affiliated business' USING ERRCODE='42501';
  END IF;
  IF p_decision='approved' THEN
    IF NOT EXISTS(SELECT 1 FROM public.businesses WHERE id=v_business AND status='approved')
       OR EXISTS (
         SELECT 1 FROM public.offer_branches ob
         JOIN public.business_branches b ON b.id=ob.branch_id
         WHERE ob.offer_version_id=p_version_id
           AND (b.status<>'approved' OR b.business_id<>v_business)
       ) THEN
      RAISE EXCEPTION 'Business and branches must still be approved' USING ERRCODE='22023';
    END IF;
  END IF;
  INSERT INTO public.offer_reviews(offer_version_id,reviewer_user_id,decision,reason,previous_status)
    VALUES (p_version_id,v_reviewer,p_decision,v_reason,v_status);
  IF p_decision='approved' THEN
    UPDATE public.offer_versions SET review_status='approved',approved_at=now()
      WHERE id=p_version_id;
    UPDATE public.offers SET current_version_id=p_version_id,
      status=CASE WHEN v_offer_status='paused' THEN 'paused' ELSE 'active' END
      WHERE id=v_offer;
  ELSE
    -- needs_info is represented as rejected draft submission with preserved review history.
    -- Merchant prepares a NEW draft revision; original submission is immutable.
    UPDATE public.offer_versions SET review_status='rejected'
      WHERE id=p_version_id;
    IF v_current IS NULL THEN
      UPDATE public.offers SET status='draft' WHERE id=v_offer;
    END IF;
  END IF;
  RETURN p_version_id;
END;
$$;


ALTER FUNCTION "wow_private"."admin_decide_offer_internal"("p_version_id" "uuid", "p_decision" "text", "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "wow_private"."admin_decide_profile_revision_internal"("p_revision_id" "uuid", "p_decision" "text", "p_reason" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE v_business UUID;v_branch UUID;v_patch JSONB;v_status TEXT;
  v_bs TEXT;v_br TEXT;v_reviewer TEXT:=(SELECT auth.jwt()->>'sub');
  v_reason TEXT:=NULLIF(btrim(p_reason),'');
BEGIN
  IF NOT wow_private.has_admin_permission(true) THEN
    RAISE EXCEPTION 'Reviewer authorization required' USING ERRCODE='42501';
  END IF;
  IF p_decision IS NULL OR p_decision NOT IN ('approved','rejected')
    OR (p_decision='rejected' AND (v_reason IS NULL OR length(v_reason) NOT BETWEEN 5 AND 2000))
    OR length(v_reason)>2000 THEN
    RAISE EXCEPTION 'Invalid decision/reason' USING ERRCODE='22023';
  END IF;
  -- Parent lock first, then revision (consistent with merchant submit).
  SELECT business_id INTO v_business FROM public.business_profile_revisions
    WHERE id=p_revision_id;
  IF v_business IS NULL THEN
    RAISE EXCEPTION 'Revision not found' USING ERRCODE='22023';
  END IF;
  SELECT status INTO v_bs FROM public.businesses WHERE id=v_business FOR UPDATE;
  SELECT branch_id,patch,status INTO v_branch,v_patch,v_status
    FROM public.business_profile_revisions WHERE id=p_revision_id FOR UPDATE;
  IF v_status<>'submitted' OR v_bs<>'approved' THEN
    RAISE EXCEPTION 'Only submitted revisions on approved businesses may be reviewed'
      USING ERRCODE='22023';
  END IF;
  IF v_branch IS NOT NULL THEN
    SELECT status INTO v_br FROM public.business_branches
      WHERE id=v_branch AND business_id=v_business FOR UPDATE;
    IF v_br<>'approved' THEN
      RAISE EXCEPTION 'Target branch is no longer approved' USING ERRCODE='22023';
    END IF;
  END IF;
  IF EXISTS (SELECT 1 FROM public.businesses b
    WHERE b.id=v_business AND b.owner_user_id=v_reviewer)
     OR EXISTS (SELECT 1 FROM public.business_members m
       WHERE m.business_id=v_business AND m.user_id=v_reviewer AND m.status='active') THEN
    RAISE EXCEPTION 'Cannot review own or affiliated business' USING ERRCODE='42501';
  END IF;
  IF p_decision='approved' THEN
    PERFORM wow_private.apply_merchant_profile_patch(v_business,v_branch,v_patch);
  END IF;
  UPDATE public.business_profile_revisions SET status=p_decision,
    reviewed_by_user_id=v_reviewer,review_reason=v_reason,decided_at=now()
    WHERE id=p_revision_id;
  INSERT INTO wow_private.merchant_operation_events(
    business_id,actor_user_id,operation,target_id,metadata
  ) VALUES(v_business,v_reviewer,
    CASE WHEN p_decision='approved' THEN 'profile_revision_approve' ELSE 'profile_revision_reject' END,
    p_revision_id::text,jsonb_build_object('reason',v_reason,'branch_id',v_branch));
  RETURN p_revision_id;
END; $$;


ALTER FUNCTION "wow_private"."admin_decide_profile_revision_internal"("p_revision_id" "uuid", "p_decision" "text", "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "wow_private"."admin_decide_subscription_payment_internal"("p_payment_id" "uuid", "p_approve" boolean, "p_note" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE v_actor TEXT; v_payment public.subscription_payments%ROWTYPE;
  v_sub public.business_subscriptions%ROWTYPE; v_time TIMESTAMPTZ := now();
  v_business_id UUID; v_duration INTEGER;
BEGIN
  SELECT s.business_id INTO v_business_id
  FROM public.subscription_payments p JOIN public.business_subscriptions s ON s.id=p.subscription_id
  WHERE p.id=p_payment_id;
  IF v_business_id IS NULL THEN RAISE EXCEPTION 'Payment not found' USING ERRCODE='22023'; END IF;
  v_actor := wow_private.assert_billing_admin(false,v_business_id);
  IF p_approve IS NULL OR p_note IS NULL OR char_length(btrim(p_note)) NOT BETWEEN 10 AND 1500 THEN
    RAISE EXCEPTION 'Documented verification decision required' USING ERRCODE='22023';
  END IF;
  PERFORM 1 FROM public.businesses WHERE id=v_business_id FOR UPDATE;
  SELECT * INTO v_payment FROM public.subscription_payments WHERE id=p_payment_id FOR UPDATE;
  SELECT * INTO v_sub FROM public.business_subscriptions WHERE id=v_payment.subscription_id FOR UPDATE;
  IF v_payment.status<>'submitted' OR v_sub.kind<>'paid' OR v_sub.status<>'pending' THEN
    RAISE EXCEPTION 'Only submitted payment for pending paid subscription can be reviewed'
      USING ERRCODE='22023';
  END IF;
  IF p_approve THEN
    -- Payment must have been independently confirmed by an administrator.
    -- No client-provided payment reference or receipt automatically grants entitlement.
    IF NOT EXISTS (SELECT 1 FROM public.businesses
      WHERE id=v_business_id AND status='approved') THEN
      RAISE EXCEPTION 'Business is no longer approved' USING ERRCODE='22023';
    END IF;
    IF EXISTS (SELECT 1 FROM public.business_subscriptions s
      WHERE s.business_id=v_business_id AND s.status='active'
        AND s.starts_at<=v_time AND s.ends_at>v_time) THEN
      RAISE EXCEPTION 'Current subscription still active; activation would overlap'
        USING ERRCODE='22023';
    END IF;
    -- Reconcile historical paid subscriptions whose end time has already passed;
    -- prevents a stale active status from blocking the unique active-paid index.
    UPDATE public.business_subscriptions SET status='expired'
    WHERE business_id=v_business_id AND kind='paid' AND status='active'
      AND ends_at<=v_time;
    v_duration := (v_sub.plan_snapshot->>'duration_days')::integer;
    IF v_duration IS NULL OR v_duration NOT BETWEEN 1 AND 366
       OR v_payment.amount IS DISTINCT FROM (v_sub.plan_snapshot->>'price')::numeric
       OR v_payment.currency IS DISTINCT FROM (v_sub.plan_snapshot->>'currency') THEN
      RAISE EXCEPTION 'Payment does not match the immutable plan snapshot'
        USING ERRCODE='22023';
    END IF;
    UPDATE public.business_subscriptions SET
      status='active',starts_at=v_time,
      ends_at=v_time+(v_duration*INTERVAL '1 day'),
      approved_by_user_id=v_actor,approved_at=v_time
    WHERE id=v_sub.id;
  END IF;
  UPDATE public.subscription_payments SET
    status=CASE WHEN p_approve THEN 'verified' ELSE 'rejected' END,
    verified_by_user_id=v_actor,verified_at=v_time,review_note=btrim(p_note),
    paid_at=CASE WHEN p_approve THEN v_time ELSE NULL END
  WHERE id=p_payment_id;
  INSERT INTO wow_private.billing_events(business_id,actor_user_id,action,target_type,target_id,details)
  VALUES(v_business_id,v_actor,
    CASE WHEN p_approve THEN 'payment_verified' ELSE 'payment_rejected' END,
    'payment',p_payment_id,jsonb_build_object('note',btrim(p_note)));
  RETURN p_payment_id;
END;
$$;


ALTER FUNCTION "wow_private"."admin_decide_subscription_payment_internal"("p_payment_id" "uuid", "p_approve" boolean, "p_note" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "wow_private"."admin_decide_verification_internal"("p_verification_id" "uuid", "p_decision" "text", "p_reason" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_reviewer TEXT := (SELECT auth.jwt() ->> 'sub');
  v_business_id UUID;
  v_branch_id UUID;
  v_request_type TEXT;
  v_case_status TEXT;
  v_business_status TEXT;
  v_branch_status TEXT;
  v_reason TEXT := NULLIF(btrim(p_reason), '');
BEGIN
  IF wow_private.has_admin_permission(true) IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'Review permission required' USING ERRCODE = '42501';
  END IF;
  IF p_decision NOT IN ('approved', 'rejected', 'needs_info')
     OR p_decision IS NULL THEN
    RAISE EXCEPTION 'Invalid decision' USING ERRCODE = '22023';
  END IF;
  IF (p_decision <> 'approved' AND
      (v_reason IS NULL OR char_length(v_reason) NOT BETWEEN 5 AND 2000))
     OR (v_reason IS NOT NULL AND char_length(v_reason) > 2000) THEN
    RAISE EXCEPTION 'Decision reason is required for rejection and needs_info'
      USING ERRCODE = '22023';
  END IF;

  -- Lock in the same order as submission: business, branch, case.
  SELECT v.business_id, v.branch_id INTO v_business_id, v_branch_id
  FROM public.business_verifications v WHERE v.id = p_verification_id;
  IF v_business_id IS NULL THEN
    RAISE EXCEPTION 'Verification not found' USING ERRCODE = '22023';
  END IF;
  SELECT b.status INTO v_business_status
  FROM public.businesses b WHERE b.id = v_business_id FOR UPDATE;
  SELECT br.status INTO v_branch_status
  FROM public.business_branches br
  WHERE br.business_id = v_business_id AND br.id = v_branch_id FOR UPDATE;
  SELECT v.request_type, v.status INTO v_request_type, v_case_status
  FROM public.business_verifications v WHERE v.id = p_verification_id FOR UPDATE;

  -- Independent review: nobody can approve/reject their own business.
  IF EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = v_business_id AND b.owner_user_id = v_reviewer
  ) THEN
    RAISE EXCEPTION 'A business owner cannot review their own qualification'
      USING ERRCODE = '42501';
  END IF;

  IF v_case_status <> 'submitted' THEN
    RAISE EXCEPTION 'Only submitted verifications may be reviewed'
      USING ERRCODE = '22023';
  END IF;
  IF v_branch_status <> 'pending_review'
     OR (v_request_type = 'initial' AND v_business_status <> 'pending_review')
     OR (v_request_type = 'branch_addition' AND v_business_status <> 'approved')
     OR v_request_type NOT IN ('initial', 'branch_addition') THEN
    RAISE EXCEPTION 'Verification target is not in the required review state'
      USING ERRCODE = '22023';
  END IF;

  INSERT INTO wow_private.verification_decisions (
    verification_id, reviewer_user_id, decision, from_status,
    business_status_before, branch_status_before, reason
  ) VALUES (
    p_verification_id, v_reviewer, p_decision, v_case_status,
    v_business_status, v_branch_status, v_reason
  );

  UPDATE public.business_verifications
  SET status = p_decision,
      reviewed_by_user_id = v_reviewer,
      merchant_feedback = v_reason,
      decided_at = CASE WHEN p_decision = 'needs_info' THEN NULL ELSE now() END
  WHERE id = p_verification_id;

  IF p_decision IN ('approved', 'rejected') THEN
    UPDATE public.business_branches SET
      status = p_decision,
      approved_at = CASE WHEN p_decision = 'approved' THEN now() ELSE NULL END
    WHERE id = v_branch_id AND business_id = v_business_id;
    IF v_request_type = 'initial' THEN
      UPDATE public.businesses SET
        status = p_decision,
        reviewed_at = now(),
        approved_at = CASE WHEN p_decision = 'approved' THEN now() ELSE NULL END
      WHERE id = v_business_id;
    END IF;
  END IF;
  RETURN p_verification_id;
END;
$$;


ALTER FUNCTION "wow_private"."admin_decide_verification_internal"("p_verification_id" "uuid", "p_decision" "text", "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "wow_private"."admin_get_complaint_internal"("p_complaint_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE v_result JSONB;
BEGIN
  IF NOT wow_private.has_admin_permission(false) THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE='42501';
  END IF;
  SELECT jsonb_build_object(
    'complaint',to_jsonb(c),
    'updates',COALESCE((SELECT jsonb_agg(to_jsonb(u) ORDER BY u.created_at,u.id)
      FROM public.complaint_updates u WHERE u.complaint_id=c.id),'[]'::jsonb)
  ) INTO v_result FROM public.complaints c WHERE c.id=p_complaint_id;
  RETURN v_result;
END;
$$;


ALTER FUNCTION "wow_private"."admin_get_complaint_internal"("p_complaint_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "wow_private"."admin_get_offer_review_internal"("p_version_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE v_data JSONB;
BEGIN
  IF NOT wow_private.has_admin_permission(false) THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE='42501';
  END IF;
  SELECT jsonb_build_object(
    'version',to_jsonb(v),
    'business',jsonb_build_object('id',b.id,'name',b.name,'status',b.status),
    'offer',jsonb_build_object('id',o.id,'status',o.status,
      'current_version_id',o.current_version_id,'merchant_available',o.merchant_available),
    'items',COALESCE((
      SELECT jsonb_agg(to_jsonb(i)||jsonb_build_object(
        'attributes',COALESCE((SELECT jsonb_agg(to_jsonb(a) ORDER BY a.sort_order)
          FROM public.offer_item_attributes a WHERE a.offer_item_id=i.id),'[]'::jsonb)
      ) ORDER BY i.sort_order) FROM public.offer_items i
      WHERE i.offer_version_id=v.id
    ),'[]'::jsonb),
    'branches',COALESCE((
      SELECT jsonb_agg(jsonb_build_object('id',br.id,'name',br.name,
        'status',br.status,'city',br.city))
      FROM public.offer_branches ob JOIN public.business_branches br ON br.id=ob.branch_id
      WHERE ob.offer_version_id=v.id
    ),'[]'::jsonb),
    'media',COALESCE((SELECT jsonb_agg(to_jsonb(m) ORDER BY m.sort_order)
      FROM public.offer_media m WHERE m.offer_version_id=v.id),'[]'::jsonb),
    'reviews',COALESCE((SELECT jsonb_agg(to_jsonb(r) ORDER BY r.created_at)
      FROM public.offer_reviews r WHERE r.offer_version_id=v.id),'[]'::jsonb)
  ) INTO v_data
  FROM public.offer_versions v
  JOIN public.offers o ON o.id=v.offer_id
  JOIN public.businesses b ON b.id=o.business_id
  WHERE v.id=p_version_id;
  RETURN v_data;
END;
$$;


ALTER FUNCTION "wow_private"."admin_get_offer_review_internal"("p_version_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "wow_private"."admin_get_verification_internal"("p_verification_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_result JSONB;
BEGIN
  IF wow_private.has_admin_permission(false) IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'Platform admin access required' USING ERRCODE = '42501';
  END IF;
  SELECT jsonb_build_object(
    'id', v.id, 'business_id', v.business_id, 'branch_id', v.branch_id,
    'business_name', b.name, 'request_type', v.request_type,
    'status', v.status, 'requested_by_user_id', v.requested_by_user_id,
    'reviewed_by_user_id', v.reviewed_by_user_id,
    'evidence_refs', v.evidence_refs,
    'private_notes', v.private_notes,
    'merchant_feedback', v.merchant_feedback,
    'submitted_at', v.submitted_at, 'decided_at', v.decided_at,
    'submission_history', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', s.id, 'submitted_by_user_id', s.submitted_by_user_id,
        'evidence_refs', s.evidence_refs, 'created_at', s.created_at
      ) ORDER BY s.created_at, s.id)
      FROM wow_private.verification_submissions s
      WHERE s.verification_id = v.id
    ), '[]'::jsonb),
    'decision_history', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', d.id, 'reviewer_user_id', d.reviewer_user_id,
        'decision', d.decision, 'from_status', d.from_status,
        'business_status_before', d.business_status_before,
        'branch_status_before', d.branch_status_before,
        'reason', d.reason, 'created_at', d.created_at
      ) ORDER BY d.created_at, d.id)
      FROM wow_private.verification_decisions d
      WHERE d.verification_id = v.id
    ), '[]'::jsonb)
  ) INTO v_result
  FROM public.business_verifications v
  JOIN public.businesses b ON b.id = v.business_id
  WHERE v.id = p_verification_id;
  RETURN v_result;
END;
$$;


ALTER FUNCTION "wow_private"."admin_get_verification_internal"("p_verification_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "wow_private"."admin_list_complaints_internal"("p_status" "text", "p_limit" integer, "p_offset" integer) RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE v_result JSONB;
BEGIN
  IF NOT wow_private.has_admin_permission(false) THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE='42501';
  END IF;
  IF (p_status IS NOT NULL AND p_status NOT IN ('new','investigating','waiting','closed'))
     OR p_limit NOT BETWEEN 1 AND 100 OR p_offset NOT BETWEEN 0 AND 10000 THEN
    RAISE EXCEPTION 'Invalid filter or pagination' USING ERRCODE='22023';
  END IF;
  SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY x.created_at DESC,x.id DESC),'[]'::jsonb)
    INTO v_result FROM (
      SELECT c.id,c.offer_id,c.offer_version_id,c.branch_id,c.complaint_type,
        c.status,c.created_at,c.closed_at
      FROM public.complaints c
      WHERE p_status IS NULL OR c.status=p_status
      ORDER BY c.created_at DESC,c.id DESC LIMIT p_limit OFFSET p_offset
    ) x;
  RETURN v_result;
END;
$$;


ALTER FUNCTION "wow_private"."admin_list_complaints_internal"("p_status" "text", "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "wow_private"."admin_list_pending_offers_internal"("p_limit" integer DEFAULT 50, "p_offset" integer DEFAULT 0) RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE v_result JSONB;
BEGIN
  IF NOT wow_private.has_admin_permission(false) THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;
  IF p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 100
     OR p_offset IS NULL OR p_offset < 0 THEN
    RAISE EXCEPTION 'Invalid pagination' USING ERRCODE = '22023';
  END IF;
  SELECT COALESCE(jsonb_agg(to_jsonb(r)),'[]'::jsonb) INTO v_result FROM (
    SELECT v.id AS version_id,v.offer_id,o.business_id,b.name AS business_name,
      v.title,v.final_price,v.currency,v.submitted_at
    FROM public.offer_versions v
    JOIN public.offers o ON o.id=v.offer_id
    JOIN public.businesses b ON b.id=o.business_id
    WHERE v.review_status='pending'
    ORDER BY v.submitted_at ASC,v.id
    LIMIT p_limit OFFSET p_offset
  ) r;
  RETURN v_result;
END;
$$;


ALTER FUNCTION "wow_private"."admin_list_pending_offers_internal"("p_limit" integer, "p_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "wow_private"."admin_list_profile_revisions_internal"("p_limit" integer, "p_offset" integer) RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE v_result JSONB;
BEGIN
  IF NOT wow_private.has_admin_permission(false) THEN
    RAISE EXCEPTION 'Platform admin required' USING ERRCODE='42501';
  END IF;
  IF p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 100
     OR p_offset IS NULL OR p_offset NOT BETWEEN 0 AND 10000 THEN
    RAISE EXCEPTION 'Invalid pagination' USING ERRCODE='22023';
  END IF;
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id',r.id,'business_id',r.business_id,'branch_id',r.branch_id,
    'patch',r.patch,'status',r.status,'created_at',r.created_at
  ) ORDER BY r.created_at,r.id),'[]'::jsonb) INTO v_result
  FROM (SELECT * FROM public.business_profile_revisions
    WHERE status='submitted' ORDER BY created_at,id LIMIT p_limit OFFSET p_offset) r;
  RETURN v_result;
END; $$;


ALTER FUNCTION "wow_private"."admin_list_profile_revisions_internal"("p_limit" integer, "p_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "wow_private"."admin_list_ratings_internal"("p_moderation_status" "text", "p_limit" integer, "p_offset" integer) RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE v_result JSONB;
BEGIN
  IF NOT wow_private.has_admin_permission(false) THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE='42501';
  END IF;
  IF (p_moderation_status IS NOT NULL AND p_moderation_status NOT IN
       ('normal','under_review','excluded'))
      OR p_limit NOT BETWEEN 1 AND 100 OR p_offset NOT BETWEEN 0 AND 10000 THEN
    RAISE EXCEPTION 'Invalid filter or pagination' USING ERRCODE='22023';
  END IF;
  SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY x.updated_at DESC,x.id DESC),'[]'::jsonb)
    INTO v_result FROM (
    SELECT r.id,r.offer_id,r.offer_version_id,r.user_id,r.conformity,
      r.experience_stars,r.moderation_status,r.moderation_reason,
      r.created_at,r.updated_at
    FROM public.offer_ratings r
    WHERE p_moderation_status IS NULL OR r.moderation_status=p_moderation_status
    ORDER BY r.updated_at DESC,r.id DESC LIMIT p_limit OFFSET p_offset
  ) x;
  RETURN v_result;
END;
$$;


ALTER FUNCTION "wow_private"."admin_list_ratings_internal"("p_moderation_status" "text", "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "wow_private"."admin_list_subscription_payments_internal"("p_status" "text" DEFAULT NULL::"text", "p_limit" integer DEFAULT 50, "p_offset" integer DEFAULT 0) RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  PERFORM wow_private.assert_billing_admin(false);
  IF (p_status IS NOT NULL AND p_status NOT IN ('submitted','verified','rejected'))
     OR p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 100
     OR p_offset IS NULL OR p_offset<0 THEN
    RAISE EXCEPTION 'Invalid payment list filters' USING ERRCODE='22023';
  END IF;
  RETURN COALESCE((SELECT jsonb_agg(jsonb_build_object(
    'payment_id',q.id,'business_id',q.business_id,
    'subscription_id',q.subscription_id,'amount',q.amount,
    'currency',q.currency,'method',q.method,'reference',q.reference,
    'status',q.status,'created_at',q.created_at
  ) ORDER BY q.created_at DESC,q.id)
  FROM (
    SELECT p.id,s.business_id,p.subscription_id,p.amount,p.currency,p.method,
      p.reference,p.status,p.created_at
    FROM public.subscription_payments p
    JOIN public.business_subscriptions s ON s.id=p.subscription_id
    WHERE p_status IS NULL OR p.status=p_status
    ORDER BY p.created_at DESC,p.id LIMIT p_limit OFFSET p_offset
  ) q),'[]'::jsonb);
END;
$$;


ALTER FUNCTION "wow_private"."admin_list_subscription_payments_internal"("p_status" "text", "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "wow_private"."admin_list_verifications_internal"("p_status" "text" DEFAULT 'submitted'::"text", "p_limit" integer DEFAULT 50, "p_offset" integer DEFAULT 0) RETURNS TABLE("id" "uuid", "business_id" "uuid", "business_name" "text", "branch_id" "uuid", "request_type" "text", "status" "text", "submitted_at" timestamp with time zone)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  IF wow_private.has_admin_permission(false) IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'Platform admin access required' USING ERRCODE = '42501';
  END IF;
  IF p_status IS NOT NULL AND p_status NOT IN
     ('draft', 'submitted', 'needs_info', 'approved', 'rejected', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid verification status filter' USING ERRCODE = '22023';
  END IF;
  IF p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 100
     OR p_offset IS NULL OR p_offset NOT BETWEEN 0 AND 100000 THEN
    RAISE EXCEPTION 'Invalid pagination arguments' USING ERRCODE = '22023';
  END IF;
  RETURN QUERY
  SELECT v.id, v.business_id, b.name, v.branch_id,
    v.request_type, v.status, v.submitted_at
  FROM public.business_verifications v
  JOIN public.businesses b ON b.id = v.business_id
  WHERE p_status IS NULL OR v.status = p_status
  ORDER BY v.created_at DESC, v.id DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;


ALTER FUNCTION "wow_private"."admin_list_verifications_internal"("p_status" "text", "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "wow_private"."admin_moderate_rating_internal"("p_rating_id" "uuid", "p_status" "text", "p_reason" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE v_reviewer TEXT; v_offer UUID; v_before TEXT; v_business UUID;
BEGIN
  IF NOT wow_private.has_admin_permission(true) THEN
    RAISE EXCEPTION 'Admin review permission required' USING ERRCODE='42501';
  END IF;
  v_reviewer := wow_private.current_active_customer_id();
  IF p_status IS NULL OR p_status NOT IN ('normal','under_review','excluded')
    OR p_reason IS NULL OR char_length(btrim(p_reason)) NOT BETWEEN 5 AND 2000 THEN
    RAISE EXCEPTION 'Moderation status and reason required' USING ERRCODE='22023';
  END IF;
  SELECT r.offer_id,r.moderation_status,o.business_id INTO v_offer,v_before,v_business
  FROM public.offer_ratings r JOIN public.offers o ON o.id=r.offer_id
  WHERE r.id=p_rating_id FOR UPDATE OF r;
  IF v_offer IS NULL THEN
    RAISE EXCEPTION 'Rating does not exist' USING ERRCODE='22023';
  END IF;
  IF EXISTS (SELECT 1 FROM public.business_members m
     WHERE m.business_id=v_business AND m.user_id=v_reviewer AND m.status='active')
     OR EXISTS (SELECT 1 FROM public.businesses b
                WHERE b.id=v_business AND b.owner_user_id=v_reviewer) THEN
    RAISE EXCEPTION 'Cannot moderate ratings for an affiliated business'
      USING ERRCODE='42501';
  END IF;
  UPDATE public.offer_ratings SET moderation_status=p_status,
    moderation_reason=btrim(p_reason),moderated_by_user_id=v_reviewer,
    moderated_at=now() WHERE id=p_rating_id;
  INSERT INTO wow_private.rating_moderation_events(
    rating_id,reviewer_user_id,from_status,to_status,reason
  ) VALUES (p_rating_id,v_reviewer,v_before,p_status,btrim(p_reason));
  RETURN p_rating_id;
END;
$$;


ALTER FUNCTION "wow_private"."admin_moderate_rating_internal"("p_rating_id" "uuid", "p_status" "text", "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "wow_private"."admin_revoke_commercial_agreement_internal"("p_agreement_id" "uuid", "p_reason" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE v_business_id UUID; v_actor TEXT;
BEGIN
  SELECT business_id INTO v_business_id FROM public.commercial_agreements
    WHERE id=p_agreement_id;
  IF v_business_id IS NULL THEN RAISE EXCEPTION 'Agreement not found' USING ERRCODE='22023'; END IF;
  v_actor := wow_private.assert_billing_admin(true,v_business_id);
  IF p_reason IS NULL OR char_length(btrim(p_reason)) NOT BETWEEN 10 AND 1000 THEN
    RAISE EXCEPTION 'Revocation reason required' USING ERRCODE='22023';
  END IF;
  PERFORM 1 FROM public.businesses WHERE id=v_business_id FOR UPDATE;
  UPDATE public.commercial_agreements SET status='revoked',
    revoked_by_user_id=v_actor,revoked_at=now(),revoke_reason=btrim(p_reason)
  WHERE id=p_agreement_id AND status='approved';
  IF NOT FOUND THEN RAISE EXCEPTION 'Agreement already revoked' USING ERRCODE='22023'; END IF;
  INSERT INTO wow_private.billing_events(business_id,actor_user_id,action,target_type,target_id)
  VALUES(v_business_id,v_actor,'agreement_revoked','agreement',p_agreement_id);
  RETURN p_agreement_id;
END;
$$;


ALTER FUNCTION "wow_private"."admin_revoke_commercial_agreement_internal"("p_agreement_id" "uuid", "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "wow_private"."admin_set_business_categories_internal"("p_business_id" "uuid", "p_category_ids" "uuid"[], "p_primary_category_id" "uuid", "p_reason" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_actor TEXT;
  v_old_ids UUID[];
  v_old_primary UUID;
BEGIN
  v_actor := wow_private.assert_billing_admin(false,p_business_id);
  IF p_category_ids IS NULL OR cardinality(p_category_ids) > 12
    OR p_reason IS NULL OR char_length(btrim(p_reason)) NOT BETWEEN 10 AND 1000
    OR (p_primary_category_id IS NOT NULL AND NOT (p_primary_category_id = ANY(p_category_ids)))
    OR EXISTS (SELECT 1 FROM unnest(p_category_ids) AS x(id) WHERE x.id IS NULL)
    OR (SELECT count(*) FROM unnest(p_category_ids) AS x(id)) <>
       (SELECT count(DISTINCT x.id) FROM unnest(p_category_ids) AS x(id)) THEN
    RAISE EXCEPTION 'Invalid business categories or reason' USING ERRCODE='22023';
  END IF;
  -- Serialize category replacements per business. No client can directly write.
  PERFORM 1 FROM public.businesses b WHERE b.id=p_business_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Business not found' USING ERRCODE='22023';
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
$$;


ALTER FUNCTION "wow_private"."admin_set_business_categories_internal"("p_business_id" "uuid", "p_category_ids" "uuid"[], "p_primary_category_id" "uuid", "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "wow_private"."admin_update_complaint_internal"("p_complaint_id" "uuid", "p_status" "text", "p_note" "text", "p_public_outcome" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE v_reviewer TEXT; v_before TEXT; v_business UUID; v_outcome TEXT;
BEGIN
  IF NOT wow_private.has_admin_permission(true) THEN
    RAISE EXCEPTION 'Admin review permission required' USING ERRCODE='42501';
  END IF;
  v_reviewer := wow_private.current_active_customer_id();
  IF p_status IS NULL OR p_status NOT IN ('investigating','waiting','closed')
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
$$;


ALTER FUNCTION "wow_private"."admin_update_complaint_internal"("p_complaint_id" "uuid", "p_status" "text", "p_note" "text", "p_public_outcome" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "wow_private"."admin_upsert_category_internal"("p_id" "uuid", "p_slug" "text", "p_name_ar" "text", "p_name_en" "text", "p_parent_id" "uuid", "p_sort_order" integer, "p_is_active" boolean) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE v_actor TEXT; v_id UUID; v_parent_parent UUID;
BEGIN
  v_actor := wow_private.assert_billing_admin(true,NULL);
  IF p_slug IS NULL OR p_name_ar IS NULL OR p_sort_order IS NULL
     OR p_is_active IS NULL THEN
    RAISE EXCEPTION 'Missing category fields' USING ERRCODE='22023';
  END IF;
  IF p_parent_id IS NOT NULL THEN
    SELECT c.parent_id INTO v_parent_parent
      FROM public.categories AS c WHERE c.id=p_parent_id;
    IF NOT FOUND OR (p_id IS NOT NULL AND p_parent_id=p_id)
      OR v_parent_parent IS NOT NULL THEN
      RAISE EXCEPTION 'Parent must be an existing root category' USING ERRCODE='22023';
    END IF;
  END IF;
  IF p_id IS NULL THEN
    INSERT INTO public.categories(slug,name_ar,name_en,parent_id,sort_order,is_active)
    VALUES(p_slug,p_name_ar,p_name_en,p_parent_id,p_sort_order,p_is_active)
    RETURNING id INTO v_id;
  ELSE
    IF p_parent_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.categories c WHERE c.parent_id=p_id
    ) THEN
      RAISE EXCEPTION 'Category with children cannot become a child' USING ERRCODE='22023';
    END IF;
    UPDATE public.categories SET slug=p_slug,name_ar=p_name_ar,
      name_en=p_name_en,parent_id=p_parent_id,
      sort_order=p_sort_order,is_active=p_is_active
    WHERE id=p_id RETURNING id INTO v_id;
    IF v_id IS NULL THEN
      RAISE EXCEPTION 'Category not found' USING ERRCODE='22023';
    END IF;
  END IF;
  RETURN v_id;
END;
$$;


ALTER FUNCTION "wow_private"."admin_upsert_category_internal"("p_id" "uuid", "p_slug" "text", "p_name_ar" "text", "p_name_en" "text", "p_parent_id" "uuid", "p_sort_order" integer, "p_is_active" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "wow_private"."apply_merchant_profile_patch"("p_business_id" "uuid", "p_branch_id" "uuid", "p_patch" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE v_lat NUMERIC;v_lon NUMERIC;
BEGIN
  PERFORM wow_private.validate_merchant_profile_patch(p_patch,p_branch_id IS NOT NULL);
  IF p_branch_id IS NULL THEN
    UPDATE public.businesses b SET
      name=CASE WHEN p_patch?'name' THEN btrim(p_patch->>'name') ELSE b.name END,
      description=CASE WHEN p_patch?'description' THEN NULLIF(btrim(p_patch->>'description'),'') ELSE b.description END,
      contact_phone=CASE WHEN p_patch?'contact_phone' THEN NULLIF(btrim(p_patch->>'contact_phone'),'') ELSE b.contact_phone END
    WHERE b.id=p_business_id;
  ELSE
    -- Respect coordinate-pair constraint even on partial updates.
    SELECT CASE WHEN p_patch?'latitude' THEN (p_patch->>'latitude')::numeric ELSE latitude END,
           CASE WHEN p_patch?'longitude' THEN (p_patch->>'longitude')::numeric ELSE longitude END
    INTO v_lat,v_lon FROM public.business_branches
    WHERE id=p_branch_id AND business_id=p_business_id FOR UPDATE;
    IF (v_lat IS NULL) <> (v_lon IS NULL) THEN
      RAISE EXCEPTION 'Latitude and longitude must be set/cleared together' USING ERRCODE='22023';
    END IF;
    UPDATE public.business_branches br SET
      name=CASE WHEN p_patch?'name' THEN btrim(p_patch->>'name') ELSE br.name END,
      city=CASE WHEN p_patch?'city' THEN btrim(p_patch->>'city') ELSE br.city END,
      district=CASE WHEN p_patch?'district' THEN NULLIF(btrim(p_patch->>'district'),'') ELSE br.district END,
      address_line=CASE WHEN p_patch?'address_line' THEN btrim(p_patch->>'address_line') ELSE br.address_line END,
      latitude=v_lat,longitude=v_lon
    WHERE br.id=p_branch_id AND br.business_id=p_business_id;
  END IF;
END; $$;


ALTER FUNCTION "wow_private"."apply_merchant_profile_patch"("p_business_id" "uuid", "p_branch_id" "uuid", "p_patch" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "wow_private"."assert_billing_admin"("p_super_only" boolean DEFAULT false, "p_business_id" "uuid" DEFAULT NULL::"uuid") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE v_user TEXT := (SELECT auth.jwt() ->> 'sub');
BEGIN
  IF NOT wow_private.has_admin_permission(true) OR v_user IS NULL THEN
    RAISE EXCEPTION 'Platform reviewer required' USING ERRCODE='42501';
  END IF;
  IF p_super_only AND NOT EXISTS (
    SELECT 1 FROM wow_private.admin_members a
    WHERE a.user_id=v_user AND a.is_active AND a.role='super_admin'
  ) THEN
    RAISE EXCEPTION 'Super admin required' USING ERRCODE='42501';
  END IF;
  IF p_business_id IS NOT NULL AND (
    EXISTS (SELECT 1 FROM public.businesses b
      WHERE b.id=p_business_id AND b.owner_user_id=v_user)
    OR EXISTS (SELECT 1 FROM public.business_members m
      WHERE m.business_id=p_business_id AND m.user_id=v_user AND m.status='active')
  ) THEN
    RAISE EXCEPTION 'Cannot approve own or affiliated business' USING ERRCODE='42501';
  END IF;
  RETURN v_user;
END;
$$;


ALTER FUNCTION "wow_private"."assert_billing_admin"("p_super_only" boolean, "p_business_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "wow_private"."assert_billing_owner"("p_business_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE v_user TEXT := (SELECT auth.jwt() ->> 'sub');
BEGIN
  IF (SELECT auth.jwt() ->> 'role') IS DISTINCT FROM 'authenticated'
     OR v_user IS NULL OR NOT wow_private.is_business_owner(p_business_id) THEN
    RAISE EXCEPTION 'Active business owner required' USING ERRCODE='42501';
  END IF;
  RETURN v_user;
END;
$$;


ALTER FUNCTION "wow_private"."assert_billing_owner"("p_business_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "wow_private"."attach_complaint_evidence_internal"("p_complaint_id" "uuid", "p_storage_key" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE v_user TEXT:=wow_private.storage_active_user_id();
  v_keys JSONB; v_prefix TEXT;
BEGIN
  SELECT c.private_evidence_keys INTO v_keys
    FROM public.complaints c
    WHERE c.id=p_complaint_id AND c.user_id=v_user AND c.status<>'closed'
    FOR UPDATE;
  IF v_keys IS NULL THEN
    RAISE EXCEPTION 'Active own complaint required' USING ERRCODE='42501';
  END IF;
  v_prefix:='complaints/'||v_user||'/'||p_complaint_id::text||'/';
  IF p_storage_key IS NULL
     OR left(p_storage_key,length(v_prefix)) IS DISTINCT FROM v_prefix
     OR NOT wow_private.storage_safe_key(p_storage_key,true)
     OR NOT EXISTS (SELECT 1 FROM storage.objects obj
          WHERE obj.bucket_id='wow-complaint-evidence' AND obj.name=p_storage_key)
     OR jsonb_array_length(v_keys)>=8 THEN
    RAISE EXCEPTION 'Invalid complaint attachment or attachment limit exceeded'
      USING ERRCODE='22023';
  END IF;
  IF v_keys ? p_storage_key THEN RETURN false; END IF;
  UPDATE public.complaints
    SET private_evidence_keys = v_keys || jsonb_build_array(p_storage_key)
    WHERE id=p_complaint_id;
  RETURN true;
END;
$$;


ALTER FUNCTION "wow_private"."attach_complaint_evidence_internal"("p_complaint_id" "uuid", "p_storage_key" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "wow_private"."attach_offer_media_internal"("p_version_id" "uuid", "p_storage_key" "text", "p_item_id" "uuid", "p_alt_text" "text", "p_is_cover" boolean, "p_sort_order" integer) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE v_user TEXT:=wow_private.storage_active_user_id();
  v_business UUID; v_media UUID; v_prefix TEXT;
BEGIN
  SELECT v.business_id INTO v_business FROM public.offer_versions v
    WHERE v.id=p_version_id AND v.review_status='draft' FOR UPDATE;
  IF v_business IS NULL
     OR NOT wow_private.can_manage_offer_business(v_business,'draft')
     OR NOT wow_private.can_read_offer_version(p_version_id) THEN
    RAISE EXCEPTION 'Editable offer version required' USING ERRCODE='42501';
  END IF;
  v_prefix:=v_business::text || '/' || p_version_id::text || '/' || v_user || '/';
  IF v_user IS NULL OR p_storage_key IS NULL
      OR left(p_storage_key,length(v_prefix)) IS DISTINCT FROM v_prefix
      OR NOT wow_private.storage_safe_key(p_storage_key,false)
      OR NOT EXISTS (SELECT 1 FROM storage.objects obj
        WHERE obj.bucket_id='wow-offer-media' AND obj.name=p_storage_key)
      OR p_is_cover IS NULL OR p_sort_order NOT BETWEEN 0 AND 99
      OR (p_alt_text IS NOT NULL AND char_length(p_alt_text)>250)
      OR (p_item_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.offer_items i
         WHERE i.id=p_item_id AND i.offer_version_id=p_version_id)) THEN
    RAISE EXCEPTION 'Invalid uploaded image reference' USING ERRCODE='22023';
  END IF;
  INSERT INTO public.offer_media(offer_version_id,offer_item_id,
    storage_key,alt_text,is_cover,sort_order)
  VALUES(p_version_id,p_item_id,p_storage_key,p_alt_text,p_is_cover,p_sort_order)
  RETURNING id INTO v_media;
  RETURN v_media;
END;
$$;


ALTER FUNCTION "wow_private"."attach_offer_media_internal"("p_version_id" "uuid", "p_storage_key" "text", "p_item_id" "uuid", "p_alt_text" "text", "p_is_cover" boolean, "p_sort_order" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "wow_private"."can_manage_offer_business"("p_business_id" "uuid", "p_action" "text") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  SELECT (SELECT auth.jwt() ->> 'role') = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.business_members m
      JOIN public.users u ON u.id = m.user_id
      JOIN public.businesses b ON b.id = m.business_id
      WHERE m.business_id = p_business_id
        AND m.user_id = (SELECT auth.jwt() ->> 'sub')
        AND m.status = 'active' AND u.account_status = 'active'
        AND u.deleted_at IS NULL
        AND b.status <> 'suspended'
        AND (
          (p_action = 'draft' AND m.can_draft)
          OR (p_action = 'submit' AND m.can_submit)
          OR (p_action = 'pause' AND m.can_pause)
        )
    );
$$;


ALTER FUNCTION "wow_private"."can_manage_offer_business"("p_business_id" "uuid", "p_action" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "wow_private"."can_read_assignment"("p_business_id" "uuid", "p_member_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  SELECT wow_private.is_business_owner(p_business_id)
    OR EXISTS (
      SELECT 1
      FROM public.business_members m
      JOIN public.users u
        ON u.id = m.user_id
      WHERE m.id = p_member_id
        AND m.business_id = p_business_id
        AND m.user_id = (SELECT auth.jwt() ->> 'sub')
        AND m.status = 'active'
        AND u.account_status = 'active'
        AND u.deleted_at IS NULL
    );
$$;


ALTER FUNCTION "wow_private"."can_read_assignment"("p_business_id" "uuid", "p_member_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "wow_private"."can_read_branch"("p_business_id" "uuid", "p_branch_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.business_members m
    JOIN public.users u ON u.id = m.user_id
    WHERE m.business_id = p_business_id
      AND m.user_id = (SELECT auth.jwt() ->> 'sub')
      AND m.status = 'active'
      AND u.account_status = 'active'
      AND u.deleted_at IS NULL
      AND (
        m.role = 'owner'
        OR EXISTS (
          SELECT 1
          FROM public.business_member_branches a
          WHERE a.business_id = p_business_id
            AND a.member_id = m.id
            AND a.branch_id = p_branch_id
        )
      )
  );
$$;


ALTER FUNCTION "wow_private"."can_read_branch"("p_business_id" "uuid", "p_branch_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "wow_private"."can_read_offer"("p_offer_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  SELECT (SELECT auth.jwt()->>'role')='authenticated'
    AND EXISTS (
      SELECT 1 FROM public.offers o
      JOIN public.business_members m ON m.business_id=o.business_id
      JOIN public.users u ON u.id=m.user_id
      WHERE o.id=p_offer_id
        AND m.user_id=(SELECT auth.jwt()->>'sub')
        AND m.status='active' AND u.account_status='active'
        AND u.deleted_at IS NULL
        AND (
          (m.role='owner' AND EXISTS (
             SELECT 1 FROM public.businesses b
             WHERE b.id=o.business_id AND b.owner_user_id=m.user_id))
          OR (o.status='draft' AND o.created_by_user_id=m.user_id
              AND NOT EXISTS (SELECT 1 FROM public.offer_versions v
                              WHERE v.offer_id=o.id))
          OR EXISTS (
            SELECT 1 FROM public.offer_versions v
            WHERE v.offer_id=o.id AND wow_private.can_read_offer_version(v.id)
          )
        )
    );
$$;


ALTER FUNCTION "wow_private"."can_read_offer"("p_offer_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "wow_private"."can_read_offer_item"("p_offer_item_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.offer_items i
    WHERE i.id = p_offer_item_id
      AND wow_private.can_read_offer_version(i.offer_version_id)
  );
$$;


ALTER FUNCTION "wow_private"."can_read_offer_item"("p_offer_item_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "wow_private"."can_read_offer_version"("p_offer_version_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  SELECT (SELECT auth.jwt()->>'role') = 'authenticated'
    AND EXISTS (
      SELECT 1
      FROM public.offer_versions v
      JOIN public.business_members m ON m.business_id=v.business_id
      JOIN public.users u ON u.id=m.user_id
      WHERE v.id=p_offer_version_id
        AND m.user_id=(SELECT auth.jwt()->>'sub')
        AND m.status='active'
        AND u.account_status='active' AND u.deleted_at IS NULL
        AND (
          (m.role='owner' AND EXISTS (
             SELECT 1 FROM public.businesses b
             WHERE b.id=v.business_id AND b.owner_user_id=m.user_id))
          OR (m.role='employee' AND (
            (v.review_status='draft' AND v.created_by_user_id=m.user_id
             AND NOT EXISTS (SELECT 1 FROM public.offer_branches ob
                             WHERE ob.offer_version_id=v.id))
            OR (
              EXISTS (SELECT 1 FROM public.offer_branches ob
                      WHERE ob.offer_version_id=v.id)
              AND NOT EXISTS (
                SELECT 1 FROM public.offer_branches ob
                WHERE ob.offer_version_id=v.id AND NOT EXISTS (
                  SELECT 1 FROM public.business_member_branches mba
                  WHERE mba.business_id=v.business_id
                    AND mba.member_id=m.id AND mba.branch_id=ob.branch_id
                )
              )
            )
          ))
        )
    );
$$;


ALTER FUNCTION "wow_private"."can_read_offer_version"("p_offer_version_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "wow_private"."can_read_wow_object"("p_bucket" "text", "p_key" "text") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $_$
DECLARE
  v_user TEXT := wow_private.storage_active_user_id();
  v_parts TEXT[] := string_to_array(p_key,'/');
  v_business UUID;
  v_version UUID;
  v_complaint UUID;
  v_is_reviewer BOOLEAN;
BEGIN
  IF v_user IS NULL OR NOT wow_private.storage_safe_key(
      p_key,p_bucket IN ('wow-verification-evidence','wow-complaint-evidence')
    ) THEN RETURN false; END IF;
  v_is_reviewer:=wow_private.has_admin_permission(true);

  CASE p_bucket
    WHEN 'wow-business-media' THEN
      IF cardinality(v_parts)<>3 OR v_parts[1] !~ '^[0-9a-f-]{36}$' THEN
        RETURN false; END IF;
      v_business:=v_parts[1]::UUID;
      RETURN wow_private.is_business_member(v_business) OR v_is_reviewer;

    WHEN 'wow-offer-media' THEN
      IF cardinality(v_parts)<>4 OR v_parts[1] !~ '^[0-9a-f-]{36}$' OR
         v_parts[2] !~ '^[0-9a-f-]{36}$' THEN RETURN false; END IF;
      v_business:=v_parts[1]::UUID;
      v_version:=v_parts[2]::UUID;
      RETURN (EXISTS (SELECT 1 FROM public.offer_versions v
        WHERE v.id=v_version AND v.business_id=v_business)
        AND (wow_private.can_read_offer_version(v_version) OR v_is_reviewer));

    WHEN 'wow-verification-evidence' THEN
      IF cardinality(v_parts)<>4 OR v_parts[1]<>'business-verifications' OR
         v_parts[2] !~ '^[0-9a-f-]{36}$' THEN RETURN false; END IF;
      v_business:=v_parts[2]::UUID;
      RETURN (v_parts[3]=v_user AND wow_private.is_business_owner(v_business))
        OR (v_is_reviewer AND NOT wow_private.is_business_member(v_business));

    WHEN 'wow-complaint-evidence' THEN
      IF cardinality(v_parts)<>4 OR v_parts[1]<>'complaints' OR
         v_parts[3] !~ '^[0-9a-f-]{36}$' THEN RETURN false; END IF;
      v_complaint:=v_parts[3]::UUID;
      RETURN EXISTS (SELECT 1 FROM public.complaints c
        JOIN public.offers o ON o.id=c.offer_id
        WHERE c.id=v_complaint
          AND (c.user_id=v_user AND v_parts[2]=v_user
          OR (v_is_reviewer AND NOT wow_private.is_business_member(o.business_id))));

    ELSE RETURN false;
  END CASE;
EXCEPTION WHEN invalid_text_representation THEN
  RETURN false;
END;
$_$;


ALTER FUNCTION "wow_private"."can_read_wow_object"("p_bucket" "text", "p_key" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "wow_private"."can_save_business"("p_business_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.businesses b WHERE b.id=p_business_id
      AND b.status='approved'
      AND EXISTS (SELECT 1 FROM public.business_branches br
                  WHERE br.business_id=b.id AND br.status='approved')
  );
$$;


ALTER FUNCTION "wow_private"."can_save_business"("p_business_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "wow_private"."can_save_offer"("p_offer_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.offers o
    JOIN public.offer_versions v ON v.id=o.current_version_id AND v.offer_id=o.id
    WHERE o.id=p_offer_id AND o.status IN ('active','paused')
      AND v.review_status='approved' AND v.ends_at > now()
      AND wow_private.can_save_business(o.business_id)
      AND EXISTS (
        SELECT 1 FROM public.offer_branches ob
        JOIN public.business_branches br ON br.id=ob.branch_id
        WHERE ob.offer_version_id=v.id AND ob.business_id=o.business_id
          AND br.status='approved'
      )
  );
$$;


ALTER FUNCTION "wow_private"."can_save_offer"("p_offer_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "wow_private"."can_upload_wow_object"("p_bucket" "text", "p_key" "text") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $_$
DECLARE
  v_user TEXT := wow_private.storage_active_user_id();
  v_parts TEXT[] := string_to_array(p_key,'/');
  v_business UUID;
  v_version UUID;
  v_complaint UUID;
BEGIN
  IF v_user IS NULL OR NOT wow_private.storage_safe_key(
    p_key,p_bucket IN ('wow-verification-evidence','wow-complaint-evidence')
  ) THEN RETURN false; END IF;

  CASE p_bucket
    WHEN 'wow-business-media' THEN
      IF cardinality(v_parts)<>3 OR v_parts[2]<>v_user OR
         v_parts[1] !~ '^[0-9a-f-]{36}$' THEN RETURN false; END IF;
      v_business:=v_parts[1]::UUID;
      RETURN wow_private.is_business_owner(v_business);

    WHEN 'wow-offer-media' THEN
      IF cardinality(v_parts)<>4 OR v_parts[3]<>v_user OR
         v_parts[1] !~ '^[0-9a-f-]{36}$' OR
         v_parts[2] !~ '^[0-9a-f-]{36}$' THEN RETURN false; END IF;
      v_business:=v_parts[1]::UUID;
      v_version:=v_parts[2]::UUID;
      RETURN wow_private.can_manage_offer_business(v_business,'draft')
        AND EXISTS (SELECT 1 FROM public.offer_versions v
          WHERE v.id=v_version AND v.business_id=v_business
            AND v.review_status='draft'
            AND wow_private.can_read_offer_version(v.id));

    WHEN 'wow-verification-evidence' THEN
      IF cardinality(v_parts)<>4 OR v_parts[1]<>'business-verifications' OR
         v_parts[3]<>v_user OR v_parts[2] !~ '^[0-9a-f-]{36}$' THEN
        RETURN false; END IF;
      v_business:=v_parts[2]::UUID;
      RETURN wow_private.is_business_owner(v_business);

    WHEN 'wow-complaint-evidence' THEN
      IF cardinality(v_parts)<>4 OR v_parts[1]<>'complaints' OR
         v_parts[2]<>v_user OR v_parts[3] !~ '^[0-9a-f-]{36}$' THEN
        RETURN false; END IF;
      v_complaint:=v_parts[3]::UUID;
      RETURN EXISTS (SELECT 1 FROM public.complaints c
        WHERE c.id=v_complaint AND c.user_id=v_user AND c.status<>'closed');

    ELSE RETURN false; -- includes payment proof bucket
  END CASE;
EXCEPTION WHEN invalid_text_representation THEN
  RETURN false;
END;
$_$;


ALTER FUNCTION "wow_private"."can_upload_wow_object"("p_bucket" "text", "p_key" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "wow_private"."create_branch_internal"("p_business_id" "uuid", "p_name" "text", "p_city" "text", "p_address_line" "text", "p_district" "text" DEFAULT NULL::"text", "p_latitude" numeric DEFAULT NULL::numeric, "p_longitude" numeric DEFAULT NULL::numeric) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_business_status TEXT;
  v_branch_id UUID;
  v_is_primary BOOLEAN;
BEGIN
  IF (SELECT auth.jwt() ->> 'role')
       IS DISTINCT FROM 'authenticated' THEN
    RAISE EXCEPTION 'Authentication required'
      USING ERRCODE = '42501';
  END IF;

  -- Serialize branch creation for this business.
  SELECT b.status
  INTO v_business_status
  FROM public.businesses b
  WHERE b.id = p_business_id
  FOR UPDATE;

  IF v_business_status IS NULL
     OR NOT wow_private.is_business_owner(p_business_id)
  THEN
    RAISE EXCEPTION 'Business owner access required'
      USING ERRCODE = '42501';
  END IF;

  IF v_business_status NOT IN (
    'draft', 'approved', 'rejected'
  ) THEN
    RAISE EXCEPTION
      'Business cannot add branches in this state'
      USING ERRCODE = '42501';
  END IF;

  IF p_name IS NULL
     OR char_length(btrim(p_name)) NOT BETWEEN 2 AND 120
     OR p_city IS NULL
     OR char_length(btrim(p_city)) NOT BETWEEN 2 AND 120
     OR p_address_line IS NULL
     OR char_length(btrim(p_address_line)) NOT BETWEEN 5 AND 500
     OR (
       p_district IS NOT NULL
       AND char_length(p_district) > 120
     ) THEN
    RAISE EXCEPTION 'Invalid branch details'
      USING ERRCODE = '22023';
  END IF;

  SELECT NOT EXISTS (
    SELECT 1
    FROM public.business_branches
    WHERE business_id = p_business_id
  )
  INTO v_is_primary;

  INSERT INTO public.business_branches (
    business_id,
    name,
    city,
    district,
    address_line,
    latitude,
    longitude,
    is_primary
  )
  VALUES (
    p_business_id,
    btrim(p_name),
    btrim(p_city),
    NULLIF(btrim(p_district), ''),
    btrim(p_address_line),
    p_latitude,
    p_longitude,
    v_is_primary
  )
  RETURNING id INTO v_branch_id;

  RETURN v_branch_id;
END;
$$;


ALTER FUNCTION "wow_private"."create_branch_internal"("p_business_id" "uuid", "p_name" "text", "p_city" "text", "p_address_line" "text", "p_district" "text", "p_latitude" numeric, "p_longitude" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "wow_private"."create_business_internal"("p_name" "text", "p_description" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_user_id TEXT := (SELECT auth.jwt() ->> 'sub');
  v_business_id UUID;
BEGIN
  IF (SELECT auth.jwt() ->> 'role')
       IS DISTINCT FROM 'authenticated'
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

  INSERT INTO public.businesses (
    owner_user_id,
    name,
    description
  )
  VALUES (
    v_user_id,
    btrim(p_name),
    NULLIF(btrim(p_description), '')
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

  RETURN v_business_id;
END;
$$;


ALTER FUNCTION "wow_private"."create_business_internal"("p_name" "text", "p_description" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "wow_private"."create_offer_internal"("p_business_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE v_offer_id UUID; v_uid TEXT := (SELECT auth.jwt() ->> 'sub');
BEGIN
  IF NOT wow_private.can_manage_offer_business(p_business_id,'draft') THEN
    RAISE EXCEPTION 'Offer drafting permission required' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.offers(business_id,created_by_user_id)
    VALUES (p_business_id,v_uid) RETURNING id INTO v_offer_id;
  RETURN v_offer_id;
END;
$$;


ALTER FUNCTION "wow_private"."create_offer_internal"("p_business_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "wow_private"."current_active_customer_id"() RETURNS "text"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE v_id TEXT;
BEGIN
  IF (SELECT auth.jwt() ->> 'role') IS DISTINCT FROM 'authenticated' THEN
    RAISE EXCEPTION 'Authenticated Clerk user required' USING ERRCODE='42501';
  END IF;
  v_id := (SELECT auth.jwt() ->> 'sub');
  IF v_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.users u WHERE u.id=v_id
      AND u.account_status='active' AND u.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Active synchronized user required' USING ERRCODE='42501';
  END IF;
  RETURN v_id;
END;
$$;


ALTER FUNCTION "wow_private"."current_active_customer_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "wow_private"."discoverable_offer_branches"() RETURNS TABLE("offer_id" "uuid", "version_id" "uuid", "business_id" "uuid", "branch_id" "uuid", "starts_at" timestamp with time zone, "ends_at" timestamp with time zone, "original_price" numeric, "final_price" numeric, "discount_percent" numeric)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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
    AND wow_private.has_publication_entitlement(o.business_id);
$$;


ALTER FUNCTION "wow_private"."discoverable_offer_branches"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "wow_private"."get_business_billing_internal"("p_business_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  PERFORM wow_private.assert_billing_owner(p_business_id);
  RETURN jsonb_build_object(
    'business_id',p_business_id,
    'has_publication_entitlement',wow_private.has_publication_entitlement(p_business_id),
    'subscriptions',COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'id',s.id,'kind',s.kind,'status',s.status,'plan_snapshot',s.plan_snapshot,
      'starts_at',s.starts_at,'ends_at',s.ends_at,'created_at',s.created_at
    ) ORDER BY s.created_at DESC)
      FROM public.business_subscriptions s WHERE s.business_id=p_business_id),'[]'::jsonb),
    'payments',COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'id',p.id,'subscription_id',p.subscription_id,'amount',p.amount,
      'currency',p.currency,'method',p.method,'reference',p.reference,
      'status',p.status,'created_at',p.created_at,'verified_at',p.verified_at
    ) ORDER BY p.created_at DESC)
      FROM public.subscription_payments p JOIN public.business_subscriptions s
        ON s.id=p.subscription_id WHERE s.business_id=p_business_id),'[]'::jsonb),
    'agreements',COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'id',a.id,'agreement_type',a.agreement_type,
      'grants_publication',a.grants_publication,'starts_at',a.starts_at,
      'ends_at',a.ends_at,'status',a.status
    ) ORDER BY a.created_at DESC)
      FROM public.commercial_agreements a WHERE a.business_id=p_business_id),'[]'::jsonb)
  );
END;
$$;


ALTER FUNCTION "wow_private"."get_business_billing_internal"("p_business_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "wow_private"."guard_offer_child_draft"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
DECLARE v_version UUID; v_other UUID; v_item UUID;
BEGIN
  IF TG_TABLE_NAME='offer_item_attributes' THEN
    IF TG_OP='DELETE' THEN
      v_item := OLD.offer_item_id;
    ELSE
      v_item := NEW.offer_item_id;
    END IF;
    SELECT i.offer_version_id INTO v_version
      FROM public.offer_items i WHERE i.id=v_item;
    IF TG_OP='UPDATE' THEN
      SELECT i.offer_version_id INTO v_other
        FROM public.offer_items i WHERE i.id=OLD.offer_item_id;
    END IF;
  ELSE
    IF TG_OP='DELETE' THEN
      v_version := OLD.offer_version_id;
    ELSE
      v_version := NEW.offer_version_id;
    END IF;
    IF TG_OP='UPDATE' THEN v_other := OLD.offer_version_id; END IF;
  END IF;
  IF v_version IS NULL OR NOT EXISTS (
       SELECT 1 FROM public.offer_versions v
       WHERE v.id=v_version AND v.review_status='draft'
     ) OR (v_other IS NOT NULL AND NOT EXISTS (
       SELECT 1 FROM public.offer_versions v
       WHERE v.id=v_other AND v.review_status='draft'
     )) THEN
    RAISE EXCEPTION 'Offer content can only change in a draft' USING ERRCODE='42501';
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;


ALTER FUNCTION "wow_private"."guard_offer_child_draft"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "wow_private"."guard_offer_current_version"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
  IF NEW.current_version_id IS NOT NULL AND (
     OLD.current_version_id IS DISTINCT FROM NEW.current_version_id
  ) AND NOT EXISTS (
    SELECT 1 FROM public.offer_versions v
    WHERE v.id=NEW.current_version_id AND v.offer_id=NEW.id
      AND v.review_status='approved'
  ) THEN
    RAISE EXCEPTION 'Current offer version must be approved' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "wow_private"."guard_offer_current_version"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "wow_private"."guard_offer_employee_branch_scope"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_user TEXT := (SELECT auth.jwt()->>'sub');
  v_business UUID;
  v_member_id UUID;
  v_role TEXT;
  v_version_created_by TEXT;
  v_version_id UUID;
  v_old_branch UUID;
  v_new_branch UUID;
BEGIN
  IF (SELECT auth.jwt()->>'role') IS DISTINCT FROM 'authenticated' THEN
    -- Trusted SQL maintenance / server operations; client roles have no
    -- direct INSERT/UPDATE/DELETE privileges on offer_branches.
    IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
  END IF;

  IF TG_OP='DELETE' THEN
    v_version_id := OLD.offer_version_id;
    v_old_branch := OLD.branch_id;
  ELSIF TG_OP='UPDATE' THEN
    v_version_id := NEW.offer_version_id;
    v_old_branch := OLD.branch_id;
    v_new_branch := NEW.branch_id;
    IF OLD.offer_version_id IS DISTINCT FROM NEW.offer_version_id
       OR OLD.business_id IS DISTINCT FROM NEW.business_id THEN
      RAISE EXCEPTION 'Changing offer branch ownership is forbidden' USING ERRCODE='42501';
    END IF;
  ELSE
    v_version_id := NEW.offer_version_id;
    v_new_branch := NEW.branch_id;
  END IF;

  SELECT v.business_id,v.created_by_user_id
    INTO v_business,v_version_created_by
  FROM public.offer_versions v WHERE v.id=v_version_id;
  SELECT m.id,m.role INTO v_member_id,v_role
  FROM public.business_members m
  JOIN public.users u ON u.id=m.user_id
  WHERE m.business_id=v_business AND m.user_id=v_user
    AND m.status='active' AND u.account_status='active'
    AND u.deleted_at IS NULL;
  IF v_member_id IS NULL THEN
    RAISE EXCEPTION 'Active offer membership required' USING ERRCODE='42501';
  END IF;

  IF v_role='owner' THEN
    IF NOT EXISTS (SELECT 1 FROM public.businesses b
                   WHERE b.id=v_business AND b.owner_user_id=v_user) THEN
      RAISE EXCEPTION 'Owner identity mismatch' USING ERRCODE='42501';
    END IF;
    IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
  END IF;
  IF v_role IS DISTINCT FROM 'employee' THEN
    RAISE EXCEPTION 'Unsupported membership role' USING ERRCODE='42501';
  END IF;

  -- Employees may begin populating their OWN fresh empty draft, but not
  -- hijack somebody else's empty draft.
  IF TG_OP='INSERT'
     AND NOT EXISTS (SELECT 1 FROM public.offer_branches ob
                     WHERE ob.offer_version_id=v_version_id)
     AND v_version_created_by IS DISTINCT FROM v_user THEN
    RAISE EXCEPTION 'Cannot claim another user draft' USING ERRCODE='42501';
  END IF;

  IF v_old_branch IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.business_member_branches mba
      WHERE mba.business_id=v_business AND mba.member_id=v_member_id
        AND mba.branch_id=v_old_branch
  ) THEN
    RAISE EXCEPTION 'Employee cannot remove or move an unassigned branch'
      USING ERRCODE='42501';
  END IF;
  IF v_new_branch IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.business_member_branches mba
      WHERE mba.business_id=v_business AND mba.member_id=v_member_id
        AND mba.branch_id=v_new_branch
  ) THEN
    RAISE EXCEPTION 'Employee cannot attach an unassigned branch'
      USING ERRCODE='42501';
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;


ALTER FUNCTION "wow_private"."guard_offer_employee_branch_scope"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "wow_private"."guard_offer_employee_submission_scope"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE v_uid TEXT:=(SELECT auth.jwt()->>'sub');v_member UUID;v_role TEXT;
BEGIN
  IF OLD.review_status<>'draft' OR NEW.review_status<>'pending'
     OR (SELECT auth.jwt()->>'role') <> 'authenticated' THEN RETURN NEW; END IF;
  SELECT m.id,m.role INTO v_member,v_role FROM public.business_members m
  WHERE m.business_id=NEW.business_id AND m.user_id=v_uid AND m.status='active';
  IF v_member IS NULL THEN
    RAISE EXCEPTION 'Active membership required to submit offer' USING ERRCODE='42501';
  END IF;
  IF v_role='employee' AND EXISTS (
    SELECT 1 FROM public.offer_branches ob
    WHERE ob.offer_version_id=NEW.id AND NOT EXISTS (
      SELECT 1 FROM public.business_member_branches a
      WHERE a.member_id=v_member AND a.business_id=NEW.business_id AND a.branch_id=ob.branch_id
    )
  ) THEN
    RAISE EXCEPTION 'Employee cannot submit offers for unassigned branches'
      USING ERRCODE='42501';
  END IF;
  RETURN NEW;
END; $$;


ALTER FUNCTION "wow_private"."guard_offer_employee_submission_scope"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "wow_private"."guard_offer_version_immutable"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
  IF OLD.review_status IN ('pending','approved','rejected') AND (
      ROW(OLD.business_id,OLD.offer_id,OLD.version_no,OLD.title,
          OLD.description,OLD.offer_kind,OLD.original_price,OLD.final_price,
          OLD.currency,OLD.benefit_details,OLD.mandatory_fees,OLD.terms,
          OLD.stock_or_condition_notice,OLD.starts_at,OLD.ends_at,
          OLD.created_by_user_id,OLD.submitted_at)
      IS DISTINCT FROM
      ROW(NEW.business_id,NEW.offer_id,NEW.version_no,NEW.title,
          NEW.description,NEW.offer_kind,NEW.original_price,NEW.final_price,
          NEW.currency,NEW.benefit_details,NEW.mandatory_fees,NEW.terms,
          NEW.stock_or_condition_notice,NEW.starts_at,NEW.ends_at,
          NEW.created_by_user_id,NEW.submitted_at)
  ) THEN
    RAISE EXCEPTION 'Submitted offer contents are immutable' USING ERRCODE='42501';
  END IF;
  IF (OLD.review_status='approved' AND NEW.review_status<>'approved')
     OR (OLD.review_status='rejected' AND NEW.review_status<>'rejected')
     OR (OLD.review_status='pending' AND NEW.review_status NOT IN ('approved','rejected'))
     OR (OLD.review_status='draft' AND NEW.review_status NOT IN ('draft','pending')) THEN
    RAISE EXCEPTION 'Invalid offer review state transition' USING ERRCODE='22023';
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "wow_private"."guard_offer_version_immutable"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "wow_private"."has_admin_permission"("p_review" boolean DEFAULT false) RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  SELECT COALESCE((SELECT auth.jwt() ->> 'role') = 'authenticated', false)
    AND EXISTS (
      SELECT 1
      FROM wow_private.admin_members a
      JOIN public.users u ON u.id = a.user_id
      WHERE a.user_id = (SELECT auth.jwt() ->> 'sub')
        AND a.is_active
        AND u.account_status = 'active'
        AND u.deleted_at IS NULL
        AND (
          (NOT p_review AND a.role IN ('super_admin', 'reviewer', 'viewer'))
          OR (p_review AND a.role IN ('super_admin', 'reviewer'))
        )
    );
$$;


ALTER FUNCTION "wow_private"."has_admin_permission"("p_review" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "wow_private"."has_publication_entitlement"("p_business_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id=p_business_id AND b.status='approved'
      AND (
        EXISTS (
          SELECT 1 FROM public.business_subscriptions s
          WHERE s.business_id=b.id AND s.status='active'
            AND s.starts_at <= now() AND s.ends_at > now()
        )
        OR EXISTS (
          SELECT 1 FROM public.commercial_agreements a
          WHERE a.business_id=b.id AND a.status='approved'
            AND a.grants_publication AND a.starts_at<=now()
            AND (a.ends_at IS NULL OR a.ends_at>now())
        )
      )
  );
$$;


ALTER FUNCTION "wow_private"."has_publication_entitlement"("p_business_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "wow_private"."is_business_member"("p_business_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.business_members m
    JOIN public.users u ON u.id = m.user_id
    WHERE m.business_id = p_business_id
      AND m.user_id = (SELECT auth.jwt() ->> 'sub')
      AND m.status = 'active'
      AND u.account_status = 'active'
      AND u.deleted_at IS NULL
  );
$$;


ALTER FUNCTION "wow_private"."is_business_member"("p_business_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "wow_private"."is_business_owner"("p_business_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.business_members m
    JOIN public.businesses b
      ON b.id = m.business_id
    JOIN public.users u
      ON u.id = m.user_id
    WHERE m.business_id = p_business_id
      AND b.owner_user_id = m.user_id
      AND m.user_id = (SELECT auth.jwt() ->> 'sub')
      AND m.role = 'owner'
      AND m.status = 'active'
      AND u.account_status = 'active'
      AND u.deleted_at IS NULL
  );
$$;


ALTER FUNCTION "wow_private"."is_business_owner"("p_business_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "wow_private"."is_public_offer_object"("p_key" "text") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.offer_media m
    JOIN public.offer_versions v ON v.id=m.offer_version_id
    JOIN public.offers o ON o.current_version_id=v.id AND o.id=v.offer_id
    WHERE m.storage_key=p_key AND EXISTS (
      SELECT 1 FROM wow_private.discoverable_offer_branches() visible
      WHERE visible.offer_id=o.id AND visible.version_id=v.id
    )
  );
$$;


ALTER FUNCTION "wow_private"."is_public_offer_object"("p_key" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "wow_private"."list_business_team_internal"("p_business_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE v_output JSONB;
BEGIN
  IF NOT wow_private.is_business_owner(p_business_id) THEN
    RAISE EXCEPTION 'Owner authorization required' USING ERRCODE='42501';
  END IF;
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id',m.id,'user_id',m.user_id,'role',m.role,'status',m.status,
    'can_draft',m.can_draft,'can_submit',m.can_submit,
    'can_pause',m.can_pause,'can_monitor',m.can_monitor,
    'branch_ids',COALESCE((SELECT jsonb_agg(a.branch_id ORDER BY a.branch_id)
      FROM public.business_member_branches a WHERE a.member_id=m.id),'[]'::jsonb)
  ) ORDER BY m.created_at,m.id),'[]'::jsonb) INTO v_output
  FROM public.business_members m WHERE m.business_id=p_business_id;
  RETURN v_output;
END; $$;


ALTER FUNCTION "wow_private"."list_business_team_internal"("p_business_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "wow_private"."list_my_profile_revisions_internal"("p_business_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE v_result JSONB;
BEGIN
  IF NOT wow_private.is_business_owner(p_business_id) THEN
    RAISE EXCEPTION 'Owner authorization required' USING ERRCODE='42501';
  END IF;
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id',r.id,'branch_id',r.branch_id,'patch',r.patch,'status',r.status,
    'review_reason',r.review_reason,'created_at',r.created_at,
    'decided_at',r.decided_at
  ) ORDER BY r.created_at DESC,r.id DESC),'[]'::jsonb) INTO v_result
  FROM public.business_profile_revisions r WHERE r.business_id=p_business_id;
  RETURN v_result;
END; $$;


ALTER FUNCTION "wow_private"."list_my_profile_revisions_internal"("p_business_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "wow_private"."list_subscription_plans_internal"() RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  IF (SELECT auth.jwt() ->> 'role') IS DISTINCT FROM 'authenticated'
     OR NOT EXISTS (SELECT 1 FROM public.users u
       WHERE u.id=(SELECT auth.jwt() ->> 'sub')
         AND u.account_status='active' AND u.deleted_at IS NULL) THEN
    RAISE EXCEPTION 'Active authenticated user required' USING ERRCODE='42501';
  END IF;
  RETURN COALESCE((SELECT jsonb_agg(jsonb_build_object(
    'code',p.code,'name',p.name,'price',p.price,'currency',p.currency,
    'duration_days',p.duration_days,'feature_limits',p.feature_limits
  ) ORDER BY p.code)
  FROM public.subscription_plans p WHERE p.is_active),'[]'::jsonb);
END;
$$;


ALTER FUNCTION "wow_private"."list_subscription_plans_internal"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "wow_private"."merchant_complaints_internal"("p_business_id" "uuid", "p_limit" integer, "p_offset" integer) RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE v_result JSONB;
BEGIN
  PERFORM wow_private.current_active_customer_id();
  IF NOT wow_private.is_business_owner(p_business_id) THEN
    RAISE EXCEPTION 'Active business owner required' USING ERRCODE='42501';
  END IF;
  IF p_limit NOT BETWEEN 1 AND 100 OR p_offset NOT BETWEEN 0 AND 10000 THEN
    RAISE EXCEPTION 'Invalid pagination' USING ERRCODE='22023';
  END IF;
  SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY x.created_at DESC,x.id DESC),'[]'::jsonb)
  INTO v_result FROM (
    SELECT c.id,c.offer_id,c.offer_version_id,c.branch_id,
      c.complaint_type,c.status,c.created_at,
      (SELECT COUNT(*)::INTEGER FROM public.complaint_updates u
       WHERE u.complaint_id=c.id AND u.kind='merchant_response') AS response_count
    FROM public.complaints c JOIN public.offers o ON o.id=c.offer_id
    WHERE o.business_id=p_business_id
    ORDER BY c.created_at DESC,c.id DESC LIMIT p_limit OFFSET p_offset
  ) x;
  RETURN v_result;
END;
$$;


ALTER FUNCTION "wow_private"."merchant_complaints_internal"("p_business_id" "uuid", "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "wow_private"."merchant_respond_complaint_internal"("p_complaint_id" "uuid", "p_message" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE v_user TEXT; v_business UUID; v_status TEXT; v_update UUID;
BEGIN
  v_user := wow_private.current_active_customer_id();
  SELECT o.business_id,c.status INTO v_business,v_status
  FROM public.complaints c JOIN public.offers o ON o.id=c.offer_id
  WHERE c.id=p_complaint_id FOR UPDATE OF c;
  IF v_business IS NULL OR NOT wow_private.is_business_owner(v_business) THEN
    RAISE EXCEPTION 'Active business owner required' USING ERRCODE='42501';
  END IF;
  IF v_status='closed' THEN
    RAISE EXCEPTION 'Closed complaint cannot receive proprietor responses'
      USING ERRCODE='22023';
  END IF;
  IF p_message IS NULL OR char_length(btrim(p_message)) NOT BETWEEN 5 AND 3000 THEN
    RAISE EXCEPTION 'Response must contain 5–3000 characters' USING ERRCODE='22023';
  END IF;
  INSERT INTO public.complaint_updates(
    complaint_id,author_user_id,kind,message,visibility
  ) VALUES (p_complaint_id,v_user,'merchant_response',btrim(p_message),'admin_only')
  RETURNING id INTO v_update;
  RETURN v_update;
END;
$$;


ALTER FUNCTION "wow_private"."merchant_respond_complaint_internal"("p_complaint_id" "uuid", "p_message" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "wow_private"."my_complaints_internal"("p_limit" integer, "p_offset" integer) RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE v_user TEXT; v_result JSONB;
BEGIN
  v_user := wow_private.current_active_customer_id();
  IF p_limit NOT BETWEEN 1 AND 100 OR p_offset NOT BETWEEN 0 AND 10000 THEN
    RAISE EXCEPTION 'Invalid pagination' USING ERRCODE='22023';
  END IF;
  SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY x.created_at DESC,x.id DESC),'[]'::jsonb)
  INTO v_result FROM (
    SELECT c.id,c.offer_id,c.offer_version_id,c.branch_id,c.complaint_type,
      c.description,c.incident_at,c.status,c.public_outcome,c.created_at,c.closed_at,
      COALESCE((SELECT jsonb_agg(jsonb_build_object(
        'kind',u.kind,'message',u.message,'created_at',u.created_at
        ) ORDER BY u.created_at,u.id)
        FROM public.complaint_updates u WHERE u.complaint_id=c.id
          AND u.visibility='customer_safe'),'[]'::jsonb) AS updates
    FROM public.complaints c WHERE c.user_id=v_user
    ORDER BY c.created_at DESC,c.id DESC LIMIT p_limit OFFSET p_offset
  ) x;
  RETURN v_result;
END;
$$;


ALTER FUNCTION "wow_private"."my_complaints_internal"("p_limit" integer, "p_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "wow_private"."my_ratings_internal"("p_limit" integer, "p_offset" integer) RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE v_user TEXT; v_result JSONB;
BEGIN
  v_user := wow_private.current_active_customer_id();
  IF p_limit NOT BETWEEN 1 AND 100 OR p_offset NOT BETWEEN 0 AND 10000 THEN
    RAISE EXCEPTION 'Invalid pagination' USING ERRCODE='22023';
  END IF;
  SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY x.updated_at DESC,x.id DESC),'[]'::jsonb)
  INTO v_result FROM (
    SELECT r.id,r.offer_id,r.offer_version_id,r.conformity,
      r.experience_stars,r.moderation_status,r.created_at,r.updated_at
    FROM public.offer_ratings r WHERE r.user_id=v_user
    ORDER BY r.updated_at DESC,r.id DESC LIMIT p_limit OFFSET p_offset
  ) x;
  RETURN v_result;
END;
$$;


ALTER FUNCTION "wow_private"."my_ratings_internal"("p_limit" integer, "p_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "wow_private"."my_verifications_internal"("p_business_id" "uuid") RETURNS TABLE("id" "uuid", "branch_id" "uuid", "request_type" "text", "status" "text", "submitted_at" timestamp with time zone, "decided_at" timestamp with time zone, "merchant_feedback" "text", "created_at" timestamp with time zone)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  IF (SELECT auth.jwt() ->> 'role') IS DISTINCT FROM 'authenticated'
     OR NOT wow_private.is_business_owner(p_business_id) THEN
    RAISE EXCEPTION 'Business owner access required' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY SELECT v.id, v.branch_id, v.request_type, v.status,
    v.submitted_at, v.decided_at, v.merchant_feedback, v.created_at
  FROM public.business_verifications v
  WHERE v.business_id = p_business_id ORDER BY v.created_at DESC;
END;
$$;


ALTER FUNCTION "wow_private"."my_verifications_internal"("p_business_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "wow_private"."public_get_business_internal"("p_business_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'id', b.id, 'name', b.name, 'description', b.description,
    'contact_phone', b.contact_phone, 'logo_url', b.logo_url,
    'cover_url', b.cover_url,
    'categories', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', c.id, 'slug', c.slug, 'name_ar', c.name_ar,
        'name_en', c.name_en, 'is_primary', bc.is_primary
      ) ORDER BY bc.is_primary DESC, c.sort_order, c.id)
      FROM public.business_categories AS bc
      JOIN public.categories AS c ON c.id = bc.category_id
      WHERE bc.business_id = b.id AND c.is_active
        AND (c.parent_id IS NULL OR EXISTS (
          SELECT 1 FROM public.categories AS parent
          WHERE parent.id=c.parent_id AND parent.is_active
        ))
    ), '[]'::jsonb),
    'branches', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', e.id, 'name', e.name, 'city', e.city,
        'district', e.district, 'address_line', e.address_line,
        'latitude', e.latitude, 'longitude', e.longitude,
        'is_primary', e.is_primary
      ) ORDER BY e.is_primary DESC, e.name, e.id)
      FROM (
        SELECT DISTINCT br.id, br.name, br.city, br.district,
          br.address_line, br.latitude, br.longitude, br.is_primary
        FROM wow_private.discoverable_offer_branches() AS vis
        JOIN public.business_branches AS br ON br.id=vis.branch_id
        WHERE vis.business_id=b.id
      ) AS e
    ), '[]'::jsonb),
    'offers', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', e.offer_id, 'title', e.title, 'offer_kind', e.offer_kind,
        'original_price', e.original_price, 'final_price', e.final_price,
        'currency', e.currency, 'discount_percent', e.discount_percent,
        'starts_at', e.starts_at, 'ends_at', e.ends_at
      ) ORDER BY e.starts_at DESC, e.offer_id)
      FROM (
        SELECT DISTINCT vis.offer_id, v.title, v.offer_kind,
          vis.original_price, vis.final_price, v.currency,
          vis.discount_percent, vis.starts_at, vis.ends_at
        FROM wow_private.discoverable_offer_branches() AS vis
        JOIN public.offer_versions AS v ON v.id=vis.version_id
        WHERE vis.business_id=b.id
      ) AS e
    ), '[]'::jsonb)
  ) INTO v_result
  FROM public.businesses AS b
  WHERE b.id=p_business_id AND b.status='approved'
    AND EXISTS (SELECT 1 FROM wow_private.discoverable_offer_branches() AS vis
                WHERE vis.business_id=b.id);
  RETURN v_result;
END;
$$;


ALTER FUNCTION "wow_private"."public_get_business_internal"("p_business_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "wow_private"."public_get_offer_internal"("p_offer_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'id', o.id, 'business_id', o.business_id,
    'business', jsonb_build_object(
      'id', b.id, 'name', b.name, 'contact_phone', b.contact_phone,
      'logo_url', b.logo_url
    ),
    'title', v.title, 'description', v.description,
    'offer_kind', v.offer_kind,
    'original_price', v.original_price, 'final_price', v.final_price,
    'currency', v.currency,
    'discount_percent', CASE
      WHEN v.original_price > 0 AND v.final_price < v.original_price
        THEN round(((v.original_price - v.final_price) * 100 / v.original_price)::numeric, 2)
      ELSE 0::numeric END,
    'benefit_details', v.benefit_details, 'mandatory_fees', v.mandatory_fees,
    'terms', v.terms, 'stock_or_condition_notice', v.stock_or_condition_notice,
    'starts_at', v.starts_at, 'ends_at', v.ends_at,
    'items', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'item_type', i.item_type, 'name', i.name,
        'description', i.description, 'brand', i.brand, 'model', i.model,
        'quantity', i.quantity, 'unit', i.unit,
        'reference_value', i.reference_value,
        'attributes', COALESCE((
          SELECT jsonb_agg(jsonb_build_object('name', a.name, 'value', a.value)
             ORDER BY a.sort_order, a.id)
          FROM public.offer_item_attributes AS a
          WHERE a.offer_item_id=i.id
        ), '[]'::jsonb)
      ) ORDER BY i.sort_order, i.id)
      FROM public.offer_items AS i WHERE i.offer_version_id=v.id
    ), '[]'::jsonb),
    'branches', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', br.id, 'name', br.name, 'city', br.city,
        'district', br.district, 'address_line', br.address_line,
        'latitude', br.latitude, 'longitude', br.longitude,
        'is_primary', br.is_primary
      ) ORDER BY br.is_primary DESC, br.name, br.id)
      FROM wow_private.discoverable_offer_branches() AS vis
      JOIN public.business_branches AS br ON br.id=vis.branch_id
      WHERE vis.offer_id=o.id AND vis.version_id=v.id
    ), '[]'::jsonb)
  ) INTO v_result
  FROM public.offers AS o
  JOIN public.offer_versions AS v ON v.id=o.current_version_id AND v.offer_id=o.id
  JOIN public.businesses AS b ON b.id=o.business_id
  WHERE o.id=p_offer_id
    AND EXISTS (SELECT 1 FROM wow_private.discoverable_offer_branches() AS vis
                WHERE vis.offer_id=o.id AND vis.version_id=v.id);
  RETURN v_result;
END;
$$;


ALTER FUNCTION "wow_private"."public_get_offer_internal"("p_offer_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "wow_private"."public_list_categories_internal"() RETURNS "jsonb"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', c.id, 'parent_id', c.parent_id, 'slug', c.slug,
      'name_ar', c.name_ar, 'name_en', c.name_en
    ) ORDER BY c.sort_order, c.name_ar, c.id
  ), '[]'::jsonb)
  FROM public.categories AS c
  WHERE c.is_active = true
    AND (c.parent_id IS NULL OR EXISTS (
      SELECT 1 FROM public.categories AS parent
      WHERE parent.id = c.parent_id AND parent.is_active = true
    ));
$$;


ALTER FUNCTION "wow_private"."public_list_categories_internal"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "wow_private"."public_offer_media_internal"("p_offer_id" "uuid") RETURNS "jsonb"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'bucket','wow-offer-media','key',m.storage_key,
    'alt_text',m.alt_text,'is_cover',m.is_cover,'sort_order',m.sort_order
  ) ORDER BY m.is_cover DESC,m.sort_order,m.id),'[]'::jsonb)
  FROM public.offer_media m
  JOIN public.offer_versions v ON v.id=m.offer_version_id
  JOIN public.offers o ON o.current_version_id=v.id AND o.id=v.offer_id
  WHERE o.id=p_offer_id
    AND EXISTS (SELECT 1 FROM storage.objects obj
      WHERE obj.bucket_id='wow-offer-media' AND obj.name=m.storage_key)
    AND EXISTS (
    SELECT 1 FROM wow_private.discoverable_offer_branches() visible
    WHERE visible.offer_id=o.id AND visible.version_id=v.id
  );
$$;


ALTER FUNCTION "wow_private"."public_offer_media_internal"("p_offer_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "wow_private"."public_search_businesses_internal"("p_query" "text", "p_city" "text", "p_district" "text", "p_category_id" "uuid", "p_sort" "text", "p_limit" integer, "p_offset" integer) RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_query TEXT := NULLIF(btrim(p_query), '');
  v_city TEXT := NULLIF(btrim(p_city), '');
  v_district TEXT := NULLIF(btrim(p_district), '');
  v_result JSONB;
BEGIN
  IF p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 50
    OR p_offset IS NULL OR p_offset NOT BETWEEN 0 AND 5000
    OR p_sort IS NULL OR p_sort NOT IN ('recent','discount','name')
    OR char_length(COALESCE(v_query,'')) > 100
    OR char_length(COALESCE(v_city,'')) > 120
    OR char_length(COALESCE(v_district,'')) > 120 THEN
    RAISE EXCEPTION 'Invalid public search parameters' USING ERRCODE = '22023';
  END IF;

  WITH matches AS (
    SELECT DISTINCT
      vo.business_id, vo.offer_id, vo.version_id,
      vo.discount_percent, vo.starts_at
    FROM wow_private.discoverable_offer_branches() AS vo
    JOIN public.businesses AS b ON b.id = vo.business_id
    JOIN public.business_branches AS br ON br.id = vo.branch_id
    JOIN public.offer_versions AS v ON v.id = vo.version_id
    WHERE (v_city IS NULL OR lower(btrim(br.city)) = lower(v_city))
      AND (v_district IS NULL OR lower(btrim(COALESCE(br.district,''))) = lower(v_district))
      AND (p_category_id IS NULL OR EXISTS (
        SELECT 1 FROM public.business_categories AS bc
        JOIN public.categories AS c ON c.id = bc.category_id
        WHERE bc.business_id = b.id
          AND (bc.category_id = p_category_id OR c.parent_id = p_category_id)
          AND c.is_active
          AND (c.parent_id IS NULL OR EXISTS (
             SELECT 1 FROM public.categories AS parent
             WHERE parent.id = c.parent_id AND parent.is_active
          ))
      ))
      AND (v_query IS NULL
        OR strpos(lower(b.name), lower(v_query)) > 0
        OR strpos(lower(v.title), lower(v_query)) > 0
        OR strpos(lower(COALESCE(v.description,'')), lower(v_query)) > 0
        OR strpos(lower(br.address_line), lower(v_query)) > 0
      )
  ), summary AS (
    SELECT business_id, count(*)::INTEGER AS offer_count,
      max(discount_percent) AS max_discount_percent,
      max(starts_at) AS newest_offer_start
    FROM matches
    GROUP BY business_id
  ), cards AS (
    SELECT b.id, b.name, b.description, b.logo_url, b.cover_url,
      s.offer_count, s.max_discount_percent, s.newest_offer_start,
      COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'offer_id', a.offer_id, 'title', a.title,
          'original_price', a.original_price, 'final_price', a.final_price,
          'currency', a.currency, 'discount_percent', a.discount_percent,
          'starts_at', a.starts_at, 'ends_at', a.ends_at
        ) ORDER BY a.starts_at DESC, a.offer_id)
        FROM (
          SELECT m.offer_id, v.title, v.original_price, v.final_price,
            v.currency, m.discount_percent, m.starts_at, v.ends_at
          FROM matches AS m
          JOIN public.offer_versions AS v ON v.id = m.version_id
          WHERE m.business_id = b.id
          ORDER BY m.starts_at DESC, m.offer_id
          LIMIT 3
        ) AS a
      ), '[]'::jsonb) AS offers,
      COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'id', c.id, 'slug', c.slug,
          'name_ar', c.name_ar, 'name_en', c.name_en,
          'is_primary', bc.is_primary
        ) ORDER BY bc.is_primary DESC, c.sort_order, c.name_ar)
        FROM public.business_categories AS bc
        JOIN public.categories AS c ON c.id = bc.category_id
        WHERE bc.business_id = b.id AND c.is_active
          AND (c.parent_id IS NULL OR EXISTS (
            SELECT 1 FROM public.categories AS parent
            WHERE parent.id = c.parent_id AND parent.is_active
          ))
      ), '[]'::jsonb) AS categories
    FROM summary AS s
    JOIN public.businesses AS b ON b.id = s.business_id
  )
  SELECT jsonb_build_object(
    'total', (SELECT count(*) FROM cards),
    'limit', p_limit, 'offset', p_offset,
    'items', COALESCE((
      SELECT jsonb_agg(to_jsonb(paged) ORDER BY
        CASE WHEN p_sort = 'discount' THEN paged.max_discount_percent END DESC NULLS LAST,
        CASE WHEN p_sort = 'recent' THEN paged.newest_offer_start END DESC NULLS LAST,
        CASE WHEN p_sort = 'name' THEN lower(paged.name) END ASC NULLS LAST,
        paged.id)
      FROM (
        SELECT * FROM cards AS c
        ORDER BY
          CASE WHEN p_sort = 'discount' THEN c.max_discount_percent END DESC NULLS LAST,
          CASE WHEN p_sort = 'recent' THEN c.newest_offer_start END DESC NULLS LAST,
          CASE WHEN p_sort = 'name' THEN lower(c.name) END ASC NULLS LAST,
          c.id
        LIMIT p_limit OFFSET p_offset
      ) AS paged
    ), '[]'::jsonb)
  ) INTO v_result;
  RETURN v_result;
END;
$$;


ALTER FUNCTION "wow_private"."public_search_businesses_internal"("p_query" "text", "p_city" "text", "p_district" "text", "p_category_id" "uuid", "p_sort" "text", "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "wow_private"."rate_offer_internal"("p_offer_id" "uuid", "p_conformity" "text", "p_experience_stars" smallint) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE v_user TEXT; v_version UUID; v_rating UUID;
BEGIN
  v_user := wow_private.current_active_customer_id();
  IF p_conformity IS NULL OR p_conformity NOT IN
       ('matches','does_not_match','could_not_verify')
     OR (p_experience_stars IS NOT NULL AND
       (p_experience_stars NOT BETWEEN 1 AND 5 OR p_conformity='could_not_verify')) THEN
    RAISE EXCEPTION 'Invalid conformity or experience stars' USING ERRCODE='22023';
  END IF;
  -- Lock offer so the approved version pointer cannot change mid-submission.
  SELECT v.id INTO v_version
  FROM public.offers o
  JOIN public.offer_versions v ON v.id=o.current_version_id AND v.offer_id=o.id
  JOIN public.businesses b ON b.id=o.business_id
  WHERE o.id=p_offer_id AND b.status='approved'
    AND v.review_status='approved' AND v.starts_at IS NOT NULL
    AND v.ends_at IS NOT NULL AND now()>=v.starts_at
    AND now()<=v.ends_at+INTERVAL '14 days'
    AND EXISTS (SELECT 1 FROM public.offer_branches ob
       JOIN public.business_branches br ON br.id=ob.branch_id
       WHERE ob.offer_version_id=v.id AND ob.business_id=o.business_id
         AND br.status='approved')
  FOR SHARE OF o;
  IF v_version IS NULL THEN
    RAISE EXCEPTION 'Offer is not within the 14-day assessment window' USING ERRCODE='22023';
  END IF;
  INSERT INTO public.offer_ratings(user_id,offer_id,offer_version_id,conformity,experience_stars)
  VALUES(v_user,p_offer_id,v_version,p_conformity,p_experience_stars)
  ON CONFLICT (user_id,offer_id) DO UPDATE SET
    offer_version_id=EXCLUDED.offer_version_id,
    conformity=EXCLUDED.conformity,
    experience_stars=EXCLUDED.experience_stars
    -- NEVER reset moderation_status, moderated_by or moderated_at here.
  RETURNING id INTO v_rating;
  RETURN v_rating;
END;
$$;


ALTER FUNCTION "wow_private"."rate_offer_internal"("p_offer_id" "uuid", "p_conformity" "text", "p_experience_stars" smallint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "wow_private"."request_paid_subscription_internal"("p_business_id" "uuid", "p_plan_code" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE v_actor TEXT; v_plan public.subscription_plans%ROWTYPE;
  v_id UUID; v_snapshot JSONB;
BEGIN
  v_actor := wow_private.assert_billing_owner(p_business_id);
  PERFORM 1 FROM public.businesses WHERE id=p_business_id FOR UPDATE;
  IF NOT EXISTS (SELECT 1 FROM public.businesses
    WHERE id=p_business_id AND status='approved') THEN
    RAISE EXCEPTION 'Verified business required before paid subscription request'
      USING ERRCODE='22023';
  END IF;
  SELECT * INTO v_plan FROM public.subscription_plans
  WHERE code=upper(btrim(p_plan_code)) AND is_active FOR SHARE;
  IF NOT FOUND OR v_plan.price IS NULL OR v_plan.currency IS NULL
     OR v_plan.duration_days IS NULL THEN
    RAISE EXCEPTION 'Plan not available/configured' USING ERRCODE='22023';
  END IF;
  IF EXISTS (SELECT 1 FROM public.business_subscriptions s
    WHERE s.business_id=p_business_id AND s.kind='paid' AND s.status='pending') THEN
    RAISE EXCEPTION 'An existing paid subscription request is pending' USING ERRCODE='23505';
  END IF;
  v_snapshot := jsonb_build_object(
    'code',v_plan.code,'name',v_plan.name,'price',v_plan.price,
    'currency',v_plan.currency,'duration_days',v_plan.duration_days,
    'feature_limits',v_plan.feature_limits
  );
  INSERT INTO public.business_subscriptions(
    business_id,plan_id,kind,status,plan_snapshot,requested_by_user_id
  ) VALUES (p_business_id,v_plan.id,'paid','pending',v_snapshot,v_actor)
  RETURNING id INTO v_id;
  INSERT INTO wow_private.billing_events(business_id,actor_user_id,action,target_type,target_id)
  VALUES (p_business_id,v_actor,'paid_requested','subscription',v_id);
  RETURN v_id;
END;
$$;


ALTER FUNCTION "wow_private"."request_paid_subscription_internal"("p_business_id" "uuid", "p_plan_code" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "wow_private"."resubmit_verification_internal"("p_verification_id" "uuid", "p_evidence_refs" "jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_user_id TEXT := (SELECT auth.jwt() ->> 'sub');
  v_business_id UUID;
  v_branch_id UUID;
  v_status TEXT;
BEGIN
  IF (SELECT auth.jwt() ->> 'role') IS DISTINCT FROM 'authenticated' THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;
  SELECT v.business_id, v.branch_id INTO v_business_id, v_branch_id
  FROM public.business_verifications v WHERE v.id = p_verification_id;
  IF v_business_id IS NULL THEN
    RAISE EXCEPTION 'Verification not found' USING ERRCODE = '22023';
  END IF;
  PERFORM 1 FROM public.businesses b WHERE b.id = v_business_id FOR UPDATE;
  IF NOT wow_private.is_business_owner(v_business_id) THEN
    RAISE EXCEPTION 'Business owner access required' USING ERRCODE = '42501';
  END IF;
  PERFORM 1 FROM public.business_branches br
  WHERE br.id = v_branch_id AND br.business_id = v_business_id FOR UPDATE;
  SELECT v.status INTO v_status
  FROM public.business_verifications v WHERE v.id = p_verification_id FOR UPDATE;
  IF v_status <> 'needs_info' THEN
    RAISE EXCEPTION 'Only needs_info cases can be resubmitted' USING ERRCODE = '22023';
  END IF;
  PERFORM wow_private.validate_evidence_refs(p_evidence_refs, v_business_id, v_user_id);
  UPDATE public.business_verifications
  SET status = 'submitted', evidence_refs = p_evidence_refs,
      requested_by_user_id = v_user_id, submitted_at = now(), merchant_feedback = NULL
  WHERE id = p_verification_id;
  INSERT INTO wow_private.verification_submissions(
    verification_id, submitted_by_user_id, evidence_refs
  ) VALUES (p_verification_id, v_user_id, p_evidence_refs);
  RETURN p_verification_id;
END;
$$;


ALTER FUNCTION "wow_private"."resubmit_verification_internal"("p_verification_id" "uuid", "p_evidence_refs" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "wow_private"."save_business_internal"("p_business_id" "uuid", "p_save" boolean) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE v_user TEXT;
BEGIN
  v_user := wow_private.current_active_customer_id();
  IF p_business_id IS NULL OR p_save IS NULL THEN
    RAISE EXCEPTION 'Business and save flag are required' USING ERRCODE='22023';
  END IF;
  IF p_save THEN
    IF NOT wow_private.can_save_business(p_business_id) THEN
      RAISE EXCEPTION 'Business is not eligible for a new favorite' USING ERRCODE='22023';
    END IF;
    INSERT INTO public.saved_businesses(user_id,business_id) VALUES(v_user,p_business_id)
      ON CONFLICT (user_id,business_id) DO NOTHING;
  ELSE
    DELETE FROM public.saved_businesses WHERE user_id=v_user AND business_id=p_business_id;
  END IF;
  RETURN p_save;
END;
$$;


ALTER FUNCTION "wow_private"."save_business_internal"("p_business_id" "uuid", "p_save" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "wow_private"."save_offer_draft_internal"("p_offer_id" "uuid", "p_payload" "jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_business_id UUID;
  v_version_id UUID;
  v_next_no INTEGER;
  v_user_id TEXT := (SELECT auth.jwt() ->> 'sub');
  v_item JSONB;
  v_attribute JSONB;
  v_branch JSONB;
  v_item_id UUID;
  v_branch_id UUID;
  v_i INTEGER := 0;
  v_j INTEGER;
  v_allowed_keys TEXT[] := ARRAY[
    'title','description','offer_kind','original_price','final_price',
    'currency','benefit_details','mandatory_fees','terms',
    'stock_or_condition_notice','starts_at','ends_at','items','branches'
  ];
BEGIN
  IF p_payload IS NULL OR jsonb_typeof(p_payload) <> 'object' THEN
    RAISE EXCEPTION 'Draft payload must be an object' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (
    SELECT 1 FROM jsonb_object_keys(p_payload) AS x(k)
    WHERE NOT (x.k = ANY(v_allowed_keys))
  ) THEN
    RAISE EXCEPTION 'Unknown draft field' USING ERRCODE = '22023';
  END IF;
  IF jsonb_typeof(p_payload->'items') IS DISTINCT FROM 'array'
     OR jsonb_typeof(p_payload->'branches') IS DISTINCT FROM 'array'
     OR jsonb_array_length(p_payload->'items') NOT BETWEEN 1 AND 50
     OR jsonb_array_length(p_payload->'branches') NOT BETWEEN 1 AND 50 THEN
    RAISE EXCEPTION 'Draft requires 1-50 items and 1-50 branches' USING ERRCODE = '22023';
  END IF;
  SELECT business_id INTO v_business_id
    FROM public.offers WHERE id = p_offer_id FOR UPDATE;
  IF v_business_id IS NULL
     OR NOT wow_private.can_manage_offer_business(v_business_id,'draft') THEN
    RAISE EXCEPTION 'Offer drafting permission required' USING ERRCODE = '42501';
  END IF;
  SELECT id INTO v_version_id FROM public.offer_versions
    WHERE offer_id = p_offer_id AND review_status = 'draft' FOR UPDATE;
  IF v_version_id IS NULL THEN
    SELECT COALESCE(MAX(version_no),0) + 1 INTO v_next_no
    FROM public.offer_versions WHERE offer_id = p_offer_id;
    INSERT INTO public.offer_versions(business_id,offer_id,version_no,created_by_user_id)
      VALUES (v_business_id,p_offer_id,v_next_no,v_user_id) RETURNING id INTO v_version_id;
  ELSE
    -- Delete descendants first, and then replace draft content.
    DELETE FROM public.offer_item_attributes a USING public.offer_items i
      WHERE a.offer_item_id = i.id AND i.offer_version_id = v_version_id;
    DELETE FROM public.offer_media WHERE offer_version_id = v_version_id;
    DELETE FROM public.offer_items WHERE offer_version_id = v_version_id;
    DELETE FROM public.offer_branches WHERE offer_version_id = v_version_id;
  END IF;
  UPDATE public.offer_versions SET
    title = NULLIF(btrim(p_payload->>'title'),''),
    description = NULLIF(btrim(p_payload->>'description'),''),
    offer_kind = NULLIF(btrim(p_payload->>'offer_kind'),''),
    original_price = NULLIF(p_payload->>'original_price','')::NUMERIC,
    final_price = NULLIF(p_payload->>'final_price','')::NUMERIC,
    currency = NULLIF(btrim(p_payload->>'currency'),''),
    benefit_details = NULLIF(btrim(p_payload->>'benefit_details'),''),
    mandatory_fees = NULLIF(btrim(p_payload->>'mandatory_fees'),''),
    terms = NULLIF(btrim(p_payload->>'terms'),''),
    stock_or_condition_notice = NULLIF(btrim(p_payload->>'stock_or_condition_notice'),''),
    starts_at = NULLIF(p_payload->>'starts_at','')::TIMESTAMPTZ,
    ends_at = NULLIF(p_payload->>'ends_at','')::TIMESTAMPTZ
  WHERE id = v_version_id;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_payload->'items') LOOP
    IF jsonb_typeof(v_item) <> 'object'
       OR (v_item->>'name') IS NULL
       OR (v_item->>'item_type') IS NULL
       OR (v_item ? 'attributes' AND jsonb_typeof(v_item->'attributes') <> 'array') THEN
      RAISE EXCEPTION 'Invalid offer item' USING ERRCODE = '22023';
    END IF;
    IF (v_item ? 'attributes') AND jsonb_array_length(v_item->'attributes') > 20 THEN
      RAISE EXCEPTION 'Too many item attributes' USING ERRCODE = '22023';
    END IF;
    INSERT INTO public.offer_items(
      offer_version_id,item_type,name,description,brand,model,
      quantity,unit,reference_value,sort_order
    ) VALUES (
      v_version_id,v_item->>'item_type',btrim(v_item->>'name'),
      NULLIF(btrim(v_item->>'description'),''),NULLIF(btrim(v_item->>'brand'),''),
      NULLIF(btrim(v_item->>'model'),''),
      COALESCE(NULLIF(v_item->>'quantity','')::NUMERIC,1),
      COALESCE(NULLIF(btrim(v_item->>'unit'),''),'piece'),
      NULLIF(v_item->>'reference_value','')::NUMERIC,v_i
    ) RETURNING id INTO v_item_id;
    v_j := 0;
    FOR v_attribute IN
      SELECT value FROM jsonb_array_elements(COALESCE(v_item->'attributes','[]'::jsonb))
    LOOP
      IF jsonb_typeof(v_attribute) <> 'object' THEN
        RAISE EXCEPTION 'Invalid item attribute' USING ERRCODE = '22023';
      END IF;
      INSERT INTO public.offer_item_attributes(offer_item_id,name,value,sort_order)
      VALUES (v_item_id,btrim(v_attribute->>'name'),btrim(v_attribute->>'value'),v_j);
      v_j := v_j + 1;
    END LOOP;
    v_i := v_i + 1;
  END LOOP;

  FOR v_branch IN SELECT value FROM jsonb_array_elements(p_payload->'branches') LOOP
    IF jsonb_typeof(v_branch) <> 'string' THEN
      RAISE EXCEPTION 'Branch IDs must be strings' USING ERRCODE = '22023';
    END IF;
    v_branch_id := (v_branch #>> '{}')::UUID;
    IF NOT EXISTS (
      SELECT 1 FROM public.business_branches b
      WHERE b.id = v_branch_id AND b.business_id = v_business_id
    ) THEN
      RAISE EXCEPTION 'Branch does not belong to offer business' USING ERRCODE = '42501';
    END IF;
    INSERT INTO public.offer_branches(business_id,offer_version_id,branch_id)
      VALUES(v_business_id,v_version_id,v_branch_id);
  END LOOP;
  RETURN v_version_id;
END;
$$;


ALTER FUNCTION "wow_private"."save_offer_draft_internal"("p_offer_id" "uuid", "p_payload" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "wow_private"."save_offer_internal"("p_offer_id" "uuid", "p_save" boolean) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE v_user TEXT;
BEGIN
  v_user := wow_private.current_active_customer_id();
  IF p_offer_id IS NULL OR p_save IS NULL THEN
    RAISE EXCEPTION 'Offer and save flag are required' USING ERRCODE='22023';
  END IF;
  IF p_save THEN
    IF NOT wow_private.can_save_offer(p_offer_id) THEN
      RAISE EXCEPTION 'Offer is not eligible for a new favorite' USING ERRCODE='22023';
    END IF;
    INSERT INTO public.saved_offers(user_id,offer_id) VALUES(v_user,p_offer_id)
      ON CONFLICT (user_id,offer_id) DO NOTHING;
  ELSE
    DELETE FROM public.saved_offers WHERE user_id=v_user AND offer_id=p_offer_id;
  END IF;
  RETURN p_save;
END;
$$;


ALTER FUNCTION "wow_private"."save_offer_internal"("p_offer_id" "uuid", "p_save" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "wow_private"."set_branch_pause_internal"("p_branch_id" "uuid", "p_pause" boolean) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE v_business UUID;v_actor TEXT:=(SELECT auth.jwt()->>'sub');
BEGIN
  SELECT business_id INTO v_business FROM public.business_branches WHERE id=p_branch_id;
  IF v_business IS NULL THEN
    RAISE EXCEPTION 'Branch not found' USING ERRCODE='22023';
  END IF;
  PERFORM 1 FROM public.businesses WHERE id=v_business FOR UPDATE;
  PERFORM 1 FROM public.business_branches WHERE id=p_branch_id FOR UPDATE;
  IF p_pause IS NULL OR NOT wow_private.is_business_owner(v_business) THEN
    RAISE EXCEPTION 'Owner and boolean pause required' USING ERRCODE='42501';
  END IF;
  UPDATE public.business_branches SET is_paused=p_pause,
    paused_at=CASE WHEN p_pause THEN COALESCE(paused_at,now()) ELSE NULL END
    WHERE id=p_branch_id AND is_paused IS DISTINCT FROM p_pause;
  IF FOUND THEN
    INSERT INTO wow_private.merchant_operation_events(business_id,actor_user_id,operation,target_id,metadata)
    VALUES(v_business,v_actor,'branch_pause',p_branch_id::text,jsonb_build_object('paused',p_pause));
  END IF;
  RETURN true;
END; $$;


ALTER FUNCTION "wow_private"."set_branch_pause_internal"("p_branch_id" "uuid", "p_pause" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "wow_private"."set_business_pause_internal"("p_business_id" "uuid", "p_pause" boolean) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE v_actor TEXT:=(SELECT auth.jwt()->>'sub');
BEGIN
  PERFORM 1 FROM public.businesses WHERE id=p_business_id FOR UPDATE;
  IF p_pause IS NULL OR NOT wow_private.is_business_owner(p_business_id) THEN
    RAISE EXCEPTION 'Owner and boolean pause required' USING ERRCODE='42501';
  END IF;
  UPDATE public.businesses SET is_paused=p_pause,
    paused_at=CASE WHEN p_pause THEN COALESCE(paused_at,now()) ELSE NULL END
    WHERE id=p_business_id AND is_paused IS DISTINCT FROM p_pause;
  IF FOUND THEN
    INSERT INTO wow_private.merchant_operation_events(business_id,actor_user_id,operation,target_id,metadata)
    VALUES(p_business_id,v_actor,'business_pause',p_business_id::text,jsonb_build_object('paused',p_pause));
  END IF;
  RETURN true;
END; $$;


ALTER FUNCTION "wow_private"."set_business_pause_internal"("p_business_id" "uuid", "p_pause" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "wow_private"."set_employee_access_internal"("p_business_id" "uuid", "p_user_id" "text", "p_action" "text", "p_permissions" "jsonb", "p_branch_ids" "uuid"[]) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_actor TEXT := (SELECT auth.jwt()->>'sub');
  v_member_id UUID;
  v_existing_role TEXT;
  v_existing_status TEXT;
  v_draft BOOLEAN;v_submit BOOLEAN;v_pause BOOLEAN;v_monitor BOOLEAN;
  v_bid UUID;
  v_count INTEGER;
  v_operation TEXT;
BEGIN
  -- Serialize concurrent membership edits for this business.
  PERFORM 1 FROM public.businesses WHERE id=p_business_id FOR UPDATE;
  IF NOT wow_private.is_business_owner(p_business_id) THEN
    RAISE EXCEPTION 'Owner authorization required' USING ERRCODE='42501';
  END IF;
  IF p_action IS NULL OR p_action NOT IN ('grant','update','revoke') THEN
    RAISE EXCEPTION 'Invalid employee action' USING ERRCODE='22023';
  END IF;
  IF p_user_id IS NULL OR p_user_id=v_actor OR NOT EXISTS(
    SELECT 1 FROM public.users u WHERE u.id=p_user_id
      AND u.account_status='active' AND u.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Target must be another active synced user' USING ERRCODE='22023';
  END IF;
  SELECT id,role,status INTO v_member_id,v_existing_role,v_existing_status
  FROM public.business_members WHERE business_id=p_business_id AND user_id=p_user_id
  FOR UPDATE;
  IF v_existing_role='owner' THEN
    RAISE EXCEPTION 'Owner membership cannot be changed' USING ERRCODE='42501';
  END IF;

  IF p_action='revoke' THEN
    IF v_member_id IS NULL OR v_existing_status <> 'active' THEN
      RAISE EXCEPTION 'Active employee membership required' USING ERRCODE='22023';
    END IF;
    DELETE FROM public.business_member_branches WHERE member_id=v_member_id;
    UPDATE public.business_members SET status='revoked',revoked_at=now(),
      can_draft=false,can_submit=false,can_pause=false,can_monitor=false
      WHERE id=v_member_id;
    v_operation:='employee_revoke';
  ELSE
    IF p_permissions IS NULL OR jsonb_typeof(p_permissions)<>'object'
      OR (SELECT COUNT(*) FROM jsonb_object_keys(p_permissions) AS x(k))<>4
      OR EXISTS(SELECT 1 FROM jsonb_object_keys(p_permissions) AS x(k)
        WHERE k NOT IN ('can_draft','can_submit','can_pause','can_monitor'))
      OR EXISTS(SELECT 1 FROM jsonb_each(p_permissions) AS x(k,v)
        WHERE jsonb_typeof(v)<>'boolean') THEN
      RAISE EXCEPTION 'Four explicit boolean permissions required' USING ERRCODE='22023';
    END IF;
    IF p_branch_ids IS NULL OR cardinality(p_branch_ids) NOT BETWEEN 1 AND 100
      OR array_position(p_branch_ids,NULL) IS NOT NULL
      OR (SELECT COUNT(DISTINCT x.branch_id) FROM unnest(p_branch_ids) AS x(branch_id))<>cardinality(p_branch_ids) THEN
      RAISE EXCEPTION 'Provide 1-100 distinct non-null branch IDs' USING ERRCODE='22023';
    END IF;
    SELECT COUNT(*) INTO v_count FROM public.business_branches br
      WHERE br.id=ANY(p_branch_ids) AND br.business_id=p_business_id;
    IF v_count<>cardinality(p_branch_ids) THEN
      RAISE EXCEPTION 'All branch IDs must belong to the same business' USING ERRCODE='42501';
    END IF;
    v_draft:=(p_permissions->>'can_draft')::boolean;
    v_submit:=(p_permissions->>'can_submit')::boolean;
    v_pause:=(p_permissions->>'can_pause')::boolean;
    v_monitor:=(p_permissions->>'can_monitor')::boolean;
    IF p_action='grant' AND v_existing_status='active' THEN
      RAISE EXCEPTION 'Employee already active: use update' USING ERRCODE='22023';
    END IF;
    IF p_action='update' AND (v_member_id IS NULL OR v_existing_status<>'active') THEN
      RAISE EXCEPTION 'Active employee membership required to update' USING ERRCODE='22023';
    END IF;
    IF v_member_id IS NULL THEN
      INSERT INTO public.business_members(
        business_id,user_id,role,status,can_draft,can_submit,can_pause,can_monitor,
        granted_by_user_id
      ) VALUES (p_business_id,p_user_id,'employee','active',
        v_draft,v_submit,v_pause,v_monitor,v_actor)
      RETURNING id INTO v_member_id;
    ELSE
      UPDATE public.business_members SET status='active',revoked_at=NULL,
        can_draft=v_draft,can_submit=v_submit,can_pause=v_pause,can_monitor=v_monitor,
        granted_by_user_id=v_actor
        WHERE id=v_member_id;
      DELETE FROM public.business_member_branches WHERE member_id=v_member_id;
    END IF;
    INSERT INTO public.business_member_branches(business_id,member_id,branch_id)
      SELECT p_business_id,v_member_id,x FROM unnest(p_branch_ids) AS x;
    v_operation:=CASE WHEN p_action='grant' THEN 'employee_grant' ELSE 'employee_update' END;
  END IF;

  INSERT INTO wow_private.merchant_operation_events(
    business_id,actor_user_id,operation,target_id,metadata
  ) VALUES (p_business_id,v_actor,v_operation,v_member_id::text,
    jsonb_build_object('employee_user_id',p_user_id,'branch_count',
      COALESCE(cardinality(p_branch_ids),0)));
  RETURN v_member_id;
END; $$;


ALTER FUNCTION "wow_private"."set_employee_access_internal"("p_business_id" "uuid", "p_user_id" "text", "p_action" "text", "p_permissions" "jsonb", "p_branch_ids" "uuid"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "wow_private"."set_offer_availability_internal"("p_offer_id" "uuid", "p_available" boolean, "p_paused" boolean) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE v_business UUID;v_status TEXT;v_current UUID;
BEGIN
  SELECT business_id,status,current_version_id
    INTO v_business,v_status,v_current
  FROM public.offers WHERE id=p_offer_id FOR UPDATE;
  IF v_business IS NULL
     OR NOT wow_private.can_manage_offer_business(v_business,'pause') THEN
    RAISE EXCEPTION 'Offer management permission required' USING ERRCODE='42501';
  END IF;
  IF v_current IS NULL OR v_status NOT IN ('active','paused') THEN
    RAISE EXCEPTION 'Only approved offers can be paused or resumed' USING ERRCODE='22023';
  END IF;
  IF NOT wow_private.can_read_offer_version(v_current) THEN
    RAISE EXCEPTION 'Offer includes branches outside employee scope'
      USING ERRCODE='42501';
  END IF;
  IF p_available IS NULL OR p_paused IS NULL THEN
    RAISE EXCEPTION 'Availability and pause flags required' USING ERRCODE='22023';
  END IF;
  UPDATE public.offers SET merchant_available=p_available,
    status=CASE WHEN p_paused THEN 'paused' ELSE 'active' END
  WHERE id=p_offer_id;
  RETURN p_offer_id;
END;
$$;


ALTER FUNCTION "wow_private"."set_offer_availability_internal"("p_offer_id" "uuid", "p_available" boolean, "p_paused" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "wow_private"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "wow_private"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "wow_private"."storage_active_user_id"() RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  SELECT u.id FROM public.users AS u
  WHERE u.id = (SELECT auth.jwt()->>'sub')
    AND (SELECT auth.jwt()->>'role') = 'authenticated'
    AND u.account_status = 'active' AND u.deleted_at IS NULL
$$;


ALTER FUNCTION "wow_private"."storage_active_user_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "wow_private"."storage_safe_key"("p_key" "text", "p_documents" boolean) RETURNS boolean
    LANGUAGE "sql" IMMUTABLE
    SET "search_path" TO ''
    AS $_$
  SELECT p_key IS NOT NULL AND length(p_key) BETWEEN 12 AND 512
    AND p_key ~ '^[A-Za-z0-9_/-]+\.(jpg|jpeg|png|webp|pdf)$'
    AND p_key !~ '(^/|//|/\./|/\.\./|\.\.|/$)'
    AND (p_documents OR p_key ~ '\.(jpg|jpeg|png|webp)$')
$_$;


ALTER FUNCTION "wow_private"."storage_safe_key"("p_key" "text", "p_documents" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "wow_private"."submit_complaint_internal"("p_offer_id" "uuid", "p_offer_version_id" "uuid", "p_branch_id" "uuid", "p_complaint_type" "text", "p_description" "text", "p_incident_at" timestamp with time zone, "p_private_evidence_keys" "jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE v_user TEXT; v_id UUID; v_version UUID; v_business UUID;
BEGIN
  v_user := wow_private.current_active_customer_id();
  IF p_complaint_type IS NULL OR p_complaint_type NOT IN
     ('price_mismatch','unavailable','misleading_terms',
      'product_mismatch','business_conduct','other')
     OR p_description IS NULL OR char_length(btrim(p_description)) NOT BETWEEN 15 AND 4000
     OR p_private_evidence_keys IS DISTINCT FROM '[]'::jsonb
     OR (p_incident_at IS NOT NULL AND p_incident_at > now()+INTERVAL '5 minutes') THEN
    RAISE EXCEPTION 'Invalid complaint; evidence uploads are not enabled yet'
      USING ERRCODE='22023';
  END IF;
  SELECT o.business_id,COALESCE(p_offer_version_id,o.current_version_id)
  INTO v_business,v_version
  FROM public.offers o WHERE o.id=p_offer_id;
  IF v_business IS NULL OR v_version IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.offer_versions v
    WHERE v.id=v_version AND v.offer_id=p_offer_id AND v.review_status='approved'
  ) THEN
    RAISE EXCEPTION 'Complaint must reference an approved version of this offer'
      USING ERRCODE='22023';
  END IF;
  IF p_branch_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.offer_branches ob
    WHERE ob.offer_version_id=v_version AND ob.business_id=v_business
      AND ob.branch_id=p_branch_id
  ) THEN
    RAISE EXCEPTION 'Branch does not belong to the selected offer version'
      USING ERRCODE='22023';
  END IF;
  INSERT INTO public.complaints(
    user_id,offer_id,offer_version_id,branch_id,complaint_type,
    description,incident_at,private_evidence_keys
  ) VALUES (
    v_user,p_offer_id,v_version,p_branch_id,p_complaint_type,
    btrim(p_description),p_incident_at,'[]'::jsonb
  ) RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;


ALTER FUNCTION "wow_private"."submit_complaint_internal"("p_offer_id" "uuid", "p_offer_version_id" "uuid", "p_branch_id" "uuid", "p_complaint_type" "text", "p_description" "text", "p_incident_at" timestamp with time zone, "p_private_evidence_keys" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "wow_private"."submit_offer_internal"("p_offer_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE v_business UUID; v_version UUID; v_status TEXT; v_offer_status TEXT;
BEGIN
  SELECT business_id,status INTO v_business,v_offer_status
    FROM public.offers WHERE id=p_offer_id FOR UPDATE;
  IF v_business IS NULL OR NOT wow_private.can_manage_offer_business(v_business,'submit') THEN
    RAISE EXCEPTION 'Offer submission permission required' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.businesses
       WHERE id=v_business AND status='approved') THEN
    RAISE EXCEPTION 'Business must be approved to submit offers' USING ERRCODE = '22023';
  END IF;
  SELECT id INTO v_version FROM public.offer_versions
    WHERE offer_id=p_offer_id AND review_status='draft' FOR UPDATE;
  IF v_version IS NULL OR EXISTS (
    SELECT 1 FROM public.offer_versions
    WHERE offer_id=p_offer_id AND review_status='pending'
  ) THEN
    RAISE EXCEPTION 'One completed draft and no pending review required' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.offer_versions v
    WHERE v.id=v_version AND v.title IS NOT NULL AND v.offer_kind IS NOT NULL
      AND v.final_price IS NOT NULL AND v.currency IS NOT NULL
      AND v.starts_at IS NOT NULL AND v.ends_at IS NOT NULL
      AND v.ends_at > v.starts_at
      AND (v.original_price IS NULL OR v.original_price >= v.final_price)
  ) OR NOT EXISTS (SELECT 1 FROM public.offer_items WHERE offer_version_id=v_version)
     OR NOT EXISTS (SELECT 1 FROM public.offer_branches WHERE offer_version_id=v_version)
     OR EXISTS (
       SELECT 1 FROM public.offer_branches ob
       JOIN public.business_branches b ON b.id=ob.branch_id
       WHERE ob.offer_version_id=v_version
         AND (b.business_id<>v_business OR b.status <> 'approved')
     ) THEN
    RAISE EXCEPTION 'Incomplete offer or unapproved branch' USING ERRCODE = '22023';
  END IF;
  UPDATE public.offer_versions
    SET review_status='pending',submitted_at=now()
    WHERE id=v_version;
  -- A revision never hides an already approved current version.
  IF NOT EXISTS (SELECT 1 FROM public.offers WHERE id=p_offer_id AND current_version_id IS NOT NULL) THEN
    UPDATE public.offers SET status='pending' WHERE id=p_offer_id;
  END IF;
  RETURN v_version;
END;
$$;


ALTER FUNCTION "wow_private"."submit_offer_internal"("p_offer_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "wow_private"."submit_profile_revision_internal"("p_business_id" "uuid", "p_branch_id" "uuid", "p_patch" "jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE v_bs TEXT;v_br TEXT;v_id UUID;v_actor TEXT:=(SELECT auth.jwt()->>'sub');
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
  INSERT INTO public.business_profile_revisions(
    business_id,branch_id,patch,requested_by_user_id
  ) VALUES (p_business_id,p_branch_id,p_patch,v_actor) RETURNING id INTO v_id;
  INSERT INTO wow_private.merchant_operation_events(business_id,actor_user_id,operation,target_id,metadata)
  VALUES(p_business_id,v_actor,'profile_revision_submit',v_id::text,
    jsonb_build_object('branch_id',p_branch_id,'changed_fields',
      (SELECT jsonb_agg(x.k ORDER BY x.k) FROM jsonb_object_keys(p_patch) AS x(k))));
  RETURN v_id;
END; $$;


ALTER FUNCTION "wow_private"."submit_profile_revision_internal"("p_business_id" "uuid", "p_branch_id" "uuid", "p_patch" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "wow_private"."submit_subscription_payment_internal"("p_subscription_id" "uuid", "p_method" "text", "p_reference" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE v_actor TEXT; v_sub public.business_subscriptions%ROWTYPE;
  v_id UUID; v_method TEXT := lower(btrim(p_method)); v_reference TEXT := btrim(p_reference);
BEGIN
  SELECT * INTO v_sub FROM public.business_subscriptions WHERE id=p_subscription_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Subscription not found' USING ERRCODE='22023'; END IF;
  v_actor := wow_private.assert_billing_owner(v_sub.business_id);
  PERFORM 1 FROM public.businesses WHERE id=v_sub.business_id FOR UPDATE;
  SELECT * INTO v_sub FROM public.business_subscriptions WHERE id=p_subscription_id FOR UPDATE;
  IF v_sub.kind<>'paid' OR v_sub.status<>'pending' THEN
    RAISE EXCEPTION 'Only pending paid subscriptions accept payment submissions'
      USING ERRCODE='22023';
  END IF;
  IF v_method NOT IN ('cash','bank_transfer','wallet','other')
     OR v_reference IS NULL OR char_length(v_reference) NOT BETWEEN 4 AND 160 THEN
    RAISE EXCEPTION 'Valid payment method/reference required' USING ERRCODE='22023';
  END IF;
  IF EXISTS (SELECT 1 FROM public.subscription_payments p
    WHERE p.subscription_id=p_subscription_id AND p.status='submitted') THEN
    RAISE EXCEPTION 'A payment submission is already waiting for review' USING ERRCODE='23505';
  END IF;
  INSERT INTO public.subscription_payments(
    subscription_id,amount,currency,method,reference,submitted_by_user_id
  ) VALUES (
    p_subscription_id,(v_sub.plan_snapshot->>'price')::numeric,
    v_sub.plan_snapshot->>'currency',v_method,v_reference,v_actor
  ) RETURNING id INTO v_id;
  INSERT INTO wow_private.billing_events(business_id,actor_user_id,action,target_type,target_id)
  VALUES (v_sub.business_id,v_actor,'payment_submitted','payment',v_id);
  RETURN v_id;
END;
$$;


ALTER FUNCTION "wow_private"."submit_subscription_payment_internal"("p_subscription_id" "uuid", "p_method" "text", "p_reference" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "wow_private"."submit_verification_internal"("p_business_id" "uuid", "p_branch_id" "uuid", "p_request_type" "text", "p_evidence_refs" "jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_user_id TEXT := (SELECT auth.jwt() ->> 'sub');
  v_business_status TEXT;
  v_branch_status TEXT;
  v_is_primary BOOLEAN;
  v_case_id UUID;
BEGIN
  IF (SELECT auth.jwt() ->> 'role') IS DISTINCT FROM 'authenticated'
     OR v_user_id IS NULL
     OR NOT EXISTS (
       SELECT 1 FROM public.users u
       WHERE u.id = v_user_id AND u.account_status = 'active' AND u.deleted_at IS NULL
     ) THEN
    RAISE EXCEPTION 'Active authenticated account required' USING ERRCODE = '42501';
  END IF;

  SELECT b.status INTO v_business_status
  FROM public.businesses b WHERE b.id = p_business_id FOR UPDATE;
  IF v_business_status IS NULL OR NOT wow_private.is_business_owner(p_business_id) THEN
    RAISE EXCEPTION 'Business owner access required' USING ERRCODE = '42501';
  END IF;
  SELECT br.status, br.is_primary INTO v_branch_status, v_is_primary
  FROM public.business_branches br
  WHERE br.business_id = p_business_id AND br.id = p_branch_id FOR UPDATE;

  IF p_request_type = 'initial' THEN
    IF v_business_status NOT IN ('draft', 'rejected')
       OR v_branch_status NOT IN ('draft', 'rejected')
       OR v_is_primary IS DISTINCT FROM true THEN
      RAISE EXCEPTION 'Initial verification requires a draft/rejected business and its primary branch'
        USING ERRCODE = '22023';
    END IF;
  ELSIF p_request_type = 'branch_addition' THEN
    IF v_business_status <> 'approved'
       OR v_branch_status NOT IN ('draft', 'rejected') THEN
      RAISE EXCEPTION 'New branch review requires an approved business and draft/rejected branch'
        USING ERRCODE = '22023';
    END IF;
  ELSE
    RAISE EXCEPTION 'Unsupported verification type' USING ERRCODE = '22023';
  END IF;

  PERFORM wow_private.validate_evidence_refs(p_evidence_refs, p_business_id, v_user_id);

  IF EXISTS (
    SELECT 1 FROM public.business_verifications v
    WHERE v.business_id = p_business_id AND v.status IN ('submitted', 'needs_info')
      AND (v.request_type = 'initial' AND p_request_type = 'initial'
        OR v.branch_id = p_branch_id)
  ) THEN
    RAISE EXCEPTION 'An open verification already exists for this target'
      USING ERRCODE = '23505';
  END IF;

  INSERT INTO public.business_verifications (
    business_id, branch_id, request_type, status, requested_by_user_id,
    evidence_refs, submitted_at
  ) VALUES (
    p_business_id, p_branch_id, p_request_type, 'submitted', v_user_id,
    p_evidence_refs, now()
  ) RETURNING id INTO v_case_id;

  INSERT INTO wow_private.verification_submissions(
    verification_id, submitted_by_user_id, evidence_refs
  ) VALUES (v_case_id, v_user_id, p_evidence_refs);

  IF p_request_type = 'initial' THEN
    UPDATE public.businesses
    SET status = 'pending_review', submitted_at = now()
    WHERE id = p_business_id;
  END IF;
  UPDATE public.business_branches
  SET status = 'pending_review'
  WHERE id = p_branch_id AND business_id = p_business_id;

  RETURN v_case_id;
END;
$$;


ALTER FUNCTION "wow_private"."submit_verification_internal"("p_business_id" "uuid", "p_branch_id" "uuid", "p_request_type" "text", "p_evidence_refs" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "wow_private"."update_merchant_draft_internal"("p_business_id" "uuid", "p_branch_id" "uuid", "p_patch" "jsonb") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE v_bs TEXT;v_br TEXT;v_actor TEXT:=(SELECT auth.jwt()->>'sub');
BEGIN
  SELECT status INTO v_bs FROM public.businesses WHERE id=p_business_id FOR UPDATE;
  IF v_bs IS NULL OR NOT wow_private.is_business_owner(p_business_id)
     OR v_bs='suspended' THEN
    RAISE EXCEPTION 'Active owner of nonsuspended business required' USING ERRCODE='42501';
  END IF;
  IF p_branch_id IS NULL THEN
    IF v_bs NOT IN ('draft','rejected') THEN
      RAISE EXCEPTION 'Approved/pending business needs profile review' USING ERRCODE='22023';
    END IF;
  ELSE
    SELECT status INTO v_br FROM public.business_branches
      WHERE id=p_branch_id AND business_id=p_business_id FOR UPDATE;
    IF v_br IS NULL OR v_br NOT IN ('draft','rejected') THEN
      RAISE EXCEPTION 'Only draft/rejected branches may be edited directly' USING ERRCODE='22023';
    END IF;
  END IF;
  PERFORM wow_private.apply_merchant_profile_patch(p_business_id,p_branch_id,p_patch);
  INSERT INTO wow_private.merchant_operation_events(business_id,actor_user_id,operation,target_id,metadata)
  VALUES(p_business_id,v_actor,
    CASE WHEN p_branch_id IS NULL THEN 'business_draft_update' ELSE 'branch_draft_update' END,
    COALESCE(p_branch_id,p_business_id)::text,jsonb_build_object('changed_fields',
      (SELECT jsonb_agg(x.k ORDER BY x.k) FROM jsonb_object_keys(p_patch) AS x(k))));
  RETURN true;
END; $$;


ALTER FUNCTION "wow_private"."update_merchant_draft_internal"("p_business_id" "uuid", "p_branch_id" "uuid", "p_patch" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "wow_private"."validate_evidence_refs"("p_refs" "jsonb", "p_business_id" "uuid", "p_user_id" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_entry JSONB; v_key TEXT;
  v_prefix TEXT:='business-verifications/' || p_business_id::text || '/' || p_user_id || '/';
BEGIN
  IF p_refs IS NULL OR jsonb_typeof(p_refs) IS DISTINCT FROM 'array'
    OR jsonb_array_length(p_refs) NOT BETWEEN 1 AND 12 THEN
    RAISE EXCEPTION 'Between 1 and 12 evidence keys required' USING ERRCODE='22023';
  END IF;
  FOR v_entry IN SELECT value FROM jsonb_array_elements(p_refs) LOOP
    IF jsonb_typeof(v_entry) IS DISTINCT FROM 'string' THEN
      RAISE EXCEPTION 'Evidence references must be strings' USING ERRCODE='22023';
    END IF;
    v_key:=v_entry #>> '{}';
    IF left(v_key,length(v_prefix)) IS DISTINCT FROM v_prefix
       OR NOT wow_private.storage_safe_key(v_key,true)
       OR NOT EXISTS (SELECT 1 FROM storage.objects obj
          WHERE obj.bucket_id='wow-verification-evidence' AND obj.name=v_key) THEN
      RAISE EXCEPTION 'Invalid or missing verification evidence object' USING ERRCODE='22023';
    END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "wow_private"."validate_evidence_refs"("p_refs" "jsonb", "p_business_id" "uuid", "p_user_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "wow_private"."validate_merchant_profile_patch"("p_patch" "jsonb", "p_branch" boolean) RETURNS "void"
    LANGUAGE "plpgsql" IMMUTABLE
    SET "search_path" TO ''
    AS $$
DECLARE v_key TEXT; v_value TEXT;
BEGIN
  IF p_patch IS NULL OR jsonb_typeof(p_patch)<>'object' OR p_patch='{}'::jsonb THEN
    RAISE EXCEPTION 'Nonempty profile patch object required' USING ERRCODE='22023';
  END IF;
  FOR v_key IN SELECT jsonb_object_keys(p_patch) LOOP
    IF (p_branch AND v_key NOT IN ('name','city','district','address_line','latitude','longitude'))
       OR (NOT p_branch AND v_key NOT IN ('name','description','contact_phone')) THEN
      RAISE EXCEPTION 'Unsupported profile field: %',v_key USING ERRCODE='22023';
    END IF;
    IF v_key IN ('latitude','longitude') THEN
      IF jsonb_typeof(p_patch->v_key) NOT IN ('number','null') THEN
        RAISE EXCEPTION 'Coordinates must be numeric or null' USING ERRCODE='22023';
      END IF;
      CONTINUE;
    END IF;
    IF jsonb_typeof(p_patch->v_key) NOT IN ('string','null') THEN
      RAISE EXCEPTION 'Profile text fields must be strings or null' USING ERRCODE='22023';
    END IF;
    v_value:=p_patch->>v_key;
    IF (v_key='name' AND (v_value IS NULL OR length(btrim(v_value)) NOT BETWEEN 2 AND 120))
      OR (v_key='city' AND (v_value IS NULL OR length(btrim(v_value)) NOT BETWEEN 2 AND 120))
      OR (v_key='address_line' AND (v_value IS NULL OR length(btrim(v_value)) NOT BETWEEN 5 AND 500))
      OR (v_key='district' AND length(v_value)>120)
      OR (v_key='description' AND length(v_value)>1200)
      OR (v_key='contact_phone' AND length(v_value)>35) THEN
      RAISE EXCEPTION 'Invalid profile field length/value: %',v_key USING ERRCODE='22023';
    END IF;
  END LOOP;
END; $$;


ALTER FUNCTION "wow_private"."validate_merchant_profile_patch"("p_patch" "jsonb", "p_branch" boolean) OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."business_branches" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "business_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "city" "text" NOT NULL,
    "district" "text",
    "address_line" "text" NOT NULL,
    "latitude" numeric(9,6),
    "longitude" numeric(9,6),
    "is_primary" boolean DEFAULT false NOT NULL,
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "approved_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_paused" boolean DEFAULT false NOT NULL,
    "paused_at" timestamp with time zone,
    CONSTRAINT "branch_approved_timestamp_ck" CHECK ((("status" <> 'approved'::"text") OR ("approved_at" IS NOT NULL))),
    CONSTRAINT "branch_coordinates_pair_ck" CHECK (((("latitude" IS NULL) AND ("longitude" IS NULL)) OR (("latitude" IS NOT NULL) AND ("longitude" IS NOT NULL)))),
    CONSTRAINT "branch_latitude_range_ck" CHECK ((("latitude" >= ('-90'::integer)::numeric) AND ("latitude" <= (90)::numeric))),
    CONSTRAINT "branch_longitude_range_ck" CHECK ((("longitude" >= ('-180'::integer)::numeric) AND ("longitude" <= (180)::numeric))),
    CONSTRAINT "branches_pause_consistency_ck" CHECK (("is_paused" = ("paused_at" IS NOT NULL))),
    CONSTRAINT "business_branches_address_line_check" CHECK ((("char_length"("btrim"("address_line")) >= 5) AND ("char_length"("btrim"("address_line")) <= 500))),
    CONSTRAINT "business_branches_city_check" CHECK ((("char_length"("btrim"("city")) >= 2) AND ("char_length"("btrim"("city")) <= 120))),
    CONSTRAINT "business_branches_district_check" CHECK ((("district" IS NULL) OR ("char_length"("district") <= 120))),
    CONSTRAINT "business_branches_name_check" CHECK ((("char_length"("btrim"("name")) >= 2) AND ("char_length"("btrim"("name")) <= 120))),
    CONSTRAINT "business_branches_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'pending_review'::"text", 'approved'::"text", 'rejected'::"text", 'suspended'::"text"])))
);


ALTER TABLE "public"."business_branches" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."business_categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "business_id" "uuid" NOT NULL,
    "category_id" "uuid" NOT NULL,
    "is_primary" boolean DEFAULT false NOT NULL,
    "approved_by_user_id" "text" NOT NULL,
    "approved_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."business_categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."business_member_branches" (
    "business_id" "uuid" NOT NULL,
    "member_id" "uuid" NOT NULL,
    "branch_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."business_member_branches" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."business_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "business_id" "uuid" NOT NULL,
    "user_id" "text" NOT NULL,
    "role" "text" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "can_draft" boolean DEFAULT false NOT NULL,
    "can_submit" boolean DEFAULT false NOT NULL,
    "can_pause" boolean DEFAULT false NOT NULL,
    "can_monitor" boolean DEFAULT false NOT NULL,
    "granted_by_user_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "revoked_at" timestamp with time zone,
    CONSTRAINT "business_member_revocation_ck" CHECK ((("status" = 'revoked'::"text") = ("revoked_at" IS NOT NULL))),
    CONSTRAINT "business_members_role_check" CHECK (("role" = ANY (ARRAY['owner'::"text", 'employee'::"text"]))),
    CONSTRAINT "business_members_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'revoked'::"text"]))),
    CONSTRAINT "business_owner_capabilities_ck" CHECK ((("role" <> 'owner'::"text") OR ("can_draft" AND "can_submit" AND "can_pause" AND "can_monitor")))
);


ALTER TABLE "public"."business_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."business_profile_revisions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "business_id" "uuid" NOT NULL,
    "branch_id" "uuid",
    "patch" "jsonb" NOT NULL,
    "status" "text" DEFAULT 'submitted'::"text" NOT NULL,
    "requested_by_user_id" "text" NOT NULL,
    "reviewed_by_user_id" "text",
    "review_reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "decided_at" timestamp with time zone,
    CONSTRAINT "business_profile_revisions_patch_check" CHECK ((("jsonb_typeof"("patch") = 'object'::"text") AND ("patch" <> '{}'::"jsonb"))),
    CONSTRAINT "business_profile_revisions_review_reason_check" CHECK ((("review_reason" IS NULL) OR ("char_length"("review_reason") <= 2000))),
    CONSTRAINT "business_profile_revisions_status_check" CHECK (("status" = ANY (ARRAY['submitted'::"text", 'approved'::"text", 'rejected'::"text"]))),
    CONSTRAINT "profile_review_consistency_ck" CHECK (((("status" = 'submitted'::"text") AND ("reviewed_by_user_id" IS NULL) AND ("decided_at" IS NULL)) OR (("status" = ANY (ARRAY['approved'::"text", 'rejected'::"text"])) AND ("reviewed_by_user_id" IS NOT NULL) AND ("decided_at" IS NOT NULL))))
);


ALTER TABLE "public"."business_profile_revisions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."business_subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "business_id" "uuid" NOT NULL,
    "plan_id" "uuid",
    "kind" "text" NOT NULL,
    "status" "text" NOT NULL,
    "starts_at" timestamp with time zone,
    "ends_at" timestamp with time zone,
    "plan_snapshot" "jsonb",
    "approved_by_user_id" "text",
    "approved_at" timestamp with time zone,
    "requested_by_user_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "business_subscriptions_active_period_ck" CHECK ((("status" <> ALL (ARRAY['active'::"text", 'expired'::"text"])) OR (("starts_at" IS NOT NULL) AND ("ends_at" IS NOT NULL)))),
    CONSTRAINT "business_subscriptions_kind_check" CHECK (("kind" = ANY (ARRAY['trial'::"text", 'paid'::"text"]))),
    CONSTRAINT "business_subscriptions_kind_ck" CHECK (((("kind" = 'trial'::"text") AND ("plan_id" IS NULL) AND ("plan_snapshot" IS NULL)) OR (("kind" = 'paid'::"text") AND ("plan_id" IS NOT NULL) AND ("plan_snapshot" IS NOT NULL)))),
    CONSTRAINT "business_subscriptions_paid_approval_ck" CHECK ((("kind" <> 'paid'::"text") OR ("status" <> 'active'::"text") OR (("approved_by_user_id" IS NOT NULL) AND ("approved_at" IS NOT NULL)))),
    CONSTRAINT "business_subscriptions_period_ck" CHECK (((("starts_at" IS NULL) AND ("ends_at" IS NULL)) OR (("starts_at" IS NOT NULL) AND ("ends_at" IS NOT NULL) AND ("ends_at" > "starts_at")))),
    CONSTRAINT "business_subscriptions_plan_snapshot_check" CHECK ((("plan_snapshot" IS NULL) OR ("jsonb_typeof"("plan_snapshot") = 'object'::"text"))),
    CONSTRAINT "business_subscriptions_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'active'::"text", 'expired'::"text", 'cancelled'::"text"]))),
    CONSTRAINT "business_subscriptions_trial_time_ck" CHECK ((("kind" <> 'trial'::"text") OR (("status" = 'active'::"text") AND ("ends_at" = ("starts_at" + '30 days'::interval)) AND ("approved_by_user_id" IS NULL))))
);


ALTER TABLE "public"."business_subscriptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."business_verifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "business_id" "uuid" NOT NULL,
    "branch_id" "uuid",
    "request_type" "text" NOT NULL,
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "requested_by_user_id" "text",
    "reviewed_by_user_id" "text",
    "evidence_refs" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "private_notes" "text",
    "submitted_at" timestamp with time zone,
    "decided_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "merchant_feedback" "text",
    CONSTRAINT "business_verification_evidence_type_ck" CHECK (("jsonb_typeof"("evidence_refs") = 'array'::"text")),
    CONSTRAINT "business_verification_target_ck" CHECK ((("request_type" <> 'branch_addition'::"text") OR ("branch_id" IS NOT NULL))),
    CONSTRAINT "business_verifications_request_type_check" CHECK (("request_type" = ANY (ARRAY['initial'::"text", 'branch_addition'::"text", 'profile_change'::"text", 'category_change'::"text", 'representative_change'::"text"]))),
    CONSTRAINT "business_verifications_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'submitted'::"text", 'needs_info'::"text", 'approved'::"text", 'rejected'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."business_verifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."businesses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "owner_user_id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "contact_phone" "text",
    "logo_url" "text",
    "cover_url" "text",
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "submitted_at" timestamp with time zone,
    "reviewed_at" timestamp with time zone,
    "approved_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_paused" boolean DEFAULT false NOT NULL,
    "paused_at" timestamp with time zone,
    CONSTRAINT "business_approved_timestamp_ck" CHECK ((("status" <> 'approved'::"text") OR ("approved_at" IS NOT NULL))),
    CONSTRAINT "businesses_contact_phone_check" CHECK ((("contact_phone" IS NULL) OR ("char_length"("contact_phone") <= 35))),
    CONSTRAINT "businesses_cover_url_check" CHECK ((("cover_url" IS NULL) OR ("char_length"("cover_url") <= 2048))),
    CONSTRAINT "businesses_description_check" CHECK ((("description" IS NULL) OR ("char_length"("description") <= 1200))),
    CONSTRAINT "businesses_logo_url_check" CHECK ((("logo_url" IS NULL) OR ("char_length"("logo_url") <= 2048))),
    CONSTRAINT "businesses_name_check" CHECK ((("char_length"("btrim"("name")) >= 2) AND ("char_length"("btrim"("name")) <= 120))),
    CONSTRAINT "businesses_pause_consistency_ck" CHECK (("is_paused" = ("paused_at" IS NOT NULL))),
    CONSTRAINT "businesses_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'pending_review'::"text", 'approved'::"text", 'rejected'::"text", 'suspended'::"text"])))
);


ALTER TABLE "public"."businesses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "parent_id" "uuid",
    "slug" "text" NOT NULL,
    "name_ar" "text" NOT NULL,
    "name_en" "text",
    "sort_order" integer DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "categories_name_ar_check" CHECK ((("char_length"("btrim"("name_ar")) >= 2) AND ("char_length"("btrim"("name_ar")) <= 120))),
    CONSTRAINT "categories_name_en_check" CHECK ((("name_en" IS NULL) OR (("char_length"("btrim"("name_en")) >= 2) AND ("char_length"("btrim"("name_en")) <= 120)))),
    CONSTRAINT "categories_not_self_parent_ck" CHECK ((("parent_id" IS NULL) OR ("parent_id" <> "id"))),
    CONSTRAINT "categories_slug_check" CHECK ((("slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'::"text") AND ("char_length"("slug") <= 100))),
    CONSTRAINT "categories_sort_order_check" CHECK ((("sort_order" >= 0) AND ("sort_order" <= 100000)))
);


ALTER TABLE "public"."categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."commercial_agreements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "business_id" "uuid" NOT NULL,
    "agreement_type" "text" NOT NULL,
    "terms_snapshot" "jsonb" NOT NULL,
    "grants_publication" boolean DEFAULT false NOT NULL,
    "starts_at" timestamp with time zone NOT NULL,
    "ends_at" timestamp with time zone,
    "status" "text" DEFAULT 'approved'::"text" NOT NULL,
    "approved_by_user_id" "text" NOT NULL,
    "approved_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "revoked_by_user_id" "text",
    "revoked_at" timestamp with time zone,
    "reason" "text" NOT NULL,
    "revoke_reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "commercial_agreements_agreement_type_check" CHECK (("agreement_type" = ANY (ARRAY['exemption'::"text", 'partnership'::"text", 'other'::"text"]))),
    CONSTRAINT "commercial_agreements_grant_ck" CHECK (((NOT "grants_publication") OR ("agreement_type" = ANY (ARRAY['exemption'::"text", 'partnership'::"text"])))),
    CONSTRAINT "commercial_agreements_period_ck" CHECK ((("ends_at" IS NULL) OR ("ends_at" > "starts_at"))),
    CONSTRAINT "commercial_agreements_reason_check" CHECK ((("char_length"("btrim"("reason")) >= 10) AND ("char_length"("btrim"("reason")) <= 1000))),
    CONSTRAINT "commercial_agreements_revoke_ck" CHECK (((("status" = 'approved'::"text") AND ("revoked_by_user_id" IS NULL) AND ("revoked_at" IS NULL) AND ("revoke_reason" IS NULL)) OR (("status" = 'revoked'::"text") AND ("revoked_by_user_id" IS NOT NULL) AND ("revoked_at" IS NOT NULL) AND ("revoke_reason" IS NOT NULL)))),
    CONSTRAINT "commercial_agreements_revoke_reason_check" CHECK ((("revoke_reason" IS NULL) OR (("char_length"("btrim"("revoke_reason")) >= 10) AND ("char_length"("btrim"("revoke_reason")) <= 1000)))),
    CONSTRAINT "commercial_agreements_status_check" CHECK (("status" = ANY (ARRAY['approved'::"text", 'revoked'::"text"]))),
    CONSTRAINT "commercial_agreements_terms_snapshot_check" CHECK (("jsonb_typeof"("terms_snapshot") = 'object'::"text"))
);


ALTER TABLE "public"."commercial_agreements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."complaint_updates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "complaint_id" "uuid" NOT NULL,
    "author_user_id" "text" NOT NULL,
    "kind" "text" NOT NULL,
    "message" "text" NOT NULL,
    "private_evidence_keys" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "visibility" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "complaint_updates_kind_check" CHECK (("kind" = ANY (ARRAY['merchant_response'::"text", 'request_info'::"text", 'internal_note'::"text", 'decision'::"text", 'status'::"text"]))),
    CONSTRAINT "complaint_updates_message_check" CHECK ((("char_length"("btrim"("message")) >= 5) AND ("char_length"("btrim"("message")) <= 3000))),
    CONSTRAINT "complaint_updates_private_evidence_keys_check" CHECK (("jsonb_typeof"("private_evidence_keys") = 'array'::"text")),
    CONSTRAINT "complaint_updates_visibility_check" CHECK (("visibility" = ANY (ARRAY['admin_only'::"text", 'customer_safe'::"text", 'proprietor_safe'::"text"])))
);


ALTER TABLE "public"."complaint_updates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."complaints" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "text" NOT NULL,
    "offer_id" "uuid" NOT NULL,
    "offer_version_id" "uuid" NOT NULL,
    "branch_id" "uuid",
    "complaint_type" "text" NOT NULL,
    "description" "text" NOT NULL,
    "incident_at" timestamp with time zone,
    "private_evidence_keys" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "status" "text" DEFAULT 'new'::"text" NOT NULL,
    "public_outcome" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "closed_at" timestamp with time zone,
    CONSTRAINT "complaints_closed_ck" CHECK ((("status" = 'closed'::"text") = ("closed_at" IS NOT NULL))),
    CONSTRAINT "complaints_closed_outcome_ck" CHECK ((("status" <> 'closed'::"text") OR ("public_outcome" IS NOT NULL))),
    CONSTRAINT "complaints_complaint_type_check" CHECK (("complaint_type" = ANY (ARRAY['price_mismatch'::"text", 'unavailable'::"text", 'misleading_terms'::"text", 'product_mismatch'::"text", 'business_conduct'::"text", 'other'::"text"]))),
    CONSTRAINT "complaints_description_check" CHECK ((("char_length"("btrim"("description")) >= 15) AND ("char_length"("btrim"("description")) <= 4000))),
    CONSTRAINT "complaints_private_evidence_keys_check" CHECK (("jsonb_typeof"("private_evidence_keys") = 'array'::"text")),
    CONSTRAINT "complaints_public_outcome_check" CHECK ((("public_outcome" IS NULL) OR (("char_length"("btrim"("public_outcome")) >= 5) AND ("char_length"("btrim"("public_outcome")) <= 2000)))),
    CONSTRAINT "complaints_status_check" CHECK (("status" = ANY (ARRAY['new'::"text", 'investigating'::"text", 'waiting'::"text", 'closed'::"text"])))
);


ALTER TABLE "public"."complaints" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."offer_branches" (
    "business_id" "uuid" NOT NULL,
    "offer_version_id" "uuid" NOT NULL,
    "branch_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."offer_branches" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."offer_item_attributes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "offer_item_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "value" "text" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    CONSTRAINT "offer_item_attributes_name_check" CHECK ((("char_length"("btrim"("name")) >= 1) AND ("char_length"("btrim"("name")) <= 80))),
    CONSTRAINT "offer_item_attributes_sort_order_check" CHECK ((("sort_order" >= 0) AND ("sort_order" <= 99))),
    CONSTRAINT "offer_item_attributes_value_check" CHECK ((("char_length"("btrim"("value")) >= 1) AND ("char_length"("btrim"("value")) <= 240)))
);


ALTER TABLE "public"."offer_item_attributes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."offer_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "offer_version_id" "uuid" NOT NULL,
    "item_type" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "brand" "text",
    "model" "text",
    "quantity" numeric(12,3) DEFAULT 1 NOT NULL,
    "unit" "text" DEFAULT 'piece'::"text" NOT NULL,
    "reference_value" numeric(14,2),
    "sort_order" integer DEFAULT 0 NOT NULL,
    CONSTRAINT "offer_items_brand_check" CHECK ((("brand" IS NULL) OR ("char_length"("brand") <= 120))),
    CONSTRAINT "offer_items_description_check" CHECK ((("description" IS NULL) OR ("char_length"("description") <= 2000))),
    CONSTRAINT "offer_items_item_type_check" CHECK (("item_type" = ANY (ARRAY['product'::"text", 'service'::"text"]))),
    CONSTRAINT "offer_items_model_check" CHECK ((("model" IS NULL) OR ("char_length"("model") <= 120))),
    CONSTRAINT "offer_items_name_check" CHECK ((("char_length"("btrim"("name")) >= 2) AND ("char_length"("btrim"("name")) <= 160))),
    CONSTRAINT "offer_items_quantity_check" CHECK (("quantity" > (0)::numeric)),
    CONSTRAINT "offer_items_reference_value_check" CHECK ((("reference_value" IS NULL) OR ("reference_value" >= (0)::numeric))),
    CONSTRAINT "offer_items_sort_order_check" CHECK ((("sort_order" >= 0) AND ("sort_order" <= 999))),
    CONSTRAINT "offer_items_unit_check" CHECK ((("char_length"("btrim"("unit")) >= 1) AND ("char_length"("btrim"("unit")) <= 50)))
);


ALTER TABLE "public"."offer_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."offer_media" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "offer_version_id" "uuid" NOT NULL,
    "offer_item_id" "uuid",
    "storage_key" "text" NOT NULL,
    "alt_text" "text",
    "is_cover" boolean DEFAULT false NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "offer_media_alt_text_check" CHECK ((("alt_text" IS NULL) OR ("char_length"("alt_text") <= 250))),
    CONSTRAINT "offer_media_sort_order_check" CHECK ((("sort_order" >= 0) AND ("sort_order" <= 99))),
    CONSTRAINT "offer_media_storage_key_check" CHECK ((("char_length"("storage_key") >= 4) AND ("char_length"("storage_key") <= 512)))
);


ALTER TABLE "public"."offer_media" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."offer_ratings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "text" NOT NULL,
    "offer_id" "uuid" NOT NULL,
    "offer_version_id" "uuid" NOT NULL,
    "conformity" "text" NOT NULL,
    "experience_stars" smallint,
    "moderation_status" "text" DEFAULT 'normal'::"text" NOT NULL,
    "moderation_reason" "text",
    "moderated_by_user_id" "text",
    "moderated_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "offer_ratings_conformity_check" CHECK (("conformity" = ANY (ARRAY['matches'::"text", 'does_not_match'::"text", 'could_not_verify'::"text"]))),
    CONSTRAINT "offer_ratings_experience_stars_check" CHECK ((("experience_stars" >= 1) AND ("experience_stars" <= 5))),
    CONSTRAINT "offer_ratings_moderation_status_check" CHECK (("moderation_status" = ANY (ARRAY['normal'::"text", 'under_review'::"text", 'excluded'::"text"]))),
    CONSTRAINT "offer_ratings_stars_conformity_ck" CHECK ((("conformity" <> 'could_not_verify'::"text") OR ("experience_stars" IS NULL)))
);


ALTER TABLE "public"."offer_ratings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."offer_reviews" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "offer_version_id" "uuid" NOT NULL,
    "reviewer_user_id" "text" NOT NULL,
    "decision" "text" NOT NULL,
    "reason" "text",
    "previous_status" "text" NOT NULL,
    "private_evidence_keys" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "merchant_consent_key" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "offer_reviews_decision_check" CHECK (("decision" = ANY (ARRAY['approved'::"text", 'rejected'::"text", 'needs_info'::"text"]))),
    CONSTRAINT "offer_reviews_private_evidence_keys_check" CHECK (("jsonb_typeof"("private_evidence_keys") = 'array'::"text")),
    CONSTRAINT "offer_reviews_reason_ck" CHECK ((("decision" = 'approved'::"text") OR (("reason" IS NOT NULL) AND (("char_length"("btrim"("reason")) >= 5) AND ("char_length"("btrim"("reason")) <= 2000)))))
);


ALTER TABLE "public"."offer_reviews" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."offer_versions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "business_id" "uuid" NOT NULL,
    "offer_id" "uuid" NOT NULL,
    "version_no" integer NOT NULL,
    "title" "text",
    "description" "text",
    "offer_kind" "text",
    "original_price" numeric(14,2),
    "final_price" numeric(14,2),
    "currency" "text",
    "benefit_details" "text",
    "mandatory_fees" "text",
    "terms" "text",
    "stock_or_condition_notice" "text",
    "starts_at" timestamp with time zone,
    "ends_at" timestamp with time zone,
    "review_status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "created_by_user_id" "text" NOT NULL,
    "submitted_at" timestamp with time zone,
    "approved_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "offer_versions_approved_at_ck" CHECK ((("review_status" <> 'approved'::"text") OR ("approved_at" IS NOT NULL))),
    CONSTRAINT "offer_versions_benefit_details_check" CHECK ((("benefit_details" IS NULL) OR ("char_length"("benefit_details") <= 2000))),
    CONSTRAINT "offer_versions_currency_check" CHECK ((("currency" IS NULL) OR ("currency" ~ '^[A-Z]{3}$'::"text"))),
    CONSTRAINT "offer_versions_description_check" CHECK ((("description" IS NULL) OR ("char_length"("description") <= 4000))),
    CONSTRAINT "offer_versions_final_price_check" CHECK ((("final_price" IS NULL) OR ("final_price" >= (0)::numeric))),
    CONSTRAINT "offer_versions_mandatory_fees_check" CHECK ((("mandatory_fees" IS NULL) OR ("char_length"("mandatory_fees") <= 1200))),
    CONSTRAINT "offer_versions_offer_kind_check" CHECK ((("offer_kind" IS NULL) OR ("offer_kind" = ANY (ARRAY['product'::"text", 'service'::"text", 'bundle'::"text", 'clearance'::"text"])))),
    CONSTRAINT "offer_versions_original_price_check" CHECK ((("original_price" IS NULL) OR ("original_price" >= (0)::numeric))),
    CONSTRAINT "offer_versions_period_ck" CHECK ((("ends_at" IS NULL) OR ("starts_at" IS NULL) OR ("ends_at" > "starts_at"))),
    CONSTRAINT "offer_versions_review_status_check" CHECK (("review_status" = ANY (ARRAY['draft'::"text", 'pending'::"text", 'approved'::"text", 'rejected'::"text"]))),
    CONSTRAINT "offer_versions_stock_or_condition_notice_check" CHECK ((("stock_or_condition_notice" IS NULL) OR ("char_length"("stock_or_condition_notice") <= 1200))),
    CONSTRAINT "offer_versions_submitted_at_ck" CHECK ((("review_status" <> ALL (ARRAY['pending'::"text", 'approved'::"text"])) OR ("submitted_at" IS NOT NULL))),
    CONSTRAINT "offer_versions_terms_check" CHECK ((("terms" IS NULL) OR ("char_length"("terms") <= 4000))),
    CONSTRAINT "offer_versions_title_check" CHECK ((("title" IS NULL) OR (("char_length"("btrim"("title")) >= 3) AND ("char_length"("btrim"("title")) <= 160)))),
    CONSTRAINT "offer_versions_version_no_check" CHECK (("version_no" > 0))
);


ALTER TABLE "public"."offer_versions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."offers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "business_id" "uuid" NOT NULL,
    "created_by_user_id" "text" NOT NULL,
    "current_version_id" "uuid",
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "merchant_available" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "offers_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'pending'::"text", 'active'::"text", 'paused'::"text", 'closed'::"text"])))
);


ALTER TABLE "public"."offers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."saved_businesses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "text" NOT NULL,
    "business_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."saved_businesses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."saved_offers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "text" NOT NULL,
    "offer_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."saved_offers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subscription_payments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "subscription_id" "uuid" NOT NULL,
    "amount" numeric(14,2) NOT NULL,
    "currency" "text" NOT NULL,
    "method" "text" NOT NULL,
    "reference" "text" NOT NULL,
    "proof_key" "text",
    "status" "text" DEFAULT 'submitted'::"text" NOT NULL,
    "submitted_by_user_id" "text" NOT NULL,
    "verified_by_user_id" "text",
    "verified_at" timestamp with time zone,
    "review_note" "text",
    "paid_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "subscription_payments_amount_check" CHECK (("amount" > (0)::numeric)),
    CONSTRAINT "subscription_payments_currency_check" CHECK (("currency" ~ '^[A-Z]{3}$'::"text")),
    CONSTRAINT "subscription_payments_method_check" CHECK (("method" = ANY (ARRAY['cash'::"text", 'bank_transfer'::"text", 'wallet'::"text", 'other'::"text"]))),
    CONSTRAINT "subscription_payments_proof_disabled_ck" CHECK (("proof_key" IS NULL)),
    CONSTRAINT "subscription_payments_reference_check" CHECK ((("char_length"("btrim"("reference")) >= 4) AND ("char_length"("btrim"("reference")) <= 160))),
    CONSTRAINT "subscription_payments_review_ck" CHECK (((("status" = 'submitted'::"text") AND ("verified_by_user_id" IS NULL) AND ("verified_at" IS NULL)) OR (("status" = ANY (ARRAY['verified'::"text", 'rejected'::"text"])) AND ("verified_by_user_id" IS NOT NULL) AND ("verified_at" IS NOT NULL)))),
    CONSTRAINT "subscription_payments_review_note_check" CHECK ((("review_note" IS NULL) OR (("char_length"("review_note") >= 10) AND ("char_length"("review_note") <= 1500)))),
    CONSTRAINT "subscription_payments_status_check" CHECK (("status" = ANY (ARRAY['submitted'::"text", 'verified'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."subscription_payments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subscription_plans" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "price" numeric(14,2),
    "currency" "text",
    "duration_days" integer,
    "feature_limits" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "is_active" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "subscription_plans_code_check" CHECK (("code" = ANY (ARRAY['BASIC'::"text", 'ADVANCED'::"text"]))),
    CONSTRAINT "subscription_plans_currency_check" CHECK ((("currency" IS NULL) OR ("currency" ~ '^[A-Z]{3}$'::"text"))),
    CONSTRAINT "subscription_plans_duration_days_check" CHECK ((("duration_days" IS NULL) OR (("duration_days" >= 1) AND ("duration_days" <= 366)))),
    CONSTRAINT "subscription_plans_feature_limits_check" CHECK (("jsonb_typeof"("feature_limits") = 'object'::"text")),
    CONSTRAINT "subscription_plans_name_check" CHECK ((("char_length"("btrim"("name")) >= 2) AND ("char_length"("btrim"("name")) <= 100))),
    CONSTRAINT "subscription_plans_price_check" CHECK ((("price" IS NULL) OR ("price" > (0)::numeric))),
    CONSTRAINT "subscription_plans_ready_ck" CHECK (((NOT "is_active") OR (("price" IS NOT NULL) AND ("currency" IS NOT NULL) AND ("duration_days" IS NOT NULL))))
);


ALTER TABLE "public"."subscription_plans" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "text" NOT NULL,
    "email" "text",
    "full_name" "text",
    "avatar_url" "text",
    "account_status" "text" DEFAULT 'active'::"text" NOT NULL,
    "clerk_updated_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    "clerk_event_at" timestamp with time zone,
    CONSTRAINT "users_account_status_check" CHECK (("account_status" = ANY (ARRAY['active'::"text", 'suspended'::"text", 'deleted'::"text"])))
);


ALTER TABLE "public"."users" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "wow_private"."admin_members" (
    "user_id" "text" NOT NULL,
    "role" "text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "granted_by_user_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "admin_members_role_check" CHECK (("role" = ANY (ARRAY['super_admin'::"text", 'reviewer'::"text", 'viewer'::"text"])))
);


ALTER TABLE "wow_private"."admin_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "wow_private"."billing_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "business_id" "uuid",
    "actor_user_id" "text" NOT NULL,
    "action" "text" NOT NULL,
    "target_type" "text" NOT NULL,
    "target_id" "uuid" NOT NULL,
    "details" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "billing_events_action_check" CHECK (("action" = ANY (ARRAY['trial_activated'::"text", 'paid_requested'::"text", 'payment_submitted'::"text", 'payment_verified'::"text", 'payment_rejected'::"text", 'plan_configured'::"text", 'agreement_approved'::"text", 'agreement_revoked'::"text"]))),
    CONSTRAINT "billing_events_details_check" CHECK (("jsonb_typeof"("details") = 'object'::"text")),
    CONSTRAINT "billing_events_target_type_check" CHECK (("target_type" = ANY (ARRAY['plan'::"text", 'subscription'::"text", 'payment'::"text", 'agreement'::"text"])))
);


ALTER TABLE "wow_private"."billing_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "wow_private"."category_assignment_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "business_id" "uuid" NOT NULL,
    "actor_user_id" "text" NOT NULL,
    "old_category_ids" "uuid"[] DEFAULT ARRAY[]::"uuid"[] NOT NULL,
    "new_category_ids" "uuid"[] DEFAULT ARRAY[]::"uuid"[] NOT NULL,
    "old_primary_id" "uuid",
    "new_primary_id" "uuid",
    "reason" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "category_assignment_events_reason_check" CHECK ((("char_length"("btrim"("reason")) >= 10) AND ("char_length"("btrim"("reason")) <= 1000)))
);


ALTER TABLE "wow_private"."category_assignment_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "wow_private"."merchant_operation_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "business_id" "uuid" NOT NULL,
    "actor_user_id" "text" NOT NULL,
    "operation" "text" NOT NULL,
    "target_id" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "merchant_operation_events_operation_check" CHECK (("operation" = ANY (ARRAY['employee_grant'::"text", 'employee_update'::"text", 'employee_revoke'::"text", 'business_pause'::"text", 'branch_pause'::"text", 'business_draft_update'::"text", 'branch_draft_update'::"text", 'profile_revision_submit'::"text", 'profile_revision_approve'::"text", 'profile_revision_reject'::"text"])))
);


ALTER TABLE "wow_private"."merchant_operation_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "wow_private"."rating_moderation_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "rating_id" "uuid" NOT NULL,
    "reviewer_user_id" "text" NOT NULL,
    "from_status" "text" NOT NULL,
    "to_status" "text" NOT NULL,
    "reason" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "rating_moderation_events_reason_check" CHECK ((("char_length"("btrim"("reason")) >= 5) AND ("char_length"("btrim"("reason")) <= 2000))),
    CONSTRAINT "rating_moderation_events_to_status_check" CHECK (("to_status" = ANY (ARRAY['normal'::"text", 'under_review'::"text", 'excluded'::"text"])))
);


ALTER TABLE "wow_private"."rating_moderation_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "wow_private"."verification_decisions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "verification_id" "uuid" NOT NULL,
    "reviewer_user_id" "text" NOT NULL,
    "decision" "text" NOT NULL,
    "from_status" "text" NOT NULL,
    "business_status_before" "text" NOT NULL,
    "branch_status_before" "text",
    "reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "review_decision_reason_ck" CHECK ((("decision" = 'approved'::"text") OR (("reason" IS NOT NULL) AND (("char_length"("btrim"("reason")) >= 5) AND ("char_length"("btrim"("reason")) <= 2000))))),
    CONSTRAINT "verification_decisions_decision_check" CHECK (("decision" = ANY (ARRAY['approved'::"text", 'rejected'::"text", 'needs_info'::"text"])))
);


ALTER TABLE "wow_private"."verification_decisions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "wow_private"."verification_submissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "verification_id" "uuid" NOT NULL,
    "submitted_by_user_id" "text" NOT NULL,
    "evidence_refs" "jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "verification_submissions_evidence_refs_check" CHECK (("jsonb_typeof"("evidence_refs") = 'array'::"text"))
);


ALTER TABLE "wow_private"."verification_submissions" OWNER TO "postgres";


ALTER TABLE ONLY "public"."business_branches"
    ADD CONSTRAINT "branch_business_id_id_uk" UNIQUE ("business_id", "id");



ALTER TABLE ONLY "public"."business_branches"
    ADD CONSTRAINT "business_branches_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."business_categories"
    ADD CONSTRAINT "business_categories_pair_uk" UNIQUE ("business_id", "category_id");



ALTER TABLE ONLY "public"."business_categories"
    ADD CONSTRAINT "business_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."business_member_branches"
    ADD CONSTRAINT "business_member_branches_pkey" PRIMARY KEY ("member_id", "branch_id");



ALTER TABLE ONLY "public"."business_members"
    ADD CONSTRAINT "business_member_business_id_id_uk" UNIQUE ("business_id", "id");



ALTER TABLE ONLY "public"."business_members"
    ADD CONSTRAINT "business_member_pair_uk" UNIQUE ("business_id", "user_id");



ALTER TABLE ONLY "public"."business_members"
    ADD CONSTRAINT "business_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."business_profile_revisions"
    ADD CONSTRAINT "business_profile_revisions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."business_subscriptions"
    ADD CONSTRAINT "business_subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."business_verifications"
    ADD CONSTRAINT "business_verifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."businesses"
    ADD CONSTRAINT "businesses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."commercial_agreements"
    ADD CONSTRAINT "commercial_agreements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."complaint_updates"
    ADD CONSTRAINT "complaint_updates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."complaints"
    ADD CONSTRAINT "complaints_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."offer_branches"
    ADD CONSTRAINT "offer_branches_pkey" PRIMARY KEY ("offer_version_id", "branch_id");



ALTER TABLE ONLY "public"."offer_item_attributes"
    ADD CONSTRAINT "offer_item_attributes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."offer_items"
    ADD CONSTRAINT "offer_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."offer_items"
    ADD CONSTRAINT "offer_items_version_id_id_uk" UNIQUE ("offer_version_id", "id");



ALTER TABLE ONLY "public"."offer_media"
    ADD CONSTRAINT "offer_media_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."offer_media"
    ADD CONSTRAINT "offer_media_storage_uk" UNIQUE ("offer_version_id", "storage_key");



ALTER TABLE ONLY "public"."offer_ratings"
    ADD CONSTRAINT "offer_ratings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."offer_ratings"
    ADD CONSTRAINT "offer_ratings_user_offer_uk" UNIQUE ("user_id", "offer_id");



ALTER TABLE ONLY "public"."offer_reviews"
    ADD CONSTRAINT "offer_reviews_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."offer_versions"
    ADD CONSTRAINT "offer_versions_business_id_id_uk" UNIQUE ("business_id", "id");



ALTER TABLE ONLY "public"."offer_versions"
    ADD CONSTRAINT "offer_versions_offer_id_id_uk" UNIQUE ("offer_id", "id");



ALTER TABLE ONLY "public"."offer_versions"
    ADD CONSTRAINT "offer_versions_offer_no_uk" UNIQUE ("offer_id", "version_no");



ALTER TABLE ONLY "public"."offer_versions"
    ADD CONSTRAINT "offer_versions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."offers"
    ADD CONSTRAINT "offers_business_id_id_uk" UNIQUE ("business_id", "id");



ALTER TABLE ONLY "public"."offers"
    ADD CONSTRAINT "offers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."saved_businesses"
    ADD CONSTRAINT "saved_businesses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."saved_businesses"
    ADD CONSTRAINT "saved_businesses_user_business_uk" UNIQUE ("user_id", "business_id");



ALTER TABLE ONLY "public"."saved_offers"
    ADD CONSTRAINT "saved_offers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."saved_offers"
    ADD CONSTRAINT "saved_offers_user_offer_uk" UNIQUE ("user_id", "offer_id");



ALTER TABLE ONLY "public"."subscription_payments"
    ADD CONSTRAINT "subscription_payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscription_plans"
    ADD CONSTRAINT "subscription_plans_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."subscription_plans"
    ADD CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "wow_private"."admin_members"
    ADD CONSTRAINT "admin_members_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "wow_private"."billing_events"
    ADD CONSTRAINT "billing_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "wow_private"."category_assignment_events"
    ADD CONSTRAINT "category_assignment_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "wow_private"."merchant_operation_events"
    ADD CONSTRAINT "merchant_operation_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "wow_private"."rating_moderation_events"
    ADD CONSTRAINT "rating_moderation_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "wow_private"."verification_decisions"
    ADD CONSTRAINT "verification_decisions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "wow_private"."verification_submissions"
    ADD CONSTRAINT "verification_submissions_pkey" PRIMARY KEY ("id");



CREATE INDEX "business_branches_business_idx" ON "public"."business_branches" USING "btree" ("business_id");



CREATE UNIQUE INDEX "business_branches_one_primary_idx" ON "public"."business_branches" USING "btree" ("business_id") WHERE ("is_primary" = true);



CREATE INDEX "business_branches_status_idx" ON "public"."business_branches" USING "btree" ("status");



CREATE INDEX "business_categories_category_idx" ON "public"."business_categories" USING "btree" ("category_id", "business_id");



CREATE UNIQUE INDEX "business_categories_primary_idx" ON "public"."business_categories" USING "btree" ("business_id") WHERE "is_primary";



CREATE INDEX "business_member_branches_branch_idx" ON "public"."business_member_branches" USING "btree" ("branch_id");



CREATE INDEX "business_member_branches_business_idx" ON "public"."business_member_branches" USING "btree" ("business_id");



CREATE INDEX "business_members_business_status_idx" ON "public"."business_members" USING "btree" ("business_id", "status");



CREATE UNIQUE INDEX "business_members_one_active_owner_idx" ON "public"."business_members" USING "btree" ("business_id") WHERE (("role" = 'owner'::"text") AND ("status" = 'active'::"text"));



CREATE INDEX "business_members_user_status_idx" ON "public"."business_members" USING "btree" ("user_id", "status");



CREATE INDEX "business_subscriptions_expiration_idx" ON "public"."business_subscriptions" USING "btree" ("ends_at") WHERE ("status" = 'active'::"text");



CREATE INDEX "business_subscriptions_lookup_idx" ON "public"."business_subscriptions" USING "btree" ("business_id", "created_at" DESC);



CREATE UNIQUE INDEX "business_subscriptions_one_active_paid_idx" ON "public"."business_subscriptions" USING "btree" ("business_id") WHERE (("kind" = 'paid'::"text") AND ("status" = 'active'::"text"));



CREATE UNIQUE INDEX "business_subscriptions_one_pending_paid_idx" ON "public"."business_subscriptions" USING "btree" ("business_id") WHERE (("kind" = 'paid'::"text") AND ("status" = 'pending'::"text"));



CREATE UNIQUE INDEX "business_subscriptions_one_trial_idx" ON "public"."business_subscriptions" USING "btree" ("business_id") WHERE ("kind" = 'trial'::"text");



CREATE INDEX "business_verifications_branch_idx" ON "public"."business_verifications" USING "btree" ("branch_id") WHERE ("branch_id" IS NOT NULL);



CREATE INDEX "business_verifications_business_status_idx" ON "public"."business_verifications" USING "btree" ("business_id", "status");



CREATE UNIQUE INDEX "business_verifications_one_open_branch_idx" ON "public"."business_verifications" USING "btree" ("branch_id") WHERE (("branch_id" IS NOT NULL) AND ("status" = ANY (ARRAY['submitted'::"text", 'needs_info'::"text"])));



CREATE UNIQUE INDEX "business_verifications_one_open_initial_idx" ON "public"."business_verifications" USING "btree" ("business_id") WHERE (("request_type" = 'initial'::"text") AND ("status" = ANY (ARRAY['submitted'::"text", 'needs_info'::"text"])));



CREATE INDEX "businesses_owner_idx" ON "public"."businesses" USING "btree" ("owner_user_id");



CREATE INDEX "businesses_status_idx" ON "public"."businesses" USING "btree" ("status");



CREATE INDEX "categories_active_order_idx" ON "public"."categories" USING "btree" ("sort_order", "name_ar") WHERE "is_active";



CREATE INDEX "categories_parent_idx" ON "public"."categories" USING "btree" ("parent_id");



CREATE INDEX "commercial_agreements_business_idx" ON "public"."commercial_agreements" USING "btree" ("business_id", "status", "starts_at", "ends_at");



CREATE INDEX "complaint_updates_case_time_idx" ON "public"."complaint_updates" USING "btree" ("complaint_id", "created_at", "id");



CREATE INDEX "complaints_offer_created_idx" ON "public"."complaints" USING "btree" ("offer_id", "created_at" DESC);



CREATE INDEX "complaints_status_created_idx" ON "public"."complaints" USING "btree" ("status", "created_at" DESC);



CREATE INDEX "complaints_user_created_idx" ON "public"."complaints" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_users_account_status" ON "public"."users" USING "btree" ("account_status");



CREATE INDEX "idx_users_email" ON "public"."users" USING "btree" ("email");



CREATE INDEX "offer_branches_branch_idx" ON "public"."offer_branches" USING "btree" ("branch_id");



CREATE INDEX "offer_item_attributes_item_idx" ON "public"."offer_item_attributes" USING "btree" ("offer_item_id", "sort_order");



CREATE INDEX "offer_items_version_order_idx" ON "public"."offer_items" USING "btree" ("offer_version_id", "sort_order");



CREATE UNIQUE INDEX "offer_media_one_cover_idx" ON "public"."offer_media" USING "btree" ("offer_version_id") WHERE "is_cover";



CREATE INDEX "offer_ratings_moderation_queue_idx" ON "public"."offer_ratings" USING "btree" ("moderation_status", "updated_at" DESC);



CREATE INDEX "offer_ratings_offer_moderation_idx" ON "public"."offer_ratings" USING "btree" ("offer_id", "moderation_status");



CREATE INDEX "offer_ratings_user_time_idx" ON "public"."offer_ratings" USING "btree" ("user_id", "updated_at" DESC);



CREATE INDEX "offer_reviews_version_time_idx" ON "public"."offer_reviews" USING "btree" ("offer_version_id", "created_at" DESC);



CREATE UNIQUE INDEX "offer_versions_one_draft_idx" ON "public"."offer_versions" USING "btree" ("offer_id") WHERE ("review_status" = 'draft'::"text");



CREATE UNIQUE INDEX "offer_versions_one_pending_idx" ON "public"."offer_versions" USING "btree" ("offer_id") WHERE ("review_status" = 'pending'::"text");



CREATE INDEX "offer_versions_review_queue_idx" ON "public"."offer_versions" USING "btree" ("review_status", "submitted_at" DESC) WHERE ("review_status" = 'pending'::"text");



CREATE INDEX "offers_business_status_idx" ON "public"."offers" USING "btree" ("business_id", "status");



CREATE INDEX "offers_current_version_idx" ON "public"."offers" USING "btree" ("current_version_id") WHERE ("current_version_id" IS NOT NULL);



CREATE INDEX "profile_revisions_business_created_idx" ON "public"."business_profile_revisions" USING "btree" ("business_id", "created_at" DESC);



CREATE UNIQUE INDEX "profile_revisions_one_pending_branch_idx" ON "public"."business_profile_revisions" USING "btree" ("branch_id") WHERE (("branch_id" IS NOT NULL) AND ("status" = 'submitted'::"text"));



CREATE UNIQUE INDEX "profile_revisions_one_pending_business_idx" ON "public"."business_profile_revisions" USING "btree" ("business_id") WHERE (("branch_id" IS NULL) AND ("status" = 'submitted'::"text"));



CREATE INDEX "profile_revisions_pending_idx" ON "public"."business_profile_revisions" USING "btree" ("created_at", "id") WHERE ("status" = 'submitted'::"text");



CREATE INDEX "saved_businesses_user_time_idx" ON "public"."saved_businesses" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "saved_offers_user_time_idx" ON "public"."saved_offers" USING "btree" ("user_id", "created_at" DESC);



CREATE UNIQUE INDEX "subscription_payments_no_ref_reuse_idx" ON "public"."subscription_payments" USING "btree" ("method", "lower"("btrim"("reference"))) WHERE ("status" = ANY (ARRAY['submitted'::"text", 'verified'::"text"]));



CREATE UNIQUE INDEX "subscription_payments_one_submitted_idx" ON "public"."subscription_payments" USING "btree" ("subscription_id") WHERE ("status" = 'submitted'::"text");



CREATE INDEX "subscription_payments_review_queue_idx" ON "public"."subscription_payments" USING "btree" ("status", "created_at" DESC);



CREATE INDEX "subscription_payments_subscription_idx" ON "public"."subscription_payments" USING "btree" ("subscription_id", "created_at" DESC);



CREATE INDEX "billing_events_business_time_idx" ON "wow_private"."billing_events" USING "btree" ("business_id", "created_at" DESC);



CREATE INDEX "category_assignment_events_business_time_idx" ON "wow_private"."category_assignment_events" USING "btree" ("business_id", "created_at" DESC);



CREATE INDEX "merchant_operation_events_business_idx" ON "wow_private"."merchant_operation_events" USING "btree" ("business_id", "created_at" DESC);



CREATE INDEX "rating_moderation_events_rating_time_idx" ON "wow_private"."rating_moderation_events" USING "btree" ("rating_id", "created_at" DESC);



CREATE INDEX "verification_decisions_case_idx" ON "wow_private"."verification_decisions" USING "btree" ("verification_id", "created_at" DESC);



CREATE INDEX "verification_submissions_case_idx" ON "wow_private"."verification_submissions" USING "btree" ("verification_id", "created_at" DESC);



CREATE OR REPLACE TRIGGER "business_branches_touch_updated_at" BEFORE UPDATE ON "public"."business_branches" FOR EACH ROW EXECUTE FUNCTION "wow_private"."set_updated_at"();



CREATE OR REPLACE TRIGGER "business_members_touch_updated_at" BEFORE UPDATE ON "public"."business_members" FOR EACH ROW EXECUTE FUNCTION "wow_private"."set_updated_at"();



CREATE OR REPLACE TRIGGER "business_subscriptions_updated_at" BEFORE UPDATE ON "public"."business_subscriptions" FOR EACH ROW EXECUTE FUNCTION "wow_private"."set_updated_at"();



CREATE OR REPLACE TRIGGER "business_verifications_touch_updated_at" BEFORE UPDATE ON "public"."business_verifications" FOR EACH ROW EXECUTE FUNCTION "wow_private"."set_updated_at"();



CREATE OR REPLACE TRIGGER "businesses_touch_updated_at" BEFORE UPDATE ON "public"."businesses" FOR EACH ROW EXECUTE FUNCTION "wow_private"."set_updated_at"();



CREATE OR REPLACE TRIGGER "categories_touch_updated_at" BEFORE UPDATE ON "public"."categories" FOR EACH ROW EXECUTE FUNCTION "wow_private"."set_updated_at"();



CREATE OR REPLACE TRIGGER "complaints_touch_updated_at" BEFORE UPDATE ON "public"."complaints" FOR EACH ROW EXECUTE FUNCTION "wow_private"."set_updated_at"();



CREATE OR REPLACE TRIGGER "offer_branches_draft_guard" BEFORE INSERT OR DELETE OR UPDATE ON "public"."offer_branches" FOR EACH ROW EXECUTE FUNCTION "wow_private"."guard_offer_child_draft"();



CREATE OR REPLACE TRIGGER "offer_branches_employee_scope_guard" BEFORE INSERT OR DELETE OR UPDATE ON "public"."offer_branches" FOR EACH ROW EXECUTE FUNCTION "wow_private"."guard_offer_employee_branch_scope"();



CREATE OR REPLACE TRIGGER "offer_item_attributes_draft_guard" BEFORE INSERT OR DELETE OR UPDATE ON "public"."offer_item_attributes" FOR EACH ROW EXECUTE FUNCTION "wow_private"."guard_offer_child_draft"();



CREATE OR REPLACE TRIGGER "offer_items_draft_guard" BEFORE INSERT OR DELETE OR UPDATE ON "public"."offer_items" FOR EACH ROW EXECUTE FUNCTION "wow_private"."guard_offer_child_draft"();



CREATE OR REPLACE TRIGGER "offer_media_draft_guard" BEFORE INSERT OR DELETE OR UPDATE ON "public"."offer_media" FOR EACH ROW EXECUTE FUNCTION "wow_private"."guard_offer_child_draft"();



CREATE OR REPLACE TRIGGER "offer_ratings_touch_updated_at" BEFORE UPDATE ON "public"."offer_ratings" FOR EACH ROW EXECUTE FUNCTION "wow_private"."set_updated_at"();



CREATE OR REPLACE TRIGGER "offer_versions_employee_submission_scope_guard" BEFORE UPDATE ON "public"."offer_versions" FOR EACH ROW EXECUTE FUNCTION "wow_private"."guard_offer_employee_submission_scope"();



CREATE OR REPLACE TRIGGER "offer_versions_immutable_guard" BEFORE UPDATE ON "public"."offer_versions" FOR EACH ROW EXECUTE FUNCTION "wow_private"."guard_offer_version_immutable"();



CREATE OR REPLACE TRIGGER "offer_versions_touch_updated_at" BEFORE UPDATE ON "public"."offer_versions" FOR EACH ROW EXECUTE FUNCTION "wow_private"."set_updated_at"();



CREATE OR REPLACE TRIGGER "offers_current_version_guard" BEFORE UPDATE ON "public"."offers" FOR EACH ROW EXECUTE FUNCTION "wow_private"."guard_offer_current_version"();



CREATE OR REPLACE TRIGGER "offers_touch_updated_at" BEFORE UPDATE ON "public"."offers" FOR EACH ROW EXECUTE FUNCTION "wow_private"."set_updated_at"();



CREATE OR REPLACE TRIGGER "subscription_plans_updated_at" BEFORE UPDATE ON "public"."subscription_plans" FOR EACH ROW EXECUTE FUNCTION "wow_private"."set_updated_at"();



CREATE OR REPLACE TRIGGER "admin_members_touch_updated_at" BEFORE UPDATE ON "wow_private"."admin_members" FOR EACH ROW EXECUTE FUNCTION "wow_private"."set_updated_at"();



ALTER TABLE ONLY "public"."business_branches"
    ADD CONSTRAINT "business_branches_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."business_categories"
    ADD CONSTRAINT "business_categories_approved_by_user_id_fkey" FOREIGN KEY ("approved_by_user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."business_categories"
    ADD CONSTRAINT "business_categories_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."business_categories"
    ADD CONSTRAINT "business_categories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."business_members"
    ADD CONSTRAINT "business_members_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."business_members"
    ADD CONSTRAINT "business_members_granted_by_user_id_fkey" FOREIGN KEY ("granted_by_user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."business_members"
    ADD CONSTRAINT "business_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."business_profile_revisions"
    ADD CONSTRAINT "business_profile_revisions_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."business_profile_revisions"
    ADD CONSTRAINT "business_profile_revisions_requested_by_user_id_fkey" FOREIGN KEY ("requested_by_user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."business_profile_revisions"
    ADD CONSTRAINT "business_profile_revisions_reviewed_by_user_id_fkey" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."business_subscriptions"
    ADD CONSTRAINT "business_subscriptions_approved_by_user_id_fkey" FOREIGN KEY ("approved_by_user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."business_subscriptions"
    ADD CONSTRAINT "business_subscriptions_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."business_subscriptions"
    ADD CONSTRAINT "business_subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "public"."subscription_plans"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."business_subscriptions"
    ADD CONSTRAINT "business_subscriptions_requested_by_user_id_fkey" FOREIGN KEY ("requested_by_user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."business_verifications"
    ADD CONSTRAINT "business_verification_branch_fk" FOREIGN KEY ("business_id", "branch_id") REFERENCES "public"."business_branches"("business_id", "id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."business_verifications"
    ADD CONSTRAINT "business_verifications_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."business_verifications"
    ADD CONSTRAINT "business_verifications_requested_by_user_id_fkey" FOREIGN KEY ("requested_by_user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."business_verifications"
    ADD CONSTRAINT "business_verifications_reviewed_by_user_id_fkey" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."businesses"
    ADD CONSTRAINT "businesses_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."categories"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."commercial_agreements"
    ADD CONSTRAINT "commercial_agreements_approved_by_user_id_fkey" FOREIGN KEY ("approved_by_user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."commercial_agreements"
    ADD CONSTRAINT "commercial_agreements_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."commercial_agreements"
    ADD CONSTRAINT "commercial_agreements_revoked_by_user_id_fkey" FOREIGN KEY ("revoked_by_user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."complaint_updates"
    ADD CONSTRAINT "complaint_updates_author_user_id_fkey" FOREIGN KEY ("author_user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."complaint_updates"
    ADD CONSTRAINT "complaint_updates_complaint_id_fkey" FOREIGN KEY ("complaint_id") REFERENCES "public"."complaints"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."complaints"
    ADD CONSTRAINT "complaints_branch_version_fk" FOREIGN KEY ("offer_version_id", "branch_id") REFERENCES "public"."offer_branches"("offer_version_id", "branch_id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."complaints"
    ADD CONSTRAINT "complaints_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."complaints"
    ADD CONSTRAINT "complaints_same_offer_version_fk" FOREIGN KEY ("offer_id", "offer_version_id") REFERENCES "public"."offer_versions"("offer_id", "id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."complaints"
    ADD CONSTRAINT "complaints_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."business_member_branches"
    ADD CONSTRAINT "member_branch_branch_fk" FOREIGN KEY ("business_id", "branch_id") REFERENCES "public"."business_branches"("business_id", "id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."business_member_branches"
    ADD CONSTRAINT "member_branch_member_fk" FOREIGN KEY ("business_id", "member_id") REFERENCES "public"."business_members"("business_id", "id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."offer_branches"
    ADD CONSTRAINT "offer_branches_same_business_branch_fk" FOREIGN KEY ("business_id", "branch_id") REFERENCES "public"."business_branches"("business_id", "id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."offer_branches"
    ADD CONSTRAINT "offer_branches_same_business_version_fk" FOREIGN KEY ("business_id", "offer_version_id") REFERENCES "public"."offer_versions"("business_id", "id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."offer_item_attributes"
    ADD CONSTRAINT "offer_item_attributes_offer_item_id_fkey" FOREIGN KEY ("offer_item_id") REFERENCES "public"."offer_items"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."offer_items"
    ADD CONSTRAINT "offer_items_offer_version_id_fkey" FOREIGN KEY ("offer_version_id") REFERENCES "public"."offer_versions"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."offer_media"
    ADD CONSTRAINT "offer_media_offer_version_id_fkey" FOREIGN KEY ("offer_version_id") REFERENCES "public"."offer_versions"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."offer_media"
    ADD CONSTRAINT "offer_media_version_item_fk" FOREIGN KEY ("offer_version_id", "offer_item_id") REFERENCES "public"."offer_items"("offer_version_id", "id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."offer_ratings"
    ADD CONSTRAINT "offer_ratings_moderated_by_user_id_fkey" FOREIGN KEY ("moderated_by_user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."offer_ratings"
    ADD CONSTRAINT "offer_ratings_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."offer_ratings"
    ADD CONSTRAINT "offer_ratings_same_offer_version_fk" FOREIGN KEY ("offer_id", "offer_version_id") REFERENCES "public"."offer_versions"("offer_id", "id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."offer_ratings"
    ADD CONSTRAINT "offer_ratings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."offer_reviews"
    ADD CONSTRAINT "offer_reviews_offer_version_id_fkey" FOREIGN KEY ("offer_version_id") REFERENCES "public"."offer_versions"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."offer_reviews"
    ADD CONSTRAINT "offer_reviews_reviewer_user_id_fkey" FOREIGN KEY ("reviewer_user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."offer_versions"
    ADD CONSTRAINT "offer_versions_business_offer_fk" FOREIGN KEY ("business_id", "offer_id") REFERENCES "public"."offers"("business_id", "id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."offer_versions"
    ADD CONSTRAINT "offer_versions_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."offers"
    ADD CONSTRAINT "offers_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."offers"
    ADD CONSTRAINT "offers_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."offers"
    ADD CONSTRAINT "offers_current_version_same_offer_fk" FOREIGN KEY ("id", "current_version_id") REFERENCES "public"."offer_versions"("offer_id", "id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."business_profile_revisions"
    ADD CONSTRAINT "profile_revision_branch_fk" FOREIGN KEY ("business_id", "branch_id") REFERENCES "public"."business_branches"("business_id", "id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."saved_businesses"
    ADD CONSTRAINT "saved_businesses_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."saved_businesses"
    ADD CONSTRAINT "saved_businesses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."saved_offers"
    ADD CONSTRAINT "saved_offers_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."saved_offers"
    ADD CONSTRAINT "saved_offers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."subscription_payments"
    ADD CONSTRAINT "subscription_payments_submitted_by_user_id_fkey" FOREIGN KEY ("submitted_by_user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."subscription_payments"
    ADD CONSTRAINT "subscription_payments_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "public"."business_subscriptions"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."subscription_payments"
    ADD CONSTRAINT "subscription_payments_verified_by_user_id_fkey" FOREIGN KEY ("verified_by_user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "wow_private"."admin_members"
    ADD CONSTRAINT "admin_members_granted_by_user_id_fkey" FOREIGN KEY ("granted_by_user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "wow_private"."admin_members"
    ADD CONSTRAINT "admin_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "wow_private"."billing_events"
    ADD CONSTRAINT "billing_events_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "wow_private"."billing_events"
    ADD CONSTRAINT "billing_events_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "wow_private"."category_assignment_events"
    ADD CONSTRAINT "category_assignment_events_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "wow_private"."category_assignment_events"
    ADD CONSTRAINT "category_assignment_events_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "wow_private"."merchant_operation_events"
    ADD CONSTRAINT "merchant_operation_events_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "wow_private"."merchant_operation_events"
    ADD CONSTRAINT "merchant_operation_events_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "wow_private"."rating_moderation_events"
    ADD CONSTRAINT "rating_moderation_events_rating_id_fkey" FOREIGN KEY ("rating_id") REFERENCES "public"."offer_ratings"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "wow_private"."rating_moderation_events"
    ADD CONSTRAINT "rating_moderation_events_reviewer_user_id_fkey" FOREIGN KEY ("reviewer_user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "wow_private"."verification_decisions"
    ADD CONSTRAINT "verification_decisions_reviewer_user_id_fkey" FOREIGN KEY ("reviewer_user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "wow_private"."verification_decisions"
    ADD CONSTRAINT "verification_decisions_verification_id_fkey" FOREIGN KEY ("verification_id") REFERENCES "public"."business_verifications"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "wow_private"."verification_submissions"
    ADD CONSTRAINT "verification_submissions_submitted_by_user_id_fkey" FOREIGN KEY ("submitted_by_user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "wow_private"."verification_submissions"
    ADD CONSTRAINT "verification_submissions_verification_id_fkey" FOREIGN KEY ("verification_id") REFERENCES "public"."business_verifications"("id") ON DELETE RESTRICT;



CREATE POLICY "Users can read own profile" ON "public"."users" FOR SELECT TO "authenticated" USING (("id" = ( SELECT ("auth"."jwt"() ->> 'sub'::"text"))));



ALTER TABLE "public"."business_branches" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "business_branches_scoped_read" ON "public"."business_branches" FOR SELECT TO "authenticated" USING ("wow_private"."can_read_branch"("business_id", "id"));



ALTER TABLE "public"."business_categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."business_member_branches" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "business_member_branches_owner_or_self_read" ON "public"."business_member_branches" FOR SELECT TO "authenticated" USING ("wow_private"."can_read_assignment"("business_id", "member_id"));



ALTER TABLE "public"."business_members" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "business_members_owner_or_self_read" ON "public"."business_members" FOR SELECT TO "authenticated" USING (("wow_private"."is_business_owner"("business_id") OR (("user_id" = ( SELECT ("auth"."jwt"() ->> 'sub'::"text"))) AND "wow_private"."is_business_member"("business_id"))));



ALTER TABLE "public"."business_profile_revisions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."business_subscriptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."business_verifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."businesses" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "businesses_member_read" ON "public"."businesses" FOR SELECT TO "authenticated" USING ("wow_private"."is_business_member"("id"));



ALTER TABLE "public"."categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."commercial_agreements" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."complaint_updates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."complaints" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."offer_branches" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "offer_branches_member_read" ON "public"."offer_branches" FOR SELECT TO "authenticated" USING (("wow_private"."can_read_offer_version"("offer_version_id") AND "wow_private"."can_read_branch"("business_id", "branch_id")));



ALTER TABLE "public"."offer_item_attributes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "offer_item_attributes_member_read" ON "public"."offer_item_attributes" FOR SELECT TO "authenticated" USING ("wow_private"."can_read_offer_item"("offer_item_id"));



ALTER TABLE "public"."offer_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "offer_items_member_read" ON "public"."offer_items" FOR SELECT TO "authenticated" USING ("wow_private"."can_read_offer_version"("offer_version_id"));



ALTER TABLE "public"."offer_media" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "offer_media_member_read" ON "public"."offer_media" FOR SELECT TO "authenticated" USING ("wow_private"."can_read_offer_version"("offer_version_id"));



ALTER TABLE "public"."offer_ratings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."offer_reviews" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."offer_versions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "offer_versions_member_read" ON "public"."offer_versions" FOR SELECT TO "authenticated" USING ("wow_private"."can_read_offer_version"("id"));



ALTER TABLE "public"."offers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "offers_member_read" ON "public"."offers" FOR SELECT TO "authenticated" USING ("wow_private"."can_read_offer"("id"));



ALTER TABLE "public"."saved_businesses" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "saved_businesses_read_self" ON "public"."saved_businesses" FOR SELECT TO "authenticated" USING ((("user_id" = ( SELECT ("auth"."jwt"() ->> 'sub'::"text"))) AND (( SELECT ("auth"."jwt"() ->> 'role'::"text")) = 'authenticated'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."id" = "saved_businesses"."user_id") AND ("u"."account_status" = 'active'::"text") AND ("u"."deleted_at" IS NULL))))));



ALTER TABLE "public"."saved_offers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "saved_offers_read_self" ON "public"."saved_offers" FOR SELECT TO "authenticated" USING ((("user_id" = ( SELECT ("auth"."jwt"() ->> 'sub'::"text"))) AND (( SELECT ("auth"."jwt"() ->> 'role'::"text")) = 'authenticated'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."id" = "saved_offers"."user_id") AND ("u"."account_status" = 'active'::"text") AND ("u"."deleted_at" IS NULL))))));



ALTER TABLE "public"."subscription_payments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."subscription_plans" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "wow_private"."admin_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "wow_private"."billing_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "wow_private"."category_assignment_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "wow_private"."merchant_operation_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "wow_private"."rating_moderation_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "wow_private"."verification_decisions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "wow_private"."verification_submissions" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT USAGE ON SCHEMA "wow_private" TO "authenticated";
GRANT USAGE ON SCHEMA "wow_private" TO "anon";






















































































































































REVOKE ALL ON FUNCTION "public"."sync_clerk_user"("p_event_id" "text", "p_event_type" "text", "p_user_id" "text", "p_event_at" timestamp with time zone, "p_clerk_updated_at" timestamp with time zone, "p_email" "text", "p_full_name" "text", "p_avatar_url" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."sync_clerk_user"("p_event_id" "text", "p_event_type" "text", "p_user_id" "text", "p_event_at" timestamp with time zone, "p_clerk_updated_at" timestamp with time zone, "p_email" "text", "p_full_name" "text", "p_avatar_url" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."wow_activate_business_trial"("p_business_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."wow_activate_business_trial"("p_business_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."wow_activate_business_trial"("p_business_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."wow_admin_configure_subscription_plan"("p_code" "text", "p_price" numeric, "p_currency" "text", "p_duration_days" integer, "p_feature_limits" "jsonb", "p_active" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."wow_admin_configure_subscription_plan"("p_code" "text", "p_price" numeric, "p_currency" "text", "p_duration_days" integer, "p_feature_limits" "jsonb", "p_active" boolean) TO "service_role";
GRANT ALL ON FUNCTION "public"."wow_admin_configure_subscription_plan"("p_code" "text", "p_price" numeric, "p_currency" "text", "p_duration_days" integer, "p_feature_limits" "jsonb", "p_active" boolean) TO "authenticated";



REVOKE ALL ON FUNCTION "public"."wow_admin_create_commercial_agreement"("p_business_id" "uuid", "p_agreement_type" "text", "p_grants_publication" boolean, "p_starts_at" timestamp with time zone, "p_ends_at" timestamp with time zone, "p_terms_snapshot" "jsonb", "p_reason" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."wow_admin_create_commercial_agreement"("p_business_id" "uuid", "p_agreement_type" "text", "p_grants_publication" boolean, "p_starts_at" timestamp with time zone, "p_ends_at" timestamp with time zone, "p_terms_snapshot" "jsonb", "p_reason" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."wow_admin_create_commercial_agreement"("p_business_id" "uuid", "p_agreement_type" "text", "p_grants_publication" boolean, "p_starts_at" timestamp with time zone, "p_ends_at" timestamp with time zone, "p_terms_snapshot" "jsonb", "p_reason" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."wow_admin_decide_business_verification"("p_verification_id" "uuid", "p_decision" "text", "p_reason" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."wow_admin_decide_business_verification"("p_verification_id" "uuid", "p_decision" "text", "p_reason" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."wow_admin_decide_business_verification"("p_verification_id" "uuid", "p_decision" "text", "p_reason" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."wow_admin_decide_offer"("p_version_id" "uuid", "p_decision" "text", "p_reason" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."wow_admin_decide_offer"("p_version_id" "uuid", "p_decision" "text", "p_reason" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."wow_admin_decide_offer"("p_version_id" "uuid", "p_decision" "text", "p_reason" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."wow_admin_decide_profile_revision"("p_revision_id" "uuid", "p_decision" "text", "p_reason" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."wow_admin_decide_profile_revision"("p_revision_id" "uuid", "p_decision" "text", "p_reason" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."wow_admin_decide_profile_revision"("p_revision_id" "uuid", "p_decision" "text", "p_reason" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."wow_admin_decide_subscription_payment"("p_payment_id" "uuid", "p_approve" boolean, "p_note" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."wow_admin_decide_subscription_payment"("p_payment_id" "uuid", "p_approve" boolean, "p_note" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."wow_admin_decide_subscription_payment"("p_payment_id" "uuid", "p_approve" boolean, "p_note" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."wow_admin_get_business_verification"("p_verification_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."wow_admin_get_business_verification"("p_verification_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."wow_admin_get_business_verification"("p_verification_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."wow_admin_get_complaint"("p_complaint_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."wow_admin_get_complaint"("p_complaint_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."wow_admin_get_complaint"("p_complaint_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."wow_admin_get_offer_review"("p_version_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."wow_admin_get_offer_review"("p_version_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."wow_admin_get_offer_review"("p_version_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."wow_admin_list_business_verifications"("p_status" "text", "p_limit" integer, "p_offset" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."wow_admin_list_business_verifications"("p_status" "text", "p_limit" integer, "p_offset" integer) TO "service_role";
GRANT ALL ON FUNCTION "public"."wow_admin_list_business_verifications"("p_status" "text", "p_limit" integer, "p_offset" integer) TO "authenticated";



REVOKE ALL ON FUNCTION "public"."wow_admin_list_complaints"("p_status" "text", "p_limit" integer, "p_offset" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."wow_admin_list_complaints"("p_status" "text", "p_limit" integer, "p_offset" integer) TO "service_role";
GRANT ALL ON FUNCTION "public"."wow_admin_list_complaints"("p_status" "text", "p_limit" integer, "p_offset" integer) TO "authenticated";



REVOKE ALL ON FUNCTION "public"."wow_admin_list_pending_offers"("p_limit" integer, "p_offset" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."wow_admin_list_pending_offers"("p_limit" integer, "p_offset" integer) TO "service_role";
GRANT ALL ON FUNCTION "public"."wow_admin_list_pending_offers"("p_limit" integer, "p_offset" integer) TO "authenticated";



REVOKE ALL ON FUNCTION "public"."wow_admin_list_profile_revisions"("p_limit" integer, "p_offset" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."wow_admin_list_profile_revisions"("p_limit" integer, "p_offset" integer) TO "service_role";
GRANT ALL ON FUNCTION "public"."wow_admin_list_profile_revisions"("p_limit" integer, "p_offset" integer) TO "authenticated";



REVOKE ALL ON FUNCTION "public"."wow_admin_list_ratings"("p_moderation_status" "text", "p_limit" integer, "p_offset" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."wow_admin_list_ratings"("p_moderation_status" "text", "p_limit" integer, "p_offset" integer) TO "service_role";
GRANT ALL ON FUNCTION "public"."wow_admin_list_ratings"("p_moderation_status" "text", "p_limit" integer, "p_offset" integer) TO "authenticated";



REVOKE ALL ON FUNCTION "public"."wow_admin_list_subscription_payments"("p_status" "text", "p_limit" integer, "p_offset" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."wow_admin_list_subscription_payments"("p_status" "text", "p_limit" integer, "p_offset" integer) TO "service_role";
GRANT ALL ON FUNCTION "public"."wow_admin_list_subscription_payments"("p_status" "text", "p_limit" integer, "p_offset" integer) TO "authenticated";



REVOKE ALL ON FUNCTION "public"."wow_admin_moderate_rating"("p_rating_id" "uuid", "p_status" "text", "p_reason" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."wow_admin_moderate_rating"("p_rating_id" "uuid", "p_status" "text", "p_reason" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."wow_admin_moderate_rating"("p_rating_id" "uuid", "p_status" "text", "p_reason" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."wow_admin_revoke_commercial_agreement"("p_agreement_id" "uuid", "p_reason" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."wow_admin_revoke_commercial_agreement"("p_agreement_id" "uuid", "p_reason" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."wow_admin_revoke_commercial_agreement"("p_agreement_id" "uuid", "p_reason" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."wow_admin_set_business_categories"("p_business_id" "uuid", "p_category_ids" "uuid"[], "p_primary_category_id" "uuid", "p_reason" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."wow_admin_set_business_categories"("p_business_id" "uuid", "p_category_ids" "uuid"[], "p_primary_category_id" "uuid", "p_reason" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."wow_admin_set_business_categories"("p_business_id" "uuid", "p_category_ids" "uuid"[], "p_primary_category_id" "uuid", "p_reason" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."wow_admin_update_complaint"("p_complaint_id" "uuid", "p_status" "text", "p_note" "text", "p_public_outcome" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."wow_admin_update_complaint"("p_complaint_id" "uuid", "p_status" "text", "p_note" "text", "p_public_outcome" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."wow_admin_update_complaint"("p_complaint_id" "uuid", "p_status" "text", "p_note" "text", "p_public_outcome" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."wow_admin_upsert_category"("p_id" "uuid", "p_slug" "text", "p_name_ar" "text", "p_name_en" "text", "p_parent_id" "uuid", "p_sort_order" integer, "p_is_active" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."wow_admin_upsert_category"("p_id" "uuid", "p_slug" "text", "p_name_ar" "text", "p_name_en" "text", "p_parent_id" "uuid", "p_sort_order" integer, "p_is_active" boolean) TO "service_role";
GRANT ALL ON FUNCTION "public"."wow_admin_upsert_category"("p_id" "uuid", "p_slug" "text", "p_name_ar" "text", "p_name_en" "text", "p_parent_id" "uuid", "p_sort_order" integer, "p_is_active" boolean) TO "authenticated";



REVOKE ALL ON FUNCTION "public"."wow_attach_complaint_evidence"("p_complaint_id" "uuid", "p_storage_key" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."wow_attach_complaint_evidence"("p_complaint_id" "uuid", "p_storage_key" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."wow_attach_complaint_evidence"("p_complaint_id" "uuid", "p_storage_key" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."wow_attach_offer_media"("p_version_id" "uuid", "p_storage_key" "text", "p_item_id" "uuid", "p_alt_text" "text", "p_is_cover" boolean, "p_sort_order" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."wow_attach_offer_media"("p_version_id" "uuid", "p_storage_key" "text", "p_item_id" "uuid", "p_alt_text" "text", "p_is_cover" boolean, "p_sort_order" integer) TO "service_role";
GRANT ALL ON FUNCTION "public"."wow_attach_offer_media"("p_version_id" "uuid", "p_storage_key" "text", "p_item_id" "uuid", "p_alt_text" "text", "p_is_cover" boolean, "p_sort_order" integer) TO "authenticated";



REVOKE ALL ON FUNCTION "public"."wow_create_branch"("p_business_id" "uuid", "p_name" "text", "p_city" "text", "p_address_line" "text", "p_district" "text", "p_latitude" numeric, "p_longitude" numeric) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."wow_create_branch"("p_business_id" "uuid", "p_name" "text", "p_city" "text", "p_address_line" "text", "p_district" "text", "p_latitude" numeric, "p_longitude" numeric) TO "service_role";
GRANT ALL ON FUNCTION "public"."wow_create_branch"("p_business_id" "uuid", "p_name" "text", "p_city" "text", "p_address_line" "text", "p_district" "text", "p_latitude" numeric, "p_longitude" numeric) TO "authenticated";



REVOKE ALL ON FUNCTION "public"."wow_create_business"("p_name" "text", "p_description" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."wow_create_business"("p_name" "text", "p_description" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."wow_create_business"("p_name" "text", "p_description" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."wow_create_offer"("p_business_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."wow_create_offer"("p_business_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."wow_create_offer"("p_business_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."wow_get_business_billing"("p_business_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."wow_get_business_billing"("p_business_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."wow_get_business_billing"("p_business_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."wow_get_business_complaints"("p_business_id" "uuid", "p_limit" integer, "p_offset" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."wow_get_business_complaints"("p_business_id" "uuid", "p_limit" integer, "p_offset" integer) TO "service_role";
GRANT ALL ON FUNCTION "public"."wow_get_business_complaints"("p_business_id" "uuid", "p_limit" integer, "p_offset" integer) TO "authenticated";



REVOKE ALL ON FUNCTION "public"."wow_get_my_business_verifications"("p_business_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."wow_get_my_business_verifications"("p_business_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."wow_get_my_business_verifications"("p_business_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."wow_get_my_complaints"("p_limit" integer, "p_offset" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."wow_get_my_complaints"("p_limit" integer, "p_offset" integer) TO "service_role";
GRANT ALL ON FUNCTION "public"."wow_get_my_complaints"("p_limit" integer, "p_offset" integer) TO "authenticated";



REVOKE ALL ON FUNCTION "public"."wow_get_my_ratings"("p_limit" integer, "p_offset" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."wow_get_my_ratings"("p_limit" integer, "p_offset" integer) TO "service_role";
GRANT ALL ON FUNCTION "public"."wow_get_my_ratings"("p_limit" integer, "p_offset" integer) TO "authenticated";



REVOKE ALL ON FUNCTION "public"."wow_list_business_team"("p_business_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."wow_list_business_team"("p_business_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."wow_list_business_team"("p_business_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."wow_list_my_profile_revisions"("p_business_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."wow_list_my_profile_revisions"("p_business_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."wow_list_my_profile_revisions"("p_business_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."wow_list_subscription_plans"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."wow_list_subscription_plans"() TO "service_role";
GRANT ALL ON FUNCTION "public"."wow_list_subscription_plans"() TO "authenticated";



REVOKE ALL ON FUNCTION "public"."wow_merchant_respond_complaint"("p_complaint_id" "uuid", "p_message" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."wow_merchant_respond_complaint"("p_complaint_id" "uuid", "p_message" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."wow_merchant_respond_complaint"("p_complaint_id" "uuid", "p_message" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."wow_public_get_business"("p_business_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."wow_public_get_business"("p_business_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."wow_public_get_business"("p_business_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."wow_public_get_business"("p_business_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."wow_public_get_offer"("p_offer_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."wow_public_get_offer"("p_offer_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."wow_public_get_offer"("p_offer_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."wow_public_get_offer"("p_offer_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."wow_public_get_offer_media"("p_offer_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."wow_public_get_offer_media"("p_offer_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."wow_public_get_offer_media"("p_offer_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."wow_public_get_offer_media"("p_offer_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."wow_public_list_categories"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."wow_public_list_categories"() TO "service_role";
GRANT ALL ON FUNCTION "public"."wow_public_list_categories"() TO "anon";
GRANT ALL ON FUNCTION "public"."wow_public_list_categories"() TO "authenticated";



REVOKE ALL ON FUNCTION "public"."wow_public_search_businesses"("p_query" "text", "p_city" "text", "p_district" "text", "p_category_id" "uuid", "p_sort" "text", "p_limit" integer, "p_offset" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."wow_public_search_businesses"("p_query" "text", "p_city" "text", "p_district" "text", "p_category_id" "uuid", "p_sort" "text", "p_limit" integer, "p_offset" integer) TO "service_role";
GRANT ALL ON FUNCTION "public"."wow_public_search_businesses"("p_query" "text", "p_city" "text", "p_district" "text", "p_category_id" "uuid", "p_sort" "text", "p_limit" integer, "p_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."wow_public_search_businesses"("p_query" "text", "p_city" "text", "p_district" "text", "p_category_id" "uuid", "p_sort" "text", "p_limit" integer, "p_offset" integer) TO "authenticated";



REVOKE ALL ON FUNCTION "public"."wow_rate_offer"("p_offer_id" "uuid", "p_conformity" "text", "p_experience_stars" smallint) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."wow_rate_offer"("p_offer_id" "uuid", "p_conformity" "text", "p_experience_stars" smallint) TO "service_role";
GRANT ALL ON FUNCTION "public"."wow_rate_offer"("p_offer_id" "uuid", "p_conformity" "text", "p_experience_stars" smallint) TO "authenticated";



REVOKE ALL ON FUNCTION "public"."wow_request_paid_subscription"("p_business_id" "uuid", "p_plan_code" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."wow_request_paid_subscription"("p_business_id" "uuid", "p_plan_code" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."wow_request_paid_subscription"("p_business_id" "uuid", "p_plan_code" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."wow_resubmit_business_verification"("p_verification_id" "uuid", "p_evidence_refs" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."wow_resubmit_business_verification"("p_verification_id" "uuid", "p_evidence_refs" "jsonb") TO "service_role";
GRANT ALL ON FUNCTION "public"."wow_resubmit_business_verification"("p_verification_id" "uuid", "p_evidence_refs" "jsonb") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."wow_save_offer_draft"("p_offer_id" "uuid", "p_payload" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."wow_save_offer_draft"("p_offer_id" "uuid", "p_payload" "jsonb") TO "service_role";
GRANT ALL ON FUNCTION "public"."wow_save_offer_draft"("p_offer_id" "uuid", "p_payload" "jsonb") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."wow_set_branch_pause"("p_branch_id" "uuid", "p_pause" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."wow_set_branch_pause"("p_branch_id" "uuid", "p_pause" boolean) TO "service_role";
GRANT ALL ON FUNCTION "public"."wow_set_branch_pause"("p_branch_id" "uuid", "p_pause" boolean) TO "authenticated";



REVOKE ALL ON FUNCTION "public"."wow_set_business_pause"("p_business_id" "uuid", "p_pause" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."wow_set_business_pause"("p_business_id" "uuid", "p_pause" boolean) TO "service_role";
GRANT ALL ON FUNCTION "public"."wow_set_business_pause"("p_business_id" "uuid", "p_pause" boolean) TO "authenticated";



REVOKE ALL ON FUNCTION "public"."wow_set_employee_access"("p_business_id" "uuid", "p_user_id" "text", "p_action" "text", "p_permissions" "jsonb", "p_branch_ids" "uuid"[]) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."wow_set_employee_access"("p_business_id" "uuid", "p_user_id" "text", "p_action" "text", "p_permissions" "jsonb", "p_branch_ids" "uuid"[]) TO "service_role";
GRANT ALL ON FUNCTION "public"."wow_set_employee_access"("p_business_id" "uuid", "p_user_id" "text", "p_action" "text", "p_permissions" "jsonb", "p_branch_ids" "uuid"[]) TO "authenticated";



REVOKE ALL ON FUNCTION "public"."wow_set_offer_availability"("p_offer_id" "uuid", "p_available" boolean, "p_paused" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."wow_set_offer_availability"("p_offer_id" "uuid", "p_available" boolean, "p_paused" boolean) TO "service_role";
GRANT ALL ON FUNCTION "public"."wow_set_offer_availability"("p_offer_id" "uuid", "p_available" boolean, "p_paused" boolean) TO "authenticated";



REVOKE ALL ON FUNCTION "public"."wow_set_saved_business"("p_business_id" "uuid", "p_save" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."wow_set_saved_business"("p_business_id" "uuid", "p_save" boolean) TO "service_role";
GRANT ALL ON FUNCTION "public"."wow_set_saved_business"("p_business_id" "uuid", "p_save" boolean) TO "authenticated";



REVOKE ALL ON FUNCTION "public"."wow_set_saved_offer"("p_offer_id" "uuid", "p_save" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."wow_set_saved_offer"("p_offer_id" "uuid", "p_save" boolean) TO "service_role";
GRANT ALL ON FUNCTION "public"."wow_set_saved_offer"("p_offer_id" "uuid", "p_save" boolean) TO "authenticated";



REVOKE ALL ON FUNCTION "public"."wow_submit_business_verification"("p_business_id" "uuid", "p_branch_id" "uuid", "p_request_type" "text", "p_evidence_refs" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."wow_submit_business_verification"("p_business_id" "uuid", "p_branch_id" "uuid", "p_request_type" "text", "p_evidence_refs" "jsonb") TO "service_role";
GRANT ALL ON FUNCTION "public"."wow_submit_business_verification"("p_business_id" "uuid", "p_branch_id" "uuid", "p_request_type" "text", "p_evidence_refs" "jsonb") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."wow_submit_complaint"("p_offer_id" "uuid", "p_complaint_type" "text", "p_description" "text", "p_offer_version_id" "uuid", "p_branch_id" "uuid", "p_incident_at" timestamp with time zone, "p_private_evidence_keys" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."wow_submit_complaint"("p_offer_id" "uuid", "p_complaint_type" "text", "p_description" "text", "p_offer_version_id" "uuid", "p_branch_id" "uuid", "p_incident_at" timestamp with time zone, "p_private_evidence_keys" "jsonb") TO "service_role";
GRANT ALL ON FUNCTION "public"."wow_submit_complaint"("p_offer_id" "uuid", "p_complaint_type" "text", "p_description" "text", "p_offer_version_id" "uuid", "p_branch_id" "uuid", "p_incident_at" timestamp with time zone, "p_private_evidence_keys" "jsonb") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."wow_submit_offer"("p_offer_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."wow_submit_offer"("p_offer_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."wow_submit_offer"("p_offer_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."wow_submit_profile_revision"("p_business_id" "uuid", "p_branch_id" "uuid", "p_patch" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."wow_submit_profile_revision"("p_business_id" "uuid", "p_branch_id" "uuid", "p_patch" "jsonb") TO "service_role";
GRANT ALL ON FUNCTION "public"."wow_submit_profile_revision"("p_business_id" "uuid", "p_branch_id" "uuid", "p_patch" "jsonb") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."wow_submit_subscription_payment"("p_subscription_id" "uuid", "p_method" "text", "p_reference" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."wow_submit_subscription_payment"("p_subscription_id" "uuid", "p_method" "text", "p_reference" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."wow_submit_subscription_payment"("p_subscription_id" "uuid", "p_method" "text", "p_reference" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."wow_test_auth"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."wow_test_auth"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."wow_test_auth"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."wow_update_merchant_draft"("p_business_id" "uuid", "p_branch_id" "uuid", "p_patch" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."wow_update_merchant_draft"("p_business_id" "uuid", "p_branch_id" "uuid", "p_patch" "jsonb") TO "service_role";
GRANT ALL ON FUNCTION "public"."wow_update_merchant_draft"("p_business_id" "uuid", "p_branch_id" "uuid", "p_patch" "jsonb") TO "authenticated";












REVOKE ALL ON FUNCTION "wow_private"."activate_business_trial_internal"("p_business_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "wow_private"."activate_business_trial_internal"("p_business_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "wow_private"."admin_configure_subscription_plan_internal"("p_code" "text", "p_price" numeric, "p_currency" "text", "p_duration_days" integer, "p_feature_limits" "jsonb", "p_active" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "wow_private"."admin_configure_subscription_plan_internal"("p_code" "text", "p_price" numeric, "p_currency" "text", "p_duration_days" integer, "p_feature_limits" "jsonb", "p_active" boolean) TO "authenticated";



REVOKE ALL ON FUNCTION "wow_private"."admin_create_commercial_agreement_internal"("p_business_id" "uuid", "p_agreement_type" "text", "p_grants_publication" boolean, "p_starts_at" timestamp with time zone, "p_ends_at" timestamp with time zone, "p_terms_snapshot" "jsonb", "p_reason" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "wow_private"."admin_create_commercial_agreement_internal"("p_business_id" "uuid", "p_agreement_type" "text", "p_grants_publication" boolean, "p_starts_at" timestamp with time zone, "p_ends_at" timestamp with time zone, "p_terms_snapshot" "jsonb", "p_reason" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "wow_private"."admin_decide_offer_internal"("p_version_id" "uuid", "p_decision" "text", "p_reason" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "wow_private"."admin_decide_offer_internal"("p_version_id" "uuid", "p_decision" "text", "p_reason" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "wow_private"."admin_decide_profile_revision_internal"("p_revision_id" "uuid", "p_decision" "text", "p_reason" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "wow_private"."admin_decide_profile_revision_internal"("p_revision_id" "uuid", "p_decision" "text", "p_reason" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "wow_private"."admin_decide_subscription_payment_internal"("p_payment_id" "uuid", "p_approve" boolean, "p_note" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "wow_private"."admin_decide_subscription_payment_internal"("p_payment_id" "uuid", "p_approve" boolean, "p_note" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "wow_private"."admin_decide_verification_internal"("p_verification_id" "uuid", "p_decision" "text", "p_reason" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "wow_private"."admin_decide_verification_internal"("p_verification_id" "uuid", "p_decision" "text", "p_reason" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "wow_private"."admin_get_complaint_internal"("p_complaint_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "wow_private"."admin_get_complaint_internal"("p_complaint_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "wow_private"."admin_get_offer_review_internal"("p_version_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "wow_private"."admin_get_offer_review_internal"("p_version_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "wow_private"."admin_get_verification_internal"("p_verification_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "wow_private"."admin_get_verification_internal"("p_verification_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "wow_private"."admin_list_complaints_internal"("p_status" "text", "p_limit" integer, "p_offset" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "wow_private"."admin_list_complaints_internal"("p_status" "text", "p_limit" integer, "p_offset" integer) TO "authenticated";



REVOKE ALL ON FUNCTION "wow_private"."admin_list_pending_offers_internal"("p_limit" integer, "p_offset" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "wow_private"."admin_list_pending_offers_internal"("p_limit" integer, "p_offset" integer) TO "authenticated";



REVOKE ALL ON FUNCTION "wow_private"."admin_list_profile_revisions_internal"("p_limit" integer, "p_offset" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "wow_private"."admin_list_profile_revisions_internal"("p_limit" integer, "p_offset" integer) TO "authenticated";



REVOKE ALL ON FUNCTION "wow_private"."admin_list_ratings_internal"("p_moderation_status" "text", "p_limit" integer, "p_offset" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "wow_private"."admin_list_ratings_internal"("p_moderation_status" "text", "p_limit" integer, "p_offset" integer) TO "authenticated";



REVOKE ALL ON FUNCTION "wow_private"."admin_list_subscription_payments_internal"("p_status" "text", "p_limit" integer, "p_offset" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "wow_private"."admin_list_subscription_payments_internal"("p_status" "text", "p_limit" integer, "p_offset" integer) TO "authenticated";



REVOKE ALL ON FUNCTION "wow_private"."admin_list_verifications_internal"("p_status" "text", "p_limit" integer, "p_offset" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "wow_private"."admin_list_verifications_internal"("p_status" "text", "p_limit" integer, "p_offset" integer) TO "authenticated";



REVOKE ALL ON FUNCTION "wow_private"."admin_moderate_rating_internal"("p_rating_id" "uuid", "p_status" "text", "p_reason" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "wow_private"."admin_moderate_rating_internal"("p_rating_id" "uuid", "p_status" "text", "p_reason" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "wow_private"."admin_revoke_commercial_agreement_internal"("p_agreement_id" "uuid", "p_reason" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "wow_private"."admin_revoke_commercial_agreement_internal"("p_agreement_id" "uuid", "p_reason" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "wow_private"."admin_set_business_categories_internal"("p_business_id" "uuid", "p_category_ids" "uuid"[], "p_primary_category_id" "uuid", "p_reason" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "wow_private"."admin_set_business_categories_internal"("p_business_id" "uuid", "p_category_ids" "uuid"[], "p_primary_category_id" "uuid", "p_reason" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "wow_private"."admin_update_complaint_internal"("p_complaint_id" "uuid", "p_status" "text", "p_note" "text", "p_public_outcome" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "wow_private"."admin_update_complaint_internal"("p_complaint_id" "uuid", "p_status" "text", "p_note" "text", "p_public_outcome" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "wow_private"."admin_upsert_category_internal"("p_id" "uuid", "p_slug" "text", "p_name_ar" "text", "p_name_en" "text", "p_parent_id" "uuid", "p_sort_order" integer, "p_is_active" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "wow_private"."admin_upsert_category_internal"("p_id" "uuid", "p_slug" "text", "p_name_ar" "text", "p_name_en" "text", "p_parent_id" "uuid", "p_sort_order" integer, "p_is_active" boolean) TO "authenticated";



REVOKE ALL ON FUNCTION "wow_private"."apply_merchant_profile_patch"("p_business_id" "uuid", "p_branch_id" "uuid", "p_patch" "jsonb") FROM PUBLIC;



REVOKE ALL ON FUNCTION "wow_private"."assert_billing_admin"("p_super_only" boolean, "p_business_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "wow_private"."assert_billing_admin"("p_super_only" boolean, "p_business_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "wow_private"."assert_billing_owner"("p_business_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "wow_private"."assert_billing_owner"("p_business_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "wow_private"."attach_complaint_evidence_internal"("p_complaint_id" "uuid", "p_storage_key" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "wow_private"."attach_complaint_evidence_internal"("p_complaint_id" "uuid", "p_storage_key" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "wow_private"."attach_offer_media_internal"("p_version_id" "uuid", "p_storage_key" "text", "p_item_id" "uuid", "p_alt_text" "text", "p_is_cover" boolean, "p_sort_order" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "wow_private"."attach_offer_media_internal"("p_version_id" "uuid", "p_storage_key" "text", "p_item_id" "uuid", "p_alt_text" "text", "p_is_cover" boolean, "p_sort_order" integer) TO "authenticated";



REVOKE ALL ON FUNCTION "wow_private"."can_manage_offer_business"("p_business_id" "uuid", "p_action" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "wow_private"."can_manage_offer_business"("p_business_id" "uuid", "p_action" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "wow_private"."can_read_assignment"("p_business_id" "uuid", "p_member_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "wow_private"."can_read_assignment"("p_business_id" "uuid", "p_member_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "wow_private"."can_read_branch"("p_business_id" "uuid", "p_branch_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "wow_private"."can_read_branch"("p_business_id" "uuid", "p_branch_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "wow_private"."can_read_offer"("p_offer_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "wow_private"."can_read_offer"("p_offer_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "wow_private"."can_read_offer_item"("p_offer_item_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "wow_private"."can_read_offer_item"("p_offer_item_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "wow_private"."can_read_offer_version"("p_offer_version_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "wow_private"."can_read_offer_version"("p_offer_version_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "wow_private"."can_read_wow_object"("p_bucket" "text", "p_key" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "wow_private"."can_read_wow_object"("p_bucket" "text", "p_key" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "wow_private"."can_save_business"("p_business_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "wow_private"."can_save_business"("p_business_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "wow_private"."can_save_offer"("p_offer_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "wow_private"."can_save_offer"("p_offer_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "wow_private"."can_upload_wow_object"("p_bucket" "text", "p_key" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "wow_private"."can_upload_wow_object"("p_bucket" "text", "p_key" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "wow_private"."create_branch_internal"("p_business_id" "uuid", "p_name" "text", "p_city" "text", "p_address_line" "text", "p_district" "text", "p_latitude" numeric, "p_longitude" numeric) FROM PUBLIC;
GRANT ALL ON FUNCTION "wow_private"."create_branch_internal"("p_business_id" "uuid", "p_name" "text", "p_city" "text", "p_address_line" "text", "p_district" "text", "p_latitude" numeric, "p_longitude" numeric) TO "authenticated";



REVOKE ALL ON FUNCTION "wow_private"."create_business_internal"("p_name" "text", "p_description" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "wow_private"."create_business_internal"("p_name" "text", "p_description" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "wow_private"."create_offer_internal"("p_business_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "wow_private"."create_offer_internal"("p_business_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "wow_private"."current_active_customer_id"() FROM PUBLIC;
GRANT ALL ON FUNCTION "wow_private"."current_active_customer_id"() TO "authenticated";



REVOKE ALL ON FUNCTION "wow_private"."discoverable_offer_branches"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "wow_private"."get_business_billing_internal"("p_business_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "wow_private"."get_business_billing_internal"("p_business_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "wow_private"."guard_offer_child_draft"() FROM PUBLIC;
GRANT ALL ON FUNCTION "wow_private"."guard_offer_child_draft"() TO "authenticated";



REVOKE ALL ON FUNCTION "wow_private"."guard_offer_current_version"() FROM PUBLIC;
GRANT ALL ON FUNCTION "wow_private"."guard_offer_current_version"() TO "authenticated";



REVOKE ALL ON FUNCTION "wow_private"."guard_offer_employee_branch_scope"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "wow_private"."guard_offer_employee_submission_scope"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "wow_private"."guard_offer_version_immutable"() FROM PUBLIC;
GRANT ALL ON FUNCTION "wow_private"."guard_offer_version_immutable"() TO "authenticated";



REVOKE ALL ON FUNCTION "wow_private"."has_admin_permission"("p_review" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "wow_private"."has_admin_permission"("p_review" boolean) TO "authenticated";



REVOKE ALL ON FUNCTION "wow_private"."has_publication_entitlement"("p_business_id" "uuid") FROM PUBLIC;



REVOKE ALL ON FUNCTION "wow_private"."is_business_member"("p_business_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "wow_private"."is_business_member"("p_business_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "wow_private"."is_business_owner"("p_business_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "wow_private"."is_business_owner"("p_business_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "wow_private"."is_public_offer_object"("p_key" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "wow_private"."is_public_offer_object"("p_key" "text") TO "anon";
GRANT ALL ON FUNCTION "wow_private"."is_public_offer_object"("p_key" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "wow_private"."list_business_team_internal"("p_business_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "wow_private"."list_business_team_internal"("p_business_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "wow_private"."list_my_profile_revisions_internal"("p_business_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "wow_private"."list_my_profile_revisions_internal"("p_business_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "wow_private"."list_subscription_plans_internal"() FROM PUBLIC;
GRANT ALL ON FUNCTION "wow_private"."list_subscription_plans_internal"() TO "authenticated";



REVOKE ALL ON FUNCTION "wow_private"."merchant_complaints_internal"("p_business_id" "uuid", "p_limit" integer, "p_offset" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "wow_private"."merchant_complaints_internal"("p_business_id" "uuid", "p_limit" integer, "p_offset" integer) TO "authenticated";



REVOKE ALL ON FUNCTION "wow_private"."merchant_respond_complaint_internal"("p_complaint_id" "uuid", "p_message" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "wow_private"."merchant_respond_complaint_internal"("p_complaint_id" "uuid", "p_message" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "wow_private"."my_complaints_internal"("p_limit" integer, "p_offset" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "wow_private"."my_complaints_internal"("p_limit" integer, "p_offset" integer) TO "authenticated";



REVOKE ALL ON FUNCTION "wow_private"."my_ratings_internal"("p_limit" integer, "p_offset" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "wow_private"."my_ratings_internal"("p_limit" integer, "p_offset" integer) TO "authenticated";



REVOKE ALL ON FUNCTION "wow_private"."my_verifications_internal"("p_business_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "wow_private"."my_verifications_internal"("p_business_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "wow_private"."public_get_business_internal"("p_business_id" "uuid") FROM PUBLIC;



REVOKE ALL ON FUNCTION "wow_private"."public_get_offer_internal"("p_offer_id" "uuid") FROM PUBLIC;



REVOKE ALL ON FUNCTION "wow_private"."public_list_categories_internal"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "wow_private"."public_offer_media_internal"("p_offer_id" "uuid") FROM PUBLIC;



REVOKE ALL ON FUNCTION "wow_private"."public_search_businesses_internal"("p_query" "text", "p_city" "text", "p_district" "text", "p_category_id" "uuid", "p_sort" "text", "p_limit" integer, "p_offset" integer) FROM PUBLIC;



REVOKE ALL ON FUNCTION "wow_private"."rate_offer_internal"("p_offer_id" "uuid", "p_conformity" "text", "p_experience_stars" smallint) FROM PUBLIC;
GRANT ALL ON FUNCTION "wow_private"."rate_offer_internal"("p_offer_id" "uuid", "p_conformity" "text", "p_experience_stars" smallint) TO "authenticated";



REVOKE ALL ON FUNCTION "wow_private"."request_paid_subscription_internal"("p_business_id" "uuid", "p_plan_code" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "wow_private"."request_paid_subscription_internal"("p_business_id" "uuid", "p_plan_code" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "wow_private"."resubmit_verification_internal"("p_verification_id" "uuid", "p_evidence_refs" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "wow_private"."resubmit_verification_internal"("p_verification_id" "uuid", "p_evidence_refs" "jsonb") TO "authenticated";



REVOKE ALL ON FUNCTION "wow_private"."save_business_internal"("p_business_id" "uuid", "p_save" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "wow_private"."save_business_internal"("p_business_id" "uuid", "p_save" boolean) TO "authenticated";



REVOKE ALL ON FUNCTION "wow_private"."save_offer_draft_internal"("p_offer_id" "uuid", "p_payload" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "wow_private"."save_offer_draft_internal"("p_offer_id" "uuid", "p_payload" "jsonb") TO "authenticated";



REVOKE ALL ON FUNCTION "wow_private"."save_offer_internal"("p_offer_id" "uuid", "p_save" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "wow_private"."save_offer_internal"("p_offer_id" "uuid", "p_save" boolean) TO "authenticated";



REVOKE ALL ON FUNCTION "wow_private"."set_branch_pause_internal"("p_branch_id" "uuid", "p_pause" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "wow_private"."set_branch_pause_internal"("p_branch_id" "uuid", "p_pause" boolean) TO "authenticated";



REVOKE ALL ON FUNCTION "wow_private"."set_business_pause_internal"("p_business_id" "uuid", "p_pause" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "wow_private"."set_business_pause_internal"("p_business_id" "uuid", "p_pause" boolean) TO "authenticated";



REVOKE ALL ON FUNCTION "wow_private"."set_employee_access_internal"("p_business_id" "uuid", "p_user_id" "text", "p_action" "text", "p_permissions" "jsonb", "p_branch_ids" "uuid"[]) FROM PUBLIC;
GRANT ALL ON FUNCTION "wow_private"."set_employee_access_internal"("p_business_id" "uuid", "p_user_id" "text", "p_action" "text", "p_permissions" "jsonb", "p_branch_ids" "uuid"[]) TO "authenticated";



REVOKE ALL ON FUNCTION "wow_private"."set_offer_availability_internal"("p_offer_id" "uuid", "p_available" boolean, "p_paused" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "wow_private"."set_offer_availability_internal"("p_offer_id" "uuid", "p_available" boolean, "p_paused" boolean) TO "authenticated";



REVOKE ALL ON FUNCTION "wow_private"."set_updated_at"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "wow_private"."storage_active_user_id"() FROM PUBLIC;
GRANT ALL ON FUNCTION "wow_private"."storage_active_user_id"() TO "authenticated";



REVOKE ALL ON FUNCTION "wow_private"."storage_safe_key"("p_key" "text", "p_documents" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "wow_private"."storage_safe_key"("p_key" "text", "p_documents" boolean) TO "authenticated";



REVOKE ALL ON FUNCTION "wow_private"."submit_complaint_internal"("p_offer_id" "uuid", "p_offer_version_id" "uuid", "p_branch_id" "uuid", "p_complaint_type" "text", "p_description" "text", "p_incident_at" timestamp with time zone, "p_private_evidence_keys" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "wow_private"."submit_complaint_internal"("p_offer_id" "uuid", "p_offer_version_id" "uuid", "p_branch_id" "uuid", "p_complaint_type" "text", "p_description" "text", "p_incident_at" timestamp with time zone, "p_private_evidence_keys" "jsonb") TO "authenticated";



REVOKE ALL ON FUNCTION "wow_private"."submit_offer_internal"("p_offer_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "wow_private"."submit_offer_internal"("p_offer_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "wow_private"."submit_profile_revision_internal"("p_business_id" "uuid", "p_branch_id" "uuid", "p_patch" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "wow_private"."submit_profile_revision_internal"("p_business_id" "uuid", "p_branch_id" "uuid", "p_patch" "jsonb") TO "authenticated";



REVOKE ALL ON FUNCTION "wow_private"."submit_subscription_payment_internal"("p_subscription_id" "uuid", "p_method" "text", "p_reference" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "wow_private"."submit_subscription_payment_internal"("p_subscription_id" "uuid", "p_method" "text", "p_reference" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "wow_private"."submit_verification_internal"("p_business_id" "uuid", "p_branch_id" "uuid", "p_request_type" "text", "p_evidence_refs" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "wow_private"."submit_verification_internal"("p_business_id" "uuid", "p_branch_id" "uuid", "p_request_type" "text", "p_evidence_refs" "jsonb") TO "authenticated";



REVOKE ALL ON FUNCTION "wow_private"."update_merchant_draft_internal"("p_business_id" "uuid", "p_branch_id" "uuid", "p_patch" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "wow_private"."update_merchant_draft_internal"("p_business_id" "uuid", "p_branch_id" "uuid", "p_patch" "jsonb") TO "authenticated";



REVOKE ALL ON FUNCTION "wow_private"."validate_evidence_refs"("p_refs" "jsonb", "p_business_id" "uuid", "p_user_id" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "wow_private"."validate_evidence_refs"("p_refs" "jsonb", "p_business_id" "uuid", "p_user_id" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "wow_private"."validate_merchant_profile_patch"("p_patch" "jsonb", "p_branch" boolean) FROM PUBLIC;









GRANT ALL ON TABLE "public"."business_branches" TO "service_role";
GRANT SELECT ON TABLE "public"."business_branches" TO "authenticated";



GRANT ALL ON TABLE "public"."business_categories" TO "service_role";



GRANT ALL ON TABLE "public"."business_member_branches" TO "service_role";
GRANT SELECT ON TABLE "public"."business_member_branches" TO "authenticated";



GRANT ALL ON TABLE "public"."business_members" TO "service_role";
GRANT SELECT ON TABLE "public"."business_members" TO "authenticated";



GRANT ALL ON TABLE "public"."business_profile_revisions" TO "service_role";



GRANT ALL ON TABLE "public"."business_subscriptions" TO "service_role";



GRANT ALL ON TABLE "public"."business_verifications" TO "service_role";



GRANT ALL ON TABLE "public"."businesses" TO "service_role";
GRANT SELECT ON TABLE "public"."businesses" TO "authenticated";



GRANT ALL ON TABLE "public"."categories" TO "service_role";



GRANT ALL ON TABLE "public"."commercial_agreements" TO "service_role";



GRANT ALL ON TABLE "public"."complaint_updates" TO "service_role";



GRANT ALL ON TABLE "public"."complaints" TO "service_role";



GRANT ALL ON TABLE "public"."offer_branches" TO "service_role";
GRANT SELECT ON TABLE "public"."offer_branches" TO "authenticated";



GRANT ALL ON TABLE "public"."offer_item_attributes" TO "service_role";
GRANT SELECT ON TABLE "public"."offer_item_attributes" TO "authenticated";



GRANT ALL ON TABLE "public"."offer_items" TO "service_role";
GRANT SELECT ON TABLE "public"."offer_items" TO "authenticated";



GRANT ALL ON TABLE "public"."offer_media" TO "service_role";
GRANT SELECT ON TABLE "public"."offer_media" TO "authenticated";



GRANT ALL ON TABLE "public"."offer_ratings" TO "service_role";



GRANT ALL ON TABLE "public"."offer_reviews" TO "service_role";



GRANT ALL ON TABLE "public"."offer_versions" TO "service_role";
GRANT SELECT ON TABLE "public"."offer_versions" TO "authenticated";



GRANT ALL ON TABLE "public"."offers" TO "service_role";
GRANT SELECT ON TABLE "public"."offers" TO "authenticated";



GRANT ALL ON TABLE "public"."saved_businesses" TO "service_role";
GRANT SELECT ON TABLE "public"."saved_businesses" TO "authenticated";



GRANT ALL ON TABLE "public"."saved_offers" TO "service_role";
GRANT SELECT ON TABLE "public"."saved_offers" TO "authenticated";



GRANT ALL ON TABLE "public"."subscription_payments" TO "service_role";



GRANT ALL ON TABLE "public"."subscription_plans" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "service_role";
GRANT SELECT ON TABLE "public"."users" TO "authenticated";









GRANT ALL ON TABLE "wow_private"."admin_members" TO "service_role";



GRANT ALL ON TABLE "wow_private"."billing_events" TO "service_role";



GRANT ALL ON TABLE "wow_private"."category_assignment_events" TO "service_role";



GRANT ALL ON TABLE "wow_private"."merchant_operation_events" TO "service_role";



GRANT ALL ON TABLE "wow_private"."rating_moderation_events" TO "service_role";



GRANT ALL ON TABLE "wow_private"."verification_decisions" TO "service_role";



GRANT ALL ON TABLE "wow_private"."verification_submissions" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";
































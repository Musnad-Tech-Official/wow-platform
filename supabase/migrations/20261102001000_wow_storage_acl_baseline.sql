-- MUSNAD-WOW W00 / baseline add-on for a NEW, EMPTY Supabase LOCAL database.
-- This file accompanies 20261102000000_wow_baseline.sql.
-- Do NOT push this historical baseline/add-on to the already provisioned WOW production project.
-- Source: previously verified local ACL reconciliation and WOW Storage 008 policies.
-- One transaction; refuses to run if the target already contains WOW user/admin records.
BEGIN;

-- A. Restore least-privilege table GRANTs to match production.
-- MUSNAD-WOW / W00 / Local PostgreSQL only.
-- Fix table GRANT drift from schema-only dump to match verified production ACLs.
-- Run ONLY against docker container supabase_db_wow-platform.
-- No production connection, no INSERT/UPDATE/DELETE, no fixture rows.
DO $guard$
DECLARE v_count int;
BEGIN
  IF current_database() <> 'postgres' THEN
    RAISE EXCEPTION 'Unexpected target database: %', current_database();
  END IF;
  SELECT count(*) INTO v_count
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname IN ('public','wow_private') AND c.relkind IN ('r','p');
  IF v_count <> 32 THEN
    RAISE EXCEPTION 'Unexpected WOW table count: % (wanted 32)', v_count;
  END IF;
  IF EXISTS (SELECT 1 FROM public.users)
     OR EXISTS (SELECT 1 FROM wow_private.admin_members) THEN
    RAISE EXCEPTION 'Refusing to modify ACLs on a populated database';
  END IF;
END
$guard$;

-- Supabase schema dump includes ACL/default-grant effects that differ from
-- production. Preserve postgres and service_role privileges; reset ONLY
-- PUBLIC/anon/authenticated grants on application tables.
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public, wow_private
FROM PUBLIC, anon, authenticated;

-- Exact authenticated SELECT table allow-list observed on WOW production.
GRANT SELECT ON TABLE
  public.business_branches,
  public.business_member_branches,
  public.business_members,
  public.businesses,
  public.offer_branches,
  public.offer_item_attributes,
  public.offer_items,
  public.offer_media,
  public.offer_versions,
  public.offers,
  public.saved_businesses,
  public.saved_offers,
  public.users
TO authenticated;

DO $verify$
DECLARE bad_count int;
BEGIN
  WITH expected AS (
    SELECT unnest(ARRAY[
      'public.business_branches',
      'public.business_member_branches',
      'public.business_members',
      'public.businesses',
      'public.offer_branches',
      'public.offer_item_attributes',
      'public.offer_items',
      'public.offer_media',
      'public.offer_versions',
      'public.offers',
      'public.saved_businesses',
      'public.saved_offers',
      'public.users'
    ]) AS relation_name
  ), all_tables AS (
    SELECT c.oid, (n.nspname || '.' || c.relname) AS relation_name
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname IN ('public','wow_private') AND c.relkind IN ('r','p')
  )
  SELECT count(*) INTO bad_count FROM all_tables t
  WHERE has_table_privilege('anon',t.oid,'SELECT')
     OR has_table_privilege('anon',t.oid,'INSERT')
     OR has_table_privilege('anon',t.oid,'UPDATE')
     OR has_table_privilege('anon',t.oid,'DELETE')
     OR has_table_privilege('authenticated',t.oid,'INSERT')
     OR has_table_privilege('authenticated',t.oid,'UPDATE')
     OR has_table_privilege('authenticated',t.oid,'DELETE')
     OR (has_table_privilege('authenticated',t.oid,'SELECT')
          IS DISTINCT FROM EXISTS(SELECT 1 FROM expected e WHERE e.relation_name=t.relation_name));
  IF bad_count <> 0 THEN
    RAISE EXCEPTION 'Local ACLs still differ from production on % tables',bad_count;
  END IF;
END
$verify$;

-- B. Restore WOW private Storage buckets and policies.
-- W00: LOCAL ONLY. Align WOW offer-table grants and recreate WOW Storage configuration.
-- Source: supplied original Migration 008 (bucket/policy definitions) and verified production offer ACL.
-- THIS IS NOT A PRODUCTION MIGRATION. Never run on hosted Supabase.
DO $wow_check$
BEGIN
  IF to_regprocedure('wow_private.can_upload_wow_object(text,text)') IS NULL
    OR to_regprocedure('wow_private.can_read_wow_object(text,text)') IS NULL
    OR to_regprocedure('wow_private.is_public_offer_object(text)') IS NULL THEN
    RAISE EXCEPTION 'WOW schema helpers are missing; stop without changing anything';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects'
             AND policyname IN ('wow_storage_upload_images_and_evidence',
                                'wow_storage_read_owner_or_reviewer',
                                'wow_storage_read_live_offer_images')) THEN
    RAISE EXCEPTION 'WOW Storage policies already exist; stop instead of modifying them';
  END IF;
END
$wow_check$;

-- Restore 5 bucket configurations from original 008.
INSERT INTO storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
VALUES
  ('wow-business-media','wow-business-media',false,5242880,ARRAY['image/jpeg','image/png','image/webp']::text[]),
  ('wow-offer-media','wow-offer-media',false,5242880,ARRAY['image/jpeg','image/png','image/webp']::text[]),
  ('wow-verification-evidence','wow-verification-evidence',false,10485760,ARRAY['image/jpeg','image/png','image/webp','application/pdf']::text[]),
  ('wow-complaint-evidence','wow-complaint-evidence',false,10485760,ARRAY['image/jpeg','image/png','image/webp','application/pdf']::text[]),
  ('wow-payment-proofs','wow-payment-proofs',false,10485760,ARRAY['image/jpeg','image/png','image/webp','application/pdf']::text[])
ON CONFLICT (id) DO NOTHING;

-- Fail closed if a name already exists with a public or misconfigured bucket.
DO $$
DECLARE v_bad INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_bad FROM storage.buckets b
  JOIN (VALUES
    ('wow-business-media',5242880,ARRAY['image/jpeg','image/png','image/webp']::text[]),
    ('wow-offer-media',5242880,ARRAY['image/jpeg','image/png','image/webp']::text[]),
    ('wow-verification-evidence',10485760,ARRAY['image/jpeg','image/png','image/webp','application/pdf']::text[]),
    ('wow-complaint-evidence',10485760,ARRAY['image/jpeg','image/png','image/webp','application/pdf']::text[]),
    ('wow-payment-proofs',10485760,ARRAY['image/jpeg','image/png','image/webp','application/pdf']::text[])
  ) AS expected(id,max_size,mimes) ON expected.id=b.id
  WHERE b.public IS DISTINCT FROM false
    OR b.file_size_limit IS DISTINCT FROM expected.max_size
    OR b.allowed_mime_types IS DISTINCT FROM expected.mimes;
  IF v_bad <> 0 THEN
    RAISE EXCEPTION 'Storage bucket settings conflict with WOW private bucket policy' USING ERRCODE='23514';
  END IF;
END;
$$;


-- Restore 3 Storage policies from original 008.
CREATE POLICY wow_storage_upload_images_and_evidence
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id IN ('wow-business-media','wow-offer-media',
                  'wow-verification-evidence','wow-complaint-evidence')
    AND wow_private.can_upload_wow_object(bucket_id,name)
  );

CREATE POLICY wow_storage_read_owner_or_reviewer
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id IN ('wow-business-media','wow-offer-media',
                  'wow-verification-evidence','wow-complaint-evidence')
    AND storage.allow_any_operation(ARRAY[
      'object.get_authenticated','object.get_authenticated_info','object.sign'
    ])
    AND wow_private.can_read_wow_object(bucket_id,name)
  );

CREATE POLICY wow_storage_read_live_offer_images
  ON storage.objects FOR SELECT TO anon,authenticated
  USING (
    bucket_id='wow-offer-media'
    AND storage.allow_any_operation(ARRAY[
      'object.get_authenticated','object.get_authenticated_info','object.sign'
    ])
    AND wow_private.is_public_offer_object(name)
  );


-- Match production SQL privileges for the seven offer tables (RLS alone is not a GRANT).
REVOKE ALL PRIVILEGES ON TABLE
  public.offer_branches, public.offer_item_attributes, public.offer_items,
  public.offer_media, public.offer_reviews, public.offer_versions, public.offers
FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE
  public.offer_branches, public.offer_item_attributes, public.offer_items,
  public.offer_media, public.offer_versions, public.offers
TO authenticated;

DO $wow_verify$
DECLARE n_bad int;
BEGIN
  SELECT count(*) INTO n_bad FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relname IN
      ('offer_branches','offer_item_attributes','offer_items','offer_media',
       'offer_reviews','offer_versions','offers') AND (
      NOT c.relrowsecurity
      OR has_table_privilege('anon',c.oid,'SELECT')
      OR has_table_privilege('authenticated',c.oid,'INSERT')
      OR has_table_privilege('authenticated',c.oid,'UPDATE')
      OR has_table_privilege('authenticated',c.oid,'DELETE')
      OR (c.relname='offer_reviews' AND has_table_privilege('authenticated',c.oid,'SELECT'))
      OR (c.relname<>'offer_reviews' AND NOT has_table_privilege('authenticated',c.oid,'SELECT'))
    );
  IF n_bad<>0 THEN
    RAISE EXCEPTION 'Local grants differ from production for % offer tables',n_bad;
  END IF;
  IF (SELECT count(*) FROM storage.buckets WHERE id LIKE 'wow-%')<>5 THEN
    RAISE EXCEPTION 'Expected five WOW buckets';
  END IF;
  IF (SELECT count(*) FROM pg_policies WHERE schemaname='storage' AND tablename='objects'
      AND policyname LIKE 'wow_storage_%')<>3 THEN
    RAISE EXCEPTION 'Expected three WOW Storage policies';
  END IF;
END
$wow_verify$;

COMMIT;

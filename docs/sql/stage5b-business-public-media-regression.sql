-- Execute in one BEGIN/ROLLBACK transaction only (never retain fixtures).
-- Uses randomized UUIDs and a synthetic approved offer with a paid-for time
-- window supplied by a trial fixture, without admin credentials.
CREATE TEMP TABLE aud034_ids (
  business_id uuid, offer_id uuid, version_id uuid,
  root_category_id uuid, category_id uuid, owner_id text
) ON COMMIT DROP;
CREATE TEMP TABLE aud034_cases(name text PRIMARY KEY) ON COMMIT DROP;
DO $aud034_seed$
DECLARE
  b uuid:=gen_random_uuid();
  o uuid:=gen_random_uuid();
  v uuid:=gen_random_uuid();
  br uuid:=gen_random_uuid();
  root_cat uuid:=gen_random_uuid();
  cat uuid:=gen_random_uuid();
  owner text:='qa_aud034_'||substr(md5(random()::text),1,17);
  slug_root text:='qa-aud034-root-'||substr(md5(random()::text),1,14);
  slug_child text:='qa-aud034-child-'||substr(md5(random()::text),1,14);
BEGIN
  INSERT INTO public.users(id,account_status) VALUES(owner,'active');
  INSERT INTO public.categories(id,slug,name_ar,is_active)
    VALUES (root_cat,slug_root,'فئة اختبار رئيسية',true);
  INSERT INTO public.categories(id,parent_id,slug,name_ar,is_active)
    VALUES (cat,root_cat,slug_child,'فئة اختبار فرعية',true);
  INSERT INTO public.businesses(id,owner_user_id,name,status,approved_at)
    VALUES (b,owner,'نشاط اختبار التصنيف','approved',now());
  INSERT INTO public.business_members(business_id,user_id,role,status,can_draft,can_submit,can_pause,can_monitor)
    VALUES (b,owner,'owner','active',true,true,true,true);
  -- Offer submission is additionally guarded by the live Clerk JWT actor.
  PERFORM set_config('request.jwt.claims',
    jsonb_build_object('sub',owner,'role','authenticated')::text,true);
  INSERT INTO public.business_categories(business_id,category_id,is_primary,approved_by_user_id)
    VALUES(b,cat,true,owner);
  INSERT INTO public.business_branches(id,business_id,name,city,address_line,status,approved_at)
    VALUES(br,b,'فرع اختبار','عدن','عنوان الاختبار','approved',now());
  INSERT INTO public.business_subscriptions(business_id,kind,status,starts_at,ends_at,requested_by_user_id)
    VALUES(b,'trial','active',now()-interval '1 day',now()+interval '29 days',owner);
  INSERT INTO public.offers(id,business_id,created_by_user_id,status,merchant_available)
    VALUES(o,b,owner,'draft',true);
  INSERT INTO public.offer_versions(
    id,business_id,offer_id,version_no,title,offer_kind,original_price,final_price,
    currency,starts_at,ends_at,review_status,created_by_user_id,submitted_at,
    approved_at,category_id
  ) VALUES(
    v,b,o,1,'عرض اختبار التصنيف','product',100,80,
    'YER',now()-interval '1 hour',now()+interval '1 day','draft',owner,NULL,
    NULL,cat
  );
  INSERT INTO public.offer_branches(business_id,offer_version_id,branch_id)
    VALUES(b,v,br);
  -- Content is attached only while the version is still a draft.
  -- Respect the enforced draft -> pending -> approved state machine.
  UPDATE public.offer_versions SET review_status='pending',
    submitted_at=now()-interval '2 hours' WHERE id=v;
  UPDATE public.offer_versions SET review_status='approved',
    approved_at=now()-interval '1 hour' WHERE id=v;
  UPDATE public.offers SET current_version_id=v,status='active' WHERE id=o;
  INSERT INTO aud034_ids VALUES(b,o,v,root_cat,cat,owner);
END;
$aud034_seed$;


DO $media$
DECLARE x aud034_ids%ROWTYPE; logo text; cover text; wrong text;
BEGIN
 SELECT * INTO x FROM aud034_ids;
 logo:=x.business_id::text||'/'||x.owner_id||'/'||repeat('a',48)||'.jpg';
 cover:=x.business_id::text||'/'||x.owner_id||'/'||repeat('b',48)||'.png';
 wrong:=x.business_id::text||'/'||x.owner_id||'/'||repeat('c',48)||'.jpg';
 UPDATE public.businesses SET logo_url=logo,cover_url=cover WHERE id=x.business_id;
 IF NOT wow_private.is_public_business_object(logo) OR NOT wow_private.is_public_business_object(cover) THEN RAISE EXCEPTION 'approved images not eligible'; END IF;
 INSERT INTO aud034_cases VALUES('exact-logo-cover');
 IF wow_private.is_public_business_object(wrong) OR wow_private.is_public_business_object('https://example.com/image.jpg') OR wow_private.is_public_business_object(replace(logo,x.business_id::text,gen_random_uuid()::text)) THEN RAISE EXCEPTION 'unauthorized image eligible'; END IF;
 INSERT INTO aud034_cases VALUES('other-keys-denied');
 UPDATE public.businesses SET logo_url=wrong WHERE id=x.business_id;
 IF wow_private.is_public_business_object(logo) OR NOT wow_private.is_public_business_object(wrong) THEN RAISE EXCEPTION 'old logo remains eligible'; END IF;
 INSERT INTO aud034_cases VALUES('superseded-key-denied');
 UPDATE public.businesses SET is_paused=true,paused_at=now() WHERE id=x.business_id;
 IF wow_private.is_public_business_object(wrong) OR wow_private.is_public_business_object(cover) THEN RAISE EXCEPTION 'paused business images eligible'; END IF;
 INSERT INTO aud034_cases VALUES('paused-business-denied');
 IF (SELECT public FROM storage.buckets WHERE id='wow-business-media') IS DISTINCT FROM false THEN RAISE EXCEPTION 'bucket public or missing'; END IF;
 INSERT INTO aud034_cases VALUES('bucket-private');
END; $media$;
SELECT count(*) AS passed,jsonb_agg(name ORDER BY name) AS cases FROM aud034_cases;

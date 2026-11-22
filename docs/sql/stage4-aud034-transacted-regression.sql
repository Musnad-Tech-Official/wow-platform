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
  INSERT INTO public.business_categories(business_id,category_id,is_primary,approved_by_user_id)
    VALUES(b,cat,true,owner);
  INSERT INTO public.business_branches(id,business_id,name,city,address_line,status,approved_at)
    VALUES(br,b,'فرع اختبار','عدن','عنوان الاختبار','approved',now());
  INSERT INTO public.business_subscriptions(business_id,kind,status,starts_at,ends_at,requested_by_user_id)
    VALUES(b,'trial','active',now()-interval '1 day',now()+interval '29 days',owner);
  INSERT INTO public.offers(id,business_id,created_by_user_id,status,merchant_available)
    VALUES(o,b,owner,'active',true);
  INSERT INTO public.offer_versions(
    id,business_id,offer_id,version_no,title,offer_kind,original_price,final_price,
    currency,starts_at,ends_at,review_status,created_by_user_id,submitted_at,
    approved_at,category_id
  ) VALUES(
    v,b,o,1,'عرض اختبار التصنيف','product',100,80,
    'YER',now()-interval '1 hour',now()+interval '1 day','approved',owner,now()-interval '2 hours',
    now()-interval '1 hour',cat
  );
  UPDATE public.offers SET current_version_id=v WHERE id=o;
  INSERT INTO public.offer_branches(business_id,offer_version_id,branch_id)
    VALUES(b,v,br);
  INSERT INTO aud034_ids VALUES(b,o,v,root_cat,cat,owner);
END;
$aud034_seed$;

DO $aud034_assertions$
DECLARE
  ids aud034_ids%ROWTYPE;
  n integer;
BEGIN
  SELECT * INTO ids FROM aud034_ids;
  SELECT count(*) INTO n FROM wow_private.discoverable_offer_branches()
    WHERE offer_id=ids.offer_id;
  IF n<>1 THEN RAISE EXCEPTION 'AUD-034 valid approved offer not visible (%)',n; END IF;
  INSERT INTO aud034_cases VALUES('active-category-visible');

  UPDATE public.categories SET is_active=false WHERE id=ids.category_id;
  IF EXISTS(SELECT 1 FROM wow_private.discoverable_offer_branches()
    WHERE offer_id=ids.offer_id) THEN
    RAISE EXCEPTION 'AUD-034 inactive leaf category still visible';
  END IF;
  INSERT INTO aud034_cases VALUES('revoked-leaf-hidden');

  UPDATE public.categories SET is_active=true WHERE id=ids.category_id;
  UPDATE public.categories SET is_active=false WHERE id=ids.root_category_id;
  IF EXISTS(SELECT 1 FROM wow_private.discoverable_offer_branches()
    WHERE offer_id=ids.offer_id) THEN
    RAISE EXCEPTION 'AUD-034 revoked parent category still visible';
  END IF;
  INSERT INTO aud034_cases VALUES('revoked-root-hidden');

  UPDATE public.categories SET is_active=true WHERE id=ids.root_category_id;
  IF NOT EXISTS(SELECT 1 FROM wow_private.discoverable_offer_branches()
    WHERE offer_id=ids.offer_id) THEN
    RAISE EXCEPTION 'AUD-034 offer not restored after category reactivation';
  END IF;
  INSERT INTO aud034_cases VALUES('reactivated-category-visible');

  DELETE FROM public.business_categories WHERE business_id=ids.business_id AND category_id=ids.category_id;
  IF EXISTS(SELECT 1 FROM wow_private.discoverable_offer_branches()
    WHERE offer_id=ids.offer_id) THEN
    RAISE EXCEPTION 'AUD-034 removed business-category assignment still visible';
  END IF;
  INSERT INTO aud034_cases VALUES('unassigned-offer-category-hidden');

  INSERT INTO public.business_categories(business_id,category_id,is_primary,approved_by_user_id)
    VALUES(ids.business_id,ids.category_id,true,ids.owner_id);
  IF NOT EXISTS(SELECT 1 FROM wow_private.discoverable_offer_branches()
    WHERE offer_id=ids.offer_id) THEN
    RAISE EXCEPTION 'AUD-034 offer not restored after assignment';
  END IF;
  INSERT INTO aud034_cases VALUES('reassigned-category-visible');

  UPDATE public.businesses SET is_paused=true,paused_at=now() WHERE id=ids.business_id;
  IF EXISTS(SELECT 1 FROM wow_private.discoverable_offer_branches()
    WHERE offer_id=ids.offer_id) THEN
    RAISE EXCEPTION 'AUD-034 paused business became visible';
  END IF;
  INSERT INTO aud034_cases VALUES('paused-business-still-hidden');

  UPDATE public.businesses SET is_paused=false,paused_at=NULL WHERE id=ids.business_id;
  UPDATE public.offer_versions SET category_id=NULL WHERE id=ids.version_id;
  IF EXISTS(SELECT 1 FROM wow_private.discoverable_offer_branches()
    WHERE offer_id=ids.offer_id) THEN
    RAISE EXCEPTION 'AUD-034 missing offer category still visible';
  END IF;
  INSERT INTO aud034_cases VALUES('uncategorized-offer-hidden');
END;
$aud034_assertions$;

SELECT jsonb_build_object('passed',count(*),'cases',jsonb_agg(name ORDER BY name))
  AS aud034_results FROM aud034_cases;

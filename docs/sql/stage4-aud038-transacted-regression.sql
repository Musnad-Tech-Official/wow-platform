-- Execute in one BEGIN/ROLLBACK transaction only (never retain fixtures).
-- Uses randomized UUIDs and a synthetic approved offer without a subscription; trial is activated only after
-- proving business, branch and category eligibility.
CREATE TEMP TABLE aud038_ids (
  business_id uuid, offer_id uuid, version_id uuid,
  root_category_id uuid, category_id uuid, branch_id uuid, owner_id text
) ON COMMIT DROP;
CREATE TEMP TABLE aud038_cases(name text PRIMARY KEY) ON COMMIT DROP;
DO $aud038_seed$
DECLARE
  b uuid:=gen_random_uuid();
  o uuid:=gen_random_uuid();
  v uuid:=gen_random_uuid();
  br uuid:=gen_random_uuid();
  root_cat uuid:=gen_random_uuid();
  cat uuid:=gen_random_uuid();
  owner text:='qa_aud038_'||substr(md5(random()::text),1,17);
  slug_root text:='qa-aud038-root-'||substr(md5(random()::text),1,14);
  slug_child text:='qa-aud038-child-'||substr(md5(random()::text),1,14);
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
  INSERT INTO aud038_ids VALUES(b,o,v,root_cat,cat,br,owner);
END;
$aud038_seed$;


DO $aud038_assertions$
DECLARE
 ids aud038_ids%ROWTYPE;
 trial_id uuid;
 repeat_id uuid;
 period_start timestamptz;
 period_end timestamptz;
 before_events integer;
 after_events integer;
BEGIN
 SELECT * INTO ids FROM aud038_ids;

 -- The published offer would otherwise be eligible; trial is the missing
 -- publication entitlement, and nothing is consumed under a paused business.
 IF EXISTS(SELECT 1 FROM public.business_subscriptions WHERE business_id=ids.business_id) THEN
   RAISE EXCEPTION 'AUD-038 fixture accidentally has a subscription';
 END IF;
 SELECT count(*) INTO before_events FROM wow_private.billing_events
   WHERE business_id=ids.business_id AND action='trial_activated';

 UPDATE public.businesses SET is_paused=true,paused_at=now() WHERE id=ids.business_id;
 BEGIN
   PERFORM public.wow_activate_business_trial(ids.business_id);
   RAISE EXCEPTION 'AUD-038 paused business unexpectedly activated trial';
 EXCEPTION WHEN SQLSTATE '22023' THEN NULL;
 END;
 IF EXISTS(SELECT 1 FROM public.business_subscriptions WHERE business_id=ids.business_id) THEN
   RAISE EXCEPTION 'AUD-038 paused business created billing row';
 END IF;
 INSERT INTO aud038_cases VALUES('paused-business-rejected-no-trial');

 UPDATE public.businesses SET is_paused=false,paused_at=NULL WHERE id=ids.business_id;
 UPDATE public.business_branches SET is_paused=true,paused_at=now() WHERE id=ids.branch_id;
 BEGIN
   PERFORM public.wow_activate_business_trial(ids.business_id);
   RAISE EXCEPTION 'AUD-038 paused branch unexpectedly activated trial';
 EXCEPTION WHEN SQLSTATE '22023' THEN NULL;
 END;
 IF EXISTS(SELECT 1 FROM public.business_subscriptions WHERE business_id=ids.business_id) THEN
   RAISE EXCEPTION 'AUD-038 paused branch created billing row';
 END IF;
 INSERT INTO aud038_cases VALUES('paused-branch-rejected-no-trial');

 UPDATE public.business_branches SET is_paused=false,paused_at=NULL WHERE id=ids.branch_id;
 UPDATE public.categories SET is_active=false WHERE id=ids.category_id;
 BEGIN
   PERFORM public.wow_activate_business_trial(ids.business_id);
   RAISE EXCEPTION 'AUD-038 inactive category unexpectedly activated trial';
 EXCEPTION WHEN SQLSTATE '22023' THEN NULL;
 END;
 IF EXISTS(SELECT 1 FROM public.business_subscriptions WHERE business_id=ids.business_id) THEN
   RAISE EXCEPTION 'AUD-038 revoked category created billing row';
 END IF;
 INSERT INTO aud038_cases VALUES('inactive-category-rejected-no-trial');

 UPDATE public.categories SET is_active=true WHERE id=ids.category_id;
 UPDATE public.categories SET is_active=false WHERE id=ids.root_category_id;
 BEGIN
   PERFORM public.wow_activate_business_trial(ids.business_id);
   RAISE EXCEPTION 'AUD-038 inactive parent unexpectedly activated trial';
 EXCEPTION WHEN SQLSTATE '22023' THEN NULL;
 END;
 IF EXISTS(SELECT 1 FROM public.business_subscriptions WHERE business_id=ids.business_id) THEN
   RAISE EXCEPTION 'AUD-038 inactive parent created billing row';
 END IF;
 INSERT INTO aud038_cases VALUES('inactive-parent-rejected-no-trial');

 UPDATE public.categories SET is_active=true WHERE id=ids.root_category_id;
 DELETE FROM public.business_categories
   WHERE business_id=ids.business_id AND category_id=ids.category_id;
 BEGIN
   PERFORM public.wow_activate_business_trial(ids.business_id);
   RAISE EXCEPTION 'AUD-038 unassigned category unexpectedly activated trial';
 EXCEPTION WHEN SQLSTATE '22023' THEN NULL;
 END;
 IF EXISTS(SELECT 1 FROM public.business_subscriptions WHERE business_id=ids.business_id) THEN
   RAISE EXCEPTION 'AUD-038 removed category assignment created billing row';
 END IF;
 INSERT INTO aud038_cases VALUES('unassigned-category-rejected-no-trial');

 SELECT count(*) INTO after_events FROM wow_private.billing_events
   WHERE business_id=ids.business_id AND action='trial_activated';
 IF before_events<>after_events THEN
   RAISE EXCEPTION 'AUD-038 denial created a billing event';
 END IF;
 INSERT INTO aud038_cases VALUES('rejected-trials-no-billing-events');

 INSERT INTO public.business_categories(business_id,category_id,is_primary,approved_by_user_id)
   VALUES(ids.business_id,ids.category_id,true,ids.owner_id);
 trial_id:=public.wow_activate_business_trial(ids.business_id);
 IF trial_id IS NULL THEN RAISE EXCEPTION 'AUD-038 eligible trial did not start'; END IF;
 SELECT starts_at,ends_at INTO period_start,period_end
   FROM public.business_subscriptions WHERE id=trial_id AND business_id=ids.business_id;
 IF period_start IS NULL OR period_end<>period_start+interval '30 days' THEN
   RAISE EXCEPTION 'AUD-038 30 day trial period incorrect';
 END IF;
 INSERT INTO aud038_cases VALUES('eligible-offer-starts-exact-30-day-trial');

 SELECT count(*) INTO after_events FROM wow_private.billing_events
   WHERE business_id=ids.business_id AND action='trial_activated';
 IF after_events<>before_events+1 THEN
   RAISE EXCEPTION 'AUD-038 expected exactly one trial event, saw %',after_events-before_events;
 END IF;
 INSERT INTO aud038_cases VALUES('eligible-trial-emits-one-event');

 -- Existing-trial retries are idempotent even when the business is paused.
 UPDATE public.businesses SET is_paused=true,paused_at=now() WHERE id=ids.business_id;
 repeat_id:=public.wow_activate_business_trial(ids.business_id);
 IF repeat_id IS DISTINCT FROM trial_id THEN
   RAISE EXCEPTION 'AUD-038 existing trial was reset or changed';
 END IF;
 IF EXISTS(
   SELECT 1 FROM public.business_subscriptions
   WHERE id=trial_id AND (starts_at IS DISTINCT FROM period_start OR ends_at IS DISTINCT FROM period_end)
 ) THEN RAISE EXCEPTION 'AUD-038 existing trial expiry was extended'; END IF;
 INSERT INTO aud038_cases VALUES('repeat-call-preserves-original-trial');

 SELECT count(*) INTO after_events FROM wow_private.billing_events
   WHERE business_id=ids.business_id AND action='trial_activated';
 IF after_events<>before_events+1 THEN
   RAISE EXCEPTION 'AUD-038 repeated activation logged extra event';
 END IF;
 INSERT INTO aud038_cases VALUES('repeat-call-no-extra-event');
END;
$aud038_assertions$;

SELECT jsonb_build_object('passed',count(*),'cases',jsonb_agg(name ORDER BY name))
  AS aud038_results FROM aud038_cases;

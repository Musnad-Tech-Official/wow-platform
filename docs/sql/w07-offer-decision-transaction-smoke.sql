-- Independent reviewer decision matrix for W07. All DML is rolled back.
BEGIN;
SET LOCAL lock_timeout='5s'; SET LOCAL statement_timeout='30s';
DO $fixtures$
BEGIN
 IF EXISTS (SELECT 1 FROM public.users WHERE id LIKE 'w07_offerqa_%') OR
 EXISTS (SELECT 1 FROM public.businesses WHERE id='97070000-0000-4000-8000-000000000001'::uuid) THEN
  RAISE EXCEPTION 'QA fixture collision'; END IF;
 INSERT INTO public.users(id,full_name) VALUES
 ('w07_offerqa_owner_20261115','W07 Offer QA owner'),
 ('w07_offerqa_reviewer_20261115','W07 Offer QA reviewer'),
 ('w07_offerqa_employee_20261115','W07 Offer QA staff'),
 ('w07_offerqa_viewer_20261115','W07 Offer QA viewer'),
 ('w07_offerqa_revoked_20261115','W07 Offer QA revoked');
 INSERT INTO wow_private.admin_members(user_id,role,is_active) VALUES
 ('w07_offerqa_owner_20261115','reviewer',true),('w07_offerqa_reviewer_20261115','reviewer',true),
 ('w07_offerqa_employee_20261115','reviewer',true),('w07_offerqa_viewer_20261115','viewer',true),
 ('w07_offerqa_revoked_20261115','reviewer',false);
 INSERT INTO public.businesses(id,owner_user_id,name,status,approved_at) VALUES
 ('97070000-0000-4000-8000-000000000001'::uuid,'w07_offerqa_owner_20261115','W07 QA Merchant','approved',now());
 INSERT INTO public.business_members(business_id,user_id,role,status,can_draft,can_submit,can_pause,can_monitor)
 VALUES ('97070000-0000-4000-8000-000000000001'::uuid,'w07_offerqa_owner_20261115','owner','active',true,true,true,true),
 ('97070000-0000-4000-8000-000000000001'::uuid,'w07_offerqa_employee_20261115','employee','active',false,false,false,false);
 INSERT INTO public.categories(id,slug,name_ar,is_active)
 VALUES ('97070000-0000-4000-8000-000000000003'::uuid,'w07-qa-catalog','تصنيف تجريبي ضمن معاملة',true);
 INSERT INTO public.business_categories(business_id,category_id,is_primary,approved_by_user_id)
 VALUES ('97070000-0000-4000-8000-000000000001'::uuid,'97070000-0000-4000-8000-000000000003'::uuid,true,'w07_offerqa_reviewer_20261115');
 INSERT INTO public.business_branches(id,business_id,name,city,address_line,status,approved_at)
 VALUES ('97070000-0000-4000-8000-000000000002'::uuid,'97070000-0000-4000-8000-000000000001'::uuid,'W07 QA Branch','Aden','Temporary transaction only','approved',now());
 INSERT INTO public.offers(id,business_id,created_by_user_id,status) VALUES
 ('97070000-0000-4000-8000-000000000011'::uuid,'97070000-0000-4000-8000-000000000001'::uuid,'w07_offerqa_owner_20261115','draft'),
 ('97070000-0000-4000-8000-000000000012'::uuid,'97070000-0000-4000-8000-000000000001'::uuid,'w07_offerqa_owner_20261115','draft'),
 ('97070000-0000-4000-8000-000000000013'::uuid,'97070000-0000-4000-8000-000000000001'::uuid,'w07_offerqa_owner_20261115','draft'),
 ('97070000-0000-4000-8000-000000000014'::uuid,'97070000-0000-4000-8000-000000000001'::uuid,'w07_offerqa_owner_20261115','draft');
 INSERT INTO public.offer_versions(id,business_id,offer_id,version_no,title,offer_kind,original_price,final_price,currency,review_status,created_by_user_id,category_id)
 VALUES
 ('97070000-0000-4000-8000-000000000021'::uuid,'97070000-0000-4000-8000-000000000001'::uuid,'97070000-0000-4000-8000-000000000011'::uuid,1,'W07 QA Offer 1','product',NULL,100,'YER','draft','w07_offerqa_owner_20261115','97070000-0000-4000-8000-000000000003'::uuid),
 ('97070000-0000-4000-8000-000000000022'::uuid,'97070000-0000-4000-8000-000000000001'::uuid,'97070000-0000-4000-8000-000000000012'::uuid,1,'W07 QA Offer 2','product',NULL,100,'YER','draft','w07_offerqa_owner_20261115','97070000-0000-4000-8000-000000000003'::uuid),
 ('97070000-0000-4000-8000-000000000023'::uuid,'97070000-0000-4000-8000-000000000001'::uuid,'97070000-0000-4000-8000-000000000013'::uuid,1,'W07 QA Offer 3','product',NULL,100,'YER','draft','w07_offerqa_owner_20261115','97070000-0000-4000-8000-000000000003'::uuid),
 ('97070000-0000-4000-8000-000000000024'::uuid,'97070000-0000-4000-8000-000000000001'::uuid,'97070000-0000-4000-8000-000000000014'::uuid,1,'W07 QA Offer 4','product',150,100,'YER','draft','w07_offerqa_owner_20261115','97070000-0000-4000-8000-000000000003'::uuid);
 INSERT INTO public.offer_branches(business_id,offer_version_id,branch_id) VALUES
 ('97070000-0000-4000-8000-000000000001'::uuid,'97070000-0000-4000-8000-000000000021'::uuid,'97070000-0000-4000-8000-000000000002'::uuid),
 ('97070000-0000-4000-8000-000000000001'::uuid,'97070000-0000-4000-8000-000000000022'::uuid,'97070000-0000-4000-8000-000000000002'::uuid),
 ('97070000-0000-4000-8000-000000000001'::uuid,'97070000-0000-4000-8000-000000000023'::uuid,'97070000-0000-4000-8000-000000000002'::uuid),
 ('97070000-0000-4000-8000-000000000001'::uuid,'97070000-0000-4000-8000-000000000024'::uuid,'97070000-0000-4000-8000-000000000002'::uuid);
 -- The submission-scope trigger requires an active merchant's signed JWT.
 PERFORM set_config('request.jwt.claims','{"role":"authenticated","sub":"w07_offerqa_owner_20261115"}',true);
 UPDATE public.offer_versions SET review_status='pending',submitted_at=now() WHERE business_id='97070000-0000-4000-8000-000000000001'::uuid;
 UPDATE public.offers SET status='pending' WHERE business_id='97070000-0000-4000-8000-000000000001'::uuid;
END $fixtures$;
SET LOCAL ROLE authenticated;
DO $decisions$
DECLARE out_id uuid; pending_list jsonb;
BEGIN
 
 PERFORM set_config('request.jwt.claims','{"role":"authenticated","sub":"w07_offerqa_owner_20261115"}',true);
 BEGIN
  PERFORM public.wow_admin_decide_offer('97070000-0000-4000-8000-000000000021'::uuid,'approved',null);
  RAISE EXCEPTION 'Unauthorized owner was permitted to approve';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;

 PERFORM set_config('request.jwt.claims','{"role":"authenticated","sub":"w07_offerqa_employee_20261115"}',true);
 BEGIN
  PERFORM public.wow_admin_decide_offer('97070000-0000-4000-8000-000000000021'::uuid,'approved',null);
  RAISE EXCEPTION 'Unauthorized staff was permitted to approve';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;

 PERFORM set_config('request.jwt.claims','{"role":"authenticated","sub":"w07_offerqa_viewer_20261115"}',true);
 BEGIN
  PERFORM public.wow_admin_decide_offer('97070000-0000-4000-8000-000000000021'::uuid,'approved',null);
  RAISE EXCEPTION 'Unauthorized viewer was permitted to approve';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;

 PERFORM set_config('request.jwt.claims','{"role":"authenticated","sub":"w07_offerqa_revoked_20261115"}',true);
 BEGIN
  PERFORM public.wow_admin_decide_offer('97070000-0000-4000-8000-000000000021'::uuid,'approved',null);
  RAISE EXCEPTION 'Unauthorized revoked was permitted to approve';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 PERFORM set_config('request.jwt.claims','{"role":"authenticated","sub":"w07_offerqa_viewer_20261115"}',true);
 SELECT public.wow_admin_list_pending_offers(50,0) INTO pending_list;
 IF jsonb_array_length(pending_list)<4 THEN RAISE EXCEPTION 'Viewer cannot read queue'; END IF;
 PERFORM set_config('request.jwt.claims','{"role":"authenticated","sub":"w07_offerqa_reviewer_20261115"}',true);
 BEGIN PERFORM public.wow_admin_decide_offer('97070000-0000-4000-8000-000000000022'::uuid,'rejected','bad');
  RAISE EXCEPTION 'Short reason allowed'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
 BEGIN PERFORM public.wow_admin_decide_offer('97070000-0000-4000-8000-000000000024'::uuid,'approved',null);
  RAISE EXCEPTION 'Required evidence bypassed'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
 SELECT public.wow_admin_decide_offer('97070000-0000-4000-8000-000000000021'::uuid,'approved',null) INTO out_id;
 IF out_id IS DISTINCT FROM '97070000-0000-4000-8000-000000000021'::uuid THEN RAISE EXCEPTION 'Approve mismatch'; END IF;
 SELECT public.wow_admin_decide_offer('97070000-0000-4000-8000-000000000022'::uuid,'rejected','Incomplete offer details') INTO out_id;
 IF out_id IS DISTINCT FROM '97070000-0000-4000-8000-000000000022'::uuid THEN RAISE EXCEPTION 'Reject mismatch'; END IF;
 SELECT public.wow_admin_decide_offer('97070000-0000-4000-8000-000000000023'::uuid,'needs_info','Please submit additional details') INTO out_id;
 IF out_id IS DISTINCT FROM '97070000-0000-4000-8000-000000000023'::uuid THEN RAISE EXCEPTION 'Needs-info mismatch'; END IF;
END $decisions$;
RESET ROLE;
DO $assert$
BEGIN
 IF (SELECT review_status FROM public.offer_versions WHERE id='97070000-0000-4000-8000-000000000021'::uuid)<>'approved'
 OR (SELECT current_version_id FROM public.offers WHERE id='97070000-0000-4000-8000-000000000011'::uuid) IS DISTINCT FROM '97070000-0000-4000-8000-000000000021'::uuid
 OR (SELECT status FROM public.offers WHERE id='97070000-0000-4000-8000-000000000011'::uuid)<>'active'
 OR (SELECT review_status FROM public.offer_versions WHERE id='97070000-0000-4000-8000-000000000022'::uuid)<>'rejected'
 OR (SELECT review_status FROM public.offer_versions WHERE id='97070000-0000-4000-8000-000000000023'::uuid)<>'rejected'
 OR (SELECT review_status FROM public.offer_versions WHERE id='97070000-0000-4000-8000-000000000024'::uuid)<>'pending'
 OR (SELECT count(*) FROM public.offer_reviews WHERE offer_version_id IN
 ('97070000-0000-4000-8000-000000000021'::uuid,'97070000-0000-4000-8000-000000000022'::uuid,'97070000-0000-4000-8000-000000000023'::uuid,'97070000-0000-4000-8000-000000000024'::uuid))<>3
 OR NOT EXISTS (SELECT 1 FROM public.offer_reviews WHERE offer_version_id='97070000-0000-4000-8000-000000000023'::uuid AND decision='needs_info')
 THEN RAISE EXCEPTION 'Moderation result or audit trail mismatch'; END IF;
END $assert$;
ROLLBACK;
SELECT 'PASS_W07_OFFER_REVIEW_MATRIX_ROLLBACK' AS result;
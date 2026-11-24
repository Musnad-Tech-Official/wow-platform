-- Run in BEGIN/ROLLBACK against the proposed or installed read model.
CREATE TEMP TABLE aud025_ids(case_name text primary key,offer_id uuid,version_id uuid) ON COMMIT DROP;
CREATE TEMP TABLE aud025_actors(customer text,suspended text,branch_id uuid) ON COMMIT DROP;
CREATE TEMP TABLE aud025_cases(name text primary key) ON COMMIT DROP;
DO $seed$
DECLARE b uuid:=gen_random_uuid(); br uuid:=gen_random_uuid(); cat uuid:=gen_random_uuid();
 owner text:='qa_aud025_owner_'||substr(md5(random()::text),1,16);
 customer text:='qa_aud025_customer_'||substr(md5(random()::text),1,16);
 suspended text:='qa_aud025_suspended_'||substr(md5(random()::text),1,16);
 item record; o uuid; v uuid;
BEGIN
 INSERT INTO public.users(id,account_status) VALUES(owner,'active'),(customer,'active'),(suspended,'suspended');
 INSERT INTO public.categories(id,slug,name_ar,is_active) VALUES(cat,'qa-aud025-'||substr(md5(random()::text),1,16),'تصنيف اختبار',true);
 INSERT INTO public.businesses(id,owner_user_id,name,status,approved_at) VALUES(b,owner,'نشاط اختبار التقييم','approved',now());
 INSERT INTO public.business_members(business_id,user_id,role,status,can_draft,can_submit,can_pause,can_monitor)
 VALUES(b,owner,'owner','active',true,true,true,true);
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',owner,'role','authenticated')::text,true);
 INSERT INTO public.business_categories(business_id,category_id,is_primary,approved_by_user_id) VALUES(b,cat,true,owner);
 INSERT INTO public.business_branches(id,business_id,name,city,address_line,status,approved_at) VALUES(br,b,'فرع اختبار','عدن','عنوان الاختبار','approved',now());
 INSERT INTO public.business_subscriptions(business_id,kind,status,starts_at,ends_at,requested_by_user_id)
 VALUES(b,'trial','active',now()-interval '1 day',now()+interval '29 days',owner);
 FOR item IN SELECT * FROM (VALUES
   ('active',now()-interval '1 day',now()+interval '1 day',true),
   ('recent',now()-interval '5 days',now()-interval '1 day',true),
   ('boundary',now()-interval '20 days',now()-interval '14 days',true),
   ('outside',now()-interval '21 days',now()-interval '14 days 1 second',true),
   ('future',now()+interval '1 day',now()+interval '2 days',true),
   ('draft',now()-interval '1 day',now()+interval '1 day',false)
 ) AS x(label,starts_at,ends_at,approved) LOOP
   o:=gen_random_uuid(); v:=gen_random_uuid();
   INSERT INTO public.offers(id,business_id,created_by_user_id,status,merchant_available) VALUES(o,b,owner,'draft',true);
   INSERT INTO public.offer_versions(id,business_id,offer_id,version_no,title,offer_kind,original_price,final_price,currency,starts_at,ends_at,review_status,created_by_user_id,category_id)
     VALUES(v,b,o,1,'عرض اختبار التقييم','product',100,80,'YER',item.starts_at,item.ends_at,'draft',owner,cat);
   INSERT INTO public.offer_branches(business_id,offer_version_id,branch_id) VALUES(b,v,br);
   IF item.approved THEN
     UPDATE public.offer_versions SET review_status='pending',submitted_at=now()-interval '2 hours' WHERE id=v;
     UPDATE public.offer_versions SET review_status='approved',approved_at=now()-interval '1 hour' WHERE id=v;
     UPDATE public.offers SET current_version_id=v,status='active' WHERE id=o;
   END IF;
   INSERT INTO aud025_ids VALUES(item.label,o,v);
 END LOOP;
 INSERT INTO aud025_actors VALUES(customer,suspended,br);
END $seed$;
GRANT SELECT ON aud025_ids,aud025_actors TO authenticated,anon;
GRANT INSERT,SELECT ON aud025_cases TO authenticated;
DO $privileges$
BEGIN
 IF has_function_privilege('anon','public.wow_customer_get_assessment_offer(uuid,text)','EXECUTE')
 OR has_function_privilege('anon','wow_private.customer_get_assessment_offer_internal(uuid,text)','EXECUTE')
 THEN RAISE EXCEPTION 'Anonymous function privilege exposed'; END IF;
 INSERT INTO aud025_cases VALUES('anonymous-execute-denied');
END $privileges$;
SET LOCAL ROLE authenticated;
DO $verify$
DECLARE a aud025_actors%ROWTYPE; r record; data jsonb; key_count int; rating_id uuid; complaint_id uuid;
BEGIN
 SELECT * INTO a FROM aud025_actors;
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',a.customer,'role','authenticated')::text,true);
 FOR r IN SELECT * FROM aud025_ids LOOP
   data:=public.wow_customer_get_assessment_offer(r.offer_id,'rating');
   IF r.case_name IN ('active','recent','boundary') THEN
     IF data IS NULL OR data->>'offer_version_id' IS DISTINCT FROM r.version_id::text OR jsonb_array_length(data->'branches')<>0 THEN
       RAISE EXCEPTION 'Rating expected eligible: %',r.case_name;
     END IF;
     SELECT count(*) INTO key_count FROM jsonb_object_keys(data);
     IF key_count<>5 OR NOT data ?& ARRAY['id','offer_version_id','title','business','branches']
       OR (SELECT count(*) FROM jsonb_object_keys(data->'business'))<>1 THEN RAISE EXCEPTION 'Projection not minimal'; END IF;
     rating_id:=public.wow_rate_offer(r.offer_id,'matches',4::smallint);
     IF rating_id IS NULL THEN RAISE EXCEPTION 'Rating write policy mismatch'; END IF;
   ELSE
     IF data IS NOT NULL THEN RAISE EXCEPTION 'Rating unexpectedly eligible: %',r.case_name; END IF;
     BEGIN
       PERFORM public.wow_rate_offer(r.offer_id,'matches',4::smallint);
       RAISE EXCEPTION 'Invalid rating unexpectedly accepted';
     EXCEPTION WHEN SQLSTATE '22023' THEN NULL; END;
   END IF;
   INSERT INTO aud025_cases VALUES('rating-'||r.case_name);
   data:=public.wow_customer_get_assessment_offer(r.offer_id,'complaint');
   IF r.case_name='draft' THEN
     IF data IS NOT NULL THEN RAISE EXCEPTION 'Draft complaint target exposed'; END IF;
   ELSE
     IF data IS NULL OR data->>'offer_version_id' IS DISTINCT FROM r.version_id::text OR
       jsonb_array_length(data->'branches')<>1 OR data->'branches'->0->>'id' IS DISTINCT FROM a.branch_id::text
       THEN RAISE EXCEPTION 'Complaint target policy mismatch: %',r.case_name; END IF;
   END IF;
   INSERT INTO aud025_cases VALUES('complaint-'||r.case_name);
 END LOOP;
 SELECT * INTO r FROM aud025_ids WHERE case_name='recent';
 IF public.wow_public_get_offer(r.offer_id) IS NOT NULL THEN RAISE EXCEPTION 'Expired offer publicly discoverable'; END IF;
 INSERT INTO aud025_cases VALUES('expired-public-detail-remains-hidden');
 SELECT * INTO r FROM aud025_ids WHERE case_name='outside';
 complaint_id:=public.wow_submit_complaint(r.offer_id,'other','Regression test complaint, valid description',r.version_id,a.branch_id,NULL,'[]'::jsonb);
 IF complaint_id IS NULL THEN RAISE EXCEPTION 'Complaint incorrectly limited by rating window'; END IF;
 INSERT INTO aud025_cases VALUES('complaint-outside-window-write-permitted');
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',a.suspended,'role','authenticated')::text,true);
 BEGIN
   PERFORM public.wow_customer_get_assessment_offer(r.offer_id,'complaint');
   RAISE EXCEPTION 'Suspended user read unexpectedly accepted';
 EXCEPTION WHEN SQLSTATE '42501' THEN NULL; END;
 INSERT INTO aud025_cases VALUES('suspended-profile-denied');
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub','qa_aud025_missing_profile','role','authenticated')::text,true);
 BEGIN
   PERFORM public.wow_customer_get_assessment_offer(r.offer_id,'rating');
   RAISE EXCEPTION 'Missing profile read unexpectedly accepted';
 EXCEPTION WHEN SQLSTATE '42501' THEN NULL; END;
 INSERT INTO aud025_cases VALUES('unsynchronized-profile-denied');
END $verify$;
RESET ROLE;
SELECT jsonb_build_object('passed',count(*),'cases',jsonb_agg(name ORDER BY name)) AS aud025_results FROM aud025_cases;

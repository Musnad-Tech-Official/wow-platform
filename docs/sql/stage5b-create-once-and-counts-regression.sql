-- Run inside BEGIN/ROLLBACK, after proposed SQL, using only synthetic records.
CREATE TEMP TABLE aud5b_cases(name text PRIMARY KEY) ON COMMIT DROP;
DO $check$
DECLARE b uuid:=gen_random_uuid(); req uuid:=gen_random_uuid(); first_id uuid; second_id uuid; n bigint;
o uuid:=gen_random_uuid(); v uuid:=gen_random_uuid(); br uuid:=gen_random_uuid(); br2 uuid:=gen_random_uuid(); cat uuid:=gen_random_uuid(); mem uuid;
owner_id text:='qa_5b_owner_'||substr(md5(random()::text),1,17);
monitor_id text:='qa_5b_monitor_'||substr(md5(random()::text),1,17);
zero_id text:='qa_5b_zero_'||substr(md5(random()::text),1,17);
customer_id text; counts jsonb;
BEGIN
 INSERT INTO public.users(id,account_status) VALUES(owner_id,'active'),(monitor_id,'active'),(zero_id,'active');
 INSERT INTO public.businesses(id,owner_user_id,name,status,approved_at) VALUES(b,owner_id,'QA business','approved',now());
 INSERT INTO public.business_members(business_id,user_id,role,status,can_draft,can_submit,can_pause,can_monitor) VALUES(b,owner_id,'owner','active',true,true,true,true);
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',owner_id,'role','authenticated')::text,true);
 first_id:=public.wow_create_offer_once(b,req);
 second_id:=public.wow_create_offer_once(b,req);
 SELECT count(*) INTO n FROM public.offers WHERE id=req AND business_id=b AND created_by_user_id=owner_id;
 IF first_id IS DISTINCT FROM req OR second_id IS DISTINCT FROM req OR n<>1 THEN RAISE EXCEPTION 'create-once mismatch first %, second %, rows %',first_id,second_id,n; END IF;
 INSERT INTO aud5b_cases VALUES('same-request-same-offer');
 INSERT INTO public.categories(id,slug,name_ar,is_active) VALUES(cat,'qa-5b-'||substr(md5(random()::text),1,16),'QA',true);
 INSERT INTO public.business_categories(business_id,category_id,is_primary,approved_by_user_id) VALUES(b,cat,true,owner_id);
 INSERT INTO public.business_branches(id,business_id,name,city,address_line,status,approved_at) VALUES(br,b,'Branch A','Aden','QA address','approved',now()),(br2,b,'Branch B','Aden','QA address','approved',now());
 INSERT INTO public.offers(id,business_id,created_by_user_id,status,merchant_available) VALUES(o,b,owner_id,'draft',true);
 INSERT INTO public.offer_versions(id,business_id,offer_id,version_no,title,offer_kind,original_price,final_price,currency,starts_at,ends_at,review_status,created_by_user_id,category_id) VALUES(v,b,o,1,'QA offer','product',100,80,'YER',now()-interval '1 hour',now()+interval '1 day','draft',owner_id,cat);
 INSERT INTO public.offer_branches(business_id,offer_version_id,branch_id) VALUES(b,v,br),(b,v,br2);
 UPDATE public.offer_versions SET review_status='pending',submitted_at=now()-interval '2 hours' WHERE id=v;
 UPDATE public.offer_versions SET review_status='approved',approved_at=now()-interval '1 hour' WHERE id=v;
 UPDATE public.offers SET current_version_id=v,status='active' WHERE id=o;
 FOR i IN 1..55 LOOP
 customer_id:='qa_5b_customer_'||substr(md5(random()::text),1,17);
 INSERT INTO public.users(id,account_status) VALUES(customer_id,'active');
 INSERT INTO public.complaints(user_id,offer_id,offer_version_id,branch_id,complaint_type,description,status,created_at,closed_at,public_outcome)
 VALUES(customer_id,o,v,CASE WHEN i<=52 THEN br ELSE br2 END,'other','QA complaint description for regression',CASE WHEN i=1 THEN 'new' ELSE 'closed' END,now()-(56-i)*interval '1 second',CASE WHEN i=1 THEN NULL ELSE now() END,CASE WHEN i=1 THEN NULL ELSE 'QA resolved outcome' END);
 END LOOP;
 counts:=public.wow_merchant_complaint_counts(b);
 IF counts<>jsonb_build_object('totalCount',55,'openCount',1,'closedCount',54) THEN RAISE EXCEPTION 'owner counts %',counts; END IF;
 INSERT INTO aud5b_cases VALUES('owner-beyond-50');
 INSERT INTO public.business_members(business_id,user_id,role,status,can_draft,can_submit,can_pause,can_monitor) VALUES(b,monitor_id,'employee','active',false,false,false,true) RETURNING id INTO mem;
 INSERT INTO public.business_member_branches(member_id,business_id,branch_id) VALUES(mem,b,br);
 INSERT INTO public.business_members(business_id,user_id,role,status,can_draft,can_submit,can_pause,can_monitor) VALUES(b,zero_id,'employee','active',false,false,false,false);
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',monitor_id,'role','authenticated')::text,true);
 counts:=public.wow_merchant_complaint_counts(b);
 IF counts<>jsonb_build_object('totalCount',52,'openCount',1,'closedCount',51) THEN RAISE EXCEPTION 'monitor counts %',counts; END IF;
 INSERT INTO aud5b_cases VALUES('monitor-branch-scope');
 BEGIN PERFORM public.wow_create_offer_once(b,gen_random_uuid()); RAISE EXCEPTION 'unexpected draft permission'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 INSERT INTO aud5b_cases VALUES('monitor-draft-denied');
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',zero_id,'role','authenticated')::text,true);
 BEGIN PERFORM public.wow_merchant_complaint_counts(b); RAISE EXCEPTION 'unexpected zero flag access'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 INSERT INTO aud5b_cases VALUES('zero-flags-denied');
 IF has_function_privilege('anon','public.wow_merchant_complaint_counts(uuid)','EXECUTE') OR has_function_privilege('anon','public.wow_create_offer_once(uuid,uuid)','EXECUTE') THEN RAISE EXCEPTION 'anon grant'; END IF;
 INSERT INTO aud5b_cases VALUES('anon-denied');
END; $check$;
SELECT count(*) AS passed,jsonb_agg(name ORDER BY name) AS cases FROM aud5b_cases;

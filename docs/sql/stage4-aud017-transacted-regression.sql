-- AUD-017. Run ONLY inside BEGIN/ROLLBACK after the tested migration.
CREATE TEMP TABLE aud017_results(case_name text primary key) ON COMMIT DROP;
DO $aud017$
DECLARE
  reviewer text := 'qa_cat_reviewer_' || substr(md5(random()::text),1,18);
  owner_id text := 'qa_cat_owner_' || substr(md5(random()::text),1,18);
  approved_id uuid := gen_random_uuid();
  draft_id uuid := gen_random_uuid();
  v_category_id uuid;
  invalid_primary uuid := gen_random_uuid();
  done boolean;
  result_id uuid;
BEGIN
 SELECT id INTO v_category_id FROM public.categories WHERE is_active ORDER BY created_at LIMIT 1;
 IF v_category_id IS NULL THEN RAISE EXCEPTION 'Missing active category to test'; END IF;
 INSERT INTO public.users(id,account_status) VALUES(reviewer,'active'),(owner_id,'active');
 INSERT INTO wow_private.admin_members(user_id,role,is_active) VALUES(reviewer,'reviewer',true);
 INSERT INTO public.businesses(id,owner_user_id,name,status,approved_at)
 VALUES(approved_id,owner_id,'QA Approved Shop','approved',now());
 INSERT INTO public.businesses(id,owner_user_id,name,status)
 VALUES(draft_id,owner_id,'QA Draft Shop','draft');
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',reviewer,'role','authenticated')::text,true);

 done:=false;
 BEGIN
   PERFORM public.wow_admin_set_business_categories(approved_id,ARRAY[]::uuid[],NULL,'QA intentionally empty assignment');
 EXCEPTION WHEN SQLSTATE '22023' THEN done:=true;
 END;
 IF NOT done THEN RAISE EXCEPTION 'Empty category list accepted'; END IF;
 INSERT INTO aud017_results VALUES('empty-categories-denied');
 done:=false;
 BEGIN
   PERFORM public.wow_admin_set_business_categories(approved_id,ARRAY[v_category_id],NULL,'QA missing primary category');
 EXCEPTION WHEN SQLSTATE '22023' THEN done:=true;
 END;
 IF NOT done THEN RAISE EXCEPTION 'Missing primary category accepted'; END IF;
 INSERT INTO aud017_results VALUES('missing-primary-denied');
 done:=false;
 BEGIN
   PERFORM public.wow_admin_set_business_categories(approved_id,ARRAY[v_category_id],invalid_primary,'QA foreign primary category');
 EXCEPTION WHEN SQLSTATE '22023' THEN done:=true;
 END;
 IF NOT done THEN RAISE EXCEPTION 'Unassigned primary accepted'; END IF;
 INSERT INTO aud017_results VALUES('foreign-primary-denied');
 done:=false;
 BEGIN
   PERFORM public.wow_admin_set_business_categories(approved_id,ARRAY[v_category_id,v_category_id],v_category_id,'QA duplicate category assignment');
 EXCEPTION WHEN SQLSTATE '22023' THEN done:=true;
 END;
 IF NOT done THEN RAISE EXCEPTION 'Duplicate category accepted'; END IF;
 INSERT INTO aud017_results VALUES('duplicate-categories-denied');
 done:=false;
 BEGIN
   PERFORM public.wow_admin_set_business_categories(draft_id,ARRAY[v_category_id],v_category_id,'QA attempt to categorize draft');
 EXCEPTION WHEN SQLSTATE '22023' THEN done:=true;
 END;
 IF NOT done THEN RAISE EXCEPTION 'Draft business category assignment accepted'; END IF;
 INSERT INTO aud017_results VALUES('draft-business-denied');
 result_id:=public.wow_admin_set_business_categories(approved_id,ARRAY[v_category_id],v_category_id,'QA valid approved business assignment');
 IF result_id IS DISTINCT FROM approved_id OR NOT EXISTS(
   SELECT 1 FROM public.business_categories bc
   WHERE bc.business_id=approved_id AND bc.category_id=v_category_id AND bc.is_primary
 ) THEN RAISE EXCEPTION 'Approved business assignment not saved'; END IF;
 INSERT INTO aud017_results VALUES('approved-business-assignment-succeeds');
 IF (SELECT count(*) FROM public.business_categories WHERE business_id=approved_id) <> 1
 OR (SELECT count(*) FROM wow_private.category_assignment_events WHERE business_id=approved_id) <> 1
 THEN RAISE EXCEPTION 'Incorrect assignment count or audit trail'; END IF;
 INSERT INTO aud017_results VALUES('assignment-and-audit-atomic');
 PERFORM set_config('request.jwt.claims','{}',true);
 done:=false;
 BEGIN
   PERFORM public.wow_admin_set_business_categories(approved_id,ARRAY[v_category_id],v_category_id,'QA unauthorized assignment attempt');
 EXCEPTION WHEN SQLSTATE '42501' THEN done:=true;
 END;
 IF NOT done THEN RAISE EXCEPTION 'Anonymous admin category assignment accepted'; END IF;
 INSERT INTO aud017_results VALUES('anonymous-denied');
END;
$aud017$;
SELECT jsonb_build_object('passed',count(*),'cases',jsonb_agg(case_name ORDER BY case_name))
 AS aud017_result FROM aud017_results;

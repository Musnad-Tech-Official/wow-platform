-- W07 category editing and business assignment role/state/audit matrix.
-- All synthetic entities and events rolled back.
BEGIN;
SET LOCAL lock_timeout='5s'; SET LOCAL statement_timeout='30s';
DO $fixture$
BEGIN
 IF EXISTS (SELECT 1 FROM public.users WHERE id LIKE 'w07_catqa_%') OR
 EXISTS (SELECT 1 FROM public.businesses WHERE id='a7070000-0000-4000-8000-000000000001'::uuid)
 THEN RAISE EXCEPTION 'W07 category fixture collision'; END IF;
 INSERT INTO public.users(id,full_name) VALUES
 ('w07_catqa_owner_20261115','W07 Category QA owner'),('w07_catqa_reviewer_20261115','W07 Category QA reviewer'),('w07_catqa_super_20261115','W07 Category QA admin'),('w07_catqa_viewer_20261115','W07 Category QA viewer');
 INSERT INTO wow_private.admin_members(user_id,role,is_active) VALUES
 ('w07_catqa_owner_20261115','reviewer',true),('w07_catqa_reviewer_20261115','reviewer',true),
 ('w07_catqa_super_20261115','super_admin',true),('w07_catqa_viewer_20261115','viewer',true);
 INSERT INTO public.businesses(id,owner_user_id,name,status,approved_at)
 VALUES('a7070000-0000-4000-8000-000000000001'::uuid,'w07_catqa_owner_20261115','W07 Category QA Business','approved',now());
 INSERT INTO public.business_members(business_id,user_id,role,status,can_draft,can_submit,can_pause,can_monitor)
 VALUES('a7070000-0000-4000-8000-000000000001'::uuid,'w07_catqa_owner_20261115','owner','active',true,true,true,true);
 INSERT INTO public.categories(id,slug,name_ar,is_active)
 VALUES('a7070000-0000-4000-8000-000000000002'::uuid,'w07-category-qa-root','فئة إدارية تجريبية',true);
END $fixture$;
SET LOCAL ROLE authenticated;
DO $roles$
DECLARE v_created uuid; v_record uuid; v_result jsonb;
BEGIN
 PERFORM set_config('request.jwt.claims','{"role":"authenticated","sub":"w07_catqa_viewer_20261115"}',true);
 SELECT public.wow_admin_list_categories() INTO v_result;
 IF jsonb_typeof(v_result)<>'array' THEN RAISE EXCEPTION 'Viewer could not see categories'; END IF;
 BEGIN PERFORM public.wow_admin_upsert_category(NULL,'w07-illegal','غير مصرح',NULL,NULL,0,true);
  RAISE EXCEPTION 'Viewer was allowed category write'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM public.wow_admin_set_business_categories('a7070000-0000-4000-8000-000000000001'::uuid,ARRAY['a7070000-0000-4000-8000-000000000002'::uuid],'a7070000-0000-4000-8000-000000000002'::uuid,'Category assignment requires review');
  RAISE EXCEPTION 'Viewer could approve category assignment'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 PERFORM set_config('request.jwt.claims','{"role":"authenticated","sub":"w07_catqa_owner_20261115"}',true);
 BEGIN PERFORM public.wow_admin_set_business_categories('a7070000-0000-4000-8000-000000000001'::uuid,ARRAY['a7070000-0000-4000-8000-000000000002'::uuid],'a7070000-0000-4000-8000-000000000002'::uuid,'Owner conflict review check');
  RAISE EXCEPTION 'Owner reviewer approved own business categories'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 PERFORM set_config('request.jwt.claims','{"role":"authenticated","sub":"w07_catqa_reviewer_20261115"}',true);
 BEGIN PERFORM public.wow_admin_upsert_category(NULL,'w07-not-allowed','مرفوض',NULL,NULL,0,true);
  RAISE EXCEPTION 'Reviewer was allowed superadmin catalog write'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM public.wow_admin_set_business_categories('a7070000-0000-4000-8000-000000000001'::uuid,ARRAY['a7070000-0000-4000-8000-000000000002'::uuid],'a7070000-0000-4000-8000-000000000002'::uuid,'short');
  RAISE EXCEPTION 'Short category reason was accepted'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
 SELECT public.wow_admin_set_business_categories('a7070000-0000-4000-8000-000000000001'::uuid,ARRAY['a7070000-0000-4000-8000-000000000002'::uuid],'a7070000-0000-4000-8000-000000000002'::uuid,'Validated independent category assignment') INTO v_record;
 IF v_record IS DISTINCT FROM 'a7070000-0000-4000-8000-000000000001'::uuid THEN RAISE EXCEPTION 'Unexpected category assignment result'; END IF;
 PERFORM set_config('request.jwt.claims','{"role":"authenticated","sub":"w07_catqa_super_20261115"}',true);
 SELECT public.wow_admin_upsert_category('a7070000-0000-4000-8000-000000000002'::uuid,'w07-category-qa-root','فئة تجريبية معدلة',NULL,NULL,1,true) INTO v_record;
 IF v_record IS DISTINCT FROM 'a7070000-0000-4000-8000-000000000002'::uuid THEN RAISE EXCEPTION 'Superadmin category update mismatch'; END IF;
 SELECT public.wow_admin_upsert_category(NULL,'w07-category-qa-child','تصنيف فرعي',NULL,'a7070000-0000-4000-8000-000000000002'::uuid,2,true) INTO v_created;
 IF v_created IS NULL THEN RAISE EXCEPTION 'Superadmin category create failed'; END IF;
END $roles$;
RESET ROLE;
DO $assert$
BEGIN
 IF (SELECT name_ar FROM public.categories WHERE id='a7070000-0000-4000-8000-000000000002'::uuid)<>'فئة تجريبية معدلة'
 OR (SELECT count(*) FROM public.business_categories WHERE business_id='a7070000-0000-4000-8000-000000000001'::uuid AND category_id='a7070000-0000-4000-8000-000000000002'::uuid AND is_primary)<>1
 OR (SELECT count(*) FROM wow_private.category_assignment_events WHERE business_id='a7070000-0000-4000-8000-000000000001'::uuid)<>1
 OR (SELECT count(*) FROM public.categories WHERE parent_id='a7070000-0000-4000-8000-000000000002'::uuid AND slug='w07-category-qa-child')<>1
 THEN RAISE EXCEPTION 'Category write or audit state mismatch'; END IF;
END $assert$;
ROLLBACK;
SELECT 'PASS_W07_CATEGORIES_ROLE_WRITE_AUDIT_ROLLBACK' AS result;
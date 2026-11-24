-- Stage 6: storage authorization helpers under the actual database role.
-- Transaction rollback only; no storage.objects writes or physical files.
BEGIN;
SET LOCAL statement_timeout='30s'; SET LOCAL lock_timeout='5s';
CREATE TEMP TABLE qa6_store_actors(label text PRIMARY KEY,uid text) ON COMMIT DROP;
CREATE TEMP TABLE qa6_store_objects(label text PRIMARY KEY,bucket text,key text) ON COMMIT DROP;
CREATE TEMP TABLE qa6_store_cases(actor text,object_label text,read_ok boolean,upload_ok boolean,PRIMARY KEY(actor,object_label)) ON COMMIT DROP;
DO $seed$
DECLARE x text:=substr(md5(random()::text),1,16); a text:='qa_6_store_a_'||x; b text:='qa_6_store_b_'||x; c text:='qa_6_store_c_'||x; e text:='qa_6_store_e_'||x; z text:='qa_6_store_z_'||x; r text:='qa_6_store_r_'||x; w text:='qa_6_store_w_'||x; t text:='qa_6_store_t_'||x; f text:='qa_6_store_f_'||x; u text:='qa_6_store_u_'||x;
 ba uuid:=gen_random_uuid(); bb uuid:=gen_random_uuid(); br uuid:=gen_random_uuid(); mem uuid; oa uuid; va uuid; oe uuid; ve uuid; cid uuid:=gen_random_uuid(); payload jsonb;
BEGIN
 INSERT INTO public.users(id,account_status) VALUES(a,'active'),(b,'active'),(c,'active'),(e,'active'),(z,'active'),(r,'active'),(w,'active'),(t,'active'),(f,'active'),(u,'suspended');
 INSERT INTO wow_private.admin_members(user_id,role,is_active) VALUES(r,'reviewer',true),(w,'viewer',true),(t,'super_admin',true),(f,'reviewer',true),(u,'reviewer',true);
 INSERT INTO public.businesses(id,owner_user_id,name,status,approved_at) VALUES(ba,a,'QA6 storage rollback A','approved',now()),(bb,b,'QA6 storage rollback B','approved',now());
 INSERT INTO public.business_members(business_id,user_id,role,status,can_draft,can_submit,can_pause,can_monitor) VALUES(ba,a,'owner','active',true,true,true,true),(bb,b,'owner','active',true,true,true,true),(ba,z,'employee','active',false,false,false,false),(ba,f,'employee','active',false,false,false,false);
 INSERT INTO public.business_members(business_id,user_id,role,status,can_draft,can_submit,can_pause,can_monitor) VALUES(ba,e,'employee','active',true,false,false,false) RETURNING id INTO mem;
 INSERT INTO public.business_branches(id,business_id,name,city,address_line,status,approved_at) VALUES(br,ba,'QA branch','Aden','QA address','approved',now());
 INSERT INTO public.business_member_branches(member_id,business_id,branch_id) VALUES(mem,ba,br);
 payload:=jsonb_build_object('title','QA draft','offer_kind','product','currency','YER','items',jsonb_build_array(jsonb_build_object('item_type','product','name','QA item')),'branches',jsonb_build_array(br::text));
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated')::text,true);
 oa:=public.wow_create_offer(ba); va:=public.wow_save_offer_draft(oa,payload);
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',e,'role','authenticated')::text,true);
 oe:=public.wow_create_offer(ba); ve:=public.wow_save_offer_draft(oe,payload);
 INSERT INTO public.complaints(id,user_id,offer_id,offer_version_id,complaint_type,description,status,private_evidence_keys) VALUES(cid,c,oa,va,'other','QA synthetic complaint description','new','[]'::jsonb);
 INSERT INTO qa6_store_actors VALUES('owner',a),('other_owner',b),('customer',c),('assigned_creator',e),('zero_permission',z),('reviewer',r),('viewer',w),('super_admin',t),('conflicted',f),('suspended',u);
 INSERT INTO qa6_store_objects VALUES
 ('business_image','wow-business-media',ba::text||'/'||a||'/'||repeat('a',48)||'.jpg'),
 ('owner_offer','wow-offer-media',ba::text||'/'||va::text||'/'||a||'/'||repeat('b',48)||'.jpg'),
 ('employee_offer','wow-offer-media',ba::text||'/'||ve::text||'/'||e||'/'||repeat('c',48)||'.jpg'),
 ('verification','wow-verification-evidence','business-verifications/'||ba::text||'/'||a||'/'||repeat('d',48)||'.pdf'),
 ('customer_complaint','wow-complaint-evidence','complaints/'||c||'/'||cid::text||'/'||repeat('e',48)||'.pdf'),
 ('owner_complaint','wow-complaint-evidence','complaints/'||a||'/'||cid::text||'/'||repeat('f',48)||'.pdf');
END $seed$;
GRANT SELECT ON qa6_store_actors,qa6_store_objects TO authenticated;
GRANT SELECT,INSERT ON qa6_store_cases TO authenticated;
SET LOCAL ROLE authenticated;
DO $matrix$
DECLARE rec record; actual_r boolean; actual_u boolean; expected_r boolean; expected_u boolean;
BEGIN
 FOR rec IN SELECT a.label actor,a.uid,o.label object_label,o.bucket,o.key FROM qa6_store_actors a CROSS JOIN qa6_store_objects o LOOP
  PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',rec.uid,'role','authenticated')::text,true);
  expected_r:=CASE
   WHEN rec.actor IN ('reviewer','super_admin') THEN true
   WHEN rec.actor='owner' THEN rec.object_label<>'customer_complaint'
   WHEN rec.actor='assigned_creator' THEN rec.object_label IN ('owner_offer','employee_offer')
   WHEN rec.actor='customer' THEN rec.object_label='customer_complaint'
   ELSE false END;
  expected_u:=CASE
   WHEN rec.actor='owner' THEN rec.object_label IN ('business_image','owner_offer','verification','owner_complaint')
   WHEN rec.actor='assigned_creator' THEN rec.object_label='employee_offer'
   WHEN rec.actor='customer' THEN rec.object_label='customer_complaint'
   ELSE false END;
  actual_r:=wow_private.can_read_wow_object(rec.bucket,rec.key);
  actual_u:=wow_private.can_upload_wow_object(rec.bucket,rec.key);
  IF actual_r IS DISTINCT FROM expected_r OR actual_u IS DISTINCT FROM expected_u THEN RAISE EXCEPTION 'scope mismatch %/% read actual=% expected=% upload actual=% expected=%',rec.actor,rec.object_label,actual_r,expected_r,actual_u,expected_u; END IF;
  INSERT INTO qa6_store_cases VALUES(rec.actor,rec.object_label,actual_r,actual_u);
 END LOOP;
END $matrix$;
RESET ROLE;
SELECT count(*) AS combinations, count(*)*2 AS assertions, count(*) FILTER(WHERE read_ok) AS allowed_reads,count(*) FILTER(WHERE upload_ok) AS allowed_uploads FROM qa6_store_cases;
ROLLBACK;
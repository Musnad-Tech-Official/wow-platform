-- AUD-019: run inside BEGIN / ROLLBACK with migration applied.
CREATE TEMP TABLE aud019_results (case_name text primary key) ON COMMIT DROP;
DO $aud019$
DECLARE
  biz uuid;
  owner_id text;
  reviewer text := 'stage4_reviewer_' || substr(md5(random()::text),1,16);
  customer text := 'stage4_customer_' || substr(md5(random()::text),1,16);
  offerid uuid := gen_random_uuid();
  versionid uuid := gen_random_uuid();
  complaintid uuid := gen_random_uuid();
  r uuid;
  denied boolean;
BEGIN
  biz:=gen_random_uuid();
 owner_id:='qa_aud019_owner_'||substr(md5(random()::text),1,16);
 INSERT INTO public.users(id,account_status) VALUES(owner_id,'active');
 INSERT INTO public.businesses(id,owner_user_id,name,status,approved_at) VALUES(biz,owner_id,'Isolated Stage4 SQL regression', 'approved',now());
 INSERT INTO public.business_members(business_id,user_id,role,status,can_draft,can_submit,can_pause,can_monitor)
 VALUES(biz,owner_id,'owner','active',true,true,true,true);
  INSERT INTO public.users(id,account_status)
  VALUES(reviewer,'active'),(customer,'active');
  INSERT INTO wow_private.admin_members(user_id,role,is_active) VALUES(reviewer,'reviewer',true);
  INSERT INTO public.offers(id,business_id,created_by_user_id) VALUES(offerid,biz,owner_id);
  INSERT INTO public.offer_versions(id,business_id,offer_id,version_no,created_by_user_id,title)
  VALUES(versionid,biz,offerid,1,owner_id,'Stage4 waiting QA offer');
  INSERT INTO public.complaints(id,user_id,offer_id,offer_version_id,complaint_type,description,status)
  VALUES(complaintid,customer,offerid,versionid,'other','Test complaint about a merchant service','new');
  PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',reviewer,'role','authenticated')::text,true);
  denied:=false;
  BEGIN
    PERFORM public.wow_admin_update_complaint(complaintid,'waiting','Internal review note',null);
  EXCEPTION WHEN SQLSTATE '22023' THEN denied:=true;
  END;
  IF NOT denied THEN RAISE EXCEPTION 'status-only waiting succeeded'; END IF;
  INSERT INTO aud019_results VALUES('waiting-status-only-denied');
  IF (SELECT status FROM public.complaints WHERE id=complaintid) <> 'new'
     OR EXISTS (SELECT 1 FROM public.complaint_updates WHERE complaint_id=complaintid) THEN
    RAISE EXCEPTION 'Denial caused partial complaint mutation';
  END IF;
  INSERT INTO aud019_results VALUES('waiting-denial-atomic');
  r:=public.wow_admin_request_merchant_response(complaintid,'Please explain the price mismatch');
  IF r IS NULL OR NOT EXISTS(
      SELECT 1 FROM public.complaint_updates
      WHERE id=r AND complaint_id=complaintid
        AND kind='request_info' AND visibility='proprietor_safe'
    ) OR (SELECT status FROM public.complaints WHERE id=complaintid) <> 'waiting'
    THEN RAISE EXCEPTION 'Legitimate request failed to record waiting and request_info'; END IF;
  INSERT INTO aud019_results VALUES('request-writes-waiting-and-proprietor-visible-update');
  denied:=false;
  BEGIN
    PERFORM public.wow_admin_request_merchant_response(complaintid,'Duplicate information request');
  EXCEPTION WHEN SQLSTATE '22023' THEN denied:=true;
  END;
  IF NOT denied THEN RAISE EXCEPTION 'duplicate request accepted'; END IF;
  INSERT INTO aud019_results VALUES('duplicate-pending-request-denied');
  PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',owner_id,'role','authenticated')::text,true);
  r:=public.wow_merchant_respond_complaint(complaintid,'Response to administrator request');
  IF r IS NULL OR
     (SELECT status FROM public.complaints WHERE id=complaintid) <> 'investigating' THEN
    RAISE EXCEPTION 'Merchant cannot respond to explicit request'; END IF;
  INSERT INTO aud019_results VALUES('merchant-response-restores-investigating');
  PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',reviewer,'role','authenticated')::text,true);
  r:=public.wow_admin_update_complaint(complaintid,'closed','Administrative decision note','Matter resolved as requested');
  IF r<>complaintid OR (SELECT status FROM public.complaints WHERE id=complaintid) <> 'closed'
    THEN RAISE EXCEPTION 'Closed complaint regression'; END IF;
  INSERT INTO aud019_results VALUES('close-workflow-unchanged');
END;
$aud019$;
SELECT jsonb_build_object('passed',count(*),'cases',jsonb_agg(case_name ORDER BY case_name))
AS aud019_result FROM aud019_results;

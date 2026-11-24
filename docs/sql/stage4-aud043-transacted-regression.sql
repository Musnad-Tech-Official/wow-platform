-- AUD-043 regression. Safe ONLY when run inside BEGIN / ROLLBACK.
-- Creates temporary users, admin memberships, business memberships,
-- offer/media/evidence and complaint/update records. Never commit fixtures.
CREATE TEMP TABLE aud043_results (case_name text primary key) ON COMMIT DROP;
DO $aud043$
DECLARE
 biz uuid; owner_id text;
 viewer text := 'qa_viewer_' || substr(md5(random()::text),1,19);
 reviewer text := 'qa_reviewer_' || substr(md5(random()::text),1,19);
 conflict text := 'qa_conflict_' || substr(md5(random()::text),1,19);
 offerid uuid := gen_random_uuid();
 versionid uuid := gen_random_uuid();
 complaintid uuid := gen_random_uuid();
 storagekey text;
 j jsonb;
BEGIN
 biz:=gen_random_uuid();
 owner_id:='qa_aud043_owner_'||substr(md5(random()::text),1,16);
 INSERT INTO public.users(id,account_status) VALUES(owner_id,'active');
 INSERT INTO public.businesses(id,owner_user_id,name,status,approved_at) VALUES(biz,owner_id,'Isolated Stage4 SQL regression', 'approved',now());
 INSERT INTO public.business_members(business_id,user_id,role,status,can_draft,can_submit,can_pause,can_monitor)
 VALUES(biz,owner_id,'owner','active',true,true,true,true);
 INSERT INTO public.users(id,account_status) VALUES(viewer,'active'),(reviewer,'active'),(conflict,'active');
 INSERT INTO wow_private.admin_members(user_id,role,is_active) VALUES
 (viewer,'viewer',true),(reviewer,'reviewer',true),(conflict,'reviewer',true);
 INSERT INTO public.business_members(business_id,user_id,role,status,can_draft)
 VALUES (biz,conflict,'employee','active',false);
 INSERT INTO public.offers(id,business_id,created_by_user_id) VALUES(offerid,biz,owner_id);
 INSERT INTO public.offer_versions(id,business_id,offer_id,version_no,created_by_user_id,title)
 VALUES(versionid,biz,offerid,1,owner_id,'Aud043 Test Version');
 storagekey := biz::text||'/'||versionid::text||'/media/qa.jpg';
 INSERT INTO public.offer_media(offer_version_id,storage_key,alt_text,sort_order)
 VALUES(versionid,storagekey,'QA alt',0);
 INSERT INTO wow_private.offer_evidence_drafts(offer_version_id,offer_id,documents,updated_by_user_id)
 VALUES(versionid,offerid,jsonb_build_array(jsonb_build_object(
 'storageKey','qa/private/secret.pdf','name','Private file','size',120,'mimeType','application/pdf')),owner_id);
 INSERT INTO public.complaints(id,user_id,offer_id,offer_version_id,complaint_type,description,status,private_evidence_keys)
 VALUES(complaintid,viewer,offerid,versionid,'other','QA complaint description with evidence','new',
 jsonb_build_array('qa/complaint/secret.pdf'));
 INSERT INTO public.complaint_updates(complaint_id,author_user_id,kind,message,visibility,private_evidence_keys)
 VALUES(complaintid,owner_id,'internal_note','QA note with evidence','admin_only',
 jsonb_build_array('qa/complaint/secret2.pdf'));

 -- Viewer: existence and descriptive metadata are allowed, private paths are not.
 PERFORM set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',viewer)::text,true);
 j:=public.wow_admin_get_offer_review(versionid);
 IF j IS NULL THEN RAISE EXCEPTION 'viewer cannot read review'; END IF;
 INSERT INTO aud043_results VALUES('viewer-offer-read');
 IF j #>> '{media,0,storage_key}' IS NOT NULL THEN RAISE EXCEPTION 'viewer media leak'; END IF;
 INSERT INTO aud043_results VALUES('viewer-media-path-hidden');
 IF j #>> '{media,0,alt_text}' IS DISTINCT FROM 'QA alt' THEN RAISE EXCEPTION 'viewer media metadata missing'; END IF;
 INSERT INTO aud043_results VALUES('viewer-media-metadata');
 IF j #>> '{private_evidence,0,storageKey}' IS NOT NULL THEN RAISE EXCEPTION 'viewer evidence leak'; END IF;
 INSERT INTO aud043_results VALUES('viewer-evidence-path-hidden');
 IF j #>> '{private_evidence,0,name}' IS DISTINCT FROM 'Private file' THEN RAISE EXCEPTION 'viewer evidence metadata missing'; END IF;
 INSERT INTO aud043_results VALUES('viewer-evidence-metadata');
 j:=wow_private.admin_get_offer_review_internal(versionid);
 IF j #>> '{media,0,storage_key}' IS NOT NULL THEN RAISE EXCEPTION 'internal viewer media leak'; END IF;
 INSERT INTO aud043_results VALUES('viewer-internal-offer-safe');
 j:=public.wow_admin_get_complaint(complaintid);
 IF j #> '{complaint,private_evidence_keys}' IS NOT NULL OR
    j #> '{updates,0,private_evidence_keys}' IS NOT NULL THEN RAISE EXCEPTION 'viewer complaint keys leak'; END IF;
 INSERT INTO aud043_results VALUES('viewer-complaint-paths-hidden');
 IF j #>> '{complaint,private_evidence_count}' IS DISTINCT FROM '1'
 OR j #>> '{updates,0,private_evidence_count}' IS DISTINCT FROM '1' THEN RAISE EXCEPTION 'viewer complaint counts missing'; END IF;
 INSERT INTO aud043_results VALUES('viewer-complaint-counts');
 j:=wow_private.admin_get_complaint_internal(complaintid);
 IF j #> '{complaint,private_evidence_keys}' IS NOT NULL THEN RAISE EXCEPTION 'internal viewer complaint leak'; END IF;
 INSERT INTO aud043_results VALUES('viewer-internal-complaint-safe');

 -- Unaffiliated reviewer retains private keys for legitimate review.
 PERFORM set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',reviewer)::text,true);
 j:=public.wow_admin_get_offer_review(versionid);
 IF j #>> '{media,0,storage_key}' IS DISTINCT FROM storagekey THEN RAISE EXCEPTION 'reviewer media key missing'; END IF;
 INSERT INTO aud043_results VALUES('reviewer-media-full');
 IF j #>> '{private_evidence,0,storageKey}' IS NULL THEN RAISE EXCEPTION 'reviewer evidence key missing'; END IF;
 INSERT INTO aud043_results VALUES('reviewer-evidence-full');
 j:=public.wow_admin_get_complaint(complaintid);
 IF j #> '{complaint,private_evidence_keys}' IS NULL
 OR j #> '{updates,0,private_evidence_keys}' IS NULL THEN RAISE EXCEPTION 'reviewer complaint evidence missing'; END IF;
 INSERT INTO aud043_results VALUES('reviewer-complaint-full');

 -- Reviewer who is an active employee is treated as conflicted on this business.
 PERFORM set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',conflict)::text,true);
 j:=public.wow_admin_get_offer_review(versionid);
 IF j #>> '{media,0,storage_key}' IS NOT NULL
 OR j #>> '{private_evidence,0,storageKey}' IS NOT NULL THEN RAISE EXCEPTION 'conflicted reviewer offer leak'; END IF;
 INSERT INTO aud043_results VALUES('conflicted-offer-sanitized');
 j:=public.wow_admin_get_complaint(complaintid);
 IF j #> '{complaint,private_evidence_keys}' IS NOT NULL
 OR j #> '{updates,0,private_evidence_keys}' IS NOT NULL THEN RAISE EXCEPTION 'conflicted reviewer complaint leak'; END IF;
 INSERT INTO aud043_results VALUES('conflicted-complaint-sanitized');

 -- Anonymous callers are rejected by existing admin access guard.
 PERFORM set_config('request.jwt.claims','{}',true);
 BEGIN
   j:=public.wow_admin_get_offer_review(versionid);
   RAISE EXCEPTION 'anonymous offer unexpectedly accessible';
 EXCEPTION WHEN SQLSTATE '42501' THEN
   INSERT INTO aud043_results VALUES('anonymous-offer-denied');
 END;
 BEGIN
   j:=public.wow_admin_get_complaint(complaintid);
   RAISE EXCEPTION 'anonymous complaint unexpectedly accessible';
 EXCEPTION WHEN SQLSTATE '42501' THEN
   INSERT INTO aud043_results VALUES('anonymous-complaint-denied');
 END;
END;
$aud043$;
SELECT jsonb_build_object('passed',count(*),'cases',jsonb_agg(case_name ORDER BY case_name))
 AS aud043_result FROM aud043_results;

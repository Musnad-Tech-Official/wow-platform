-- W06 QA profile-revision SQL role and decision regression.
-- Synthetic rows only; all DML and event rows rolled back.
BEGIN;
SET LOCAL statement_timeout='30s';
SET LOCAL lock_timeout='5s';
DO $fixtures$
BEGIN
 IF EXISTS(SELECT 1 FROM public.users WHERE id LIKE 'w06_revqa_%')
 OR EXISTS(SELECT 1 FROM public.businesses WHERE id IN ('81660000-0000-4000-8000-000000000011'::uuid,'81660000-0000-4000-8000-000000000012'::uuid)) THEN RAISE EXCEPTION 'Test fixture collision'; END IF;
 INSERT INTO public.users(id,full_name) VALUES ('w06_revqa_owner_20261115','W06 revision owner'),('w06_revqa_reviewer_20261115','W06 revision indep'),('w06_revqa_staff_20261115','W06 revision staff'),('w06_revqa_viewer_20261115','W06 revision viewer'),('w06_revqa_revoked_20261115','W06 revision revoked');
 INSERT INTO wow_private.admin_members(user_id,role,is_active) VALUES
 ('w06_revqa_owner_20261115','reviewer',true),('w06_revqa_reviewer_20261115','reviewer',true),('w06_revqa_staff_20261115','reviewer',true),
 ('w06_revqa_viewer_20261115','viewer',true),('w06_revqa_revoked_20261115','reviewer',false);
 INSERT INTO public.businesses(id,owner_user_id,name,status,approved_at) VALUES
 ('81660000-0000-4000-8000-000000000011'::uuid,'w06_revqa_owner_20261115','W06 Revision QA Business A','approved',now()),
 ('81660000-0000-4000-8000-000000000012'::uuid,'w06_revqa_owner_20261115','W06 Revision QA Business B','approved',now());
 INSERT INTO public.business_members(business_id,user_id,role,status,can_draft,can_submit,can_pause,can_monitor) VALUES
 ('81660000-0000-4000-8000-000000000011'::uuid,'w06_revqa_owner_20261115','owner','active',true,true,true,true),
 ('81660000-0000-4000-8000-000000000012'::uuid,'w06_revqa_owner_20261115','owner','active',true,true,true,true),
 ('81660000-0000-4000-8000-000000000011'::uuid,'w06_revqa_staff_20261115','employee','active',false,false,false,false);
 INSERT INTO public.business_profile_revisions(id,business_id,patch,status,requested_by_user_id) VALUES
 ('81660000-0000-4000-8000-000000000013'::uuid,'81660000-0000-4000-8000-000000000011'::uuid,'{"name":"W06 QA Approved Name"}'::jsonb,'submitted','w06_revqa_owner_20261115'),
 ('81660000-0000-4000-8000-000000000014'::uuid,'81660000-0000-4000-8000-000000000012'::uuid,'{"name":"W06 QA Rejected Name"}'::jsonb,'submitted','w06_revqa_owner_20261115');
END $fixtures$;
SET LOCAL ROLE authenticated;
DO $decisions$
DECLARE v uuid;
BEGIN
PERFORM set_config('request.jwt.claims','{"role":"authenticated","sub":"w06_revqa_owner_20261115"}',true);
BEGIN
  PERFORM public.wow_admin_decide_profile_revision('81660000-0000-4000-8000-000000000013'::uuid,'approved',null);
  RAISE EXCEPTION 'Unauthorized revision actor owner allowed';
EXCEPTION WHEN insufficient_privilege THEN NULL; END;
PERFORM set_config('request.jwt.claims','{"role":"authenticated","sub":"w06_revqa_staff_20261115"}',true);
BEGIN
  PERFORM public.wow_admin_decide_profile_revision('81660000-0000-4000-8000-000000000013'::uuid,'approved',null);
  RAISE EXCEPTION 'Unauthorized revision actor staff allowed';
EXCEPTION WHEN insufficient_privilege THEN NULL; END;
PERFORM set_config('request.jwt.claims','{"role":"authenticated","sub":"w06_revqa_viewer_20261115"}',true);
BEGIN
  PERFORM public.wow_admin_decide_profile_revision('81660000-0000-4000-8000-000000000013'::uuid,'approved',null);
  RAISE EXCEPTION 'Unauthorized revision actor viewer allowed';
EXCEPTION WHEN insufficient_privilege THEN NULL; END;
PERFORM set_config('request.jwt.claims','{"role":"authenticated","sub":"w06_revqa_revoked_20261115"}',true);
BEGIN
  PERFORM public.wow_admin_decide_profile_revision('81660000-0000-4000-8000-000000000013'::uuid,'approved',null);
  RAISE EXCEPTION 'Unauthorized revision actor revoked allowed';
EXCEPTION WHEN insufficient_privilege THEN NULL; END;
PERFORM set_config('request.jwt.claims','{"role":"authenticated","sub":"w06_revqa_reviewer_20261115"}',true);
BEGIN
 PERFORM public.wow_admin_decide_profile_revision('81660000-0000-4000-8000-000000000014'::uuid,'rejected','bad');
 RAISE EXCEPTION 'Rejected without adequate reason';
EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
SELECT public.wow_admin_decide_profile_revision('81660000-0000-4000-8000-000000000014'::uuid,'rejected','Insufficient profile evidence') INTO v;
IF v IS DISTINCT FROM '81660000-0000-4000-8000-000000000014'::uuid THEN RAISE EXCEPTION 'Rejection returned wrong revision'; END IF;
SELECT public.wow_admin_decide_profile_revision('81660000-0000-4000-8000-000000000013'::uuid,'approved',null) INTO v;
IF v IS DISTINCT FROM '81660000-0000-4000-8000-000000000013'::uuid THEN RAISE EXCEPTION 'Approval returned wrong revision'; END IF;
END $decisions$;
RESET ROLE;
DO $verify$
BEGIN
 IF (SELECT name FROM public.businesses WHERE id='81660000-0000-4000-8000-000000000011'::uuid)<>'W06 QA Approved Name'
 OR (SELECT status FROM public.business_profile_revisions WHERE id='81660000-0000-4000-8000-000000000013'::uuid)<>'approved'
 OR (SELECT name FROM public.businesses WHERE id='81660000-0000-4000-8000-000000000012'::uuid)<>'W06 Revision QA Business B'
 OR (SELECT status FROM public.business_profile_revisions WHERE id='81660000-0000-4000-8000-000000000014'::uuid)<>'rejected'
 OR (SELECT count(*) FROM wow_private.merchant_operation_events WHERE business_id IN('81660000-0000-4000-8000-000000000011'::uuid,'81660000-0000-4000-8000-000000000012'::uuid) AND operation IN('profile_revision_approve','profile_revision_reject'))<>2
 THEN RAISE EXCEPTION 'Profile decision state or audit mismatch'; END IF;
END $verify$;
ROLLBACK;
SELECT 'PASS_W06_PROFILE_REVISION_AUTH_AND_DECISIONS' result;
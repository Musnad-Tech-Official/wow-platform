-- W06/W00: post-deployment private Storage role-isolation smoke.
-- Uses synthetic database-only identities and transaction-scoped JWT claims.
-- Runs with privileged SQL rights. Does not create Storage API objects.
-- Entire test is rolled back; never paste real user tokens here.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='25s';
DO $setup$
BEGIN
 IF EXISTS (SELECT 1 FROM public.users WHERE id LIKE 'w06_media_qa_%') OR
    EXISTS (SELECT 1 FROM public.businesses WHERE id='70660000-0000-4000-8000-000000000081'::uuid) THEN
  RAISE EXCEPTION 'W06 business media test fixture collision';
 END IF;
 INSERT INTO public.users(id,full_name) VALUES
 ('w06_media_qa_owner_20261115','W06 Media owner'),
 ('w06_media_qa_reviewer_20261115','W06 Media reviewer'),
 ('w06_media_qa_staff_20261115','W06 Media staff'),
 ('w06_media_qa_viewer_20261115','W06 Media viewer'),
 ('w06_media_qa_guest_20261115','W06 Media guest');
 INSERT INTO wow_private.admin_members(user_id,role,is_active) VALUES
 ('w06_media_qa_reviewer_20261115','reviewer',true),('w06_media_qa_staff_20261115','reviewer',true),('w06_media_qa_viewer_20261115','viewer',true);
 INSERT INTO public.businesses(id,owner_user_id,name,status) VALUES
 ('70660000-0000-4000-8000-000000000081'::uuid,'w06_media_qa_owner_20261115','W06 Media Temporary QA','pending_review');
 INSERT INTO public.business_members(business_id,user_id,role,status,can_draft,can_submit,can_pause,can_monitor) VALUES
 ('70660000-0000-4000-8000-000000000081'::uuid,'w06_media_qa_owner_20261115','owner','active',true,true,true,true),
 ('70660000-0000-4000-8000-000000000081'::uuid,'w06_media_qa_staff_20261115','employee','active',false,false,false,false);
END $setup$;
SET LOCAL ROLE authenticated;
DO $check$
DECLARE permitted boolean;
BEGIN

PERFORM set_config('request.jwt.claims','{"role":"authenticated","sub":"w06_media_qa_owner_20261115"}',true);
SELECT wow_private.can_read_wow_object('wow-business-media','70660000-0000-4000-8000-000000000081/w06_media_qa_owner_20261115/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.webp') INTO permitted;
IF permitted IS DISTINCT FROM true THEN RAISE EXCEPTION 'Private business media owner returned %',permitted; END IF;
SELECT wow_private.can_read_wow_object('wow-verification-evidence','business-verifications/70660000-0000-4000-8000-000000000081/w06_media_qa_owner_20261115/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.pdf') INTO permitted;
IF permitted IS DISTINCT FROM true THEN RAISE EXCEPTION 'Private verification evidence owner returned %',permitted; END IF;

PERFORM set_config('request.jwt.claims','{"role":"authenticated","sub":"w06_media_qa_reviewer_20261115"}',true);
SELECT wow_private.can_read_wow_object('wow-business-media','70660000-0000-4000-8000-000000000081/w06_media_qa_owner_20261115/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.webp') INTO permitted;
IF permitted IS DISTINCT FROM true THEN RAISE EXCEPTION 'Private business media reviewer returned %',permitted; END IF;
SELECT wow_private.can_read_wow_object('wow-verification-evidence','business-verifications/70660000-0000-4000-8000-000000000081/w06_media_qa_owner_20261115/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.pdf') INTO permitted;
IF permitted IS DISTINCT FROM true THEN RAISE EXCEPTION 'Private verification evidence reviewer returned %',permitted; END IF;

PERFORM set_config('request.jwt.claims','{"role":"authenticated","sub":"w06_media_qa_staff_20261115"}',true);
SELECT wow_private.can_read_wow_object('wow-business-media','70660000-0000-4000-8000-000000000081/w06_media_qa_owner_20261115/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.webp') INTO permitted;
IF permitted IS DISTINCT FROM false THEN RAISE EXCEPTION 'Private business media staff returned %',permitted; END IF;
SELECT wow_private.can_read_wow_object('wow-verification-evidence','business-verifications/70660000-0000-4000-8000-000000000081/w06_media_qa_owner_20261115/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.pdf') INTO permitted;
IF permitted IS DISTINCT FROM false THEN RAISE EXCEPTION 'Private verification evidence staff returned %',permitted; END IF;

PERFORM set_config('request.jwt.claims','{"role":"authenticated","sub":"w06_media_qa_viewer_20261115"}',true);
SELECT wow_private.can_read_wow_object('wow-business-media','70660000-0000-4000-8000-000000000081/w06_media_qa_owner_20261115/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.webp') INTO permitted;
IF permitted IS DISTINCT FROM false THEN RAISE EXCEPTION 'Private business media viewer returned %',permitted; END IF;
SELECT wow_private.can_read_wow_object('wow-verification-evidence','business-verifications/70660000-0000-4000-8000-000000000081/w06_media_qa_owner_20261115/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.pdf') INTO permitted;
IF permitted IS DISTINCT FROM false THEN RAISE EXCEPTION 'Private verification evidence viewer returned %',permitted; END IF;

PERFORM set_config('request.jwt.claims','{"role":"authenticated","sub":"w06_media_qa_guest_20261115"}',true);
SELECT wow_private.can_read_wow_object('wow-business-media','70660000-0000-4000-8000-000000000081/w06_media_qa_owner_20261115/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.webp') INTO permitted;
IF permitted IS DISTINCT FROM false THEN RAISE EXCEPTION 'Private business media guest returned %',permitted; END IF;
SELECT wow_private.can_read_wow_object('wow-verification-evidence','business-verifications/70660000-0000-4000-8000-000000000081/w06_media_qa_owner_20261115/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.pdf') INTO permitted;
IF permitted IS DISTINCT FROM false THEN RAISE EXCEPTION 'Private verification evidence guest returned %',permitted; END IF;
PERFORM set_config('request.jwt.claims','{"role":"authenticated","sub":"w06_media_qa_reviewer_20261115"}',true);
SELECT wow_private.can_read_wow_object('wow-business-media',
 '70660000-0000-4000-8000-000000000081/w06_media_qa_owner_20261115/not-allowed.svg') INTO permitted;
IF permitted IS DISTINCT FROM false THEN RAISE EXCEPTION 'Invalid private media extension accepted'; END IF;
END $check$;
RESET ROLE;
ROLLBACK;
SELECT 'PASS_W06_PRIVATE_STORAGE_5_ROLES_POSTDEPLOY' result;
-- W06 Storage RLS helper read-permission regression.
-- Must run against a connected pre-launch test database using a privileged SQL
-- session. Uses synthetic JWT claims and rolls back ALL fixture DML.
-- Does not upload a file, generate a signed URL or authenticate a real Clerk session.
BEGIN;
SET LOCAL statement_timeout = '30s';
SET LOCAL lock_timeout = '5s';

DO $seed$
BEGIN
  IF to_regprocedure('wow_private.is_catalog_reviewer()') IS NULL
    OR EXISTS (SELECT 1 FROM public.users WHERE id LIKE 'w06_storage_probe_%')
    OR EXISTS (SELECT 1 FROM public.businesses WHERE id = '76061000-0000-4000-8000-000000000011'::uuid)
  THEN RAISE EXCEPTION 'Helper missing or fixture collision'; END IF;
  INSERT INTO public.users(id,full_name) VALUES
  ('w06_storage_probe_owner_20261115','W06 Storage owner'),
  ('w06_storage_probe_reviewer_20261115','W06 Storage reviewer'),
  ('w06_storage_probe_staff_20261115','W06 Storage staff'),
  ('w06_storage_probe_viewer_20261115','W06 Storage viewer'),
  ('w06_storage_probe_guest_20261115','W06 Storage guest'),
  ('w06_storage_probe_revoked_20261115','W06 Storage revoked');
  INSERT INTO wow_private.admin_members(user_id,role,is_active)
  VALUES ('w06_storage_probe_reviewer_20261115','reviewer',true),
         ('w06_storage_probe_staff_20261115','reviewer',true),
         ('w06_storage_probe_viewer_20261115','viewer',true),
         ('w06_storage_probe_revoked_20261115','reviewer',false);
  INSERT INTO public.businesses(id,owner_user_id,name,status)
  VALUES ('76061000-0000-4000-8000-000000000011'::uuid,'w06_storage_probe_owner_20261115','W06 Transaction Test Only','pending_review');
  INSERT INTO public.business_members(business_id,user_id,role,status,can_draft,can_submit,can_pause,can_monitor)
  VALUES ('76061000-0000-4000-8000-000000000011'::uuid,'w06_storage_probe_owner_20261115','owner','active',true,true,true,true),
         ('76061000-0000-4000-8000-000000000011'::uuid,'w06_storage_probe_staff_20261115','employee','active',false,false,false,false);
END $seed$;

SET LOCAL ROLE authenticated;
DO $probe$
DECLARE allowed boolean;
BEGIN

  PERFORM set_config('request.jwt.claims','{"role":"authenticated","sub":"w06_storage_probe_owner_20261115"}',true);
  SELECT wow_private.can_read_wow_object('wow-verification-evidence','business-verifications/76061000-0000-4000-8000-000000000011/w06_storage_probe_owner_20261115/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.pdf') INTO allowed;
  IF allowed IS DISTINCT FROM true THEN RAISE EXCEPTION 'Unexpected Storage ACL for owner: %',allowed; END IF;

  PERFORM set_config('request.jwt.claims','{"role":"authenticated","sub":"w06_storage_probe_reviewer_20261115"}',true);
  SELECT wow_private.can_read_wow_object('wow-verification-evidence','business-verifications/76061000-0000-4000-8000-000000000011/w06_storage_probe_owner_20261115/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.pdf') INTO allowed;
  IF allowed IS DISTINCT FROM true THEN RAISE EXCEPTION 'Unexpected Storage ACL for reviewer: %',allowed; END IF;

  PERFORM set_config('request.jwt.claims','{"role":"authenticated","sub":"w06_storage_probe_staff_20261115"}',true);
  SELECT wow_private.can_read_wow_object('wow-verification-evidence','business-verifications/76061000-0000-4000-8000-000000000011/w06_storage_probe_owner_20261115/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.pdf') INTO allowed;
  IF allowed IS DISTINCT FROM false THEN RAISE EXCEPTION 'Unexpected Storage ACL for staff: %',allowed; END IF;

  PERFORM set_config('request.jwt.claims','{"role":"authenticated","sub":"w06_storage_probe_viewer_20261115"}',true);
  SELECT wow_private.can_read_wow_object('wow-verification-evidence','business-verifications/76061000-0000-4000-8000-000000000011/w06_storage_probe_owner_20261115/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.pdf') INTO allowed;
  IF allowed IS DISTINCT FROM false THEN RAISE EXCEPTION 'Unexpected Storage ACL for viewer: %',allowed; END IF;

  PERFORM set_config('request.jwt.claims','{"role":"authenticated","sub":"w06_storage_probe_guest_20261115"}',true);
  SELECT wow_private.can_read_wow_object('wow-verification-evidence','business-verifications/76061000-0000-4000-8000-000000000011/w06_storage_probe_owner_20261115/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.pdf') INTO allowed;
  IF allowed IS DISTINCT FROM false THEN RAISE EXCEPTION 'Unexpected Storage ACL for guest: %',allowed; END IF;

  PERFORM set_config('request.jwt.claims','{"role":"authenticated","sub":"w06_storage_probe_revoked_20261115"}',true);
  SELECT wow_private.can_read_wow_object('wow-verification-evidence','business-verifications/76061000-0000-4000-8000-000000000011/w06_storage_probe_owner_20261115/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.pdf') INTO allowed;
  IF allowed IS DISTINCT FROM false THEN RAISE EXCEPTION 'Unexpected Storage ACL for revoked: %',allowed; END IF;
END $probe$;
RESET ROLE;

DO $privilege_check$
BEGIN
  IF has_function_privilege('anon','wow_private.is_catalog_reviewer()','EXECUTE')
    OR has_function_privilege('authenticated','wow_private.is_catalog_reviewer()','EXECUTE')
  THEN RAISE EXCEPTION 'Internal helper is publicly executable'; END IF;
END $privilege_check$;
ROLLBACK;
SELECT 'PASS_W06_STORAGE_ROLE_MATRIX_ROLLED_BACK' AS result;
-- W06 one-time evidence HTTP test teardown. All test files were removed via
-- Storage API and the dedicated reviewer role was revoked BEFORE this migration.
-- Leave no temporary QA policy active in the production-bound schema.
DO $verify_qa_cleanup$
BEGIN
 IF EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id='wow-verification-evidence' AND name='business-verifications/ea9a5297-c677-4e61-84c9-94414fe8ec74/user_3Lu62fhmntVfPUGUTuX05TO4mIz/7a7a7a7a7a7a7a7a7a7a7a7a7a7a7a7a7a7a7a7a7a7a7a7a.pdf')
 THEN RAISE EXCEPTION 'W06 QA file exists; refuse policy teardown'; END IF;
 IF EXISTS(SELECT 1 FROM wow_private.admin_members WHERE user_id='user_3Lu69csg3PeHmXa5Y8bqXn0jyQ8')
 THEN RAISE EXCEPTION 'W06 QA reviewer role still present; refuse teardown'; END IF;
 IF (SELECT COUNT(*) FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname IN('wow_w06_one_object_qa_cleanup','wow_w06_one_object_qa_cleanup_select'))<>2
 THEN RAISE EXCEPTION 'Expected two exact-object QA policies before teardown'; END IF;
END $verify_qa_cleanup$;
DROP POLICY wow_w06_one_object_qa_cleanup_select ON storage.objects;
DROP POLICY wow_w06_one_object_qa_cleanup ON storage.objects;

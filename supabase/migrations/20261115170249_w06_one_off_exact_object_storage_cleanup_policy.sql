-- ONE-OFF TEST POLICY. Must be dropped immediately after controlled W06 Storage HTTP test.
-- Grants DELETE only to a real Clerk-signed owner of this exact QA business
-- and only for this exact disposable private evidence object.
-- Does not grant DELETE on any other WOW files.
CREATE POLICY wow_w06_one_object_qa_cleanup
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'wow-verification-evidence'
  AND name = 'business-verifications/ea9a5297-c677-4e61-84c9-94414fe8ec74/user_3Lu62fhmntVfPUGUTuX05TO4mIz/7a7a7a7a7a7a7a7a7a7a7a7a7a7a7a7a7a7a7a7a7a7a7a7a.pdf'
  AND owner_id = 'user_3Lu62fhmntVfPUGUTuX05TO4mIz'
  AND (SELECT auth.jwt() ->> 'sub') = 'user_3Lu62fhmntVfPUGUTuX05TO4mIz'
  AND wow_private.is_business_owner('ea9a5297-c677-4e61-84c9-94414fe8ec74'::uuid)
);

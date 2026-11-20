-- ONE-OFF QA SELECT policy for the exact disposable Storage object.
-- Required alongside temporary DELETE to support Storage API object removal and RETURNING.
-- Never exposes other evidence paths; drop immediately after the W06 E2E.
CREATE POLICY wow_w06_one_object_qa_cleanup_select
ON storage.objects FOR SELECT TO authenticated
USING (
 bucket_id='wow-verification-evidence'
 AND name='business-verifications/ea9a5297-c677-4e61-84c9-94414fe8ec74/user_3Lu62fhmntVfPUGUTuX05TO4mIz/7a7a7a7a7a7a7a7a7a7a7a7a7a7a7a7a7a7a7a7a7a7a7a7a.pdf'
 AND owner_id='user_3Lu62fhmntVfPUGUTuX05TO4mIz'
 AND (SELECT auth.jwt()->>'sub')='user_3Lu62fhmntVfPUGUTuX05TO4mIz'
 AND wow_private.is_business_owner('ea9a5297-c677-4e61-84c9-94414fe8ec74'::uuid)
);

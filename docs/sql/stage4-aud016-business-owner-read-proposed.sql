-- AUD-016: direct business-row SELECT is owner-only.
-- Employees use wow_merchant_list_accessible_businesses(), whose SECURITY
-- DEFINER internal projection removes owner contacts and draft fields.
-- Existing members' business/branch access is not revoked via this RPC.
DO $aud016_policy_guard$
BEGIN
  IF (SELECT count(*) FROM pg_policies
      WHERE schemaname='public' AND tablename='businesses') <> 1
    OR NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname='public' AND tablename='businesses'
        AND policyname='businesses_member_read'
        AND cmd='SELECT'
        AND roles=ARRAY['authenticated']::name[]
        AND qual='wow_private.is_business_member(id)'
    ) THEN
    RAISE EXCEPTION 'AUD-016 policy changed since audit; refuse migration'
      USING ERRCODE='55000';
  END IF;
END;
$aud016_policy_guard$;

DROP POLICY businesses_member_read ON public.businesses;
CREATE POLICY businesses_owner_read
  ON public.businesses FOR SELECT TO authenticated
  USING (wow_private.is_business_owner(id));

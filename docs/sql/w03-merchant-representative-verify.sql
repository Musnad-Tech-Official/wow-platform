-- Verification Script: W03.2 MER-02-02 Merchant Representative Draft Verification
-- Purpose: Verify schema, functions, RLS, and security boundaries on an isolated/local DB.
-- DO NOT RUN AGAINST PRODUCTION.

BEGIN;

DO $$
DECLARE
  v_user_owner TEXT := 'test_rep_owner_user';
  v_user_other TEXT := 'test_rep_other_user';
  v_business_id UUID;
  v_saved BOOLEAN;
  v_read JSONB;
BEGIN
  RAISE NOTICE '=== Running W03.2 Migration Verification ===';

  -- 1. Ensure test users exist
  INSERT INTO public.users (id, account_status)
  VALUES (v_user_owner, 'active'), (v_user_other, 'active')
  ON CONFLICT (id) DO UPDATE SET account_status = 'active', deleted_at = NULL;

  -- 2. Set auth context for owner
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_user_owner, 'role', 'authenticated')::text, true);

  -- 3. Create draft business
  INSERT INTO public.businesses (owner_user_id, name, status)
  VALUES (v_user_owner, 'دار الألوان التجريبية', 'draft')
  RETURNING id INTO v_business_id;

  INSERT INTO public.business_members (business_id, user_id, role, status, can_draft, can_submit, can_pause, can_monitor, granted_by_user_id)
  VALUES (v_business_id, v_user_owner, 'owner', 'active', true, true, true, true, v_user_owner);

  -- 4. Save representative draft
  v_saved := wow_save_business_representative_draft(
    v_business_id,
    'أحمد محمد صالح',
    'owner',
    'business-verifications/' || v_business_id || '/' || v_user_owner || '/0123456789abcdef0123456789abcdef0123456789abcdef.pdf',
    'تفويض_رسمي.pdf',
    204800,
    'application/pdf'
  );

  ASSERT v_saved = true, 'Failed: wow_save_business_representative_draft returned false';

  -- 5. Read representative draft
  v_read := wow_get_business_representative_draft(v_business_id);
  ASSERT v_read IS NOT NULL, 'Failed: wow_get_business_representative_draft returned null';
  ASSERT (v_read->>'name') = 'أحمد محمد صالح', 'Failed: representative name mismatch';
  ASSERT (v_read->>'role') = 'owner', 'Failed: representative role mismatch';
  ASSERT (v_read->>'evidence_file_name') = 'تفويض_رسمي.pdf', 'Failed: representative evidence file name mismatch';

  -- 6. Verify cross-user isolation: other user cannot read
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_user_other, 'role', 'authenticated')::text, true);
  BEGIN
    PERFORM wow_get_business_representative_draft(v_business_id);
    RAISE EXCEPTION 'Access control violation: unauthorized user read representative draft';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE '%Access denied%' OR SQLSTATE = '42501' THEN
      RAISE NOTICE 'Access denied correctly enforced for unauthorized user read';
    ELSE
      RAISE;
    END IF;
  END;

  -- 7. Verify cross-user isolation: other user cannot write
  BEGIN
    PERFORM wow_save_business_representative_draft(
      v_business_id,
      'مفوض غير مصرح',
      'authorized_representative'
    );
    RAISE EXCEPTION 'Access control violation: unauthorized user wrote representative draft';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE '%Active owner required%' OR SQLSTATE = '42501' THEN
      RAISE NOTICE 'Active owner required correctly enforced for unauthorized user write';
    ELSE
      RAISE;
    END IF;
  END;

  RAISE NOTICE '=== W03.2 Migration Verification Succeeded ===';
END $$;

ROLLBACK;

-- Verification Script: W03.1 MER-02-01 Merchant Business Onboarding & Requested Category
-- Purpose: Verify schema, functions, RLS, and security boundaries on an isolated/local DB.
-- DO NOT RUN AGAINST PRODUCTION.

BEGIN;

-- Setup test harness fixtures
DO $$
DECLARE
  v_test_cat_id UUID;
  v_inactive_cat_id UUID;
  v_user_owner TEXT := 'test_merchant_owner_user';
  v_user_other TEXT := 'test_merchant_other_user';
  v_business_id UUID;
  v_updated BOOLEAN;
BEGIN
  RAISE NOTICE '=== Running W03.1 Migration Verification ===';

  -- 1. Ensure test users exist
  INSERT INTO public.users (id, account_status)
  VALUES (v_user_owner, 'active'), (v_user_other, 'active')
  ON CONFLICT (id) DO UPDATE SET account_status = 'active', deleted_at = NULL;

  -- 2. Insert active and inactive categories
  INSERT INTO public.categories (slug, name_ar, is_active)
  VALUES ('test-active-cat', 'فئة نشطة للتجربة', true)
  RETURNING id INTO v_test_cat_id;

  INSERT INTO public.categories (slug, name_ar, is_active)
  VALUES ('test-inactive-cat', 'فئة معطلة للتجربة', false)
  RETURNING id INTO v_inactive_cat_id;

  -- 3. Set auth context for owner
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_user_owner, 'role', 'authenticated')::text, true);

  -- 4. Test atomic creation with category
  v_business_id := wow_create_business_with_category(
    'متجر الألوان للتجربة',
    v_test_cat_id,
    'وصف تجريبي لنشاط جديد'
  );

  ASSERT v_business_id IS NOT NULL, 'Failed: v_business_id is null';

  -- Verify record in businesses
  ASSERT EXISTS (
    SELECT 1 FROM public.businesses
    WHERE id = v_business_id
      AND name = 'متجر الألوان للتجربة'
      AND requested_category_id = v_test_cat_id
      AND status = 'draft'
      AND owner_user_id = v_user_owner
  ), 'Failed: draft business not persisted with requested category';

  -- Verify owner membership created
  ASSERT EXISTS (
    SELECT 1 FROM public.business_members
    WHERE business_id = v_business_id
      AND user_id = v_user_owner
      AND role = 'owner'
      AND status = 'active'
  ), 'Failed: owner membership not established';

  -- Verify no admin approval was granted
  ASSERT NOT EXISTS (
    SELECT 1 FROM public.business_categories
    WHERE business_id = v_business_id
  ), 'Security violation: requested category must NOT grant business_categories row';

  -- 5. Test update draft
  v_updated := wow_update_business_draft(
    v_business_id,
    'متجر الألوان المحدث',
    v_test_cat_id,
    'وصف محدث'
  );
  ASSERT v_updated = true, 'Failed: wow_update_business_draft returned false';

  -- 6. Test rejection of inactive category
  BEGIN
    PERFORM wow_update_business_draft(v_business_id, 'متجر', v_inactive_cat_id, NULL);
    RAISE EXCEPTION 'Security failure: inactive category was accepted';
  EXCEPTION WHEN SQLSTATE '22023' THEN
    RAISE NOTICE 'Pass: inactive category correctly rejected';
  END;

  -- 7. Test unauthorized other merchant cannot update draft
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_user_other, 'role', 'authenticated')::text, true);
  BEGIN
    PERFORM wow_update_business_draft(v_business_id, 'محاولة تعديل غير مصرح بها', v_test_cat_id, NULL);
    RAISE EXCEPTION 'Security failure: non-owner updated business draft';
  EXCEPTION WHEN SQLSTATE '42501' THEN
    RAISE NOTICE 'Pass: stranger merchant correctly denied';
  END;

  -- 8. Test anonymous caller rejected
  PERFORM set_config('request.jwt.claims', json_build_object('sub', NULL, 'role', 'anon')::text, true);
  BEGIN
    PERFORM wow_create_business_with_category('متجر مجهول', v_test_cat_id, NULL);
    RAISE EXCEPTION 'Security failure: anonymous create succeeded';
  EXCEPTION WHEN SQLSTATE '42501' THEN
    RAISE NOTICE 'Pass: anonymous caller correctly denied';
  END;

  -- 9. Test direct execute on private internal function denied to authenticated
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_user_owner, 'role', 'authenticated')::text, true);
  BEGIN
    PERFORM wow_private.create_business_with_category_internal('متجر مباشر', v_test_cat_id, NULL);
    RAISE EXCEPTION 'Security failure: authenticated executed wow_private routine directly';
  EXCEPTION WHEN SQLSTATE '42501' THEN
    RAISE NOTICE 'Pass: direct wow_private execute correctly denied to authenticated';
  END;

  RAISE NOTICE '=== All W03.1 Migration checks PASSED successfully! ===';
END;
$$;

ROLLBACK;

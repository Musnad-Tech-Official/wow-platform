-- AUD-016 authorization matrix. Run inside BEGIN/ROLLBACK ONLY.
-- Fixtures are not retained; one synthetic approved business, owner, employee, branch.
CREATE TEMP TABLE aud016_fixture(
  business_id uuid,
  owner_id text,
  employee_id text,
  member_id uuid
) ON COMMIT DROP;
CREATE TEMP TABLE aud016_results(case_name text PRIMARY KEY) ON COMMIT DROP;
GRANT SELECT ON aud016_fixture TO authenticated;
GRANT SELECT, INSERT ON aud016_results TO authenticated;

DO $fixtures$
DECLARE
  b uuid := gen_random_uuid();
  branch uuid := gen_random_uuid();
  member uuid := gen_random_uuid();
  owner text := 'qa_owner_' || substr(md5(random()::text),1,19);
  employee text := 'qa_employee_' || substr(md5(random()::text),1,19);
BEGIN
  INSERT INTO public.users(id,account_status)
    VALUES (owner,'active'), (employee,'active');
  INSERT INTO public.businesses(id,owner_user_id,name,description,contact_phone,status,approved_at)
    VALUES(b,owner,'QA Approved Business','Public description','QA-PRIVATE-777','approved',now());
  INSERT INTO public.business_members(business_id,user_id,role,status,
    can_draft,can_submit,can_pause,can_monitor)
    VALUES (b,owner,'owner','active',true,true,true,true);
  INSERT INTO public.business_members(id,business_id,user_id,role,status,can_monitor)
    VALUES (member,b,employee,'employee','active',true);
  INSERT INTO public.business_branches(id,business_id,name,city,address_line,status,approved_at)
    VALUES(branch,b,'QA Branch','Aden','QA Street Address','approved',now());
  INSERT INTO public.business_member_branches(member_id,business_id,branch_id)
    VALUES(member,b,branch);
  INSERT INTO aud016_fixture VALUES(b,owner,employee,member);
END;
$fixtures$;

SET LOCAL ROLE authenticated;
DO $employee_view$
DECLARE
 b uuid; employee text; result jsonb; visible jsonb;
BEGIN
 SELECT business_id,employee_id INTO b,employee FROM aud016_fixture;
 PERFORM set_config('request.jwt.claims',
   jsonb_build_object('role','authenticated','sub',employee)::text,true);
 IF EXISTS(SELECT 1 FROM public.businesses WHERE id=b) THEN
   RAISE EXCEPTION 'AUD-016: employee can still SELECT raw business columns';
 END IF;
 INSERT INTO aud016_results VALUES('employee-raw-select-denied');
 result := public.wow_merchant_list_accessible_businesses();
 SELECT j INTO visible FROM jsonb_array_elements(result) AS j
   WHERE j->>'id'=b::text;
 IF visible IS NULL THEN RAISE EXCEPTION 'Employee lost authorized business RPC read'; END IF;
 INSERT INTO aud016_results VALUES('employee-projected-business-available');
 IF visible->>'owner_user_id' <> '' OR
    visible->>'contact_phone' IS NOT NULL OR
    visible->>'requested_category_id' IS NOT NULL OR
    visible->>'logo_url' IS NOT NULL THEN
   RAISE EXCEPTION 'Sanitized employee projection exposed private business fields';
 END IF;
 INSERT INTO aud016_results VALUES('employee-sensitive-fields-redacted');
 IF visible->>'name'<>'QA Approved Business' OR
    visible->>'description'<>'Public description' OR
    visible->>'status'<>'approved' THEN
   RAISE EXCEPTION 'Expected employee business fields missing';
 END IF;
 INSERT INTO aud016_results VALUES('employee-public-fields-preserved');
END;
$employee_view$;
RESET ROLE;

SET LOCAL ROLE authenticated;
DO $owner_view$
DECLARE b uuid; owner text; phone text; result jsonb;
BEGIN
 SELECT business_id,owner_id INTO b,owner FROM aud016_fixture;
 PERFORM set_config('request.jwt.claims',
   jsonb_build_object('role','authenticated','sub',owner)::text,true);
 SELECT contact_phone INTO phone FROM public.businesses WHERE id=b;
 IF phone IS DISTINCT FROM 'QA-PRIVATE-777' THEN
   RAISE EXCEPTION 'Active owner lost direct read privilege';
 END IF;
 INSERT INTO aud016_results VALUES('owner-direct-business-select-preserved');
 result := public.wow_merchant_list_accessible_businesses();
 IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(result) AS j
     WHERE j->>'id'=b::text AND j->>'contact_phone'='QA-PRIVATE-777') THEN
   RAISE EXCEPTION 'Owner RPC should retain own private contact';
 END IF;
 INSERT INTO aud016_results VALUES('owner-projection-preserved');
END;
$owner_view$;
RESET ROLE;

UPDATE public.business_members m SET status='revoked',revoked_at=now()
 WHERE m.id=(SELECT member_id FROM aud016_fixture);

SET LOCAL ROLE authenticated;
DO $revoked_employee$
DECLARE b uuid; employee text; result jsonb;
BEGIN
 SELECT business_id,employee_id INTO b,employee FROM aud016_fixture;
 PERFORM set_config('request.jwt.claims',
   jsonb_build_object('role','authenticated','sub',employee)::text,true);
 IF EXISTS (SELECT 1 FROM public.businesses WHERE id=b) THEN
   RAISE EXCEPTION 'Revoked employee regained raw business access';
 END IF;
 INSERT INTO aud016_results VALUES('revoked-employee-direct-denied');
 result:=public.wow_merchant_list_accessible_businesses();
 IF EXISTS (SELECT 1 FROM jsonb_array_elements(result) AS j WHERE j->>'id'=b::text) THEN
   RAISE EXCEPTION 'Revoked employee still has projected business access';
 END IF;
 INSERT INTO aud016_results VALUES('revoked-employee-rpc-denied');
END;
$revoked_employee$;
RESET ROLE;

SELECT jsonb_build_object('passed',count(*),'cases',jsonb_agg(case_name ORDER BY case_name))
 AS aud016_results FROM aud016_results;

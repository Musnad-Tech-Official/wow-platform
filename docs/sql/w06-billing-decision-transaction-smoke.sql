-- W06 non-financial synthetic QA run; all records and audit events rolled back.
-- No external payment provider is contacted; this confirms DB transition logic only.
BEGIN;
SET LOCAL statement_timeout='30s';
SET LOCAL lock_timeout='5s';
DO $seed$
BEGIN
 IF EXISTS (SELECT 1 FROM public.users WHERE id LIKE 'w06_bill_qa_%')
 OR EXISTS (SELECT 1 FROM public.businesses WHERE id IN ('40660000-0000-4000-8000-000000000001'::uuid,'40660000-0000-4000-8000-000000000008'::uuid))
 THEN RAISE EXCEPTION 'Fixture conflict'; END IF;
 INSERT INTO public.users(id,full_name) VALUES ('w06_bill_qa_owner_20261115','W06 Test owner'),('w06_bill_qa_reviewer_20261115','W06 Test reviewer'),('w06_bill_qa_viewer_20261115','W06 Test viewer'),('w06_bill_qa_staff_20261115','W06 Test staff'),('w06_bill_qa_revoked_20261115','W06 Test revoked');
 INSERT INTO wow_private.admin_members(user_id,role,is_active) VALUES
 ('w06_bill_qa_owner_20261115','reviewer',true),('w06_bill_qa_reviewer_20261115','reviewer',true),
 ('w06_bill_qa_viewer_20261115','viewer',true),('w06_bill_qa_staff_20261115','reviewer',true),('w06_bill_qa_revoked_20261115','reviewer',false);
 INSERT INTO public.businesses(id,owner_user_id,name,status,approved_at) VALUES
 ('40660000-0000-4000-8000-000000000001'::uuid,'w06_bill_qa_owner_20261115','W06 QA Billing Business A','approved',now()),
 ('40660000-0000-4000-8000-000000000008'::uuid,'w06_bill_qa_owner_20261115','W06 QA Billing Business B','approved',now());
 INSERT INTO public.business_members(business_id,user_id,role,status,can_draft,can_submit,can_pause,can_monitor) VALUES
 ('40660000-0000-4000-8000-000000000001'::uuid,'w06_bill_qa_owner_20261115','owner','active',true,true,true,true),
 ('40660000-0000-4000-8000-000000000008'::uuid,'w06_bill_qa_owner_20261115','owner','active',true,true,true,true),
 ('40660000-0000-4000-8000-000000000001'::uuid,'w06_bill_qa_staff_20261115','employee','active',false,false,false,false);
 INSERT INTO public.business_subscriptions(id,business_id,plan_id,kind,status,plan_snapshot,requested_by_user_id) VALUES
 ('40660000-0000-4000-8000-000000000002'::uuid,'40660000-0000-4000-8000-000000000001'::uuid,(SELECT id FROM public.subscription_plans WHERE code='BASIC'),'paid','pending','{"duration_days":30,"price":999,"currency":"YER"}'::jsonb,'w06_bill_qa_owner_20261115'),
 ('40660000-0000-4000-8000-000000000004'::uuid,'40660000-0000-4000-8000-000000000008'::uuid,(SELECT id FROM public.subscription_plans WHERE code='BASIC'),'paid','pending','{"duration_days":30,"price":100,"currency":"YER"}'::jsonb,'w06_bill_qa_owner_20261115');
 INSERT INTO public.subscription_payments(id,subscription_id,amount,currency,method,reference,status,submitted_by_user_id) VALUES
 ('40660000-0000-4000-8000-000000000003'::uuid,'40660000-0000-4000-8000-000000000002'::uuid,100,'YER','cash','W06-QA-PAY-A','submitted','w06_bill_qa_owner_20261115'),
 ('40660000-0000-4000-8000-000000000005'::uuid,'40660000-0000-4000-8000-000000000004'::uuid,100,'YER','cash','W06-QA-PAY-R','submitted','w06_bill_qa_owner_20261115');
END $seed$;
SET LOCAL ROLE authenticated;
DO $authorizations$
DECLARE payment_id uuid;
BEGIN
PERFORM set_config('request.jwt.claims','{"role":"authenticated","sub":"w06_bill_qa_owner_20261115"}',true);
BEGIN PERFORM public.wow_admin_decide_subscription_payment('40660000-0000-4000-8000-000000000003'::uuid,true,'Independent financial reconciliation completed for W06 test'); RAISE EXCEPTION 'Unauthorized owner approved payment'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
PERFORM set_config('request.jwt.claims','{"role":"authenticated","sub":"w06_bill_qa_staff_20261115"}',true);
BEGIN PERFORM public.wow_admin_decide_subscription_payment('40660000-0000-4000-8000-000000000003'::uuid,true,'Independent financial reconciliation completed for W06 test'); RAISE EXCEPTION 'Unauthorized staff approved payment'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
PERFORM set_config('request.jwt.claims','{"role":"authenticated","sub":"w06_bill_qa_viewer_20261115"}',true);
BEGIN PERFORM public.wow_admin_decide_subscription_payment('40660000-0000-4000-8000-000000000003'::uuid,true,'Independent financial reconciliation completed for W06 test'); RAISE EXCEPTION 'Unauthorized viewer approved payment'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
PERFORM set_config('request.jwt.claims','{"role":"authenticated","sub":"w06_bill_qa_revoked_20261115"}',true);
BEGIN PERFORM public.wow_admin_decide_subscription_payment('40660000-0000-4000-8000-000000000003'::uuid,true,'Independent financial reconciliation completed for W06 test'); RAISE EXCEPTION 'Unauthorized revoked approved payment'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
PERFORM set_config('request.jwt.claims','{"role":"authenticated","sub":"w06_bill_qa_reviewer_20261115"}',true);
BEGIN PERFORM public.wow_admin_decide_subscription_payment('40660000-0000-4000-8000-000000000003'::uuid,true,'short'); RAISE EXCEPTION 'Invalid note accepted'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
BEGIN PERFORM public.wow_admin_decide_subscription_payment('40660000-0000-4000-8000-000000000003'::uuid,true,'Independent financial reconciliation completed for W06 test'); RAISE EXCEPTION 'Price mismatch was accepted'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
SELECT public.wow_admin_decide_subscription_payment('40660000-0000-4000-8000-000000000005'::uuid,false,'Independent financial reconciliation completed for W06 test') INTO payment_id;
IF payment_id IS DISTINCT FROM '40660000-0000-4000-8000-000000000005'::uuid THEN RAISE EXCEPTION 'Reject returned wrong ID'; END IF;
END $authorizations$;
RESET ROLE;
-- Correct the synthetic plan snapshot, not a real plan, solely to exercise the authorized success path.
UPDATE public.business_subscriptions SET plan_snapshot='{"duration_days":30,"price":100,"currency":"YER"}'::jsonb WHERE id='40660000-0000-4000-8000-000000000002'::uuid;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"role":"authenticated","sub":"w06_bill_qa_reviewer_20261115"}',true);
DO $approval$
DECLARE payment_id uuid;
BEGIN
 SELECT public.wow_admin_decide_subscription_payment('40660000-0000-4000-8000-000000000003'::uuid,true,'Independent financial reconciliation completed for W06 test') INTO payment_id;
 IF payment_id IS DISTINCT FROM '40660000-0000-4000-8000-000000000003'::uuid THEN RAISE EXCEPTION 'Approve returned wrong ID'; END IF;
END $approval$;
RESET ROLE;
DO $assertions$
BEGIN
 IF (SELECT status FROM public.subscription_payments WHERE id='40660000-0000-4000-8000-000000000003'::uuid)<>'verified'
 OR (SELECT status FROM public.business_subscriptions WHERE id='40660000-0000-4000-8000-000000000002'::uuid)<>'active'
 OR (SELECT status FROM public.subscription_payments WHERE id='40660000-0000-4000-8000-000000000005'::uuid)<>'rejected'
 OR (SELECT status FROM public.business_subscriptions WHERE id='40660000-0000-4000-8000-000000000004'::uuid)<>'pending'
 OR (SELECT COUNT(*) FROM wow_private.billing_events WHERE business_id IN('40660000-0000-4000-8000-000000000001'::uuid,'40660000-0000-4000-8000-000000000008'::uuid) AND action IN ('payment_verified','payment_rejected'))<>2
 THEN RAISE EXCEPTION 'Review state or billing audit mismatch'; END IF;
END $assertions$;
ROLLBACK;
SELECT 'PASS_W06_BILLING_AUTH_AND_DECISION_WITH_ROLLBACK' result;
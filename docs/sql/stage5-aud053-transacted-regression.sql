-- Execute in a single BEGIN/ROLLBACK; only synthetic profiles.
CREATE TEMP TABLE aud053_actors(kind text primary key,uid text) ON COMMIT DROP;
CREATE TEMP TABLE aud053_results(name text primary key) ON COMMIT DROP;
INSERT INTO aud053_actors SELECT kind,'qa_aud053_'||kind||'_'||substr(md5(random()::text),1,16)
FROM unnest(ARRAY['customer','other','admin','reviewer','viewer','suspended']) kind;
INSERT INTO public.users(id,account_status) SELECT uid,CASE WHEN kind='suspended' THEN 'suspended' ELSE 'active' END FROM aud053_actors;
INSERT INTO wow_private.admin_members(user_id,role,is_active)
 SELECT uid,CASE WHEN kind='admin' THEN 'super_admin' ELSE kind END,true FROM aud053_actors WHERE kind IN ('admin','reviewer','viewer');
GRANT SELECT ON aud053_actors TO authenticated;
GRANT INSERT,SELECT ON aud053_results TO authenticated;
DO $priv$
BEGIN
 IF has_function_privilege('anon','public.wow_submit_privacy_request(text,text)','EXECUTE') OR has_function_privilege('anon','public.wow_list_my_privacy_requests(integer,integer)','EXECUTE') OR has_function_privilege('anon','wow_private.privacy_submit_internal(text,text)','EXECUTE') THEN RAISE EXCEPTION 'anonymous grant'; END IF;
 IF has_table_privilege('authenticated','wow_private.privacy_requests','SELECT,INSERT,UPDATE,DELETE') OR has_table_privilege('authenticated','wow_private.privacy_request_events','SELECT,INSERT,UPDATE,DELETE') THEN RAISE EXCEPTION 'raw grant'; END IF;
 INSERT INTO aud053_results VALUES('anon-denied'),('raw-tables-denied');
END $priv$;
SET LOCAL ROLE authenticated;
DO $qa$
DECLARE actor text; req uuid; req2 uuid; data jsonb; k text;
BEGIN
 SELECT uid INTO actor FROM aud053_actors WHERE kind='customer';
 PERFORM set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',actor)::text,true);
 req:=public.wow_submit_privacy_request('close','Synthetic QA request');
 req2:=public.wow_submit_privacy_request('close','Repeated request');
 IF req IS NULL OR req<>req2 THEN RAISE EXCEPTION 'duplicate intake'; END IF;
 INSERT INTO aud053_results VALUES('intake-idempotent');
 PERFORM public.wow_submit_privacy_request('access','');
 PERFORM public.wow_submit_privacy_request('correct','');
 data:=public.wow_list_my_privacy_requests();
 IF jsonb_array_length(data)<>3 OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(data) v WHERE v->>'id'=req::text AND v->>'status'='submitted') THEN RAISE EXCEPTION 'own list'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(data) v WHERE v?'user_id') THEN RAISE EXCEPTION 'projection leak'; END IF;
 INSERT INTO aud053_results VALUES('all-three-request-types'),('own-projection');
 BEGIN PERFORM public.wow_submit_privacy_request('unknown',''); RAISE EXCEPTION 'invalid kind accepted'; EXCEPTION WHEN SQLSTATE '22023' THEN NULL; END;
 BEGIN PERFORM public.wow_submit_privacy_request('access',repeat('a',1001)); RAISE EXCEPTION 'invalid length accepted'; EXCEPTION WHEN SQLSTATE '22023' THEN NULL; END;
 INSERT INTO aud053_results VALUES('invalid-kind-denied'),('oversize-denied');
 FOR k IN SELECT unnest(ARRAY['other','reviewer','viewer']) LOOP
  SELECT uid INTO actor FROM aud053_actors WHERE kind=k;
  PERFORM set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',actor)::text,true);
  IF jsonb_array_length(public.wow_list_my_privacy_requests())<>0 THEN RAISE EXCEPTION 'cross-account leak'; END IF;
  BEGIN PERFORM public.wow_admin_list_privacy_requests(); RAISE EXCEPTION 'admin list exposed'; EXCEPTION WHEN SQLSTATE '42501' THEN NULL; END;
  BEGIN PERFORM public.wow_admin_update_privacy_request(req,'in_review'); RAISE EXCEPTION 'admin write exposed'; EXCEPTION WHEN SQLSTATE '42501' THEN NULL; END;
  INSERT INTO aud053_results VALUES(k||'-own-isolation'),(k||'-admin-denied');
 END LOOP;
 SELECT uid INTO actor FROM aud053_actors WHERE kind='suspended';
 PERFORM set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',actor)::text,true);
 BEGIN PERFORM public.wow_submit_privacy_request('close',''); RAISE EXCEPTION 'suspended intake'; EXCEPTION WHEN SQLSTATE '42501' THEN NULL; END;
 INSERT INTO aud053_results VALUES('suspended-denied');
 SELECT uid INTO actor FROM aud053_actors WHERE kind='admin';
 PERFORM set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',actor)::text,true);
 data:=public.wow_admin_list_privacy_requests(100,0);
 IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(data) v WHERE v->>'id'=req::text) THEN RAISE EXCEPTION 'admin queue missing'; END IF;
 INSERT INTO aud053_results VALUES('admin-queue');
 BEGIN PERFORM public.wow_admin_update_privacy_request(req,'resolved','Invalid direct resolution'); RAISE EXCEPTION 'invalid transition'; EXCEPTION WHEN SQLSTATE '22023' THEN NULL; END;
 PERFORM public.wow_admin_update_privacy_request(req,'in_review','');
 BEGIN PERFORM public.wow_admin_update_privacy_request(req,'resolved','short'); RAISE EXCEPTION 'missing resolution'; EXCEPTION WHEN SQLSTATE '22023' THEN NULL; END;
 PERFORM public.wow_admin_update_privacy_request(req,'resolved','Reviewed outside the app; QA simulation only.');
 INSERT INTO aud053_results VALUES('transition-guard'),('response-required'),('admin-status-tracked');
 req2:=public.wow_submit_privacy_request('access','Self');
 BEGIN PERFORM public.wow_admin_update_privacy_request(req2,'in_review'); RAISE EXCEPTION 'self review'; EXCEPTION WHEN SQLSTATE '42501' THEN NULL; END;
 INSERT INTO aud053_results VALUES('self-review-denied');
 SELECT uid INTO actor FROM aud053_actors WHERE kind='customer';
 PERFORM set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',actor)::text,true);
 data:=public.wow_list_my_privacy_requests();
 IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(data) v WHERE v->>'id'=req::text AND v->>'status'='resolved') THEN RAISE EXCEPTION 'status invisible'; END IF;
 INSERT INTO aud053_results VALUES('customer-status-visible');
END $qa$;
RESET ROLE;
DO $audit$
BEGIN
 IF (SELECT count(*) FROM wow_private.privacy_request_events WHERE actor_id IN (SELECT uid FROM aud053_actors))<>6 THEN RAISE EXCEPTION 'event count'; END IF;
 IF EXISTS(SELECT 1 FROM public.users WHERE id=(SELECT uid FROM aud053_actors WHERE kind='customer') AND (account_status<>'active' OR deleted_at IS NOT NULL)) THEN RAISE EXCEPTION 'closure request mutated user'; END IF;
 INSERT INTO aud053_results VALUES('events-recorded'),('no-account-deletion');
END $audit$;
SELECT jsonb_build_object('passed',count(*),'cases',jsonb_agg(name ORDER BY name)) AS aud053_results FROM aud053_results;

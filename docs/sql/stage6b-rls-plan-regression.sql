BEGIN;
SET LOCAL statement_timeout='30s'; SET LOCAL lock_timeout='5s';
CREATE TEMP TABLE qa6_rls_result(label text,visible_rows int,plan jsonb) ON COMMIT DROP;
CREATE TEMP TABLE qa6_rls_ids(own text,other text,employee text,suspended text,b uuid,other_b uuid) ON COMMIT DROP;
DO $seed$
DECLARE x text:=substr(md5(random()::text),1,16); a text:='qa_6_rls_a_'||x; b text:='qa_6_rls_b_'||x; e text:='qa_6_rls_e_'||x; s text:='qa_6_rls_s_'||x; ba uuid:=gen_random_uuid(); bb uuid:=gen_random_uuid();
BEGIN
 INSERT INTO public.users(id,account_status) VALUES(a,'active'),(b,'active'),(e,'active'),(s,'suspended');
 INSERT INTO public.businesses(id,owner_user_id,name,status) VALUES(ba,a,'QA6 RLS rollback A','draft'),(bb,b,'QA6 RLS rollback B','draft');
 INSERT INTO public.business_members(business_id,user_id,role,status,can_draft,can_submit,can_pause,can_monitor) VALUES(ba,a,'owner','active',true,true,true,true),(bb,b,'owner','active',true,true,true,true),(ba,e,'employee','active',false,false,false,true);
 INSERT INTO public.saved_businesses(user_id,business_id) VALUES(a,ba),(b,bb),(s,ba);
 INSERT INTO qa6_rls_ids VALUES(a,b,e,s,ba,bb);
END $seed$;
GRANT SELECT ON qa6_rls_ids TO authenticated;
GRANT SELECT,INSERT ON qa6_rls_result TO authenticated;
SET LOCAL ROLE authenticated;
DO $verify$
DECLARE f qa6_rls_ids%ROWTYPE; j jsonb; r record; n int;
BEGIN
 SELECT * INTO f FROM qa6_rls_ids;
 FOR r IN SELECT * FROM (VALUES
 ('owner-users',f.own,'select id from public.users',1),
 ('owner-members',f.own,'select id from public.business_members',2),
 ('owner-saved-businesses',f.own,'select id from public.saved_businesses',1),
 ('employee-users',f.employee,'select id from public.users',1),
 ('employee-members',f.employee,'select id from public.business_members',1),
 ('employee-saved-businesses',f.employee,'select id from public.saved_businesses',0),
 ('other-members',f.other,'select id from public.business_members',1),
 ('suspended-saved-businesses',f.suspended,'select id from public.saved_businesses',0)
 ) v(label,actor,q,expected) LOOP
  PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',r.actor,'role','authenticated')::text,true);
  EXECUTE 'select count(*) from ('||r.q||') z' INTO n;
  IF n<>r.expected THEN RAISE EXCEPTION 'unexpected visibility %: % <> %',r.label,n,r.expected; END IF;
  EXECUTE 'EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) '||r.q INTO j;
  INSERT INTO qa6_rls_result VALUES(r.label,n,j->0->'Plan');
 END LOOP;
END $verify$;
RESET ROLE;
WITH RECURSIVE nodes(label,node) AS (
 SELECT label,plan FROM qa6_rls_result UNION ALL
 SELECT n.label,p.value FROM nodes n CROSS JOIN LATERAL jsonb_array_elements(coalesce(n.node->'Plans','[]'::jsonb)) p
)
SELECT r.label,r.visible_rows,coalesce(jsonb_agg(jsonb_build_object('name',n.node->>'Subplan Name','loops',n.node->'Actual Loops')) FILTER(WHERE n.node->>'Parent Relationship'='InitPlan'),'[]'::jsonb) AS initplans
FROM qa6_rls_result r JOIN nodes n ON n.label=r.label GROUP BY r.label,r.visible_rows ORDER BY r.label;
ROLLBACK;
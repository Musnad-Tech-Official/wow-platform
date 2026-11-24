BEGIN;
SET LOCAL statement_timeout='30s'; SET LOCAL lock_timeout='5s';
CREATE TEMP TABLE qa6_perf_ids(owner_id text,customer_id text,other_id text,business_id uuid) ON COMMIT DROP;
CREATE TEMP TABLE qa6_perf_result(label text,rows_seen int,ms numeric,plan jsonb) ON COMMIT DROP;
DO $seed$
DECLARE suffix text:=substr(md5(random()::text),1,16); own text:='qa_6_perf_own_'||suffix; c text:='qa_6_perf_c_'||suffix; other text:='qa_6_perf_other_'||suffix; b uuid:=gen_random_uuid();
BEGIN
 INSERT INTO public.users(id,account_status) VALUES(own,'active'),(c,'active'),(other,'active');
 INSERT INTO public.businesses(id,owner_user_id,name,status) VALUES(b,own,'QA6 rollback performance fixture','draft');
 INSERT INTO public.offers(business_id,created_by_user_id) SELECT b,own FROM generate_series(1,1000);
 INSERT INTO public.saved_offers(user_id,offer_id,created_at) SELECT c,id,now() - row_number() OVER(ORDER BY id)*interval '1 second' FROM public.offers WHERE business_id=b;
 INSERT INTO public.saved_offers(user_id,offer_id) SELECT other,id FROM public.offers WHERE business_id=b;
 INSERT INTO qa6_perf_ids VALUES(own,c,other,b);
END $seed$;
GRANT SELECT ON qa6_perf_ids TO authenticated;
GRANT INSERT,SELECT ON qa6_perf_result TO authenticated;
SET LOCAL ROLE authenticated;
DO $bench$
DECLARE f qa6_perf_ids%ROWTYPE; j jsonb; n int; i int; q text; label text;
BEGIN
 SELECT * INTO f FROM qa6_perf_ids;
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',f.customer_id,'role','authenticated')::text,true);
 SELECT count(*) INTO n FROM public.saved_offers;
 IF n<>1000 OR EXISTS(SELECT 1 FROM public.saved_offers WHERE user_id<>f.customer_id) THEN RAISE EXCEPTION 'RLS isolation failed'; END IF;
 FOR i IN 1..5 LOOP
  FOR label,q IN SELECT * FROM (VALUES ('full',format('select id,offer_id,created_at from public.saved_offers where user_id=%L order by created_at desc',f.customer_id)),('page24',format('select id,offer_id,created_at from public.saved_offers where user_id=%L order by created_at desc limit 24',f.customer_id))) x LOOP
   EXECUTE 'EXPLAIN (ANALYZE,BUFFERS,FORMAT JSON) '||q INTO j;
   INSERT INTO qa6_perf_result VALUES(label,(j->0->'Plan'->>'Actual Rows')::int,(j->0->>'Execution Time')::numeric,j->0->'Plan');
  END LOOP;
 END LOOP;
END $bench$;
RESET ROLE;
SELECT label,count(*) AS runs,min(rows_seen) as rows_seen,round(percentile_cont(0.5) within group (order by ms)::numeric,3) AS median_ms,round(max(ms),3) as max_ms,(array_agg(plan))[1] AS example_plan FROM qa6_perf_result GROUP BY label ORDER BY label;
ROLLBACK;
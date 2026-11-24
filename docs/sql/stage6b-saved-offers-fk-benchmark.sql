BEGIN;
SET LOCAL statement_timeout='30s'; SET LOCAL lock_timeout='5s';
CREATE TEMP TABLE qa6_fk_fixture(offer_id uuid) ON COMMIT DROP;
CREATE TEMP TABLE qa6_fk_results(phase text,ms numeric,rows_seen int,node_type text) ON COMMIT DROP;
DO $seed$
DECLARE suffix text:=substr(md5(random()::text),1,16); own text:='qa_6_fk_own_'||suffix; b uuid:=gen_random_uuid(); c text; i int;
BEGIN
 INSERT INTO public.users(id,account_status) VALUES(own,'active');
 INSERT INTO public.businesses(id,owner_user_id,name,status) VALUES(b,own,'QA6 FK rollback fixture','draft');
 INSERT INTO public.offers(business_id,created_by_user_id) SELECT b,own FROM generate_series(1,1000);
 INSERT INTO qa6_fk_fixture SELECT id FROM public.offers WHERE business_id=b ORDER BY id LIMIT 1;
 FOR i IN 1..10 LOOP
  c:='qa_6_fk_c_'||suffix||'_'||i;
  INSERT INTO public.users(id,account_status) VALUES(c,'active');
  INSERT INTO public.saved_offers(user_id,offer_id) SELECT c,id FROM public.offers WHERE business_id=b;
 END LOOP;
END $seed$;
DO $baseline$
DECLARE oid uuid; j jsonb; i int;
BEGIN
 SELECT offer_id INTO oid FROM qa6_fk_fixture;
 FOR i IN 1..5 LOOP
  EXECUTE format('EXPLAIN (ANALYZE,BUFFERS,FORMAT JSON) SELECT id FROM public.saved_offers WHERE offer_id=%L',oid) INTO j;
  INSERT INTO qa6_fk_results VALUES('without_candidate',(j->0->>'Execution Time')::numeric,(j->0->'Plan'->>'Actual Rows')::int,j->0->'Plan'->>'Node Type');
 END LOOP;
END $baseline$;
CREATE INDEX qa6_saved_offers_offer_candidate_idx ON public.saved_offers(offer_id);
DO $candidate$
DECLARE oid uuid; j jsonb; i int;
BEGIN
 SELECT offer_id INTO oid FROM qa6_fk_fixture;
 FOR i IN 1..5 LOOP
  EXECUTE format('EXPLAIN (ANALYZE,BUFFERS,FORMAT JSON) SELECT id FROM public.saved_offers WHERE offer_id=%L',oid) INTO j;
  INSERT INTO qa6_fk_results VALUES('with_candidate',(j->0->>'Execution Time')::numeric,(j->0->'Plan'->>'Actual Rows')::int,j->0->'Plan'->>'Node Type');
 END LOOP;
END $candidate$;
SELECT phase,count(*) AS runs,min(rows_seen) AS rows_seen,round(percentile_cont(.5) within group(order by ms)::numeric,3) AS median_ms,round(max(ms),3) AS max_ms,array_agg(DISTINCT node_type) AS plan_types FROM qa6_fk_results GROUP BY phase ORDER BY phase;
ROLLBACK;
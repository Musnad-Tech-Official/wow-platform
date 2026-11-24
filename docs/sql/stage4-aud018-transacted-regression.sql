-- AUD-018: run only inside BEGIN/ROLLBACK.
CREATE TEMP TABLE aud018_results(case_name text primary key) ON COMMIT DROP;
DO $qa$
DECLARE
  actor text := 'qa_aud018_'||substr(md5(random()::text),1,18);
  prefix text := 'qa-aud018-'||substr(md5(random()::text),1,16);
  lo uuid;
  hi uuid;
  item record;
  actual text;
BEGIN
  INSERT INTO public.users(id,account_status) VALUES(actor,'active');
  INSERT INTO wow_private.admin_members(user_id,role,is_active) VALUES(actor,'super_admin',true);
  PERFORM set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',actor)::text,true);
  lo:=public.wow_admin_upsert_category(NULL,prefix||'-low','QA Category',NULL,NULL,0,false);
  IF lo IS NULL OR NOT EXISTS(SELECT 1 FROM public.categories WHERE id=lo AND sort_order=0) THEN RAISE EXCEPTION 'Lower boundary failed'; END IF;
  INSERT INTO aud018_results VALUES('sort-zero-valid');
  hi:=public.wow_admin_upsert_category(NULL,rpad(prefix,100,'a'),'QA Category',NULL,NULL,100000,false);
  IF hi IS NULL OR NOT EXISTS(SELECT 1 FROM public.categories WHERE id=hi AND sort_order=100000 AND length(slug)=100) THEN RAISE EXCEPTION 'Upper boundary failed'; END IF;
  INSERT INTO aud018_results VALUES('slug-100-sort-100000-valid');
  FOR item IN SELECT * FROM (VALUES
    ('uppercase-slug',upper(prefix),0,'23514'),
    ('double-hyphen',prefix||'--x',0,'23514'),
    ('trailing-hyphen',prefix||'-',0,'23514'),
    ('slug-101',rpad(prefix,101,'a'),0,'23514'),
    ('sort-negative',prefix||'-negative',-1,'23514'),
    ('sort-over-limit',prefix||'-high',100001,'23514'),
    ('duplicate-slug',prefix||'-low',0,'23505')
  ) AS c(label,slug,ord,expected) LOOP
    actual:=NULL;
    BEGIN
      PERFORM public.wow_admin_upsert_category(NULL,item.slug,'QA Category',NULL,NULL,item.ord,false);
    EXCEPTION WHEN check_violation OR unique_violation THEN GET STACKED DIAGNOSTICS actual=RETURNED_SQLSTATE;
    END;
    IF actual IS DISTINCT FROM item.expected THEN RAISE EXCEPTION 'AUD-018 % expected % got %',item.label,item.expected,actual; END IF;
    INSERT INTO aud018_results VALUES(item.label||'-denied');
  END LOOP;
  actual:=NULL;
  BEGIN
    PERFORM public.wow_admin_upsert_category(lo,upper(prefix),'QA Category',NULL,NULL,0,false);
  EXCEPTION WHEN check_violation THEN GET STACKED DIAGNOSTICS actual=RETURNED_SQLSTATE;
  END;
  IF actual IS DISTINCT FROM '23514' OR NOT EXISTS(SELECT 1 FROM public.categories WHERE id=lo AND slug=prefix||'-low' AND sort_order=0) THEN RAISE EXCEPTION 'Invalid update was not atomic'; END IF;
  INSERT INTO aud018_results VALUES('invalid-update-atomic');
END $qa$;
SELECT jsonb_build_object('passed',count(*),'cases',jsonb_agg(case_name ORDER BY case_name)) AS aud018_result FROM aud018_results;

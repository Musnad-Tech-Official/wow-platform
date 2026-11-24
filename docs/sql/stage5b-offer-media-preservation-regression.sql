-- Rollback-only: no physical Storage writes; seed only synthetic relational references.
CREATE TEMP TABLE aud032_cases(name text PRIMARY KEY) ON COMMIT DROP;
DO $check$
DECLARE b uuid:=gen_random_uuid(); o uuid; v uuid; v2 uuid; item uuid; uid text:='qa_5b_media_'||substr(md5(random()::text),1,17);
payload jsonb; key1 text; key2 text; n integer;
BEGIN
 INSERT INTO public.users(id,account_status) VALUES(uid,'active');
 INSERT INTO public.businesses(id,owner_user_id,name,status,approved_at) VALUES(b,uid,'QA business','approved',now());
 INSERT INTO public.business_members(business_id,user_id,role,status,can_draft,can_submit,can_pause,can_monitor) VALUES(b,uid,'owner','active',true,true,true,true);
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',uid,'role','authenticated')::text,true);
 o:=public.wow_create_offer(b);
 payload:=jsonb_build_object('title','QA draft','offer_kind','product','currency','YER','items',jsonb_build_array(jsonb_build_object('item_type','product','name','QA item')),'branches','[]'::jsonb);
 v:=public.wow_save_offer_draft(o,payload);
 SELECT id INTO item FROM public.offer_items WHERE offer_version_id=v AND sort_order=0;
 key1:=b::text||'/'||v::text||'/'||uid||'/'||repeat('a',48)||'.jpg';
 key2:=b::text||'/'||v::text||'/'||uid||'/'||repeat('b',48)||'.png';
 INSERT INTO public.offer_media(offer_version_id,offer_item_id,storage_key,is_cover,sort_order) VALUES(v,NULL,key1,true,0),(v,item,key2,false,1);
 v2:=public.wow_save_offer_draft(o,payload||jsonb_build_object('title','QA draft updated'));
 SELECT count(*) INTO n FROM public.offer_media WHERE offer_version_id=v;
 IF v2 IS DISTINCT FROM v OR n<>2 THEN RAISE EXCEPTION 'media lost on draft save'; END IF;
 INSERT INTO aud032_cases VALUES('version-media-preserved');
 IF NOT EXISTS(SELECT 1 FROM public.offer_media m JOIN public.offer_items i ON i.id=m.offer_item_id WHERE m.storage_key=key2 AND i.id=item) THEN RAISE EXCEPTION 'item media lost';END IF;
 INSERT INTO aud032_cases VALUES('item-media-preserved');
 BEGIN PERFORM public.wow_attach_offer_media(v,'foreign/key.jpg',NULL,NULL,false,0); RAISE EXCEPTION 'foreign key accepted'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
 INSERT INTO aud032_cases VALUES('foreign-key-denied');
END; $check$;
SELECT count(*) AS passed,jsonb_agg(name ORDER BY name) AS cases FROM aud032_cases;

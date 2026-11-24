-- AUD-053: privacy request intake and manual follow-up; no account deletion.
CREATE TABLE wow_private.privacy_requests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id text NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
 kind text NOT NULL CHECK(kind IN ('access','correct','close')),
 status text NOT NULL DEFAULT 'submitted' CHECK(status IN ('submitted','in_review','resolved','declined')),
 note text NOT NULL DEFAULT '' CHECK(char_length(note)<=1000),
 response text CHECK(char_length(response)<=1000),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX privacy_one_open_kind ON wow_private.privacy_requests(user_id,kind) WHERE status IN ('submitted','in_review');
CREATE INDEX privacy_user_created ON wow_private.privacy_requests(user_id,created_at DESC,id);
CREATE TABLE wow_private.privacy_request_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 request_id uuid NOT NULL REFERENCES wow_private.privacy_requests(id) ON DELETE RESTRICT,
 actor_id text NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
 status text NOT NULL CHECK(status IN ('submitted','in_review','resolved','declined')),
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE wow_private.privacy_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE wow_private.privacy_request_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON wow_private.privacy_requests,wow_private.privacy_request_events FROM PUBLIC,anon,authenticated;
CREATE FUNCTION wow_private.privacy_require_admin() RETURNS text
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO '' AS $fn$
DECLARE actor text:=wow_private.current_active_customer_id();
BEGIN
 IF NOT EXISTS(SELECT 1 FROM wow_private.admin_members WHERE user_id=actor AND role='super_admin' AND is_active) THEN
   RAISE EXCEPTION 'Privacy administrator required' USING ERRCODE='42501';
 END IF;
 RETURN actor;
END $fn$;
CREATE FUNCTION wow_private.privacy_submit_internal(p_kind text,p_note text DEFAULT '') RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $fn$
DECLARE actor text:=wow_private.current_active_customer_id(); result_id uuid;
BEGIN
 IF p_kind IS NULL OR p_kind NOT IN ('access','correct','close') OR length(coalesce(p_note,''))>1000 THEN
   RAISE EXCEPTION 'Invalid privacy request' USING ERRCODE='22023';
 END IF;
 -- Serialize open requests for the same user/kind, including ambiguous retries.
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(actor||':'||p_kind,0));
 SELECT id INTO result_id FROM wow_private.privacy_requests WHERE user_id=actor AND kind=p_kind AND status IN ('submitted','in_review');
 IF result_id IS NOT NULL THEN RETURN result_id; END IF;
 INSERT INTO wow_private.privacy_requests(user_id,kind,note) VALUES(actor,p_kind,btrim(coalesce(p_note,''))) RETURNING id INTO result_id;
 INSERT INTO wow_private.privacy_request_events(request_id,actor_id,status) VALUES(result_id,actor,'submitted');
 RETURN result_id;
END $fn$;
CREATE FUNCTION wow_private.privacy_list_my_internal(p_limit integer DEFAULT 30,p_offset integer DEFAULT 0) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO '' AS $fn$
DECLARE actor text:=wow_private.current_active_customer_id(); result jsonb;
BEGIN
 SELECT coalesce(jsonb_agg(to_jsonb(r) ORDER BY r.created_at DESC,r.id DESC),'[]'::jsonb) INTO result
 FROM (SELECT id,kind,status,note,response,created_at,updated_at FROM wow_private.privacy_requests
 WHERE user_id=actor ORDER BY created_at DESC,id DESC LIMIT least(greatest(coalesce(p_limit,30),1),100) OFFSET greatest(coalesce(p_offset,0),0)) r;
 RETURN result;
END $fn$;
CREATE FUNCTION wow_private.privacy_list_admin_internal(p_limit integer DEFAULT 30,p_offset integer DEFAULT 0) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO '' AS $fn$
DECLARE actor text:=wow_private.privacy_require_admin(); result jsonb;
BEGIN
 SELECT coalesce(jsonb_agg(to_jsonb(r) ORDER BY r.created_at DESC,r.id DESC),'[]'::jsonb) INTO result
 FROM (SELECT id,user_id,kind,status,note,response,created_at,updated_at FROM wow_private.privacy_requests
 ORDER BY created_at DESC,id DESC LIMIT least(greatest(coalesce(p_limit,30),1),100) OFFSET greatest(coalesce(p_offset,0),0)) r;
 RETURN result;
END $fn$;
CREATE FUNCTION wow_private.privacy_update_internal(p_id uuid,p_status text,p_response text DEFAULT '') RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $fn$
DECLARE actor text:=wow_private.privacy_require_admin(); old_status text; subject text;
BEGIN
 SELECT status,user_id INTO old_status,subject FROM wow_private.privacy_requests WHERE id=p_id FOR UPDATE;
 IF old_status IS NULL THEN RAISE EXCEPTION 'Request not found' USING ERRCODE='22023'; END IF;
 IF subject=actor THEN RAISE EXCEPTION 'Independent privacy administrator required' USING ERRCODE='42501'; END IF;
 IF p_status IS NULL OR length(coalesce(p_response,''))>1000 OR NOT (
   (old_status='submitted' AND p_status='in_review') OR
   (old_status='in_review' AND p_status IN ('resolved','declined') AND length(btrim(coalesce(p_response,'')))>=10)
 ) THEN RAISE EXCEPTION 'Invalid privacy request transition' USING ERRCODE='22023'; END IF;
 UPDATE wow_private.privacy_requests SET status=p_status,response=nullif(btrim(coalesce(p_response,'')),''),updated_at=now() WHERE id=p_id;
 INSERT INTO wow_private.privacy_request_events(request_id,actor_id,status) VALUES(p_id,actor,p_status);
 RETURN true;
END $fn$;
CREATE FUNCTION public.wow_submit_privacy_request(p_kind text,p_note text DEFAULT '') RETURNS uuid
LANGUAGE sql SECURITY INVOKER SET search_path TO '' AS $fn$ SELECT wow_private.privacy_submit_internal(p_kind,p_note); $fn$;
CREATE FUNCTION public.wow_list_my_privacy_requests(p_limit integer DEFAULT 30,p_offset integer DEFAULT 0) RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path TO '' AS $fn$ SELECT wow_private.privacy_list_my_internal(p_limit,p_offset); $fn$;
CREATE FUNCTION public.wow_admin_list_privacy_requests(p_limit integer DEFAULT 30,p_offset integer DEFAULT 0) RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path TO '' AS $fn$ SELECT wow_private.privacy_list_admin_internal(p_limit,p_offset); $fn$;
CREATE FUNCTION public.wow_admin_update_privacy_request(p_id uuid,p_status text,p_response text DEFAULT '') RETURNS boolean
LANGUAGE sql SECURITY INVOKER SET search_path TO '' AS $fn$ SELECT wow_private.privacy_update_internal(p_id,p_status,p_response); $fn$;
REVOKE ALL ON FUNCTION wow_private.privacy_require_admin() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION wow_private.privacy_submit_internal(text,text),wow_private.privacy_list_my_internal(integer,integer),wow_private.privacy_list_admin_internal(integer,integer),wow_private.privacy_update_internal(uuid,text,text),public.wow_submit_privacy_request(text,text),public.wow_list_my_privacy_requests(integer,integer),public.wow_admin_list_privacy_requests(integer,integer),public.wow_admin_update_privacy_request(uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION wow_private.privacy_submit_internal(text,text),wow_private.privacy_list_my_internal(integer,integer),wow_private.privacy_list_admin_internal(integer,integer),wow_private.privacy_update_internal(uuid,text,text),public.wow_submit_privacy_request(text,text),public.wow_list_my_privacy_requests(integer,integer),public.wow_admin_list_privacy_requests(integer,integer),public.wow_admin_update_privacy_request(uuid,text,text) TO authenticated;

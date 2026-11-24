-- AUD-035: public signing only for the current approved logo/cover of a discoverable business.
-- Keep bucket private and deny object enumeration.
CREATE OR REPLACE FUNCTION wow_private.is_public_business_object(p_key text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT COALESCE(p_key ~ '^[0-9a-f-]{36}/[A-Za-z0-9_-]{3,128}/[a-f0-9]{48}\.(jpg|jpeg|png|webp)$',false)
 AND EXISTS(SELECT 1 FROM public.businesses b
   WHERE b.status='approved' AND b.id::text=split_part(p_key,'/',1)
     AND (b.logo_url=p_key OR b.cover_url=p_key)
     AND EXISTS(SELECT 1 FROM wow_private.discoverable_offer_branches() vis WHERE vis.business_id=b.id));
$$;
REVOKE ALL ON FUNCTION wow_private.is_public_business_object(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION wow_private.is_public_business_object(text) TO anon,authenticated;
CREATE POLICY wow_storage_read_live_business_images ON storage.objects FOR SELECT TO anon,authenticated
USING(bucket_id='wow-business-media'
  AND storage.allow_any_operation(ARRAY['object.get_authenticated','object.get_authenticated_info','object.sign'])
  AND wow_private.is_public_business_object(name));

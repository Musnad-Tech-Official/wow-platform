-- Tighten explicit anon grants inherited from default/schema function privileges.
REVOKE ALL ON FUNCTION public.wow_admin_request_merchant_response(uuid,text) FROM anon, PUBLIC;
REVOKE ALL ON FUNCTION public.wow_merchant_get_complaint(uuid) FROM anon, PUBLIC;
REVOKE ALL ON FUNCTION public.wow_merchant_respond_complaint(uuid,text,jsonb) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.wow_admin_request_merchant_response(uuid,text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.wow_merchant_get_complaint(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.wow_merchant_respond_complaint(uuid,text,jsonb) TO authenticated, service_role;

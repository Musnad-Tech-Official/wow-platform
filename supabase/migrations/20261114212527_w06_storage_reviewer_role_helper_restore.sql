-- Restore missing private reviewer predicate referenced by can_read_wow_object.
-- Reviewer or super_admin only, with active authenticated Clerk subject
-- verified through the existing authoritative admin membership contract.
-- Do not grant direct use to anon/authenticated. Parent Storage RLS helper
-- executes as its PostgreSQL owner and can invoke this SECURITY INVOKER helper.
CREATE OR REPLACE FUNCTION wow_private.is_catalog_reviewer()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $w06_reviewer$
  SELECT wow_private.has_admin_permission(true);
$w06_reviewer$;
REVOKE ALL ON FUNCTION wow_private.is_catalog_reviewer() FROM PUBLIC, anon, authenticated;
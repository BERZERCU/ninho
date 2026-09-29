-- RLS policies execute these identity-scoped helpers as authenticated.
-- Neither helper accepts a user ID: both check auth.uid().
GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_family_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.family_role(uuid) TO authenticated;

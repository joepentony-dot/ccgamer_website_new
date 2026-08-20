-- Restore the CCG admin role helper when a database has user_roles but no helper function.
-- The current production user_roles.role column is text; casting keeps this compatible
-- with role columns backed by an enum in older CCG database variants.

DO $$
BEGIN
  IF to_regprocedure('public.current_user_role()') IS NULL THEN
    EXECUTE $function$
      CREATE FUNCTION public.current_user_role()
      RETURNS text
      LANGUAGE sql
      STABLE
      SECURITY DEFINER
      SET search_path = public
      AS $body$
        SELECT ur.role::text
        FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
      $body$
    $function$;
  END IF;
END
$$;

REVOKE ALL ON FUNCTION public.current_user_role() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.current_user_role() FROM anon;
GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated;

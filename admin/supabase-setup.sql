-- CCG Admin Role-Based Access Control Setup
-- Run this in Supabase SQL editor as a privileged user.

-- 1) Optional enum for strict role values.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('superadmin', 'admin', 'editor');
  END IF;
END$$;

-- 2) Role mapping table.
CREATE TABLE IF NOT EXISTS public.user_roles (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'editor',
  assigned_by uuid REFERENCES auth.users (id),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles (role);

-- 3) Keep updated_at fresh.
CREATE OR REPLACE FUNCTION public.set_timestamp_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_user_roles_updated_at ON public.user_roles;
CREATE TRIGGER trg_user_roles_updated_at
BEFORE UPDATE ON public.user_roles
FOR EACH ROW
EXECUTE PROCEDURE public.set_timestamp_updated_at();

-- 4) Enable RLS.
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 5) Useful helper for policy checks.
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS public.app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ur.role
  FROM public.user_roles ur
  WHERE ur.user_id = auth.uid()
$$;

REVOKE ALL ON FUNCTION public.current_user_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated;

-- 6) Policies.
DROP POLICY IF EXISTS "Users can read own role" ON public.user_roles;
CREATE POLICY "Users can read own role"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can read all roles" ON public.user_roles;
CREATE POLICY "Admins can read all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.current_user_role() IN ('admin', 'superadmin'));

DROP POLICY IF EXISTS "Superadmins can manage roles" ON public.user_roles;
CREATE POLICY "Superadmins can manage roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.current_user_role() = 'superadmin')
WITH CHECK (public.current_user_role() = 'superadmin');

-- 7) Tighten direct table permissions.
REVOKE ALL ON public.user_roles FROM anon;
REVOKE ALL ON public.user_roles FROM authenticated;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;

-- 8) Seed the first superadmin (replace email before running).
-- INSERT INTO public.user_roles (user_id, role)
-- SELECT id, 'superadmin'::public.app_role
-- FROM auth.users
-- WHERE email = 'replace-with-your-email@example.com'
-- ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role;

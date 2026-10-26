-- ==============================================================================
-- KofyOne — Phase 4 Authentication & Role-Based Authorization Hardening
-- Migration: 20261011000000_auth_roles_hardening.sql
-- ==============================================================================

-- 1. Create or reconcile dedicated, private user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'educator', 'admin', 'guest')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Reconcile schema differences if user_roles was created by earlier migrations
DO $$
BEGIN
  -- If user_id column exists, drop NOT NULL constraint so (id, role) inserts never fail
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_roles' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.user_roles ALTER COLUMN user_id DROP NOT NULL;
  ELSE
    -- Add user_id column if it does not exist so queries against user_id continue to work
    ALTER TABLE public.user_roles ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  -- Drop any legacy UNIQUE constraints on user_id to prevent multi-column conflict aborts
  EXECUTE (
    SELECT COALESCE(
      string_agg('ALTER TABLE public.user_roles DROP CONSTRAINT ' || quote_ident(conname) || ';', ' '),
      ''
    )
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'user_roles'
      AND con.contype = 'u'
      AND con.conname LIKE '%user_id%'
  );

  -- Drop existing check constraints on role to ensure the expanded role set is accepted
  EXECUTE (
    SELECT COALESCE(
      string_agg('ALTER TABLE public.user_roles DROP CONSTRAINT ' || quote_ident(conname) || ';', ' '),
      ''
    )
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'user_roles'
      AND con.contype = 'c'
  );
END $$;

-- Enforce updated check constraint on role
ALTER TABLE public.user_roles
  DROP CONSTRAINT IF EXISTS user_roles_role_check;
ALTER TABLE public.user_roles
  ADD CONSTRAINT user_roles_role_check
  CHECK (role IN ('student', 'educator', 'admin', 'guest'));

-- Indexes on id, user_id, and role
CREATE INDEX IF NOT EXISTS idx_user_roles_id ON public.user_roles(id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS user_roles_role_idx ON public.user_roles(role);

-- Synchronize legacy rows where user_id was set but id was a random UUID
UPDATE public.user_roles
SET id = user_id
WHERE user_id IS NOT NULL AND id != user_id
  AND NOT EXISTS (SELECT 1 FROM public.user_roles r2 WHERE r2.id = public.user_roles.user_id);

-- Ensure user_id matches id for all rows
UPDATE public.user_roles
SET user_id = id
WHERE user_id IS NULL;

-- 2. Populate user_roles from existing profiles if present
INSERT INTO public.user_roles (id, user_id, role)
SELECT id, id, role FROM public.profiles
ON CONFLICT (id) DO UPDATE SET
  user_id = EXCLUDED.user_id,
  role = EXCLUDED.role;

-- 3. Lock down user_roles with strict Row Level Security
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Revoke direct table permissions from anon and authenticated clients
REVOKE ALL ON public.user_roles FROM anon, authenticated;

-- Allow authenticated users to view only their own role
DROP POLICY IF EXISTS "Users can read own role" ON public.user_roles;
DROP POLICY IF EXISTS "Users can read their own role" ON public.user_roles;
CREATE POLICY "Users can read own role"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = id OR auth.uid() = user_id);

-- Admins can read all roles
DROP POLICY IF EXISTS "Admins can read all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Admins can read all roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles AS r
      WHERE (r.id = auth.uid() OR r.user_id = auth.uid()) AND r.role = 'admin'
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles AS p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Only service role can insert/update/delete user_roles directly (no authenticated write policies)

-- 4. Definitive, secure is_admin() function with fixed search_path
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE (id = auth.uid() OR user_id = auth.uid()) AND role = 'admin'
  )
  OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, anon;

-- 5. Helper function for a user to query their own role safely
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(
    (SELECT role FROM public.user_roles WHERE (id = auth.uid() OR user_id = auth.uid()) LIMIT 1),
    (SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1),
    'student'
  );
$$;

REVOKE ALL ON FUNCTION public.get_current_user_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_current_user_role() TO authenticated;

-- 6. Trigger to automatically provision profile and default role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Insert or update user profile
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    avatar_url,
    preferred_platform
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data ->> 'full_name',
      NEW.raw_user_meta_data ->> 'name',
      SPLIT_PART(COALESCE(NEW.email, ''), '@', 1)
    ),
    NEW.raw_user_meta_data ->> 'avatar_url',
    'microsoft'
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name),
      avatar_url = COALESCE(public.profiles.avatar_url, EXCLUDED.avatar_url);

  -- Insert default student role into private user_roles table
  INSERT INTO public.user_roles (id, user_id, role)
  VALUES (NEW.id, NEW.id, 'student')
  ON CONFLICT (id) DO UPDATE
  SET user_id = EXCLUDED.user_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_profiles ON auth.users;
CREATE TRIGGER on_auth_user_created_profiles
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_profile();

-- 7. Ensure RLS on public.profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can delete their own profile" ON public.profiles;
CREATE POLICY "Users can delete their own profile"
  ON public.profiles FOR DELETE
  TO authenticated
  USING (auth.uid() = id OR public.is_admin());

-- Restrict columns users are allowed to update
REVOKE ALL ON public.profiles FROM authenticated;
GRANT SELECT ON public.profiles TO authenticated;
GRANT UPDATE (full_name, avatar_url, preferred_platform) ON public.profiles TO authenticated;
GRANT DELETE ON public.profiles TO authenticated;

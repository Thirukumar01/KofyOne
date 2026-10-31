-- ==============================================================================
-- Migration: 20261031000000_fix_profile_db_persistence.sql
-- Description:
-- 1. Ensure all user preference & identity columns exist on public.profiles.
-- 2. Backfill public.profiles for every existing user in auth.users.
-- 3. Fix RLS policies and table permissions on public.profiles.
-- 4. Create bulletproof atomic RPC public.upsert_my_profile(...) with SECURITY DEFINER.
-- 5. Update handle_new_user_profile() trigger to provision full profile on signup.
-- 6. Reload PostgREST schema cache.
-- ==============================================================================

-- -----------------------------------------------------------------------------
-- 1. Ensure all columns exist on public.profiles
-- -----------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS full_name TEXT,
  ADD COLUMN IF NOT EXISTS display_name TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT DEFAULT 'avatar-student-1',
  ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS learner_role TEXT DEFAULT 'student',
  ADD COLUMN IF NOT EXISTS role_focus TEXT DEFAULT 'student',
  ADD COLUMN IF NOT EXISTS preferred_platform TEXT DEFAULT 'microsoft',
  ADD COLUMN IF NOT EXISTS theme_preference TEXT DEFAULT 'dark',
  ADD COLUMN IF NOT EXISTS default_sort TEXT DEFAULT 'featured',
  ADD COLUMN IF NOT EXISTS resource_sort_preference TEXT DEFAULT 'featured',
  ADD COLUMN IF NOT EXISTS card_density TEXT DEFAULT 'comfortable',
  ADD COLUMN IF NOT EXISTS card_layout_preference TEXT DEFAULT 'comfortable',
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Expand role check constraint to accept standard user roles
DO $$
BEGIN
  ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
  ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_role_check
    CHECK (role IN ('student', 'developer', 'educator', 'admin', 'guest'));
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;

-- -----------------------------------------------------------------------------
-- 2. Backfill public.profiles for every existing user in auth.users
-- -----------------------------------------------------------------------------
INSERT INTO public.profiles (
  id, email, username, full_name, display_name, avatar_url, bio, learner_role, role_focus,
  preferred_platform, theme_preference, default_sort, resource_sort_preference,
  card_density, card_layout_preference, role
)
SELECT
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'username', SPLIT_PART(u.email, '@', 1)),
  COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'display_name', SPLIT_PART(u.email, '@', 1)),
  COALESCE(u.raw_user_meta_data->>'display_name', u.raw_user_meta_data->>'full_name', SPLIT_PART(u.email, '@', 1)),
  COALESCE(u.raw_user_meta_data->>'avatar_url', 'avatar-student-1'),
  COALESCE(u.raw_user_meta_data->>'bio', ''),
  COALESCE(u.raw_user_meta_data->>'learner_role', 'student'),
  COALESCE(u.raw_user_meta_data->>'learner_role', 'student'),
  COALESCE(u.raw_user_meta_data->>'preferred_platform', 'microsoft'),
  COALESCE(u.raw_user_meta_data->>'theme_preference', 'dark'),
  COALESCE(u.raw_user_meta_data->>'default_sort', 'featured'),
  COALESCE(u.raw_user_meta_data->>'default_sort', 'featured'),
  COALESCE(u.raw_user_meta_data->>'card_density', 'comfortable'),
  COALESCE(u.raw_user_meta_data->>'card_density', 'comfortable'),
  COALESCE((SELECT ur.role FROM public.user_roles ur WHERE ur.id = u.id OR ur.user_id = u.id LIMIT 1), 'student')
FROM auth.users u
ON CONFLICT (id) DO UPDATE SET
  email = COALESCE(public.profiles.email, EXCLUDED.email),
  username = COALESCE(public.profiles.username, EXCLUDED.username),
  display_name = COALESCE(NULLIF(public.profiles.display_name, ''), EXCLUDED.display_name),
  full_name = COALESCE(NULLIF(public.profiles.full_name, ''), EXCLUDED.full_name),
  avatar_url = COALESCE(NULLIF(public.profiles.avatar_url, ''), EXCLUDED.avatar_url),
  bio = COALESCE(NULLIF(public.profiles.bio, ''), EXCLUDED.bio),
  learner_role = COALESCE(NULLIF(public.profiles.learner_role, ''), EXCLUDED.learner_role),
  role_focus = COALESCE(NULLIF(public.profiles.role_focus, ''), EXCLUDED.role_focus),
  preferred_platform = COALESCE(NULLIF(public.profiles.preferred_platform, ''), EXCLUDED.preferred_platform);

-- -----------------------------------------------------------------------------
-- 3. Fix RLS Policies and Table Grants on public.profiles
-- -----------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.profiles;
DROP POLICY IF EXISTS "Enable update for users based on email" ON public.profiles;

CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id OR public.is_admin())
  WITH CHECK (auth.uid() = id OR public.is_admin());

-- Ensure authenticated users and service_role have full table-level grants
GRANT ALL ON public.profiles TO authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 4. Atomic SECURITY DEFINER RPC public.upsert_my_profile(...)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.upsert_my_profile(
  p_display_name TEXT DEFAULT NULL,
  p_avatar_url TEXT DEFAULT NULL,
  p_bio TEXT DEFAULT NULL,
  p_learner_role TEXT DEFAULT NULL,
  p_preferred_platform TEXT DEFAULT NULL,
  p_theme_preference TEXT DEFAULT NULL,
  p_default_sort TEXT DEFAULT NULL,
  p_card_density TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID;
  v_email TEXT;
  v_username TEXT;
  v_result JSONB;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT email, COALESCE(raw_user_meta_data->>'username', SPLIT_PART(email, '@', 1))
  INTO v_email, v_username
  FROM auth.users
  WHERE id = v_user_id;

  INSERT INTO public.profiles (
    id,
    email,
    username,
    display_name,
    full_name,
    avatar_url,
    bio,
    learner_role,
    role_focus,
    preferred_platform,
    theme_preference,
    default_sort,
    resource_sort_preference,
    card_density,
    card_layout_preference,
    updated_at
  ) VALUES (
    v_user_id,
    v_email,
    v_username,
    COALESCE(NULLIF(p_display_name, ''), v_username, 'Student'),
    COALESCE(NULLIF(p_display_name, ''), v_username, 'Student'),
    COALESCE(NULLIF(p_avatar_url, ''), 'avatar-student-1'),
    COALESCE(p_bio, ''),
    COALESCE(NULLIF(p_learner_role, ''), 'student'),
    COALESCE(NULLIF(p_learner_role, ''), 'student'),
    COALESCE(NULLIF(p_preferred_platform, ''), 'microsoft'),
    COALESCE(NULLIF(p_theme_preference, ''), 'dark'),
    COALESCE(NULLIF(p_default_sort, ''), 'featured'),
    COALESCE(NULLIF(p_default_sort, ''), 'featured'),
    COALESCE(NULLIF(p_card_density, ''), 'comfortable'),
    COALESCE(NULLIF(p_card_density, ''), 'comfortable'),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = COALESCE(public.profiles.email, v_email),
    display_name = COALESCE(NULLIF(p_display_name, ''), public.profiles.display_name),
    full_name = COALESCE(NULLIF(p_display_name, ''), public.profiles.full_name, public.profiles.display_name),
    avatar_url = COALESCE(NULLIF(p_avatar_url, ''), public.profiles.avatar_url),
    bio = COALESCE(p_bio, public.profiles.bio),
    learner_role = COALESCE(NULLIF(p_learner_role, ''), public.profiles.learner_role),
    role_focus = COALESCE(NULLIF(p_learner_role, ''), public.profiles.role_focus, public.profiles.learner_role),
    preferred_platform = COALESCE(NULLIF(p_preferred_platform, ''), public.profiles.preferred_platform),
    theme_preference = COALESCE(NULLIF(p_theme_preference, ''), public.profiles.theme_preference),
    default_sort = COALESCE(NULLIF(p_default_sort, ''), public.profiles.default_sort),
    resource_sort_preference = COALESCE(NULLIF(p_default_sort, ''), public.profiles.resource_sort_preference, public.profiles.default_sort),
    card_density = COALESCE(NULLIF(p_card_density, ''), public.profiles.card_density),
    card_layout_preference = COALESCE(NULLIF(p_card_density, ''), public.profiles.card_layout_preference, public.profiles.card_density),
    updated_at = NOW()
  RETURNING to_jsonb(public.profiles.*) INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_my_profile(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 5. Update handle_new_user_profile() Trigger
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Insert or update user profile with comprehensive initial attributes
  INSERT INTO public.profiles (
    id,
    email,
    username,
    display_name,
    full_name,
    avatar_url,
    bio,
    learner_role,
    role_focus,
    preferred_platform,
    theme_preference,
    default_sort,
    resource_sort_preference,
    card_density,
    card_layout_preference
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', SPLIT_PART(COALESCE(NEW.email, ''), '@', 1)),
    COALESCE(
      NEW.raw_user_meta_data->>'display_name',
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      SPLIT_PART(COALESCE(NEW.email, ''), '@', 1)
    ),
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'display_name',
      NEW.raw_user_meta_data->>'name',
      SPLIT_PART(COALESCE(NEW.email, ''), '@', 1)
    ),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', 'avatar-student-1'),
    COALESCE(NEW.raw_user_meta_data->>'bio', ''),
    COALESCE(NEW.raw_user_meta_data->>'learner_role', 'student'),
    COALESCE(NEW.raw_user_meta_data->>'learner_role', 'student'),
    COALESCE(NEW.raw_user_meta_data->>'preferred_platform', 'microsoft'),
    COALESCE(NEW.raw_user_meta_data->>'theme_preference', 'dark'),
    COALESCE(NEW.raw_user_meta_data->>'default_sort', 'featured'),
    COALESCE(NEW.raw_user_meta_data->>'default_sort', 'featured'),
    COALESCE(NEW.raw_user_meta_data->>'card_density', 'comfortable'),
    COALESCE(NEW.raw_user_meta_data->>'card_density', 'comfortable')
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      username = COALESCE(public.profiles.username, EXCLUDED.username),
      display_name = COALESCE(public.profiles.display_name, EXCLUDED.display_name),
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

-- -----------------------------------------------------------------------------
-- 6. Reload PostgREST Schema Cache
-- -----------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';


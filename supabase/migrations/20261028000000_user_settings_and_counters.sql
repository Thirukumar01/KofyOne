-- =============================================================================
-- Migration: 20261028000000_user_settings_and_counters.sql
-- Description:
-- 1. User Profile Settings (display_name, avatar_url, bio, theme_preference, etc.)
-- 2. Atomic Resource View and Click Counter RPCs with search_path safety
-- 3. Anonymous & Authenticated grants for view/click counters and personalization
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. USER PROFILES EXTENSION
-- -----------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS display_name TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS preferred_platform TEXT DEFAULT 'microsoft',
  ADD COLUMN IF NOT EXISTS theme_preference TEXT DEFAULT 'dark',
  ADD COLUMN IF NOT EXISTS resource_sort_preference TEXT DEFAULT 'featured',
  ADD COLUMN IF NOT EXISTS card_layout_preference TEXT DEFAULT 'comfortable',
  ADD COLUMN IF NOT EXISTS role_focus TEXT DEFAULT 'student',
  ADD COLUMN IF NOT EXISTS learner_role TEXT DEFAULT 'student',
  ADD COLUMN IF NOT EXISTS default_sort TEXT DEFAULT 'featured',
  ADD COLUMN IF NOT EXISTS card_density TEXT DEFAULT 'comfortable';

-- Expand profiles_role_check constraint to accept student, developer, educator, admin, guest
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

-- Ensure RLS is active
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Idempotent RLS Policies on profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Column-level privileges (no self-updating role or email)
REVOKE ALL ON public.profiles FROM authenticated;
GRANT SELECT ON public.profiles TO authenticated;
GRANT INSERT ON public.profiles TO authenticated;
GRANT UPDATE (
  full_name,
  display_name,
  avatar_url,
  bio,
  preferred_platform,
  theme_preference,
  resource_sort_preference,
  card_layout_preference,
  role_focus,
  learner_role,
  default_sort,
  card_density,
  updated_at
) ON public.profiles TO authenticated;

-- -----------------------------------------------------------------------------
-- 2. RESOURCE VIEW & CLICK COUNTER COLUMNS
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'resources' AND column_name = 'view_count'
  ) THEN
    ALTER TABLE public.resources ADD COLUMN view_count BIGINT NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'resources' AND column_name = 'click_count'
  ) THEN
    ALTER TABLE public.resources ADD COLUMN click_count BIGINT NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'resources' AND column_name = 'views_count'
  ) THEN
    ALTER TABLE public.resources ADD COLUMN views_count BIGINT NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'resources' AND column_name = 'clicks_count'
  ) THEN
    ALTER TABLE public.resources ADD COLUMN clicks_count BIGINT NOT NULL DEFAULT 0;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 3. ATOMIC INCREMENT RPC FUNCTIONS (SECURITY DEFINER, FIXED search_path)
-- -----------------------------------------------------------------------------

-- Drop existing function signatures to allow changing return types safely
DROP FUNCTION IF EXISTS public.increment_resource_view(UUID);
DROP FUNCTION IF EXISTS public.increment_resource_view(TEXT);
DROP FUNCTION IF EXISTS public.increment_resource_click(UUID);
DROP FUNCTION IF EXISTS public.increment_resource_click(TEXT);

-- Increment view count by slug
CREATE OR REPLACE FUNCTION public.increment_resource_view(resource_slug TEXT)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  new_count BIGINT;
BEGIN
  UPDATE public.resources
  SET view_count = view_count + 1,
      views_count = views_count + 1,
      updated_at = NOW()
  WHERE slug = resource_slug
    AND is_published = true
  RETURNING view_count INTO new_count;

  RETURN COALESCE(new_count, 0);
END;
$$;

-- Increment view count by UUID
CREATE OR REPLACE FUNCTION public.increment_resource_view(resource_uuid UUID)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  new_count BIGINT;
BEGIN
  UPDATE public.resources
  SET view_count = view_count + 1,
      views_count = views_count + 1,
      updated_at = NOW()
  WHERE id = resource_uuid
    AND is_published = true
  RETURNING view_count INTO new_count;

  RETURN COALESCE(new_count, 0);
END;
$$;

-- Increment click count by slug
CREATE OR REPLACE FUNCTION public.increment_resource_click(resource_slug TEXT)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  new_count BIGINT;
BEGIN
  UPDATE public.resources
  SET click_count = click_count + 1,
      clicks_count = clicks_count + 1,
      updated_at = NOW()
  WHERE slug = resource_slug
    AND is_published = true
  RETURNING click_count INTO new_count;

  RETURN COALESCE(new_count, 0);
END;
$$;

-- Increment click count by UUID
CREATE OR REPLACE FUNCTION public.increment_resource_click(resource_uuid UUID)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  new_count BIGINT;
BEGIN
  UPDATE public.resources
  SET click_count = click_count + 1,
      clicks_count = clicks_count + 1,
      updated_at = NOW()
  WHERE id = resource_uuid
    AND is_published = true
  RETURNING click_count INTO new_count;

  RETURN COALESCE(new_count, 0);
END;
$$;

-- Explicitly grant execute permissions to anon, authenticated, and service_role
REVOKE ALL ON FUNCTION public.increment_resource_view(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.increment_resource_view(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.increment_resource_click(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.increment_resource_click(UUID) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.increment_resource_view(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.increment_resource_view(UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.increment_resource_click(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.increment_resource_click(UUID) TO anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 4. PERSONALIZATION DELETION POLICIES (For 1-click Clear History & Favorites)
-- -----------------------------------------------------------------------------
ALTER TABLE public.user_recently_viewed ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can delete their own recently viewed" ON public.user_recently_viewed;
CREATE POLICY "Users can delete their own recently viewed"
  ON public.user_recently_viewed FOR DELETE
  USING (auth.uid() = user_id);

ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can delete their own favorites" ON public.user_favorites;
CREATE POLICY "Users can delete their own favorites"
  ON public.user_favorites FOR DELETE
  USING (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- 5. RELOAD POSTGREST SCHEMA CACHE
-- -----------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';

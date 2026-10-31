-- =============================================================================
-- Migration: 20261031120000_fix_resources_favorites_recent_counters.sql
-- Fixes new resource counters, non-null math, favorites unique constraints,
-- recently viewed auto-recording, and multi-provider canonical seeding.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. FIX public.resources COUNTERS, FLAGS & DEFAULTS
-- -----------------------------------------------------------------------------
ALTER TABLE public.resources
  ALTER COLUMN view_count SET DEFAULT 0,
  ALTER COLUMN click_count SET DEFAULT 0;

ALTER TABLE public.resources
  ADD COLUMN IF NOT EXISTS views_count BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS clicks_count BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT true;

UPDATE public.resources
SET view_count = COALESCE(view_count, views_count, 0),
    views_count = COALESCE(views_count, view_count, 0),
    click_count = COALESCE(click_count, clicks_count, 0),
    clicks_count = COALESCE(clicks_count, click_count, 0),
    is_published = COALESCE(is_published, true),
    is_active = COALESCE(is_active, true);

-- -----------------------------------------------------------------------------
-- 2. DEDUPLICATE & CONSTRAIN user_favorites AND user_recently_viewed
-- -----------------------------------------------------------------------------
DELETE FROM public.user_favorites a
USING public.user_favorites b
WHERE a.ctid < b.ctid AND a.user_id = b.user_id AND a.resource_id = b.resource_id;

DELETE FROM public.user_recently_viewed a
USING public.user_recently_viewed b
WHERE a.ctid < b.ctid AND a.user_id = b.user_id AND a.resource_id = b.resource_id;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_favorites_user_resource_unique'
  ) THEN
    ALTER TABLE public.user_favorites ADD CONSTRAINT user_favorites_user_resource_unique UNIQUE (user_id, resource_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_recently_viewed_user_resource_unique'
  ) THEN
    ALTER TABLE public.user_recently_viewed ADD CONSTRAINT user_recently_viewed_user_resource_unique UNIQUE (user_id, resource_id);
  END IF;
END $$;

ALTER TABLE public.user_recently_viewed ALTER COLUMN viewed_at SET DEFAULT NOW();

-- Full RLS Policies for user_favorites
ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own favorites" ON public.user_favorites;
CREATE POLICY "Users can read own favorites" ON public.user_favorites FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own favorites" ON public.user_favorites;
CREATE POLICY "Users can insert own favorites" ON public.user_favorites FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own favorites" ON public.user_favorites;
CREATE POLICY "Users can update own favorites" ON public.user_favorites FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own favorites" ON public.user_favorites;
CREATE POLICY "Users can delete own favorites" ON public.user_favorites FOR DELETE USING (auth.uid() = user_id);

-- Full RLS Policies for user_recently_viewed
ALTER TABLE public.user_recently_viewed ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own recently viewed" ON public.user_recently_viewed;
CREATE POLICY "Users can read own recently viewed" ON public.user_recently_viewed FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own recently viewed" ON public.user_recently_viewed;
CREATE POLICY "Users can insert own recently viewed" ON public.user_recently_viewed FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own recently viewed" ON public.user_recently_viewed;
CREATE POLICY "Users can update own recently viewed" ON public.user_recently_viewed FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own recently viewed" ON public.user_recently_viewed;
CREATE POLICY "Users can delete own recently viewed" ON public.user_recently_viewed FOR DELETE USING (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- 3. DROP OLD FUNCTION SIGNATURES SAFELY
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.increment_resource_view(UUID);
DROP FUNCTION IF EXISTS public.increment_resource_view(TEXT);
DROP FUNCTION IF EXISTS public.increment_resource_view(TEXT, TEXT);
DROP FUNCTION IF EXISTS public.increment_resource_click(UUID);
DROP FUNCTION IF EXISTS public.increment_resource_click(TEXT);
DROP FUNCTION IF EXISTS public.increment_resource_click(TEXT, TEXT);
DROP FUNCTION IF EXISTS public.toggle_resource_favorite(TEXT);
DROP FUNCTION IF EXISTS public.record_resource_view_history(TEXT);

-- -----------------------------------------------------------------------------
-- 4. ATOMIC COUNTER RPCs (SECURITY DEFINER, FIXED search_path)
-- -----------------------------------------------------------------------------

-- Increment view count by TEXT (slug or UUID string)
CREATE OR REPLACE FUNCTION public.increment_resource_view(
  p_identifier TEXT DEFAULT NULL,
  resource_slug TEXT DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_id_to_use TEXT;
  v_res_id UUID;
  new_count BIGINT;
  v_uid UUID;
BEGIN
  v_id_to_use := COALESCE(p_identifier, resource_slug);
  IF v_id_to_use IS NULL OR TRIM(v_id_to_use) = '' THEN
    RETURN 0;
  END IF;

  UPDATE public.resources
  SET view_count = COALESCE(view_count, 0) + 1,
      views_count = COALESCE(views_count, 0) + 1,
      updated_at = NOW()
  WHERE slug = v_id_to_use OR id::text = v_id_to_use
  RETURNING id, view_count INTO v_res_id, new_count;

  IF v_res_id IS NULL THEN
    SELECT id, view_count INTO v_res_id, new_count
    FROM public.resources
    WHERE slug = v_id_to_use OR id::text = v_id_to_use
    LIMIT 1;
  END IF;

  -- Automatically record recently viewed for authenticated users
  v_uid := auth.uid();
  IF v_uid IS NOT NULL AND v_res_id IS NOT NULL THEN
    INSERT INTO public.user_recently_viewed (user_id, resource_id, viewed_at)
    VALUES (v_uid, v_res_id, NOW())
    ON CONFLICT (user_id, resource_id) DO UPDATE SET viewed_at = NOW();
  END IF;

  RETURN COALESCE(new_count, 1);
END;
$$;

-- UUID overload for increment_resource_view
CREATE OR REPLACE FUNCTION public.increment_resource_view(resource_uuid UUID)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN public.increment_resource_view(p_identifier => resource_uuid::text);
END;
$$;

-- Increment click count by TEXT (slug or UUID string)
CREATE OR REPLACE FUNCTION public.increment_resource_click(
  p_identifier TEXT DEFAULT NULL,
  resource_slug TEXT DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_id_to_use TEXT;
  v_res_id UUID;
  new_count BIGINT;
  v_uid UUID;
BEGIN
  v_id_to_use := COALESCE(p_identifier, resource_slug);
  IF v_id_to_use IS NULL OR TRIM(v_id_to_use) = '' THEN
    RETURN 0;
  END IF;

  UPDATE public.resources
  SET click_count = COALESCE(click_count, 0) + 1,
      clicks_count = COALESCE(clicks_count, 0) + 1,
      view_count = GREATEST(COALESCE(view_count, 0), 1),
      views_count = GREATEST(COALESCE(views_count, 0), 1),
      updated_at = NOW()
  WHERE slug = v_id_to_use OR id::text = v_id_to_use
  RETURNING id, click_count INTO v_res_id, new_count;

  IF v_res_id IS NULL THEN
    SELECT id, click_count INTO v_res_id, new_count
    FROM public.resources
    WHERE slug = v_id_to_use OR id::text = v_id_to_use
    LIMIT 1;
  END IF;

  -- Automatically record recently viewed for authenticated users
  v_uid := auth.uid();
  IF v_uid IS NOT NULL AND v_res_id IS NOT NULL THEN
    INSERT INTO public.user_recently_viewed (user_id, resource_id, viewed_at)
    VALUES (v_uid, v_res_id, NOW())
    ON CONFLICT (user_id, resource_id) DO UPDATE SET viewed_at = NOW();
  END IF;

  RETURN COALESCE(new_count, 1);
END;
$$;

-- UUID overload for increment_resource_click
CREATE OR REPLACE FUNCTION public.increment_resource_click(resource_uuid UUID)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN public.increment_resource_click(p_identifier => resource_uuid::text);
END;
$$;

-- Grant permissions for counter RPCs
GRANT EXECUTE ON FUNCTION public.increment_resource_view(TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.increment_resource_view(UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.increment_resource_click(TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.increment_resource_click(UUID) TO anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 5. FAVORITES & RECENTLY VIEWED RPCs
-- -----------------------------------------------------------------------------

-- Toggle resource favorite atomically
CREATE OR REPLACE FUNCTION public.toggle_resource_favorite(p_identifier TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid UUID;
  v_res_id UUID;
  v_exists BOOLEAN;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('error', 'Unauthorized: Authentication required');
  END IF;

  SELECT id INTO v_res_id
  FROM public.resources
  WHERE slug = p_identifier OR id::text = p_identifier
  LIMIT 1;

  IF v_res_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Resource not found', 'identifier', p_identifier);
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.user_favorites
    WHERE user_id = v_uid AND resource_id = v_res_id
  ) INTO v_exists;

  IF v_exists THEN
    DELETE FROM public.user_favorites
    WHERE user_id = v_uid AND resource_id = v_res_id;
    RETURN jsonb_build_object('favorited', false, 'resource_id', v_res_id);
  ELSE
    INSERT INTO public.user_favorites (user_id, resource_id, created_at)
    VALUES (v_uid, v_res_id, NOW())
    ON CONFLICT (user_id, resource_id) DO NOTHING;
    RETURN jsonb_build_object('favorited', true, 'resource_id', v_res_id);
  END IF;
END;
$$;

-- Record resource view history explicitly
CREATE OR REPLACE FUNCTION public.record_resource_view_history(p_identifier TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid UUID;
  v_res_id UUID;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN;
  END IF;

  SELECT id INTO v_res_id
  FROM public.resources
  WHERE slug = p_identifier OR id::text = p_identifier
  LIMIT 1;

  IF v_res_id IS NOT NULL THEN
    INSERT INTO public.user_recently_viewed (user_id, resource_id, viewed_at)
    VALUES (v_uid, v_res_id, NOW())
    ON CONFLICT (user_id, resource_id) DO UPDATE SET viewed_at = NOW();
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.toggle_resource_favorite(TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.record_resource_view_history(TEXT) TO authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 6. IDEMPOTENT MULTI-PROVIDER SEED ENFORCEMENT
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  ms_id UUID;
  aws_id UUID;
  gcp_id UUID;
  other_id UUID;
  cat_student UUID;
  cat_ai UUID;
  cat_cloud UUID;
  cat_dev UUID;
  cat_prod UUID;
  res_id UUID;
BEGIN
  -- Get platform IDs
  SELECT id INTO ms_id FROM public.platforms WHERE slug = 'microsoft' LIMIT 1;
  SELECT id INTO aws_id FROM public.platforms WHERE slug = 'aws' LIMIT 1;
  SELECT id INTO gcp_id FROM public.platforms WHERE slug = 'google-cloud' OR slug = 'google' LIMIT 1;
  SELECT id INTO other_id FROM public.platforms WHERE slug = 'other' LIMIT 1;

  -- Get category IDs
  SELECT id INTO cat_student FROM public.categories WHERE slug = 'student' LIMIT 1;
  SELECT id INTO cat_ai FROM public.categories WHERE slug = 'ai' LIMIT 1;
  SELECT id INTO cat_cloud FROM public.categories WHERE slug = 'cloud' LIMIT 1;
  SELECT id INTO cat_dev FROM public.categories WHERE slug = 'developer' LIMIT 1;
  SELECT id INTO cat_prod FROM public.categories WHERE slug = 'productivity' LIMIT 1;

  -- Microsoft Resources
  IF ms_id IS NOT NULL THEN
    -- 1. Microsoft Learn
    INSERT INTO public.resources (platform_id, name, slug, description, official_url, is_published, featured, display_order, contributor_id, view_count, click_count, views_count, clicks_count)
    VALUES (ms_id, 'Microsoft Learn', 'microsoft-learn', 'Official technical documentation, free interactive self-paced learning paths, and training for students and developers.', 'https://learn.microsoft.com/training', true, true, 1, 'studentamb_504640', 0, 0, 0, 0)
    ON CONFLICT (slug) DO UPDATE SET platform_id = EXCLUDED.platform_id, is_published = true, official_url = EXCLUDED.official_url
    RETURNING id INTO res_id;
    IF res_id IS NOT NULL AND cat_student IS NOT NULL THEN INSERT INTO public.resource_categories (resource_id, category_id) VALUES (res_id, cat_student) ON CONFLICT DO NOTHING; END IF;
    IF res_id IS NOT NULL AND cat_cloud IS NOT NULL THEN INSERT INTO public.resource_categories (resource_id, category_id) VALUES (res_id, cat_cloud) ON CONFLICT DO NOTHING; END IF;

    -- 2. Azure for Students
    INSERT INTO public.resources (platform_id, name, slug, description, official_url, is_published, featured, display_order, contributor_id, view_count, click_count, views_count, clicks_count)
    VALUES (ms_id, 'Azure for Students', 'azure-for-students', '$100 in Azure cloud credits, 55+ always-free cloud services, and access to developer tools with no credit card required.', 'https://azure.microsoft.com/free/students/', true, true, 2, 'studentamb_504640', 0, 0, 0, 0)
    ON CONFLICT (slug) DO UPDATE SET platform_id = EXCLUDED.platform_id, is_published = true, official_url = EXCLUDED.official_url
    RETURNING id INTO res_id;
    IF res_id IS NOT NULL AND cat_student IS NOT NULL THEN INSERT INTO public.resource_categories (resource_id, category_id) VALUES (res_id, cat_student) ON CONFLICT DO NOTHING; END IF;
    IF res_id IS NOT NULL AND cat_cloud IS NOT NULL THEN INSERT INTO public.resource_categories (resource_id, category_id) VALUES (res_id, cat_cloud) ON CONFLICT DO NOTHING; END IF;

    -- 3. Azure Fundamentals
    INSERT INTO public.resources (platform_id, name, slug, description, official_url, is_published, featured, display_order, contributor_id, view_count, click_count, views_count, clicks_count)
    VALUES (ms_id, 'Azure Fundamentals', 'azure-fundamentals', 'Master fundamental cloud computing concepts and prepare for the AZ-900 Microsoft Azure Fundamentals certification.', 'https://learn.microsoft.com/training/paths/azure-fundamentals-describe-cloud-concepts/', true, false, 3, 'studentamb_504640', 0, 0, 0, 0)
    ON CONFLICT (slug) DO UPDATE SET platform_id = EXCLUDED.platform_id, is_published = true, official_url = EXCLUDED.official_url
    RETURNING id INTO res_id;
    IF res_id IS NOT NULL AND cat_cloud IS NOT NULL THEN INSERT INTO public.resource_categories (resource_id, category_id) VALUES (res_id, cat_cloud) ON CONFLICT DO NOTHING; END IF;

    -- 4. Azure OpenAI Service
    INSERT INTO public.resources (platform_id, name, slug, description, official_url, is_published, featured, display_order, contributor_id, view_count, click_count, views_count, clicks_count)
    VALUES (ms_id, 'Azure OpenAI Service', 'azure-openai-service', 'Build enterprise-grade AI solutions and smart agents with direct access to advanced OpenAI GPT models on Azure infrastructure.', 'https://learn.microsoft.com/azure/ai-services/openai/', true, true, 4, 'studentamb_504640', 0, 0, 0, 0)
    ON CONFLICT (slug) DO UPDATE SET platform_id = EXCLUDED.platform_id, is_published = true, official_url = EXCLUDED.official_url
    RETURNING id INTO res_id;
    IF res_id IS NOT NULL AND cat_ai IS NOT NULL THEN INSERT INTO public.resource_categories (resource_id, category_id) VALUES (res_id, cat_ai) ON CONFLICT DO NOTHING; END IF;

    -- 5. Microsoft Learn AI Hub
    INSERT INTO public.resources (platform_id, name, slug, description, official_url, is_published, featured, display_order, contributor_id, view_count, click_count, views_count, clicks_count)
    VALUES (ms_id, 'Microsoft Learn AI Hub', 'microsoft-learn-ai', 'Comprehensive learning paths, hands-on tutorials, and official certifications covering AI engineering and Copilot technologies.', 'https://learn.microsoft.com/ai/', true, false, 5, 'studentamb_504640', 0, 0, 0, 0)
    ON CONFLICT (slug) DO UPDATE SET platform_id = EXCLUDED.platform_id, is_published = true, official_url = EXCLUDED.official_url
    RETURNING id INTO res_id;
    IF res_id IS NOT NULL AND cat_ai IS NOT NULL THEN INSERT INTO public.resource_categories (resource_id, category_id) VALUES (res_id, cat_ai) ON CONFLICT DO NOTHING; END IF;

    -- 6. Visual Studio Code
    INSERT INTO public.resources (platform_id, name, slug, description, official_url, is_published, featured, display_order, contributor_id, view_count, click_count, views_count, clicks_count)
    VALUES (ms_id, 'Visual Studio Code', 'visual-studio-code', 'The world-standard lightweight and powerful code editor with built-in Git, debugging, remote development, and extension ecosystem.', 'https://code.visualstudio.com/', true, false, 6, null, 0, 0, 0, 0)
    ON CONFLICT (slug) DO UPDATE SET platform_id = EXCLUDED.platform_id, is_published = true, official_url = EXCLUDED.official_url
    RETURNING id INTO res_id;
    IF res_id IS NOT NULL AND cat_dev IS NOT NULL THEN INSERT INTO public.resource_categories (resource_id, category_id) VALUES (res_id, cat_dev) ON CONFLICT DO NOTHING; END IF;
    IF res_id IS NOT NULL AND cat_prod IS NOT NULL THEN INSERT INTO public.resource_categories (resource_id, category_id) VALUES (res_id, cat_prod) ON CONFLICT DO NOTHING; END IF;
  END IF;

  -- AWS Resources
  IF aws_id IS NOT NULL THEN
    -- AWS Educate
    INSERT INTO public.resources (platform_id, name, slug, description, official_url, is_published, featured, display_order, view_count, click_count, views_count, clicks_count)
    VALUES (aws_id, 'AWS Educate', 'aws-educate', 'Free cloud learning content, training pathways, and AWS credits designed specifically for students aged 13+.', 'https://aws.amazon.com/education/awseducate/', true, true, 10, 0, 0, 0, 0)
    ON CONFLICT (slug) DO UPDATE SET platform_id = EXCLUDED.platform_id, is_published = true, official_url = EXCLUDED.official_url
    RETURNING id INTO res_id;
    IF res_id IS NOT NULL AND cat_student IS NOT NULL THEN INSERT INTO public.resource_categories (resource_id, category_id) VALUES (res_id, cat_student) ON CONFLICT DO NOTHING; END IF;
    IF res_id IS NOT NULL AND cat_cloud IS NOT NULL THEN INSERT INTO public.resource_categories (resource_id, category_id) VALUES (res_id, cat_cloud) ON CONFLICT DO NOTHING; END IF;

    -- AWS Skill Builder
    INSERT INTO public.resources (platform_id, name, slug, description, official_url, is_published, featured, display_order, view_count, click_count, views_count, clicks_count)
    VALUES (aws_id, 'AWS Skill Builder', 'aws-skill-builder', 'Over 600+ free digital courses, learning plans, and AWS certification prep for students and builders.', 'https://explore.skillbuilder.aws/', true, true, 11, 0, 0, 0, 0)
    ON CONFLICT (slug) DO UPDATE SET platform_id = EXCLUDED.platform_id, is_published = true, official_url = EXCLUDED.official_url
    RETURNING id INTO res_id;
    IF res_id IS NOT NULL AND cat_cloud IS NOT NULL THEN INSERT INTO public.resource_categories (resource_id, category_id) VALUES (res_id, cat_cloud) ON CONFLICT DO NOTHING; END IF;
    IF res_id IS NOT NULL AND cat_dev IS NOT NULL THEN INSERT INTO public.resource_categories (resource_id, category_id) VALUES (res_id, cat_dev) ON CONFLICT DO NOTHING; END IF;
    IF res_id IS NOT NULL AND cat_ai IS NOT NULL THEN INSERT INTO public.resource_categories (resource_id, category_id) VALUES (res_id, cat_ai) ON CONFLICT DO NOTHING; END IF;

    -- Amazon Q Developer
    INSERT INTO public.resources (platform_id, name, slug, description, official_url, is_published, featured, display_order, view_count, click_count, views_count, clicks_count)
    VALUES (aws_id, 'Amazon Q Developer', 'amazon-q-developer', 'Generative AI-powered conversational assistant to chat about code, build applications, and transform software faster.', 'https://aws.amazon.com/q/developer/', true, false, 12, 0, 0, 0, 0)
    ON CONFLICT (slug) DO UPDATE SET platform_id = EXCLUDED.platform_id, is_published = true, official_url = EXCLUDED.official_url
    RETURNING id INTO res_id;
    IF res_id IS NOT NULL AND cat_ai IS NOT NULL THEN INSERT INTO public.resource_categories (resource_id, category_id) VALUES (res_id, cat_ai) ON CONFLICT DO NOTHING; END IF;
    IF res_id IS NOT NULL AND cat_dev IS NOT NULL THEN INSERT INTO public.resource_categories (resource_id, category_id) VALUES (res_id, cat_dev) ON CONFLICT DO NOTHING; END IF;
    IF res_id IS NOT NULL AND cat_prod IS NOT NULL THEN INSERT INTO public.resource_categories (resource_id, category_id) VALUES (res_id, cat_prod) ON CONFLICT DO NOTHING; END IF;
  END IF;

  -- Google Cloud Resources
  IF gcp_id IS NOT NULL THEN
    -- Google Cloud Skills Boost
    INSERT INTO public.resources (platform_id, name, slug, description, official_url, is_published, featured, display_order, view_count, click_count, views_count, clicks_count)
    VALUES (gcp_id, 'Google Cloud Skills Boost', 'google-cloud-skills-boost', 'Interactive hands-on labs, role-based learning paths, and skill badges on Google Cloud infrastructure and technologies.', 'https://www.cloudskillsboost.google/', true, true, 20, 0, 0, 0, 0)
    ON CONFLICT (slug) DO UPDATE SET platform_id = EXCLUDED.platform_id, is_published = true, official_url = EXCLUDED.official_url
    RETURNING id INTO res_id;
    IF res_id IS NOT NULL AND cat_student IS NOT NULL THEN INSERT INTO public.resource_categories (resource_id, category_id) VALUES (res_id, cat_student) ON CONFLICT DO NOTHING; END IF;
    IF res_id IS NOT NULL AND cat_cloud IS NOT NULL THEN INSERT INTO public.resource_categories (resource_id, category_id) VALUES (res_id, cat_cloud) ON CONFLICT DO NOTHING; END IF;
    IF res_id IS NOT NULL AND cat_ai IS NOT NULL THEN INSERT INTO public.resource_categories (resource_id, category_id) VALUES (res_id, cat_ai) ON CONFLICT DO NOTHING; END IF;

    -- Google AI Studio & Gemini API
    INSERT INTO public.resources (platform_id, name, slug, description, official_url, is_published, featured, display_order, view_count, click_count, views_count, clicks_count)
    VALUES (gcp_id, 'Google AI Studio & Gemini API', 'google-ai-studio-gemini-api', 'The fastest way to prototype and experiment with Google multimodal Gemini models and get API keys for student projects.', 'https://aistudio.google.com/', true, true, 21, 0, 0, 0, 0)
    ON CONFLICT (slug) DO UPDATE SET platform_id = EXCLUDED.platform_id, is_published = true, official_url = EXCLUDED.official_url
    RETURNING id INTO res_id;
    IF res_id IS NOT NULL AND cat_ai IS NOT NULL THEN INSERT INTO public.resource_categories (resource_id, category_id) VALUES (res_id, cat_ai) ON CONFLICT DO NOTHING; END IF;
    IF res_id IS NOT NULL AND cat_dev IS NOT NULL THEN INSERT INTO public.resource_categories (resource_id, category_id) VALUES (res_id, cat_dev) ON CONFLICT DO NOTHING; END IF;

    -- Google for Developers — Student Programs
    INSERT INTO public.resources (platform_id, name, slug, description, official_url, is_published, featured, display_order, view_count, click_count, views_count, clicks_count)
    VALUES (gcp_id, 'Google for Developers — Student Programs', 'google-for-developers-student-programs', 'Join Google Developer Student Clubs, participate in the annual Solution Challenge, and connect with global student innovators.', 'https://developers.google.com/community/gdsc', true, false, 22, 0, 0, 0, 0)
    ON CONFLICT (slug) DO UPDATE SET platform_id = EXCLUDED.platform_id, is_published = true, official_url = EXCLUDED.official_url
    RETURNING id INTO res_id;
    IF res_id IS NOT NULL AND cat_student IS NOT NULL THEN INSERT INTO public.resource_categories (resource_id, category_id) VALUES (res_id, cat_student) ON CONFLICT DO NOTHING; END IF;
    IF res_id IS NOT NULL AND cat_dev IS NOT NULL THEN INSERT INTO public.resource_categories (resource_id, category_id) VALUES (res_id, cat_dev) ON CONFLICT DO NOTHING; END IF;
  END IF;

  -- Other Ecosystem Resources
  IF other_id IS NOT NULL THEN
    -- GitHub Student Developer Pack
    INSERT INTO public.resources (platform_id, name, slug, description, official_url, is_published, featured, display_order, view_count, click_count, views_count, clicks_count)
    VALUES (other_id, 'GitHub Student Developer Pack', 'github-student-developer-pack', 'Free access to the best developer tools, cloud platforms, domains, and developer services while enrolled as a student.', 'https://education.github.com/pack', true, true, 30, 0, 0, 0, 0)
    ON CONFLICT (slug) DO UPDATE SET platform_id = EXCLUDED.platform_id, is_published = true, official_url = EXCLUDED.official_url
    RETURNING id INTO res_id;
    IF res_id IS NOT NULL AND cat_student IS NOT NULL THEN INSERT INTO public.resource_categories (resource_id, category_id) VALUES (res_id, cat_student) ON CONFLICT DO NOTHING; END IF;
    IF res_id IS NOT NULL AND cat_dev IS NOT NULL THEN INSERT INTO public.resource_categories (resource_id, category_id) VALUES (res_id, cat_dev) ON CONFLICT DO NOTHING; END IF;
    IF res_id IS NOT NULL AND cat_prod IS NOT NULL THEN INSERT INTO public.resource_categories (resource_id, category_id) VALUES (res_id, cat_prod) ON CONFLICT DO NOTHING; END IF;

    -- GitHub Copilot for Students
    INSERT INTO public.resources (platform_id, name, slug, description, official_url, is_published, featured, display_order, view_count, click_count, views_count, clicks_count)
    VALUES (other_id, 'GitHub Copilot for Students', 'github-copilot-for-students', 'Free GitHub Copilot access for verified students to get code suggestions and accelerate learning across any programming language.', 'https://github.com/features/copilot', true, true, 31, 0, 0, 0, 0)
    ON CONFLICT (slug) DO UPDATE SET platform_id = EXCLUDED.platform_id, is_published = true, official_url = EXCLUDED.official_url
    RETURNING id INTO res_id;
    IF res_id IS NOT NULL AND cat_ai IS NOT NULL THEN INSERT INTO public.resource_categories (resource_id, category_id) VALUES (res_id, cat_ai) ON CONFLICT DO NOTHING; END IF;
    IF res_id IS NOT NULL AND cat_dev IS NOT NULL THEN INSERT INTO public.resource_categories (resource_id, category_id) VALUES (res_id, cat_dev) ON CONFLICT DO NOTHING; END IF;
    IF res_id IS NOT NULL AND cat_prod IS NOT NULL THEN INSERT INTO public.resource_categories (resource_id, category_id) VALUES (res_id, cat_prod) ON CONFLICT DO NOTHING; END IF;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 7. NOTIFY POSTGREST SCHEMA CACHE RELOAD
-- -----------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';

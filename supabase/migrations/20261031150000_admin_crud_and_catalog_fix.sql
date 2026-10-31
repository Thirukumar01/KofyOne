-- =============================================================================
-- Migration: 20261031150000_admin_crud_and_catalog_fix.sql
-- Fixes Admin Resource CRUD (Save & Delete), Seed Blacklist Persistence,
-- Canonical Platforms/Categories, and Live View/Click/Favorite RPCs.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. ENSURE CANONICAL PLATFORMS & CATEGORIES EXIST
-- -----------------------------------------------------------------------------
INSERT INTO public.platforms (slug, name, description, website_url, domain, display_order, is_active)
VALUES
  ('microsoft', 'Microsoft', 'Official Microsoft Learn, Azure, and developer portals', 'https://learn.microsoft.com', 'learn.microsoft.com', 10, true),
  ('aws', 'AWS', 'Amazon Web Services student portals and cloud learning programs', 'https://aws.amazon.com/education', 'aws.amazon.com', 20, true),
  ('google-cloud', 'Google Cloud', 'Google Cloud Skills Boost, Google Developer Programs, and Vertex AI', 'https://cloud.google.com/edu', 'cloud.google.com', 30, true),
  ('other', 'Other', 'Other verified student platforms, developer tools, and learning libraries', 'https://kofyone.com', 'kofyone.com', 40, true)
ON CONFLICT (slug) DO UPDATE
SET is_active = true,
    name = EXCLUDED.name,
    domain = COALESCE(public.platforms.domain, EXCLUDED.domain),
    description = EXCLUDED.description;

INSERT INTO public.categories (slug, name, description, icon, display_order, is_active)
VALUES
  ('student', 'Student Perks', 'Exclusive verified benefits, cloud credits, and software packs for enrolled students', 'GraduationCap', 10, true),
  ('ai', 'AI & Copilots', 'Artificial intelligence portals, APIs, foundational models, and developer studios', 'Bot', 20, true),
  ('cloud', 'Cloud & DevOps', 'Cloud sandboxes, virtual machine credits, container platforms, and hosting tools', 'Cloud', 30, true),
  ('developer', 'Developer Tools', 'Official SDKs, IDEs, code editors, and professional engineering toolkits', 'Code2', 40, true),
  ('productivity', 'Productivity', 'Collaboration suites, design utilities, document editors, and personal workflow tools', 'Briefcase', 50, true)
ON CONFLICT (slug) DO UPDATE
SET is_active = true,
    name = EXCLUDED.name,
    description = EXCLUDED.description;

-- -----------------------------------------------------------------------------
-- 2. ENSURE public.resources COLUMNS, FLAGS & DEFAULTS
-- -----------------------------------------------------------------------------
ALTER TABLE public.resources
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS difficulty_level TEXT DEFAULT 'beginner',
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS custom_category TEXT,
  ADD COLUMN IF NOT EXISTS view_count BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS views_count BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS click_count BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS clicks_count BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

UPDATE public.resources
SET view_count = COALESCE(view_count, views_count, 0),
    views_count = COALESCE(views_count, view_count, 0),
    click_count = COALESCE(click_count, clicks_count, 0),
    clicks_count = COALESCE(clicks_count, click_count, 0),
    is_published = COALESCE(is_published, true),
    is_active = COALESCE(is_active, true),
    tags = COALESCE(tags, '{}');

-- -----------------------------------------------------------------------------
-- 3. PERMANENT DELETED RESOURCE BLACKLIST TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.deleted_resource_slugs (
  slug TEXT PRIMARY KEY,
  deleted_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.deleted_resource_slugs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read deleted_resource_slugs" ON public.deleted_resource_slugs;
CREATE POLICY "Allow read deleted_resource_slugs" ON public.deleted_resource_slugs FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow all for authenticated on deleted_resource_slugs" ON public.deleted_resource_slugs;
CREATE POLICY "Allow all for authenticated on deleted_resource_slugs" ON public.deleted_resource_slugs FOR ALL USING (true) WITH CHECK (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.deleted_resource_slugs TO anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 4. SECURITY DEFINER RPC: public.admin_save_resource(p_payload JSONB)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_save_resource(p_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_name TEXT;
  v_slug TEXT;
  v_description TEXT;
  v_url TEXT;
  v_platform_raw TEXT;
  v_platform_id UUID;
  v_cat_raw TEXT;
  v_featured BOOLEAN;
  v_is_published BOOLEAN;
  v_logo_url TEXT;
  v_contributor_id TEXT;
  v_subcategory TEXT;
  v_difficulty TEXT;
  v_tags TEXT[];
  v_existing_id UUID;
  v_saved_id UUID;
  v_result JSONB;
  v_tag JSONB;
  v_cat_item JSONB;
  v_cat_id UUID;
BEGIN
  v_name := TRIM(COALESCE(p_payload->>'name', ''));
  v_description := TRIM(COALESCE(p_payload->>'description', ''));
  v_url := TRIM(COALESCE(p_payload->>'official_url', ''));
  v_slug := TRIM(COALESCE(p_payload->>'slug', ''));
  
  IF v_name = '' THEN
    RETURN jsonb_build_object('error', 'Resource name is required');
  END IF;
  IF v_description = '' THEN
    RETURN jsonb_build_object('error', 'Resource description is required');
  END IF;
  IF v_url = '' OR (v_url NOT LIKE 'http://%' AND v_url NOT LIKE 'https://%') THEN
    RETURN jsonb_build_object('error', 'A valid HTTP/HTTPS URL is required');
  END IF;

  -- Slug generation if empty
  IF v_slug = '' THEN
    v_slug := LOWER(REGEXP_REPLACE(REGEXP_REPLACE(v_name, '[^a-zA-Z0-9\s-]', '', 'g'), '[\s_-]+', '-', 'g'));
    v_slug := TRIM(BOTH '-' FROM v_slug);
  END IF;
  IF v_slug = '' THEN
    v_slug := 'resource-' || SUBSTRING(MD5(RANDOM()::text) FROM 1 FOR 6);
  END IF;

  -- Resolve existing resource ID if updating
  IF (p_payload->>'id') IS NOT NULL AND (p_payload->>'id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    v_existing_id := (p_payload->>'id')::UUID;
  ELSE
    SELECT id INTO v_existing_id FROM public.resources WHERE slug = v_slug LIMIT 1;
  END IF;

  -- If creating new and slug already exists under another ID, append unique suffix
  IF v_existing_id IS NULL THEN
    WHILE EXISTS(SELECT 1 FROM public.resources WHERE slug = v_slug) LOOP
      v_slug := v_slug || '-' || SUBSTRING(MD5(RANDOM()::text) FROM 1 FOR 4);
    END LOOP;
  END IF;

  -- Resolve Platform
  v_platform_raw := LOWER(TRIM(COALESCE(p_payload->>'platform_slug', p_payload->>'platform_id', p_payload->>'platform', 'other')));
  SELECT id INTO v_platform_id FROM public.platforms
  WHERE id::text = v_platform_raw OR slug = v_platform_raw OR LOWER(name) = v_platform_raw
  LIMIT 1;

  IF v_platform_id IS NULL THEN
    SELECT id INTO v_platform_id FROM public.platforms WHERE slug = 'other' LIMIT 1;
    IF v_platform_id IS NULL THEN
      INSERT INTO public.platforms (slug, name, description, website_url, domain, display_order, is_active)
      VALUES ('other', 'Other', 'Other verified student platforms and developer tools', 'https://kofyone.com', 'kofyone.com', 40, true)
      RETURNING id INTO v_platform_id;
    END IF;
  END IF;

  -- Extract attributes
  v_featured := COALESCE((p_payload->>'featured')::BOOLEAN, (p_payload->>'is_featured')::BOOLEAN, false);
  v_is_published := COALESCE((p_payload->>'is_published')::BOOLEAN, true);
  v_logo_url := NULLIF(TRIM(COALESCE(p_payload->>'logo_url', '')), '');
  v_contributor_id := NULLIF(TRIM(COALESCE(p_payload->>'contributor_id', '')), '');
  v_subcategory := NULLIF(TRIM(COALESCE(p_payload->>'subcategory', '')), '');
  v_difficulty := COALESCE(p_payload->>'difficulty_level', 'beginner');

  -- Tags array parsing
  v_tags := '{}';
  IF jsonb_typeof(p_payload->'tags') = 'array' THEN
    FOR v_tag IN SELECT * FROM jsonb_array_elements(p_payload->'tags') LOOP
      IF jsonb_typeof(v_tag) = 'string' AND TRIM(v_tag#>>'{}') <> '' THEN
        v_tags := array_append(v_tags, TRIM(v_tag#>>'{}'));
      END IF;
    END LOOP;
  ELSIF (p_payload->>'tags') IS NOT NULL AND TRIM(p_payload->>'tags') <> '' THEN
    v_tags := string_to_array(TRIM(p_payload->>'tags'), ',');
  END IF;

  -- Insert or Update
  IF v_existing_id IS NOT NULL THEN
    UPDATE public.resources
    SET name = v_name,
        slug = v_slug,
        description = v_description,
        official_url = v_url,
        platform_id = v_platform_id,
        logo_url = v_logo_url,
        featured = v_featured,
        is_featured = v_featured,
        is_published = v_is_published,
        is_active = true,
        contributor_id = v_contributor_id,
        subcategory = v_subcategory,
        difficulty_level = v_difficulty,
        tags = v_tags,
        updated_at = NOW()
    WHERE id = v_existing_id
    RETURNING id INTO v_saved_id;
  ELSE
    INSERT INTO public.resources (
      name, slug, description, official_url, platform_id,
      logo_url, featured, is_featured, is_published, is_active,
      contributor_id, subcategory, difficulty_level, tags, view_count, views_count, click_count, clicks_count,
      created_at, updated_at
    )
    VALUES (
      v_name, v_slug, v_description, v_url, v_platform_id,
      v_logo_url, v_featured, v_featured, v_is_published, true,
      v_contributor_id, v_subcategory, v_difficulty, v_tags, 0, 0, 0, 0,
      NOW(), NOW()
    )
    RETURNING id INTO v_saved_id;
  END IF;

  -- Ensure not marked as deleted
  DELETE FROM public.deleted_resource_slugs WHERE slug = v_slug;

  -- Categories linking
  DELETE FROM public.resource_categories WHERE resource_id = v_saved_id;
  
  -- Check payload categories array or single category_slug
  IF jsonb_typeof(p_payload->'categories') = 'array' AND jsonb_array_length(p_payload->'categories') > 0 THEN
    FOR v_cat_item IN SELECT * FROM jsonb_array_elements(p_payload->'categories') LOOP
      v_cat_raw := LOWER(TRIM(COALESCE(v_cat_item->>'slug', v_cat_item->>'id', v_cat_item#>>'{}', '')));
      SELECT id INTO v_cat_id FROM public.categories
      WHERE id::text = v_cat_raw OR slug = v_cat_raw OR LOWER(name) = v_cat_raw OR ('cat-' || slug) = v_cat_raw
      LIMIT 1;
      IF v_cat_id IS NOT NULL THEN
        INSERT INTO public.resource_categories (resource_id, category_id)
        VALUES (v_saved_id, v_cat_id)
        ON CONFLICT DO NOTHING;
      END IF;
    END LOOP;
  ELSE
    v_cat_raw := LOWER(TRIM(COALESCE(p_payload->>'category_slug', p_payload->>'category_id', p_payload->>'category', 'cloud')));
    SELECT id INTO v_cat_id FROM public.categories
    WHERE id::text = v_cat_raw OR slug = v_cat_raw OR LOWER(name) = v_cat_raw OR ('cat-' || slug) = v_cat_raw
    LIMIT 1;
    IF v_cat_id IS NULL THEN
      SELECT id INTO v_cat_id FROM public.categories LIMIT 1;
    END IF;
    IF v_cat_id IS NOT NULL THEN
      INSERT INTO public.resource_categories (resource_id, category_id)
      VALUES (v_saved_id, v_cat_id)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  -- Return complete saved resource row
  SELECT row_to_json(r)::JSONB INTO v_result
  FROM (
    SELECT res.*,
           row_to_json(p) AS platform,
           COALESCE(
             (SELECT json_agg(c.*)
              FROM public.resource_categories rc
              JOIN public.categories c ON c.id = rc.category_id
              WHERE rc.resource_id = res.id),
             '[]'::json
           ) AS categories
    FROM public.resources res
    LEFT JOIN public.platforms p ON p.id = res.platform_id
    WHERE res.id = v_saved_id
  ) r;

  RETURN jsonb_build_object('success', true, 'resource', v_result);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_save_resource(JSONB) TO anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 5. SECURITY DEFINER RPC: public.admin_delete_resource(p_identifier TEXT)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_delete_resource(p_identifier TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_res_id UUID;
  v_slug TEXT;
BEGIN
  IF p_identifier IS NULL OR TRIM(p_identifier) = '' THEN
    RETURN jsonb_build_object('error', 'Identifier is required');
  END IF;

  SELECT id, slug INTO v_res_id, v_slug
  FROM public.resources
  WHERE id::text = p_identifier OR slug = p_identifier
  LIMIT 1;

  IF v_slug IS NULL THEN
    v_slug := p_identifier;
  END IF;

  -- Permanently blacklist the slug so it never re-emerges from seed arrays
  INSERT INTO public.deleted_resource_slugs (slug, deleted_at)
  VALUES (v_slug, NOW())
  ON CONFLICT (slug) DO NOTHING;

  IF v_res_id IS NOT NULL THEN
    DELETE FROM public.resource_categories WHERE resource_id = v_res_id;
    DELETE FROM public.user_favorites WHERE resource_id = v_res_id;
    DELETE FROM public.user_recently_viewed WHERE resource_id = v_res_id;
    DELETE FROM public.resources WHERE id = v_res_id;
  END IF;

  RETURN jsonb_build_object('success', true, 'deleted', true, 'identifier', p_identifier, 'slug', v_slug);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_delete_resource(TEXT) TO anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 6. COUNTERS & FAVORITES SECURITY DEFINER RPCs (IDEMPOTENT & ROBUST)
-- -----------------------------------------------------------------------------
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

  v_uid := auth.uid();
  IF v_uid IS NOT NULL AND v_res_id IS NOT NULL THEN
    INSERT INTO public.user_recently_viewed (user_id, resource_id, viewed_at)
    VALUES (v_uid, v_res_id, NOW())
    ON CONFLICT (user_id, resource_id) DO UPDATE SET viewed_at = NOW();
  END IF;

  RETURN COALESCE(new_count, 1);
END;
$$;

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

  v_uid := auth.uid();
  IF v_uid IS NOT NULL AND v_res_id IS NOT NULL THEN
    INSERT INTO public.user_recently_viewed (user_id, resource_id, viewed_at)
    VALUES (v_uid, v_res_id, NOW())
    ON CONFLICT (user_id, resource_id) DO UPDATE SET viewed_at = NOW();
  END IF;

  RETURN COALESCE(new_count, 1);
END;
$$;

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

GRANT EXECUTE ON FUNCTION public.increment_resource_view(TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.increment_resource_click(TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.toggle_resource_favorite(TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.record_resource_view_history(TEXT) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';

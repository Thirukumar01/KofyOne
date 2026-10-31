-- =============================================================================
-- Migration: 20261031180000_admin_full_control_existing_resources.sql
-- Enables full admin CRUD over pre-existing resources, platforms, and categories.
-- Guarantees deleted items never resurrect from hardcoded seed arrays.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. TOMBSTONE TABLE: public.deleted_catalog_items
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.deleted_catalog_items (
  item_type TEXT NOT NULL, -- 'resource', 'platform', 'category'
  identifier TEXT NOT NULL, -- slug or id
  deleted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (item_type, identifier)
);

ALTER TABLE public.deleted_catalog_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read deleted_catalog_items" ON public.deleted_catalog_items;
CREATE POLICY "Public read deleted_catalog_items" ON public.deleted_catalog_items FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow all for authenticated on deleted_catalog_items" ON public.deleted_catalog_items;
CREATE POLICY "Allow all for authenticated on deleted_catalog_items" ON public.deleted_catalog_items FOR ALL USING (true) WITH CHECK (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.deleted_catalog_items TO anon, authenticated, service_role;

-- Synchronize with existing deleted_resource_slugs
INSERT INTO public.deleted_catalog_items (item_type, identifier, deleted_at)
SELECT 'resource', slug, deleted_at FROM public.deleted_resource_slugs
ON CONFLICT (item_type, identifier) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 2. CASCADE ON DELETE CONSTRAINTS
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  -- resource_categories -> resources
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'resource_categories_resource_id_fkey') THEN
    ALTER TABLE public.resource_categories DROP CONSTRAINT resource_categories_resource_id_fkey;
  END IF;
  ALTER TABLE public.resource_categories
    ADD CONSTRAINT resource_categories_resource_id_fkey
    FOREIGN KEY (resource_id) REFERENCES public.resources(id) ON DELETE CASCADE;

  -- user_favorites -> resources
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_favorites_resource_id_fkey') THEN
    ALTER TABLE public.user_favorites DROP CONSTRAINT user_favorites_resource_id_fkey;
  END IF;
  ALTER TABLE public.user_favorites
    ADD CONSTRAINT user_favorites_resource_id_fkey
    FOREIGN KEY (resource_id) REFERENCES public.resources(id) ON DELETE CASCADE;

  -- user_recently_viewed -> resources
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_recently_viewed_resource_id_fkey') THEN
    ALTER TABLE public.user_recently_viewed DROP CONSTRAINT user_recently_viewed_resource_id_fkey;
  END IF;
  ALTER TABLE public.user_recently_viewed
    ADD CONSTRAINT user_recently_viewed_resource_id_fkey
    FOREIGN KEY (resource_id) REFERENCES public.resources(id) ON DELETE CASCADE;
END $$;

-- -----------------------------------------------------------------------------
-- 3. UPGRADE public.admin_save_resource(p_payload JSONB)
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
  v_orig_slug TEXT;
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
  v_orig_slug := NULLIF(TRIM(COALESCE(p_payload->>'original_slug', '')), '');
  
  IF v_name = '' THEN
    RETURN jsonb_build_object('error', 'Resource name is required');
  END IF;
  IF v_description = '' THEN
    RETURN jsonb_build_object('error', 'Resource description is required');
  END IF;
  IF v_url = '' OR (v_url NOT LIKE 'http://%' AND v_url NOT LIKE 'https://%') THEN
    RETURN jsonb_build_object('error', 'A valid HTTP/HTTPS URL is required');
  END IF;

  -- Auto-generate slug if empty
  IF v_slug = '' THEN
    v_slug := LOWER(REGEXP_REPLACE(REGEXP_REPLACE(v_name, '[^a-zA-Z0-9\s-]', '', 'g'), '[\s_-]+', '-', 'g'));
    v_slug := TRIM(BOTH '-' FROM v_slug);
  END IF;
  IF v_slug = '' THEN
    v_slug := 'resource-' || SUBSTRING(MD5(RANDOM()::text) FROM 1 FOR 6);
  END IF;

  -- 1. Find existing resource by UUID, original_slug, or current slug
  IF (p_payload->>'id') IS NOT NULL AND (p_payload->>'id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    SELECT id INTO v_existing_id FROM public.resources WHERE id = (p_payload->>'id')::UUID LIMIT 1;
  END IF;

  IF v_existing_id IS NULL AND v_orig_slug IS NOT NULL THEN
    SELECT id INTO v_existing_id FROM public.resources WHERE slug = v_orig_slug LIMIT 1;
  END IF;

  IF v_existing_id IS NULL THEN
    SELECT id INTO v_existing_id FROM public.resources WHERE slug = v_slug LIMIT 1;
  END IF;

  -- If slug is changing from original_slug, tombstone the old slug so seed arrays don't re-inject it!
  IF v_orig_slug IS NOT NULL AND v_orig_slug <> v_slug THEN
    INSERT INTO public.deleted_catalog_items (item_type, identifier, deleted_at)
    VALUES ('resource', v_orig_slug, NOW())
    ON CONFLICT (item_type, identifier) DO NOTHING;

    INSERT INTO public.deleted_resource_slugs (slug, deleted_at)
    VALUES (v_orig_slug, NOW())
    ON CONFLICT (slug) DO NOTHING;
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

  -- Ensure active item is not tombstoned
  DELETE FROM public.deleted_catalog_items WHERE item_type = 'resource' AND (identifier = v_slug OR identifier = v_saved_id::text);
  DELETE FROM public.deleted_resource_slugs WHERE slug = v_slug;

  -- Update categories
  DELETE FROM public.resource_categories WHERE resource_id = v_saved_id;
  
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

  -- Return saved resource
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
-- 4. UPGRADE public.admin_delete_resource(p_identifier TEXT)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_delete_resource(p_identifier TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_single_iden TEXT;
  v_res_id UUID;
  v_slug TEXT;
  v_deleted_count INT := 0;
  v_idens TEXT[];
BEGIN
  IF p_identifier IS NULL OR TRIM(p_identifier) = '' THEN
    RETURN jsonb_build_object('error', 'Identifier is required');
  END IF;

  -- Check if JSON array or comma separated
  IF p_identifier LIKE '[%' THEN
    SELECT array_agg(value#>>'{}') INTO v_idens FROM jsonb_array_elements(p_identifier::JSONB);
  ELSIF POSITION(',' IN p_identifier) > 0 THEN
    v_idens := string_to_array(p_identifier, ',');
  ELSE
    v_idens := ARRAY[p_identifier];
  END IF;

  FOREACH v_single_iden IN ARRAY v_idens LOOP
    v_single_iden := TRIM(v_single_iden);
    IF v_single_iden <> '' THEN
      -- Find matching row in public.resources
      SELECT id, slug INTO v_res_id, v_slug
      FROM public.resources
      WHERE id::text = v_single_iden OR slug = v_single_iden
      LIMIT 1;

      -- Tombstone the raw identifier, the slug, and the UUID
      INSERT INTO public.deleted_catalog_items (item_type, identifier, deleted_at)
      VALUES ('resource', v_single_iden, NOW())
      ON CONFLICT (item_type, identifier) DO NOTHING;

      INSERT INTO public.deleted_resource_slugs (slug, deleted_at)
      VALUES (v_single_iden, NOW())
      ON CONFLICT (slug) DO NOTHING;

      IF v_slug IS NOT NULL AND v_slug <> v_single_iden THEN
        INSERT INTO public.deleted_catalog_items (item_type, identifier, deleted_at)
        VALUES ('resource', v_slug, NOW())
        ON CONFLICT (item_type, identifier) DO NOTHING;

        INSERT INTO public.deleted_resource_slugs (slug, deleted_at)
        VALUES (v_slug, NOW())
        ON CONFLICT (slug) DO NOTHING;
      END IF;

      IF v_res_id IS NOT NULL THEN
        INSERT INTO public.deleted_catalog_items (item_type, identifier, deleted_at)
        VALUES ('resource', v_res_id::text, NOW())
        ON CONFLICT (item_type, identifier) DO NOTHING;

        DELETE FROM public.resources WHERE id = v_res_id;
        v_deleted_count := v_deleted_count + 1;
      END IF;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'deleted', true,
    'deleted_count', v_deleted_count,
    'identifier', p_identifier
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_delete_resource(TEXT) TO anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 5. ADMIN PLATFORMS RPCs: admin_save_platform & admin_delete_platform
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_save_platform(p_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_name TEXT;
  v_slug TEXT;
  v_orig_slug TEXT;
  v_description TEXT;
  v_website_url TEXT;
  v_domain TEXT;
  v_is_active BOOLEAN;
  v_display_order INT;
  v_existing_id UUID;
  v_saved_id UUID;
  v_result JSONB;
BEGIN
  v_name := TRIM(COALESCE(p_payload->>'name', ''));
  v_slug := TRIM(COALESCE(p_payload->>'slug', ''));
  v_orig_slug := NULLIF(TRIM(COALESCE(p_payload->>'original_slug', '')), '');
  v_description := TRIM(COALESCE(p_payload->>'description', ''));
  v_website_url := TRIM(COALESCE(p_payload->>'website_url', ''));
  v_domain := TRIM(COALESCE(p_payload->>'domain', ''));
  v_is_active := COALESCE((p_payload->>'is_active')::BOOLEAN, true);
  v_display_order := COALESCE((p_payload->>'display_order')::INT, 10);

  IF v_name = '' THEN
    RETURN jsonb_build_object('error', 'Platform name is required');
  END IF;

  IF v_slug = '' THEN
    v_slug := LOWER(REGEXP_REPLACE(REGEXP_REPLACE(v_name, '[^a-zA-Z0-9\s-]', '', 'g'), '[\s_-]+', '-', 'g'));
    v_slug := TRIM(BOTH '-' FROM v_slug);
  END IF;

  IF v_domain = '' AND v_website_url <> '' THEN
    v_domain := SUBSTRING(v_website_url FROM 'https?://([^/:]+)');
  END IF;
  IF v_domain = '' OR v_domain IS NULL THEN
    v_domain := v_slug || '.com';
  END IF;

  -- Find existing platform by ID, original_slug, or slug
  IF (p_payload->>'id') IS NOT NULL AND (p_payload->>'id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    SELECT id INTO v_existing_id FROM public.platforms WHERE id = (p_payload->>'id')::UUID LIMIT 1;
  END IF;

  IF v_existing_id IS NULL AND v_orig_slug IS NOT NULL THEN
    SELECT id INTO v_existing_id FROM public.platforms WHERE slug = v_orig_slug LIMIT 1;
  END IF;

  IF v_existing_id IS NULL THEN
    SELECT id INTO v_existing_id FROM public.platforms WHERE slug = v_slug LIMIT 1;
  END IF;

  IF v_orig_slug IS NOT NULL AND v_orig_slug <> v_slug THEN
    INSERT INTO public.deleted_catalog_items (item_type, identifier, deleted_at)
    VALUES ('platform', v_orig_slug, NOW())
    ON CONFLICT (item_type, identifier) DO NOTHING;
  END IF;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.platforms
    SET name = v_name,
        slug = v_slug,
        description = v_description,
        website_url = v_website_url,
        domain = v_domain,
        is_active = v_is_active,
        display_order = v_display_order
    WHERE id = v_existing_id
    RETURNING id INTO v_saved_id;
  ELSE
    INSERT INTO public.platforms (name, slug, description, website_url, domain, is_active, display_order)
    VALUES (v_name, v_slug, v_description, v_website_url, v_domain, v_is_active, v_display_order)
    RETURNING id INTO v_saved_id;
  END IF;

  -- Untombstone
  DELETE FROM public.deleted_catalog_items WHERE item_type = 'platform' AND (identifier = v_slug OR identifier = v_saved_id::text);

  SELECT row_to_json(p)::JSONB INTO v_result FROM public.platforms p WHERE p.id = v_saved_id;
  RETURN jsonb_build_object('success', true, 'platform', v_result);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_platform(p_identifier TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_plat_id UUID;
  v_slug TEXT;
  v_fallback_id UUID;
BEGIN
  IF p_identifier IS NULL OR TRIM(p_identifier) = '' THEN
    RETURN jsonb_build_object('error', 'Identifier is required');
  END IF;

  SELECT id, slug INTO v_plat_id, v_slug
  FROM public.platforms
  WHERE id::text = p_identifier OR slug = p_identifier
  LIMIT 1;

  IF v_slug IS NULL THEN
    v_slug := p_identifier;
  END IF;

  -- Tombstone platform
  INSERT INTO public.deleted_catalog_items (item_type, identifier, deleted_at)
  VALUES ('platform', p_identifier, NOW())
  ON CONFLICT (item_type, identifier) DO NOTHING;

  IF v_slug <> p_identifier THEN
    INSERT INTO public.deleted_catalog_items (item_type, identifier, deleted_at)
    VALUES ('platform', v_slug, NOW())
    ON CONFLICT (item_type, identifier) DO NOTHING;
  END IF;

  -- Reassign dependent resources to 'other' platform before delete
  SELECT id INTO v_fallback_id FROM public.platforms WHERE slug = 'other' AND id <> v_plat_id LIMIT 1;
  IF v_plat_id IS NOT NULL THEN
    IF v_fallback_id IS NOT NULL THEN
      UPDATE public.resources SET platform_id = v_fallback_id WHERE platform_id = v_plat_id;
    END IF;
    DELETE FROM public.platforms WHERE id = v_plat_id;
  END IF;

  RETURN jsonb_build_object('success', true, 'deleted', true, 'identifier', p_identifier);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_save_platform(JSONB) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_delete_platform(TEXT) TO anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 6. ADMIN CATEGORIES RPCs: admin_save_category & admin_delete_category
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_save_category(p_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_name TEXT;
  v_slug TEXT;
  v_orig_slug TEXT;
  v_description TEXT;
  v_icon TEXT;
  v_is_active BOOLEAN;
  v_display_order INT;
  v_existing_id UUID;
  v_saved_id UUID;
  v_result JSONB;
BEGIN
  v_name := TRIM(COALESCE(p_payload->>'name', ''));
  v_slug := TRIM(COALESCE(p_payload->>'slug', ''));
  v_orig_slug := NULLIF(TRIM(COALESCE(p_payload->>'original_slug', '')), '');
  v_description := TRIM(COALESCE(p_payload->>'description', ''));
  v_icon := TRIM(COALESCE(p_payload->>'icon', 'FolderTree'));
  v_is_active := COALESCE((p_payload->>'is_active')::BOOLEAN, true);
  v_display_order := COALESCE((p_payload->>'display_order')::INT, 10);

  IF v_name = '' THEN
    RETURN jsonb_build_object('error', 'Category name is required');
  END IF;

  IF v_slug = '' THEN
    v_slug := LOWER(REGEXP_REPLACE(REGEXP_REPLACE(v_name, '[^a-zA-Z0-9\s-]', '', 'g'), '[\s_-]+', '-', 'g'));
    v_slug := TRIM(BOTH '-' FROM v_slug);
  END IF;

  -- Find existing category by ID, original_slug, or slug
  IF (p_payload->>'id') IS NOT NULL AND (p_payload->>'id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    SELECT id INTO v_existing_id FROM public.categories WHERE id = (p_payload->>'id')::UUID LIMIT 1;
  END IF;

  IF v_existing_id IS NULL AND v_orig_slug IS NOT NULL THEN
    SELECT id INTO v_existing_id FROM public.categories WHERE slug = v_orig_slug LIMIT 1;
  END IF;

  IF v_existing_id IS NULL THEN
    SELECT id INTO v_existing_id FROM public.categories WHERE slug = v_slug LIMIT 1;
  END IF;

  IF v_orig_slug IS NOT NULL AND v_orig_slug <> v_slug THEN
    INSERT INTO public.deleted_catalog_items (item_type, identifier, deleted_at)
    VALUES ('category', v_orig_slug, NOW())
    ON CONFLICT (item_type, identifier) DO NOTHING;
  END IF;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.categories
    SET name = v_name,
        slug = v_slug,
        description = v_description,
        icon = v_icon,
        is_active = v_is_active,
        display_order = v_display_order
    WHERE id = v_existing_id
    RETURNING id INTO v_saved_id;
  ELSE
    INSERT INTO public.categories (name, slug, description, icon, is_active, display_order)
    VALUES (v_name, v_slug, v_description, v_icon, v_is_active, v_display_order)
    RETURNING id INTO v_saved_id;
  END IF;

  -- Untombstone
  DELETE FROM public.deleted_catalog_items WHERE item_type = 'category' AND (identifier = v_slug OR identifier = v_saved_id::text);

  SELECT row_to_json(c)::JSONB INTO v_result FROM public.categories c WHERE c.id = v_saved_id;
  RETURN jsonb_build_object('success', true, 'category', v_result);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_category(p_identifier TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_cat_id UUID;
  v_slug TEXT;
BEGIN
  IF p_identifier IS NULL OR TRIM(p_identifier) = '' THEN
    RETURN jsonb_build_object('error', 'Identifier is required');
  END IF;

  SELECT id, slug INTO v_cat_id, v_slug
  FROM public.categories
  WHERE id::text = p_identifier OR slug = p_identifier
  LIMIT 1;

  IF v_slug IS NULL THEN
    v_slug := p_identifier;
  END IF;

  -- Tombstone category
  INSERT INTO public.deleted_catalog_items (item_type, identifier, deleted_at)
  VALUES ('category', p_identifier, NOW())
  ON CONFLICT (item_type, identifier) DO NOTHING;

  IF v_slug <> p_identifier THEN
    INSERT INTO public.deleted_catalog_items (item_type, identifier, deleted_at)
    VALUES ('category', v_slug, NOW())
    ON CONFLICT (item_type, identifier) DO NOTHING;
  END IF;

  IF v_cat_id IS NOT NULL THEN
    DELETE FROM public.resource_categories WHERE category_id = v_cat_id;
    DELETE FROM public.categories WHERE id = v_cat_id;
  END IF;

  RETURN jsonb_build_object('success', true, 'deleted', true, 'identifier', p_identifier);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_save_category(JSONB) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_delete_category(TEXT) TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';

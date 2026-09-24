-- =============================================================================
-- KofyOne — Phase 0 Initial Database Schema Migration
-- Database: PostgreSQL (Supabase)
-- Engine: Extensions, Core Tables, RLS, Indexes, and Full-Text Search
-- =============================================================================

-- Enable UUID and text search extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- -----------------------------------------------------------------------------
-- 1. PLATFORMS TABLE (Generic platform entity)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.platforms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    logo_url TEXT,
    website_url TEXT NOT NULL,
    domain VARCHAR(255) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 2. TRACKING CONFIGS TABLE (Contributor/Referral Campaign Attribution)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tracking_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform_id UUID NOT NULL REFERENCES public.platforms(id) ON DELETE CASCADE,
    tracking_parameter VARCHAR(100) NOT NULL,
    tracking_value VARCHAR(255) NOT NULL,
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 3. CATEGORIES TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    icon VARCHAR(100),
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 4. RESOURCES TABLE (Educational & Developer Resource Assets)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform_id UUID NOT NULL REFERENCES public.platforms(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description TEXT NOT NULL,
    official_url TEXT NOT NULL,
    logo_url TEXT,
    featured BOOLEAN NOT NULL DEFAULT false,
    is_published BOOLEAN NOT NULL DEFAULT true,
    display_order INTEGER NOT NULL DEFAULT 0,
    tracking_config_id UUID REFERENCES public.tracking_configs(id) ON DELETE SET NULL,
    view_count BIGINT NOT NULL DEFAULT 0,
    click_count BIGINT NOT NULL DEFAULT 0,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    search_vector TSVECTOR GENERATED ALWAYS AS (
        setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(description, '')), 'B')
    ) STORED,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 5. RESOURCE_CATEGORIES JOIN TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.resource_categories (
    resource_id UUID NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (resource_id, category_id)
);

-- -----------------------------------------------------------------------------
-- 6. USER FAVORITES TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    resource_id UUID NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, resource_id)
);

-- -----------------------------------------------------------------------------
-- 7. USER RECENTLY VIEWED TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_recently_viewed (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    resource_id UUID NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
    viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, resource_id)
);

-- -----------------------------------------------------------------------------
-- 8. AUDIT LOGS TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id VARCHAR(255) NOT NULL,
    changes JSONB NOT NULL DEFAULT '{}'::jsonb,
    ip_address INET,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- INDEXES FOR PERFORMANCE & SEARCH
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_platforms_slug ON public.platforms(slug);
CREATE INDEX IF NOT EXISTS idx_platforms_is_active ON public.platforms(is_active);
CREATE INDEX IF NOT EXISTS idx_tracking_configs_platform ON public.tracking_configs(platform_id);
CREATE INDEX IF NOT EXISTS idx_resources_platform ON public.resources(platform_id);
CREATE INDEX IF NOT EXISTS idx_resources_slug ON public.resources(slug);
CREATE INDEX IF NOT EXISTS idx_resources_featured ON public.resources(featured) WHERE featured = true;
CREATE INDEX IF NOT EXISTS idx_resources_published ON public.resources(is_published);
CREATE INDEX IF NOT EXISTS idx_resources_search_vector ON public.resources USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_user_favorites_user ON public.user_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_user_recently_viewed_user ON public.user_recently_viewed(user_id);

-- -----------------------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) POLICIES
-- -----------------------------------------------------------------------------
ALTER TABLE public.platforms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracking_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_recently_viewed ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Platforms RLS: Anyone can read active platforms; only service role / admins modify
CREATE POLICY "Public can view active platforms"
    ON public.platforms FOR SELECT
    USING (is_active = true);

-- Tracking Configs RLS: Anyone can read enabled configs for URL decoration
CREATE POLICY "Public can view active tracking configs"
    ON public.tracking_configs FOR SELECT
    USING (is_enabled = true);

-- Categories RLS: Anyone can view active categories
CREATE POLICY "Public can view active categories"
    ON public.categories FOR SELECT
    USING (is_active = true);

-- Resources RLS: Anyone can view published resources
CREATE POLICY "Public can view published resources"
    ON public.resources FOR SELECT
    USING (is_published = true);

-- Resource Categories RLS: Public read
CREATE POLICY "Public can view resource categories"
    ON public.resource_categories FOR SELECT
    USING (true);

-- User Favorites RLS: Users can read and manage their own favorites
CREATE POLICY "Users can manage their own favorites"
    ON public.user_favorites FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- User Recently Viewed RLS: Users can read and record their own views
CREATE POLICY "Users can manage their recently viewed"
    ON public.user_recently_viewed FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Audit Logs RLS: Only admins or service role can view audit logs
CREATE POLICY "Admins can view audit logs"
    ON public.audit_logs FOR SELECT
    USING (auth.jwt() ->> 'role' = 'admin');

-- -----------------------------------------------------------------------------
-- POSTGRESQL FULL-TEXT SEARCH STORED FUNCTION
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.search_resources(
    search_term TEXT,
    filter_platform_id UUID DEFAULT NULL,
    filter_category_id UUID DEFAULT NULL,
    result_limit INTEGER DEFAULT 20,
    result_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    platform_id UUID,
    name VARCHAR,
    slug VARCHAR,
    description TEXT,
    official_url TEXT,
    logo_url TEXT,
    featured BOOLEAN,
    is_published BOOLEAN,
    display_order INTEGER,
    tracking_config_id UUID,
    view_count BIGINT,
    click_count BIGINT,
    metadata JSONB,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    rank REAL
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        r.id,
        r.platform_id,
        r.name,
        r.slug,
        r.description,
        r.official_url,
        r.logo_url,
        r.featured,
        r.is_published,
        r.display_order,
        r.tracking_config_id,
        r.view_count,
        r.click_count,
        r.metadata,
        r.created_at,
        r.updated_at,
        ts_rank(r.search_vector, plainto_tsquery('english', search_term)) AS rank
    FROM public.resources r
    LEFT JOIN public.resource_categories rc ON r.id = rc.resource_id
    WHERE
        r.is_published = true
        AND (search_term = '' OR r.search_vector @@ plainto_tsquery('english', search_term))
        AND (filter_platform_id IS NULL OR r.platform_id = filter_platform_id)
        AND (filter_category_id IS NULL OR rc.category_id = filter_category_id)
    GROUP BY r.id
    ORDER BY rank DESC, r.featured DESC, r.display_order ASC, r.created_at DESC
    LIMIT result_limit
    OFFSET result_offset;
END;
$$;

-- -----------------------------------------------------------------------------
-- SEED DATA (Microsoft Ecosystem First Scope)
-- -----------------------------------------------------------------------------
DO $$
DECLARE
    ms_platform_id UUID;
BEGIN
    -- 1. Insert Microsoft Platform if not existing
    INSERT INTO public.platforms (
        name, slug, description, website_url, domain, is_active, display_order
    ) VALUES (
        'Microsoft',
        'microsoft',
        'Official Microsoft student programs, developer certifications, Azure cloud sandbox, and AI development resources.',
        'https://learn.microsoft.com',
        'microsoft.com',
        true,
        1
    )
    ON CONFLICT (slug) DO UPDATE SET updated_at = NOW()
    RETURNING id INTO ms_platform_id;

    -- 2. Insert Default Tracking Config for Microsoft
    -- Parameter: wt.mc_id, Value: studentamb_504640 (Editable via Admin Portal)
    IF ms_platform_id IS NOT NULL THEN
        INSERT INTO public.tracking_configs (
            platform_id, tracking_parameter, tracking_value, is_enabled
        ) VALUES (
            ms_platform_id,
            'wt.mc_id',
            'studentamb_504640',
            true
        )
        ON CONFLICT DO NOTHING;
    END IF;

    -- 3. Insert Initial Categories
    INSERT INTO public.categories (name, slug, description, display_order)
    VALUES
        ('Student Programs', 'student-programs', 'Official student benefits, ambassador opportunities, and grants', 1),
        ('Cloud & Azure', 'cloud-azure', 'Cloud computing credits, sandboxes, and hands-on labs', 2),
        ('Certifications', 'certifications', 'Free certification vouchers, practice assessments, and curriculum', 3),
        ('AI & Copilot', 'ai-copilot', 'Generative AI tools, Copilot learning modules, and OpenAI services', 4),
        ('Developer Tools', 'developer-tools', 'Free developer licenses, GitHub student packs, and IDE tools', 5)
    ON CONFLICT (slug) DO NOTHING;
END $$;

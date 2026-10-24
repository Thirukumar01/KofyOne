-- ==============================================================================
-- KofyOne — Multi-Provider Ecosystem, Admin Branding & CMS Storage Migration
-- Migration: 20261023000000_multi_provider_branding_cms.sql
-- ==============================================================================

-- -----------------------------------------------------------------------------
-- 1. Multi-Provider Expansion (Microsoft, AWS, Google, Other)
-- -----------------------------------------------------------------------------
INSERT INTO public.platforms (
    name, slug, description, website_url, domain, is_active, display_order
) VALUES
    ('Microsoft', 'microsoft', 'Official Microsoft cloud, developer certifications, and AI learning resources.', 'https://learn.microsoft.com', 'microsoft.com', true, 1),
    ('AWS', 'aws', 'Official Amazon Web Services cloud learning, Skill Builder, and developer tools.', 'https://aws.amazon.com/training/', 'aws.amazon.com', true, 2),
    ('Google', 'google', 'Official Google Cloud, developer resources, and AI learning platforms.', 'https://cloud.google.com/learn', 'cloud.google.com', true, 3),
    ('Other', 'other', 'OpenAI, open-source platforms, productivity tools, and modern student tech resources.', 'https://kofyone.com', 'kofyone.com', true, 4)
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    website_url = EXCLUDED.website_url,
    domain = EXCLUDED.domain,
    is_active = true;

-- -----------------------------------------------------------------------------
-- 2. Enhanced Resource Columns for CMS
-- -----------------------------------------------------------------------------
ALTER TABLE public.resources
    ADD COLUMN IF NOT EXISTS subcategory VARCHAR(100),
    ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}'::TEXT[],
    ADD COLUMN IF NOT EXISTS contributor_id VARCHAR(100);

-- Ensure index on platform_id, is_published, and featured for fast directory filtering
CREATE INDEX IF NOT EXISTS resources_platform_published_idx ON public.resources(platform_id, is_published, featured);

-- -----------------------------------------------------------------------------
-- 3. Admin-Managed Site Branding & Identity Table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.site_branding (
    id VARCHAR(50) PRIMARY KEY DEFAULT 'current',
    app_name VARCHAR(100) NOT NULL DEFAULT 'KofyOne',
    tagline VARCHAR(255) NOT NULL DEFAULT 'Learn Today. Build Tomorrow.',
    description TEXT DEFAULT 'A student-focused resource discovery platform to discover, search, explore, save, and revisit official technology resources.',
    primary_logo_url TEXT,
    compact_logo_url TEXT,
    square_icon_url TEXT,
    favicon_url TEXT,
    logo_alt VARCHAR(100) DEFAULT 'KofyOne Logo',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Insert default initial branding record if not present
INSERT INTO public.site_branding (
    id, app_name, tagline, description, logo_alt
) VALUES (
    'current',
    'KofyOne',
    'Learn Today. Build Tomorrow.',
    'A student-focused resource discovery platform to discover, search, explore, save, and revisit official technology resources.',
    'KofyOne Brand Logo'
) ON CONFLICT (id) DO NOTHING;

-- Lock down site_branding with Row Level Security
ALTER TABLE public.site_branding ENABLE ROW LEVEL SECURITY;

-- Anyone (public, students, guests) can view active site branding
DROP POLICY IF EXISTS "Public can view site branding" ON public.site_branding;
CREATE POLICY "Public can view site branding"
    ON public.site_branding FOR SELECT
    TO anon, authenticated
    USING (true);

-- Only authenticated administrators can modify site branding
DROP POLICY IF EXISTS "Admins can update site branding" ON public.site_branding;
CREATE POLICY "Admins can update site branding"
    ON public.site_branding FOR UPDATE
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can insert site branding" ON public.site_branding;
CREATE POLICY "Admins can insert site branding"
    ON public.site_branding FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin());

-- -----------------------------------------------------------------------------
-- 4. Resource RLS Policies for CMS Management
-- -----------------------------------------------------------------------------
-- Ensure public only sees published resources
DROP POLICY IF EXISTS "Public can view published resources" ON public.resources;
CREATE POLICY "Public can view published resources"
    ON public.resources FOR SELECT
    TO anon, authenticated
    USING (is_published = true OR public.is_admin());

-- Admins can insert new resources
DROP POLICY IF EXISTS "Admins can insert resources" ON public.resources;
CREATE POLICY "Admins can insert resources"
    ON public.resources FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin());

-- Admins can update any resource
DROP POLICY IF EXISTS "Admins can update resources" ON public.resources;
CREATE POLICY "Admins can update resources"
    ON public.resources FOR UPDATE
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Admins can delete any resource
DROP POLICY IF EXISTS "Admins can delete resources" ON public.resources;
CREATE POLICY "Admins can delete resources"
    ON public.resources FOR DELETE
    TO authenticated
    USING (public.is_admin());

-- -----------------------------------------------------------------------------
-- 5. Supabase Storage Bucket for Media Assets
-- -----------------------------------------------------------------------------
-- Create the public storage bucket for resource logos & site branding if available
DO $$
BEGIN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
        'kofyone-media',
        'kofyone-media',
        true,
        2097152, -- 2MB
        ARRAY['image/png', 'image/jpeg', 'image/webp']
    )
    ON CONFLICT (id) DO UPDATE SET
        public = true,
        file_size_limit = 2097152,
        allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp'];
EXCEPTION
    WHEN OTHERS THEN
        -- Storage extension might not be enabled in all environments; fail safely
        NULL;
END $$;

-- Storage object policies for kofyone-media bucket
DO $$
BEGIN
    -- Public read policy
    EXECUTE '
        DROP POLICY IF EXISTS "Public can view kofyone-media assets" ON storage.objects;
        CREATE POLICY "Public can view kofyone-media assets"
            ON storage.objects FOR SELECT
            TO anon, authenticated
            USING (bucket_id = ''kofyone-media'');
    ';

    -- Admin write policy
    EXECUTE '
        DROP POLICY IF EXISTS "Admins can upload to kofyone-media" ON storage.objects;
        CREATE POLICY "Admins can upload to kofyone-media"
            ON storage.objects FOR INSERT
            TO authenticated
            WITH CHECK (bucket_id = ''kofyone-media'' AND public.is_admin());
    ';

    -- Admin update policy
    EXECUTE '
        DROP POLICY IF EXISTS "Admins can update kofyone-media" ON storage.objects;
        CREATE POLICY "Admins can update kofyone-media"
            ON storage.objects FOR UPDATE
            TO authenticated
            USING (bucket_id = ''kofyone-media'' AND public.is_admin());
    ';

    -- Admin delete policy
    EXECUTE '
        DROP POLICY IF EXISTS "Admins can delete from kofyone-media" ON storage.objects;
        CREATE POLICY "Admins can delete from kofyone-media"
            ON storage.objects FOR DELETE
            TO authenticated
            USING (bucket_id = ''kofyone-media'' AND public.is_admin());
    ';
EXCEPTION
    WHEN OTHERS THEN
        NULL;
END $$;

-- ==============================================================================
-- KofyOne — Phase 7: Catalog Expansion, Multi-Provider Seed & Student Engagement
-- Migration: 20261030000000_phase7_catalog_and_engagement.sql
-- ==============================================================================

-- -----------------------------------------------------------------------------
-- 1. Canonical Categories (student, ai, cloud, developer, productivity)
-- -----------------------------------------------------------------------------
INSERT INTO public.categories (name, slug, description, display_order, is_active)
VALUES
    ('Student', 'student', 'Programs, discounts, and resources for students.', 1, true),
    ('AI', 'ai', 'Artificial intelligence learning and generative AI resources.', 2, true),
    ('Cloud', 'cloud', 'Cloud learning, infrastructure, and sandbox credits.', 3, true),
    ('Developer', 'developer', 'Tools, IDEs, and learning resources for developers.', 4, true),
    ('Productivity', 'productivity', 'Tools for learning, collaboration, and daily productivity.', 5, true)
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    display_order = EXCLUDED.display_order,
    is_active = true,
    updated_at = NOW();

-- -----------------------------------------------------------------------------
-- 2. Multi-Provider Platforms (Microsoft, AWS, Google Cloud, Other)
-- -----------------------------------------------------------------------------
INSERT INTO public.platforms (name, slug, description, website_url, domain, is_active, display_order)
VALUES
    ('Microsoft', 'microsoft', 'Official Microsoft cloud, developer certifications, Azure, and AI learning resources.', 'https://learn.microsoft.com', 'microsoft.com', true, 1),
    ('AWS', 'aws', 'Official Amazon Web Services cloud learning paths, AWS Skill Builder, and developer resources.', 'https://aws.amazon.com/training/', 'aws.amazon.com', true, 2),
    ('Google Cloud', 'google-cloud', 'Official Google Cloud, developer certifications, and AI learning platforms.', 'https://cloud.google.com/learn', 'cloud.google.com', true, 3),
    ('Google', 'google', 'Official Google Cloud, developer certifications, and AI learning platforms.', 'https://cloud.google.com/learn', 'cloud.google.com', true, 4),
    ('Other', 'other', 'OpenAI, open-source platforms, productivity tools, and modern student tech resources.', 'https://kofyone.com', 'kofyone.com', true, 5)
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    website_url = EXCLUDED.website_url,
    domain = EXCLUDED.domain,
    is_active = true,
    updated_at = NOW();

-- Ensure Microsoft tracking config exists and is intact
DO $$
DECLARE
    ms_platform_id UUID;
BEGIN
    SELECT id INTO ms_platform_id FROM public.platforms WHERE slug = 'microsoft' LIMIT 1;
    IF ms_platform_id IS NOT NULL THEN
        INSERT INTO public.tracking_configs (
            platform_id, tracking_parameter, tracking_value, is_enabled
        ) VALUES (
            ms_platform_id, 'wt.mc_id', 'studentamb_504640', true
        )
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 3. Multi-Provider Official Student Resource Seed & Category Links
-- -----------------------------------------------------------------------------
DO $$
DECLARE
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
    SELECT id INTO aws_id FROM public.platforms WHERE slug = 'aws' LIMIT 1;
    SELECT id INTO gcp_id FROM public.platforms WHERE slug = 'google-cloud' LIMIT 1;
    IF gcp_id IS NULL THEN
        SELECT id INTO gcp_id FROM public.platforms WHERE slug = 'google' LIMIT 1;
    END IF;
    SELECT id INTO other_id FROM public.platforms WHERE slug = 'other' LIMIT 1;

    SELECT id INTO cat_student FROM public.categories WHERE slug = 'student' LIMIT 1;
    SELECT id INTO cat_ai FROM public.categories WHERE slug = 'ai' LIMIT 1;
    SELECT id INTO cat_cloud FROM public.categories WHERE slug = 'cloud' LIMIT 1;
    SELECT id INTO cat_dev FROM public.categories WHERE slug = 'developer' LIMIT 1;
    SELECT id INTO cat_prod FROM public.categories WHERE slug = 'productivity' LIMIT 1;

    -- AWS 1: AWS Educate (Student, Cloud)
    IF aws_id IS NOT NULL THEN
        INSERT INTO public.resources (platform_id, name, slug, description, official_url, is_published, featured, display_order, tags, metadata)
        VALUES (
            aws_id,
            'AWS Educate',
            'aws-educate',
            'Free cloud learning content, training pathways, and AWS credits designed specifically for students aged 13+.',
            'https://aws.amazon.com/education/awseducate/',
            true, true, 10,
            ARRAY['aws', 'educate', 'students', 'cloud'],
            '{"difficulty": "beginner", "is_free": true}'::jsonb
        )
        ON CONFLICT (slug) DO UPDATE SET
            platform_id = EXCLUDED.platform_id,
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            official_url = EXCLUDED.official_url,
            is_published = true,
            updated_at = NOW()
        RETURNING id INTO res_id;

        IF res_id IS NOT NULL THEN
            IF cat_student IS NOT NULL THEN INSERT INTO public.resource_categories (resource_id, category_id) VALUES (res_id, cat_student) ON CONFLICT DO NOTHING; END IF;
            IF cat_cloud IS NOT NULL THEN INSERT INTO public.resource_categories (resource_id, category_id) VALUES (res_id, cat_cloud) ON CONFLICT DO NOTHING; END IF;
        END IF;

        -- AWS 2: AWS Skill Builder (Cloud, Developer, AI)
        INSERT INTO public.resources (platform_id, name, slug, description, official_url, is_published, featured, display_order, tags, metadata)
        VALUES (
            aws_id,
            'AWS Skill Builder',
            'aws-skill-builder',
            'Over 600+ free digital courses, learning plans, and AWS certification prep for students and builders.',
            'https://explore.skillbuilder.aws/',
            true, true, 11,
            ARRAY['aws', 'skill-builder', 'certifications', 'training'],
            '{"difficulty": "all-levels", "is_free": true}'::jsonb
        )
        ON CONFLICT (slug) DO UPDATE SET
            platform_id = EXCLUDED.platform_id,
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            official_url = EXCLUDED.official_url,
            is_published = true,
            updated_at = NOW()
        RETURNING id INTO res_id;

        IF res_id IS NOT NULL THEN
            IF cat_cloud IS NOT NULL THEN INSERT INTO public.resource_categories (resource_id, category_id) VALUES (res_id, cat_cloud) ON CONFLICT DO NOTHING; END IF;
            IF cat_dev IS NOT NULL THEN INSERT INTO public.resource_categories (resource_id, category_id) VALUES (res_id, cat_dev) ON CONFLICT DO NOTHING; END IF;
            IF cat_ai IS NOT NULL THEN INSERT INTO public.resource_categories (resource_id, category_id) VALUES (res_id, cat_ai) ON CONFLICT DO NOTHING; END IF;
        END IF;

        -- AWS 3: Amazon Q Developer (AI, Developer, Productivity)
        INSERT INTO public.resources (platform_id, name, slug, description, official_url, is_published, featured, display_order, tags, metadata)
        VALUES (
            aws_id,
            'Amazon Q Developer',
            'amazon-q-developer',
            'Generative AI assistant for software development with code suggestions, security scans, and software upgrades.',
            'https://aws.amazon.com/q/developer/',
            true, true, 12,
            ARRAY['aws', 'amazon-q', 'generative-ai', 'assistant'],
            '{"difficulty": "all-levels", "is_free": true}'::jsonb
        )
        ON CONFLICT (slug) DO UPDATE SET
            platform_id = EXCLUDED.platform_id,
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            official_url = EXCLUDED.official_url,
            is_published = true,
            updated_at = NOW()
        RETURNING id INTO res_id;

        IF res_id IS NOT NULL THEN
            IF cat_ai IS NOT NULL THEN INSERT INTO public.resource_categories (resource_id, category_id) VALUES (res_id, cat_ai) ON CONFLICT DO NOTHING; END IF;
            IF cat_dev IS NOT NULL THEN INSERT INTO public.resource_categories (resource_id, category_id) VALUES (res_id, cat_dev) ON CONFLICT DO NOTHING; END IF;
            IF cat_prod IS NOT NULL THEN INSERT INTO public.resource_categories (resource_id, category_id) VALUES (res_id, cat_prod) ON CONFLICT DO NOTHING; END IF;
        END IF;
    END IF;

    -- Google Cloud 1: Google Cloud Skills Boost (Student, Cloud, AI)
    IF gcp_id IS NOT NULL THEN
        INSERT INTO public.resources (platform_id, name, slug, description, official_url, is_published, featured, display_order, tags, metadata)
        VALUES (
            gcp_id,
            'Google Cloud Skills Boost',
            'google-cloud-skills-boost',
            'Hands-on labs, role-based learning paths, and Google Cloud and Vertex AI training for students.',
            'https://www.cloudskillsboost.google/',
            true, true, 13,
            ARRAY['google-cloud', 'vertex-ai', 'labs', 'boost'],
            '{"difficulty": "all-levels", "is_free": true}'::jsonb
        )
        ON CONFLICT (slug) DO UPDATE SET
            platform_id = EXCLUDED.platform_id,
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            official_url = EXCLUDED.official_url,
            is_published = true,
            updated_at = NOW()
        RETURNING id INTO res_id;

        IF res_id IS NOT NULL THEN
            IF cat_student IS NOT NULL THEN INSERT INTO public.resource_categories (resource_id, category_id) VALUES (res_id, cat_student) ON CONFLICT DO NOTHING; END IF;
            IF cat_cloud IS NOT NULL THEN INSERT INTO public.resource_categories (resource_id, category_id) VALUES (res_id, cat_cloud) ON CONFLICT DO NOTHING; END IF;
            IF cat_ai IS NOT NULL THEN INSERT INTO public.resource_categories (resource_id, category_id) VALUES (res_id, cat_ai) ON CONFLICT DO NOTHING; END IF;
        END IF;

        -- Google Cloud 2: Google AI Studio & Gemini API (AI, Developer)
        INSERT INTO public.resources (platform_id, name, slug, description, official_url, is_published, featured, display_order, tags, metadata)
        VALUES (
            gcp_id,
            'Google AI Studio & Gemini API',
            'google-ai-studio-gemini-api',
            'Fastest way to prototype and experiment with Google Gemini multimodal models, prompt engineering, and developer APIs.',
            'https://aistudio.google.com/',
            true, true, 14,
            ARRAY['google', 'gemini', 'ai-studio', 'api'],
            '{"difficulty": "intermediate", "is_free": true}'::jsonb
        )
        ON CONFLICT (slug) DO UPDATE SET
            platform_id = EXCLUDED.platform_id,
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            official_url = EXCLUDED.official_url,
            is_published = true,
            updated_at = NOW()
        RETURNING id INTO res_id;

        IF res_id IS NOT NULL THEN
            IF cat_ai IS NOT NULL THEN INSERT INTO public.resource_categories (resource_id, category_id) VALUES (res_id, cat_ai) ON CONFLICT DO NOTHING; END IF;
            IF cat_dev IS NOT NULL THEN INSERT INTO public.resource_categories (resource_id, category_id) VALUES (res_id, cat_dev) ON CONFLICT DO NOTHING; END IF;
        END IF;

        -- Google Cloud 3: Google for Developers — Student Programs (Student, Developer)
        INSERT INTO public.resources (platform_id, name, slug, description, official_url, is_published, featured, display_order, tags, metadata)
        VALUES (
            gcp_id,
            'Google for Developers — Student Programs',
            'google-for-developers-student-programs',
            'Student clubs, Solution Challenge hackathons, campus leads, and developer learning pathways.',
            'https://developers.google.com/community/gdsc',
            true, false, 15,
            ARRAY['google', 'community', 'gdsc', 'students'],
            '{"difficulty": "all-levels", "is_free": true}'::jsonb
        )
        ON CONFLICT (slug) DO UPDATE SET
            platform_id = EXCLUDED.platform_id,
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            official_url = EXCLUDED.official_url,
            is_published = true,
            updated_at = NOW()
        RETURNING id INTO res_id;

        IF res_id IS NOT NULL THEN
            IF cat_student IS NOT NULL THEN INSERT INTO public.resource_categories (resource_id, category_id) VALUES (res_id, cat_student) ON CONFLICT DO NOTHING; END IF;
            IF cat_dev IS NOT NULL THEN INSERT INTO public.resource_categories (resource_id, category_id) VALUES (res_id, cat_dev) ON CONFLICT DO NOTHING; END IF;
        END IF;
    END IF;

    -- Other 1: GitHub Student Developer Pack (Student, Developer, Productivity)
    IF other_id IS NOT NULL THEN
        INSERT INTO public.resources (platform_id, name, slug, description, official_url, is_published, featured, display_order, tags, metadata)
        VALUES (
            other_id,
            'GitHub Student Developer Pack',
            'github-student-developer-pack',
            'The best developer tools, free domains, cloud credits, and subscriptions free for eligible students.',
            'https://education.github.com/pack',
            true, true, 16,
            ARRAY['github', 'student-pack', 'tools', 'developer'],
            '{"difficulty": "all-levels", "is_free": true}'::jsonb
        )
        ON CONFLICT (slug) DO UPDATE SET
            platform_id = EXCLUDED.platform_id,
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            official_url = EXCLUDED.official_url,
            is_published = true,
            updated_at = NOW()
        RETURNING id INTO res_id;

        IF res_id IS NOT NULL THEN
            IF cat_student IS NOT NULL THEN INSERT INTO public.resource_categories (resource_id, category_id) VALUES (res_id, cat_student) ON CONFLICT DO NOTHING; END IF;
            IF cat_dev IS NOT NULL THEN INSERT INTO public.resource_categories (resource_id, category_id) VALUES (res_id, cat_dev) ON CONFLICT DO NOTHING; END IF;
            IF cat_prod IS NOT NULL THEN INSERT INTO public.resource_categories (resource_id, category_id) VALUES (res_id, cat_prod) ON CONFLICT DO NOTHING; END IF;
        END IF;

        -- Other 2: GitHub Copilot for Students (AI, Developer, Productivity)
        INSERT INTO public.resources (platform_id, name, slug, description, official_url, is_published, featured, display_order, tags, metadata)
        VALUES (
            other_id,
            'GitHub Copilot for Students',
            'github-copilot-for-students',
            'Free AI pair programmer for verified students to accelerate coding, tests, and debugging directly in IDEs.',
            'https://github.com/features/copilot',
            true, true, 17,
            ARRAY['github', 'copilot', 'ai', 'ide'],
            '{"difficulty": "all-levels", "is_free": true}'::jsonb
        )
        ON CONFLICT (slug) DO UPDATE SET
            platform_id = EXCLUDED.platform_id,
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            official_url = EXCLUDED.official_url,
            is_published = true,
            updated_at = NOW()
        RETURNING id INTO res_id;

        IF res_id IS NOT NULL THEN
            IF cat_ai IS NOT NULL THEN INSERT INTO public.resource_categories (resource_id, category_id) VALUES (res_id, cat_ai) ON CONFLICT DO NOTHING; END IF;
            IF cat_dev IS NOT NULL THEN INSERT INTO public.resource_categories (resource_id, category_id) VALUES (res_id, cat_dev) ON CONFLICT DO NOTHING; END IF;
            IF cat_prod IS NOT NULL THEN INSERT INTO public.resource_categories (resource_id, category_id) VALUES (res_id, cat_prod) ON CONFLICT DO NOTHING; END IF;
        END IF;
    END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 4. Dynamic Events & Updates Tables with RLS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description TEXT NOT NULL,
    event_date VARCHAR(100) NOT NULL,
    location VARCHAR(255) NOT NULL DEFAULT 'Virtual / Global',
    category VARCHAR(100) NOT NULL DEFAULT 'Hackathon',
    official_url TEXT,
    is_published BOOLEAN NOT NULL DEFAULT true,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view published events" ON public.events;
CREATE POLICY "Public can view published events"
    ON public.events FOR SELECT
    TO anon, authenticated
    USING (is_published = true OR public.is_admin());

DROP POLICY IF EXISTS "Admins can insert events" ON public.events;
CREATE POLICY "Admins can insert events"
    ON public.events FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can update events" ON public.events;
CREATE POLICY "Admins can update events"
    ON public.events FOR UPDATE
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete events" ON public.events;
CREATE POLICY "Admins can delete events"
    ON public.events FOR DELETE
    TO authenticated
    USING (public.is_admin());

CREATE TABLE IF NOT EXISTS public.updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description TEXT NOT NULL,
    published_date VARCHAR(100) NOT NULL,
    badge VARCHAR(50) NOT NULL DEFAULT 'Update',
    is_published BOOLEAN NOT NULL DEFAULT true,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.updates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view published updates" ON public.updates;
CREATE POLICY "Public can view published updates"
    ON public.updates FOR SELECT
    TO anon, authenticated
    USING (is_published = true OR public.is_admin());

DROP POLICY IF EXISTS "Admins can insert updates" ON public.updates;
CREATE POLICY "Admins can insert updates"
    ON public.updates FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can update updates" ON public.updates;
CREATE POLICY "Admins can update updates"
    ON public.updates FOR UPDATE
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete updates" ON public.updates;
CREATE POLICY "Admins can delete updates"
    ON public.updates FOR DELETE
    TO authenticated
    USING (public.is_admin());

-- Seed initial official student events
INSERT INTO public.events (title, slug, description, event_date, location, category, official_url, is_published, display_order)
VALUES
    ('Microsoft Imagine Cup 2026', 'microsoft-imagine-cup-2026', 'The premier global student competition for building innovative AI and cloud technology solutions.', 'November 15, 2026', 'Virtual / Global', 'Hackathon', 'https://imaginecup.microsoft.com/', true, 1),
    ('GitHub Global Campus Challenge', 'github-global-campus-challenge', 'Build and showcase open-source developer workflows, actions, and collaborative software projects.', 'December 1, 2026', 'Online Livestream', 'Challenge', 'https://education.github.com/', true, 2),
    ('Google Cloud AI Study Jam', 'google-cloud-ai-study-jam', 'Hands-on interactive learning sprint covering Vertex AI, Gemini models, and generative cloud development.', 'October 28, 2026', 'Community Hubs & Online', 'Workshop', 'https://cloud.google.com/innovators/', true, 3)
ON CONFLICT (slug) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    event_date = EXCLUDED.event_date,
    location = EXCLUDED.location,
    category = EXCLUDED.category,
    official_url = EXCLUDED.official_url,
    is_published = true,
    updated_at = NOW();

-- Seed initial official platform updates
INSERT INTO public.updates (title, slug, description, published_date, badge, is_published, display_order)
VALUES
    ('Azure AI Foundry Integration', 'azure-ai-foundry-integration', 'Added complete learning path for Azure AI model catalog, inference endpoints, and SDKs.', 'October 2026', 'Major', true, 1),
    ('Multi-Provider Student Hub Launch', 'multi-provider-student-hub-launch', 'Expanded student and developer resources across AWS, Google Cloud, and GitHub ecosystems.', 'October 2026', 'Feature', true, 2),
    ('Student Developer Pack Direct Verification', 'student-developer-pack-direct-verification', 'Streamlined authentication and free credit claiming flows without credit card requirements.', 'September 2026', 'Release', true, 3)
ON CONFLICT (slug) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    published_date = EXCLUDED.published_date,
    badge = EXCLUDED.badge,
    is_published = true,
    updated_at = NOW();

-- -----------------------------------------------------------------------------
-- 5. Audit Logs Table & Policies
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id VARCHAR(255) NOT NULL DEFAULT '',
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    changes JSONB NOT NULL DEFAULT '{}'::jsonb,
    ip_address INET,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.audit_logs
    ADD COLUMN IF NOT EXISTS details JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS changes JSONB DEFAULT '{}'::jsonb;

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
CREATE POLICY "Admins can view audit logs"
    ON public.audit_logs FOR SELECT
    TO authenticated
    USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can insert audit logs" ON public.audit_logs;
CREATE POLICY "Admins can insert audit logs"
    ON public.audit_logs FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin());

-- -----------------------------------------------------------------------------
-- 6. Reload Schema Cache
-- -----------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';


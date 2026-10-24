-- ==============================================================================
-- KofyOne — Migration: Legal & Site Pages System
-- Migration: 20261024000000_legal_and_site_pages.sql
-- ==============================================================================

-- 1. Create site_pages table for dynamic Terms, Privacy, About, and Contact pages
CREATE TABLE IF NOT EXISTS public.site_pages (
    slug VARCHAR(50) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    summary TEXT,
    content TEXT NOT NULL,
    is_published BOOLEAN NOT NULL DEFAULT true,
    published_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Index for public lookup
CREATE INDEX IF NOT EXISTS idx_site_pages_published ON public.site_pages(slug, is_published);

-- 2. Enable Row Level Security
ALTER TABLE public.site_pages ENABLE ROW LEVEL SECURITY;

-- 3. Row Level Security Policies
-- Public: Anyone can read published pages
DROP POLICY IF EXISTS "Public can view published site pages" ON public.site_pages;
CREATE POLICY "Public can view published site pages"
    ON public.site_pages
    FOR SELECT
    USING (is_published = true);

-- Admins: Full access (view drafts, create, update, delete)
DROP POLICY IF EXISTS "Admins have full access to site pages" ON public.site_pages;
CREATE POLICY "Admins have full access to site pages"
    ON public.site_pages
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.id = auth.uid() AND ur.role = 'admin'
        )
        OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.id = auth.uid() AND ur.role = 'admin'
        )
        OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    );

-- 4. Seed Canonical Initial Pages
INSERT INTO public.site_pages (slug, title, summary, content, is_published, published_at, updated_at)
VALUES
(
    'terms',
    'Terms & Conditions',
    'The terms governing your access to and use of the KofyOne discovery platform.',
    '# Terms & Conditions\n\n**Last Updated:** October 24, 2026\n\nWelcome to **KofyOne**. By accessing or using KofyOne, you agree to be bound by these Terms. KofyOne is an independent, student-focused educational resource directory.\n\n### 1. Purpose and Scope\nKofyOne is an independent community discovery project and is not owned, operated, or endorsed by Microsoft Corporation, Amazon Web Services, Google LLC, or GitHub Inc.\n\n### 2. User Accounts\nUsers are responsible for safeguarding their login credentials and security recovery answers.\n\n### 3. Contact Information\nFor inquiries: [support@kofyone.com]',
    true,
    NOW(),
    NOW()
),
(
    'privacy',
    'Privacy Policy',
    'How KofyOne collects, uses, protects, and handles your personal information.',
    '# Privacy Policy\n\n**Last Updated:** October 24, 2026\n\nYour privacy is paramount to us at **KofyOne**. This Privacy Policy explains what information we collect when you visit or interact with our platform.\n\n### 1. Information We Collect\n- Account Information (Email, Username, bcrypt-hashed security answers)\n- Saved Favorites & Personalization\n- Session and Technical Logs\n\n### 2. Contact Information\nFor privacy inquiries: [privacy@kofyone.com]',
    true,
    NOW(),
    NOW()
),
(
    'about',
    'About KofyOne',
    'The story, mission, and guiding principles behind KofyOne.',
    '# About KofyOne\n\n**Mission:** Empowering every student to discover official tech learning, cloud credits, and developer tools without friction.\n\nKofyOne centralizes verified student programs across Microsoft, AWS, Google Cloud, GitHub, and independent developer platforms in one clean directory.',
    true,
    NOW(),
    NOW()
),
(
    'contact',
    'Contact & Support',
    'Get in touch with the KofyOne team for support, suggestions, or community partnerships.',
    '# Contact & Support\n\nWe are here to help! Whether you are a student encountering an issue, an educator with questions, or someone who wants to suggest a new free technology resource, we would love to hear from you.\n\n- Support Email: [support@kofyone.com]\n- GitHub Organization: https://github.com/kofyone',
    true,
    NOW(),
    NOW()
)
ON CONFLICT (slug) DO NOTHING;

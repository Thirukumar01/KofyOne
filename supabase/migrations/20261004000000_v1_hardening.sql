-- KofyOne V1 hardening: profiles, safe admin checks, canonical catalog, and indexes.

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'educator', 'admin', 'guest')),
  full_name TEXT,
  avatar_url TEXT,
  preferred_platform TEXT DEFAULT 'microsoft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$ SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'); $$;
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

CREATE POLICY "Admins can manage catalog" ON public.platforms FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins can manage categories" ON public.categories FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins can manage resources" ON public.resources FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins can manage resource categories" ON public.resource_categories FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins can manage tracking configs" ON public.tracking_configs FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE UNIQUE INDEX IF NOT EXISTS tracking_configs_platform_parameter_key
  ON public.tracking_configs (platform_id, tracking_parameter);
CREATE INDEX IF NOT EXISTS resource_categories_category_key ON public.resource_categories(category_id);
CREATE INDEX IF NOT EXISTS recently_viewed_order_key ON public.user_recently_viewed(user_id, viewed_at DESC);

INSERT INTO public.categories (name, slug, description, display_order)
VALUES
  ('Student', 'student', 'Programs and resources for students.', 1),
  ('AI', 'ai', 'AI learning and development resources.', 2),
  ('Cloud', 'cloud', 'Cloud learning, services, and architecture.', 3),
  ('Developer', 'developer', 'Tools and learning resources for developers.', 4),
  ('Productivity', 'productivity', 'Tools for learning, work, and collaboration.', 5)
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, display_order = EXCLUDED.display_order, is_active = true;
UPDATE public.categories SET is_active = false WHERE slug NOT IN ('student', 'ai', 'cloud', 'developer', 'productivity');

INSERT INTO public.tracking_configs (platform_id, tracking_parameter, tracking_value)
SELECT id, 'wt.mc_id', 'studentamb_504640' FROM public.platforms WHERE slug = 'microsoft'
ON CONFLICT (platform_id, tracking_parameter) DO NOTHING;

DO $$
DECLARE
  platform_id UUID;
  resource_id UUID;
  category_id UUID;
  item RECORD;
BEGIN
  SELECT id INTO platform_id FROM public.platforms WHERE slug = 'microsoft';
  FOR item IN SELECT * FROM (VALUES
    ('Microsoft Learn', 'microsoft-learn', 'Interactive learning paths and modules for Microsoft technologies.', 'https://learn.microsoft.com/training', 'developer'),
    ('Azure Fundamentals', 'azure-fundamentals', 'A Microsoft Learn path for foundational Azure concepts.', 'https://learn.microsoft.com/training/paths/azure-fundamentals-describe-cloud-concepts/', 'cloud'),
    ('Azure for Students', 'azure-for-students', 'Microsoft Azure information and offers for eligible students.', 'https://azure.microsoft.com/free/students/', 'student'),
    ('GitHub Student Developer Pack', 'github-student-developer-pack', 'Tools and services available through the GitHub Student Developer Pack.', 'https://education.github.com/pack', 'student'),
    ('Microsoft Learn AI hub', 'microsoft-learn-ai', 'Microsoft Learn training and documentation for AI.', 'https://learn.microsoft.com/ai/', 'ai'),
    ('Azure OpenAI Service', 'azure-openai-service', 'Documentation for building generative AI solutions with Azure OpenAI Service.', 'https://learn.microsoft.com/azure/ai-services/openai/', 'ai'),
    ('Visual Studio Community', 'visual-studio-community', 'A full-featured IDE for individual developers and students.', 'https://visualstudio.microsoft.com/vs/community/', 'developer'),
    ('Visual Studio Code', 'visual-studio-code', 'A source-code editor for building and debugging applications.', 'https://code.visualstudio.com/', 'developer'),
    ('Microsoft 365 Education', 'microsoft-365-education', 'Microsoft 365 Education information for schools and students.', 'https://www.microsoft.com/education/products/office-365-education', 'productivity'),
    ('Microsoft Teams for Education', 'microsoft-teams-education', 'Collaboration features and guidance for education.', 'https://www.microsoft.com/education/products/teams', 'productivity')
  ) AS values(name, slug, description, official_url, category_slug)
  LOOP
    INSERT INTO public.resources (platform_id, name, slug, description, official_url, is_published, featured, display_order, tracking_config_id)
    SELECT platform_id, item.name, item.slug, item.description, item.official_url, true, item.slug IN ('microsoft-learn', 'azure-for-students'), 1,
      (SELECT tc.id FROM public.tracking_configs AS tc WHERE tc.platform_id = platform_id LIMIT 1)
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, official_url = EXCLUDED.official_url, is_published = true;
    SELECT id INTO resource_id FROM public.resources WHERE slug = item.slug;
    SELECT id INTO category_id FROM public.categories WHERE slug = item.category_slug;
    INSERT INTO public.resource_categories(resource_id, category_id) VALUES (resource_id, category_id) ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

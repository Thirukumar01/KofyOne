-- ==============================================================================
-- KofyOne — Storage Bucket & Security Policy Migration: kofyone-media
-- Migration: 20261027000000_storage_bucket_kofyone_media.sql
-- ==============================================================================

-- 1. Create the 'kofyone-media' bucket if it does not already exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'kofyone-media',
    'kofyone-media',
    true,
    5242880, -- 5MB in bytes
    ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml', 'image/x-icon']::text[]
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml', 'image/x-icon']::text[];

-- 2. Storage Object RLS Policies for 'kofyone-media'
-- Public read access: Anyone can read media assets from the public bucket
DROP POLICY IF EXISTS "Public can view kofyone media objects" ON storage.objects;
CREATE POLICY "Public can view kofyone media objects"
    ON storage.objects
    FOR SELECT
    USING (bucket_id = 'kofyone-media');

-- Admin write access: Only verified administrators can insert media assets
DROP POLICY IF EXISTS "Admins can upload kofyone media objects" ON storage.objects;
CREATE POLICY "Admins can upload kofyone media objects"
    ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'kofyone-media'
        AND (
            EXISTS (
                SELECT 1 FROM public.user_roles ur
                WHERE (ur.id = auth.uid() OR ur.user_id = auth.uid()) AND ur.role = 'admin'
            )
            OR EXISTS (
                SELECT 1 FROM public.profiles p
                WHERE p.id = auth.uid() AND p.role = 'admin'
            )
        )
    );

-- Admin update access: Only verified administrators can update media assets
DROP POLICY IF EXISTS "Admins can update kofyone media objects" ON storage.objects;
CREATE POLICY "Admins can update kofyone media objects"
    ON storage.objects
    FOR UPDATE
    USING (
        bucket_id = 'kofyone-media'
        AND (
            EXISTS (
                SELECT 1 FROM public.user_roles ur
                WHERE (ur.id = auth.uid() OR ur.user_id = auth.uid()) AND ur.role = 'admin'
            )
            OR EXISTS (
                SELECT 1 FROM public.profiles p
                WHERE p.id = auth.uid() AND p.role = 'admin'
            )
        )
    )
    WITH CHECK (
        bucket_id = 'kofyone-media'
        AND (
            EXISTS (
                SELECT 1 FROM public.user_roles ur
                WHERE (ur.id = auth.uid() OR ur.user_id = auth.uid()) AND ur.role = 'admin'
            )
            OR EXISTS (
                SELECT 1 FROM public.profiles p
                WHERE p.id = auth.uid() AND p.role = 'admin'
            )
        )
    );

-- Admin delete access: Only verified administrators can delete media assets
DROP POLICY IF EXISTS "Admins can delete kofyone media objects" ON storage.objects;
CREATE POLICY "Admins can delete kofyone media objects"
    ON storage.objects
    FOR DELETE
    USING (
        bucket_id = 'kofyone-media'
        AND (
            EXISTS (
                SELECT 1 FROM public.user_roles ur
                WHERE (ur.id = auth.uid() OR ur.user_id = auth.uid()) AND ur.role = 'admin'
            )
            OR EXISTS (
                SELECT 1 FROM public.profiles p
                WHERE p.id = auth.uid() AND p.role = 'admin'
            )
        )
    );

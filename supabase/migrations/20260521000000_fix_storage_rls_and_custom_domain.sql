-- ============================================================
-- Fix 1: Storage RLS — allow authenticated users to upload logos
--        Logo path: logos/{slug}/logo_xxx.ext
--        File path: {slug}/{timestamp}_filename
-- Fix 2: Add custom_domain column to branding_settings
-- ============================================================

-- Drop old restrictive storage policies and recreate properly
DROP POLICY IF EXISTS "anyone_can_upload" ON storage.objects;
DROP POLICY IF EXISTS "authenticated_can_upload" ON storage.objects;
DROP POLICY IF EXISTS "authenticated_can_update_uploads" ON storage.objects;
DROP POLICY IF EXISTS "public_can_read_logos" ON storage.objects;
DROP POLICY IF EXISTS "owners_can_read_uploads" ON storage.objects;
DROP POLICY IF EXISTS "owners_can_delete_uploads" ON storage.objects;

-- Allow anyone (anon + authenticated) to upload to the uploads bucket
CREATE POLICY "anyone_can_upload"
ON storage.objects FOR INSERT TO public
WITH CHECK (bucket_id = 'uploads');

-- Allow authenticated users to UPDATE (upsert) in uploads bucket (needed for logo re-upload)
CREATE POLICY "authenticated_can_update_uploads"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'uploads')
WITH CHECK (bucket_id = 'uploads');

-- Allow authenticated owners to read their workspace files AND their logos
CREATE POLICY "owners_can_read_uploads"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'uploads'
  AND (
    -- Regular file uploads: path starts with workspace slug
    (storage.foldername(name))[1] IN (
      SELECT w.slug FROM public.workspaces w WHERE w.owner_id = auth.uid()
    )
    OR
    -- Logo uploads: path is logos/{slug}/...
    (
      (storage.foldername(name))[1] = 'logos'
      AND (storage.foldername(name))[2] IN (
        SELECT w.slug FROM public.workspaces w WHERE w.owner_id = auth.uid()
      )
    )
  )
);

-- Allow public (anon) to read logos so they display on the upload portal
CREATE POLICY "public_can_read_logos"
ON storage.objects FOR SELECT TO anon
USING (
  bucket_id = 'uploads'
  AND (storage.foldername(name))[1] = 'logos'
);

-- Allow authenticated owners to delete their workspace files and logos
CREATE POLICY "owners_can_delete_uploads"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'uploads'
  AND (
    (storage.foldername(name))[1] IN (
      SELECT w.slug FROM public.workspaces w WHERE w.owner_id = auth.uid()
    )
    OR
    (
      (storage.foldername(name))[1] = 'logs'
      AND (storage.foldername(name))[2] IN (
        SELECT w.slug FROM public.workspaces w WHERE w.owner_id = auth.uid()
      )
    )
  )
);

-- Make the uploads bucket public so logos are accessible via public URL
UPDATE storage.buckets SET public = true WHERE id = 'uploads';

-- ============================================================
-- Fix 3: Add custom_domain column to branding_settings
-- ============================================================
ALTER TABLE public.branding_settings
  ADD COLUMN IF NOT EXISTS custom_domain TEXT;

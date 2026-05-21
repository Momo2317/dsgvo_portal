-- ============================================================
-- TresorLink — Fix RLS Policies & Storage Permissions
-- Fixes: RLS violation on branding save, anonymous upload permissions
-- ============================================================

-- Fix branding_settings RLS: use a helper function to avoid subquery issues
CREATE OR REPLACE FUNCTION public.owns_workspace(ws_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspaces
    WHERE id = ws_id AND owner_id = auth.uid()
  )
$$;

-- Re-create branding_settings policies using the helper function
DROP POLICY IF EXISTS "users_manage_own_branding_settings" ON public.branding_settings;
CREATE POLICY "users_manage_own_branding_settings"
ON public.branding_settings FOR ALL TO authenticated
USING (public.owns_workspace(workspace_id))
WITH CHECK (public.owns_workspace(workspace_id));

DROP POLICY IF EXISTS "public_read_branding_settings" ON public.branding_settings;
CREATE POLICY "public_read_branding_settings"
ON public.branding_settings FOR SELECT TO anon
USING (true);

-- Re-create uploaded_files policies
DROP POLICY IF EXISTS "users_manage_own_uploaded_files" ON public.uploaded_files;
CREATE POLICY "users_manage_own_uploaded_files"
ON public.uploaded_files FOR ALL TO authenticated
USING (public.owns_workspace(workspace_id))
WITH CHECK (public.owns_workspace(workspace_id));

-- Fix: anonymous users can INSERT uploaded_files (client upload portal)
DROP POLICY IF EXISTS "anon_insert_uploaded_files" ON public.uploaded_files;
CREATE POLICY "anon_insert_uploaded_files"
ON public.uploaded_files FOR INSERT TO anon
WITH CHECK (true);

-- Fix workspaces public read for anon (client portal slug lookup)
DROP POLICY IF EXISTS "public_read_workspaces" ON public.workspaces;
CREATE POLICY "public_read_workspaces"
ON public.workspaces FOR SELECT TO anon
USING (true);

-- Fix storage: allow anon to upload files
DROP POLICY IF EXISTS "anyone_can_upload" ON storage.objects;
CREATE POLICY "anyone_can_upload"
ON storage.objects FOR INSERT TO anon
WITH CHECK (bucket_id = 'uploads');

-- Allow authenticated users to also upload (logo uploads)
DROP POLICY IF EXISTS "authenticated_can_upload" ON storage.objects;
CREATE POLICY "authenticated_can_upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'uploads');

-- Allow authenticated owners to read their workspace files
DROP POLICY IF EXISTS "owners_can_read_uploads" ON storage.objects;
CREATE POLICY "owners_can_read_uploads"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'uploads'
  AND (storage.foldername(name))[1] IN (
    SELECT w.slug FROM public.workspaces w WHERE w.owner_id = auth.uid()
  )
);

-- Allow authenticated owners to delete their workspace files
DROP POLICY IF EXISTS "owners_can_delete_uploads" ON storage.objects;
CREATE POLICY "owners_can_delete_uploads"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'uploads'
  AND (storage.foldername(name))[1] IN (
    SELECT w.slug FROM public.workspaces w WHERE w.owner_id = auth.uid()
  )
);

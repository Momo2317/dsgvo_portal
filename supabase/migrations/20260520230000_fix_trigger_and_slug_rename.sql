-- ============================================================
-- Fix 1: Make notification trigger completely safe (no blocking uploads)
-- Fix 2: Add slug rename support for workspaces
-- ============================================================

-- ============================================================
-- FIX 1: Replace trigger with a version that NEVER blocks uploads
-- Uses pg_net only when all required settings are present
-- ============================================================

CREATE OR REPLACE FUNCTION public.notify_on_file_upload()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  project_url TEXT;
  service_role_key TEXT;
  payload JSONB;
BEGIN
  BEGIN
    -- Read project URL and service role key from app settings
    project_url := current_setting('app.supabase_url', true);
    service_role_key := current_setting('app.service_role_key', true);
  EXCEPTION WHEN OTHERS THEN
    -- Settings not configured — skip notification silently
    RETURN NEW;
  END;

  -- Guard: skip HTTP call if project_url or service_role_key is not configured
  IF project_url IS NULL OR project_url = '' THEN
    RETURN NEW;
  END IF;

  IF service_role_key IS NULL OR service_role_key = '' THEN
    RETURN NEW;
  END IF;

  -- Build payload matching the edge function's expected shape
  payload := jsonb_build_object(
    'type', 'INSERT',
    'table', 'uploaded_files',
    'record', row_to_json(NEW)::jsonb
  );

  BEGIN
    -- Fire-and-forget HTTP POST to the Edge Function
    PERFORM
      net.http_post(
        url := project_url || '/functions/v1/send-upload-notification',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || service_role_key
        ),
        body := payload
      );
  EXCEPTION WHEN OTHERS THEN
    -- Never let HTTP errors block the file upload
    NULL;
  END;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Catch-all: notification failures must NEVER block file uploads
    RETURN NEW;
END;
$$;

-- Ensure trigger exists (re-create idempotently)
DROP TRIGGER IF EXISTS notify_on_file_upload_trigger ON public.uploaded_files;
CREATE TRIGGER notify_on_file_upload_trigger
  AFTER INSERT ON public.uploaded_files
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_file_upload();

-- ============================================================
-- FIX 2: Allow workspace slug to be updated by owner
-- The existing RLS policy already allows owners to UPDATE workspaces
-- We just need to ensure the slug uniqueness constraint is in place
-- ============================================================

-- Add a function to safely rename a workspace slug
CREATE OR REPLACE FUNCTION public.rename_workspace_slug(
  p_workspace_id UUID,
  p_new_slug TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_owner_id UUID;
  v_slug_exists BOOLEAN;
  v_clean_slug TEXT;
BEGIN
  -- Verify the caller owns this workspace
  SELECT owner_id INTO v_owner_id
  FROM public.workspaces
  WHERE id = p_workspace_id;

  IF v_owner_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Workspace not found');
  END IF;

  IF v_owner_id != auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized');
  END IF;

  -- Clean the slug: lowercase, replace non-alphanumeric with hyphens, trim hyphens
  v_clean_slug := lower(regexp_replace(p_new_slug, '[^a-z0-9]', '-', 'g'));
  v_clean_slug := regexp_replace(v_clean_slug, '-+', '-', 'g');
  v_clean_slug := trim(both '-' from v_clean_slug);

  IF length(v_clean_slug) < 3 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Slug must be at least 3 characters');
  END IF;

  IF length(v_clean_slug) > 50 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Slug must be at most 50 characters');
  END IF;

  -- Check if slug is already taken by another workspace
  SELECT EXISTS(
    SELECT 1 FROM public.workspaces
    WHERE slug = v_clean_slug AND id != p_workspace_id
  ) INTO v_slug_exists;

  IF v_slug_exists THEN
    RETURN jsonb_build_object('success', false, 'error', 'This link name is already taken');
  END IF;

  -- Update the slug
  UPDATE public.workspaces
  SET slug = v_clean_slug, updated_at = CURRENT_TIMESTAMP
  WHERE id = p_workspace_id;

  RETURN jsonb_build_object('success', true, 'slug', v_clean_slug);
END;
$$;

-- ============================================================
-- Upload Notification Webhook
-- Calls send-upload-notification Edge Function on new file upload
-- ============================================================

-- Enable pg_net extension (required for HTTP calls from Postgres)
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- ============================================================
-- Function: notify_on_file_upload
-- Fires after INSERT on uploaded_files, calls Edge Function via HTTP
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
  -- Read project URL and service role key from Vault / app.settings
  -- These are set automatically by Supabase in the function execution context
  project_url := current_setting('app.supabase_url', true);
  service_role_key := current_setting('app.service_role_key', true);

  -- Build payload matching the edge function's expected shape
  payload := jsonb_build_object(
    'type', 'INSERT',
    'table', 'uploaded_files',
    'record', row_to_json(NEW)::jsonb
  );

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

  RETURN NEW;
END;
$$;

-- ============================================================
-- Trigger: after_upload_insert
-- ============================================================
DROP TRIGGER IF EXISTS after_upload_insert ON public.uploaded_files;
CREATE TRIGGER after_upload_insert
  AFTER INSERT ON public.uploaded_files
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_file_upload();

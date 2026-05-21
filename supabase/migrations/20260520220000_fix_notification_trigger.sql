-- ============================================================
-- Fix: Guard against NULL project_url in notify_on_file_upload
-- Prevents: null value in column "url" of relation "http_request_queue"
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
  -- Read project URL and service role key from app settings
  project_url := current_setting('app.supabase_url', true);
  service_role_key := current_setting('app.service_role_key', true);

  -- Guard: skip HTTP call if project_url is not configured
  -- This prevents the "null value in column url" error in http_request_queue
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
EXCEPTION
  WHEN OTHERS THEN
    -- Never let notification errors block the file upload
    RETURN NEW;
END;
$$;

-- ============================================================
-- DSGVO Portal — Full Schema Migration
-- Tables: user_profiles, workspaces, branding_settings, uploaded_files
-- ============================================================

-- ============================================================
-- 1. CORE TABLES
-- ============================================================

-- user_profiles (intermediary for auth.users)
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL DEFAULT '',
  company TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- workspaces (one per user)
CREATE TABLE IF NOT EXISTS public.workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- branding_settings (one per workspace)
CREATE TABLE IF NOT EXISTS public.branding_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL UNIQUE REFERENCES public.workspaces(id) ON DELETE CASCADE,
  portal_title TEXT NOT NULL DEFAULT 'Sicherer Dateiupload',
  welcome_message TEXT NOT NULL DEFAULT 'Laden Sie Ihre Dokumente hier sicher und DSGVO-konform hoch. Kein Login erforderlich.',
  accent_color TEXT NOT NULL DEFAULT '#1a56db',
  auto_delete_days INTEGER NOT NULL DEFAULT 14,
  notify_email TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- uploaded_files (files received by workspace)
CREATE TABLE IF NOT EXISTS public.uploaded_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL DEFAULT 0,
  file_type TEXT NOT NULL DEFAULT 'other',
  storage_path TEXT NOT NULL,
  file_hash TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  expires_at TIMESTAMPTZ,
  downloaded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 2. INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_workspaces_owner_id ON public.workspaces(owner_id);
CREATE INDEX IF NOT EXISTS idx_workspaces_slug ON public.workspaces(slug);
CREATE INDEX IF NOT EXISTS idx_branding_settings_workspace_id ON public.branding_settings(workspace_id);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_workspace_id ON public.uploaded_files(workspace_id);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_expires_at ON public.uploaded_files(expires_at);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_created_at ON public.uploaded_files(created_at);

-- ============================================================
-- 3. FUNCTIONS
-- ============================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

-- Trigger function: create user_profile + workspace + branding on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_workspace_id UUID;
  workspace_slug TEXT;
BEGIN
  -- Insert user profile
  INSERT INTO public.user_profiles (id, email, full_name, company)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'company', '')
  )
  ON CONFLICT (id) DO NOTHING;

  -- Generate unique slug from email prefix
  workspace_slug := lower(regexp_replace(split_part(NEW.email, '@', 1), '[^a-z0-9]', '-', 'g'));
  -- Ensure uniqueness by appending random suffix if needed
  WHILE EXISTS (SELECT 1 FROM public.workspaces WHERE slug = workspace_slug) LOOP
    workspace_slug := workspace_slug || '-' || substr(md5(random()::text), 1, 4);
  END LOOP;

  -- Create workspace
  INSERT INTO public.workspaces (id, owner_id, slug)
  VALUES (gen_random_uuid(), NEW.id, workspace_slug)
  RETURNING id INTO new_workspace_id;

  -- Create default branding settings
  INSERT INTO public.branding_settings (workspace_id, portal_title, welcome_message, notify_email)
  VALUES (
    new_workspace_id,
    COALESCE(NEW.raw_user_meta_data->>'company', 'Sicherer Dateiupload') || ' — Sicherer Dateiupload',
    'Laden Sie Ihre Dokumente hier sicher und DSGVO-konform hoch. Kein Login erforderlich.',
    NEW.email
  );

  RETURN NEW;
END;
$$;

-- ============================================================
-- 4. ENABLE RLS
-- ============================================================

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branding_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uploaded_files ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 5. RLS POLICIES
-- ============================================================

-- user_profiles
DROP POLICY IF EXISTS "users_manage_own_user_profiles" ON public.user_profiles;
CREATE POLICY "users_manage_own_user_profiles"
ON public.user_profiles FOR ALL TO authenticated
USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- workspaces: owner can manage
DROP POLICY IF EXISTS "users_manage_own_workspaces" ON public.workspaces;
CREATE POLICY "users_manage_own_workspaces"
ON public.workspaces FOR ALL TO authenticated
USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

-- workspaces: public can read by slug (for client upload portal)
DROP POLICY IF EXISTS "public_read_workspaces" ON public.workspaces;
CREATE POLICY "public_read_workspaces"
ON public.workspaces FOR SELECT TO public
USING (true);

-- branding_settings: owner can manage via workspace
DROP POLICY IF EXISTS "users_manage_own_branding_settings" ON public.branding_settings;
CREATE POLICY "users_manage_own_branding_settings"
ON public.branding_settings FOR ALL TO authenticated
USING (
  workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid())
)
WITH CHECK (
  workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid())
);

-- branding_settings: public can read (for client portal display)
DROP POLICY IF EXISTS "public_read_branding_settings" ON public.branding_settings;
CREATE POLICY "public_read_branding_settings"
ON public.branding_settings FOR SELECT TO public
USING (true);

-- uploaded_files: owner can manage (view, delete, download)
DROP POLICY IF EXISTS "users_manage_own_uploaded_files" ON public.uploaded_files;
CREATE POLICY "users_manage_own_uploaded_files"
ON public.uploaded_files FOR ALL TO authenticated
USING (
  workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid())
)
WITH CHECK (
  workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid())
);

-- uploaded_files: anonymous users can INSERT (client upload)
DROP POLICY IF EXISTS "anon_insert_uploaded_files" ON public.uploaded_files;
CREATE POLICY "anon_insert_uploaded_files"
ON public.uploaded_files FOR INSERT TO public
WITH CHECK (true);

-- ============================================================
-- 6. TRIGGERS
-- ============================================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS set_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER set_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_workspaces_updated_at ON public.workspaces;
CREATE TRIGGER set_workspaces_updated_at
  BEFORE UPDATE ON public.workspaces
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_branding_settings_updated_at ON public.branding_settings;
CREATE TRIGGER set_branding_settings_updated_at
  BEFORE UPDATE ON public.branding_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 7. STORAGE BUCKET
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'uploads',
  'uploads',
  false,
  52428800, -- 50 MB
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: anyone can upload
DROP POLICY IF EXISTS "anyone_can_upload" ON storage.objects;
CREATE POLICY "anyone_can_upload"
ON storage.objects FOR INSERT TO public
WITH CHECK (bucket_id = 'uploads');

-- Storage RLS: only authenticated owners can read/delete their workspace files
DROP POLICY IF EXISTS "owners_can_read_uploads" ON storage.objects;
CREATE POLICY "owners_can_read_uploads"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'uploads'
  AND (storage.foldername(name))[1] IN (
    SELECT w.slug FROM public.workspaces w WHERE w.owner_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "owners_can_delete_uploads" ON storage.objects;
CREATE POLICY "owners_can_delete_uploads"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'uploads'
  AND (storage.foldername(name))[1] IN (
    SELECT w.slug FROM public.workspaces w WHERE w.owner_id = auth.uid()
  )
);

-- ============================================================
-- 8. MOCK DATA
-- ============================================================

DO $$
DECLARE
  user1_uuid UUID := gen_random_uuid();
  user2_uuid UUID := gen_random_uuid();
  user3_uuid UUID := gen_random_uuid();
  ws1_id UUID := gen_random_uuid();
  ws2_id UUID := gen_random_uuid();
  ws3_id UUID := gen_random_uuid();
BEGIN
  -- Create auth users (trigger will create user_profiles + workspaces + branding)
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    created_at, updated_at, raw_user_meta_data, raw_app_meta_data,
    is_sso_user, is_anonymous, confirmation_token, confirmation_sent_at,
    recovery_token, recovery_sent_at, email_change_token_new, email_change,
    email_change_sent_at, email_change_token_current, email_change_confirm_status,
    reauthentication_token, reauthentication_sent_at, phone, phone_change,
    phone_change_token, phone_change_sent_at
  ) VALUES
    (user1_uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'mueller@stb-portal.de', crypt('Sicher2026!', gen_salt('bf', 10)), now(), now(), now(),
     jsonb_build_object('full_name', 'Klaus Müller', 'company', 'Müller Steuerberatung GmbH'),
     jsonb_build_object('provider', 'email', 'providers', ARRAY['email']::TEXT[]),
     false, false, '', null, '', null, '', '', null, '', 0, '', null, null, '', '', null),
    (user2_uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'wagner@ra-kanzlei.de', crypt('Kanzlei2026!', gen_salt('bf', 10)), now(), now(), now(),
     jsonb_build_object('full_name', 'Dr. Anna Wagner', 'company', 'Kanzlei Wagner & Partner'),
     jsonb_build_object('provider', 'email', 'providers', ARRAY['email']::TEXT[]),
     false, false, '', null, '', null, '', '', null, '', 0, '', null, null, '', '', null),
    (user3_uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'hoffmann@immobilien.de', crypt('Makler2026!', gen_salt('bf', 10)), now(), now(), now(),
     jsonb_build_object('full_name', 'Thomas Hoffmann', 'company', 'Hoffmann Immobilien KG'),
     jsonb_build_object('provider', 'email', 'providers', ARRAY['email']::TEXT[]),
     false, false, '', null, '', null, '', '', null, '', 0, '', null, null, '', '', null)
  ON CONFLICT (id) DO NOTHING;

  -- Get workspace IDs created by trigger for user1
  SELECT id INTO ws1_id FROM public.workspaces WHERE owner_id = user1_uuid LIMIT 1;
  SELECT id INTO ws2_id FROM public.workspaces WHERE owner_id = user2_uuid LIMIT 1;
  SELECT id INTO ws3_id FROM public.workspaces WHERE owner_id = user3_uuid LIMIT 1;

  -- Insert sample uploaded files for user1's workspace
  IF ws1_id IS NOT NULL THEN
    INSERT INTO public.uploaded_files (
      workspace_id, file_name, file_size, file_type, storage_path, file_hash, status, expires_at, created_at
    ) VALUES
      (ws1_id, 'Steuerbescheid_2024_Mustermann.pdf', 2516582, 'pdf', 'mueller-stb/Steuerbescheid_2024_Mustermann.pdf', 'a3f8c1d2', 'new', now() + interval '12 days', now() - interval '1 hour'),
      (ws1_id, 'Lohnabrechnung_April_2026.pdf', 854016, 'pdf', 'mueller-stb/Lohnabrechnung_April_2026.pdf', 'b7e2a9f4', 'new', now() + interval '12 days', now() - interval '3 hours'),
      (ws1_id, 'Personalausweis_Vorderseite.jpg', 1153434, 'image', 'mueller-stb/Personalausweis_Vorderseite.jpg', 'c1d5f3a8', 'new', now() + interval '2 days', now() - interval '1 day'),
      (ws1_id, 'Mietvertrag_Hauptstrasse_12.docx', 455680, 'docx', 'mueller-stb/Mietvertrag_Hauptstrasse_12.docx', 'd4b2e7c9', 'new', now() + interval '1 day', now() - interval '2 days'),
      (ws1_id, 'Kontoauszug_März_April_2026.pdf', 3355443, 'pdf', 'mueller-stb/Kontoauszug_März_April_2026.pdf', 'e9c3a1d6', 'downloaded', now() + interval '11 days', now() - interval '3 days'),
      (ws1_id, 'Rentenversicherungsbescheid.pdf', 1887437, 'pdf', 'mueller-stb/Rentenversicherungsbescheid.pdf', 'f2d7b5c3', 'new', now() + interval '10 days', now() - interval '4 days'),
      (ws1_id, 'Grundbuchauszug_Objekt_44.pdf', 5872025, 'pdf', 'mueller-stb/Grundbuchauszug_Objekt_44.pdf', 'a8f1e4d2', 'new', now() + interval '9 days', now() - interval '5 days'),
      (ws1_id, 'Vollmacht_unterzeichnet.pdf', 215040, 'pdf', 'mueller-stb/Vollmacht_unterzeichnet.pdf', 'c7d4f2b8', 'downloaded', now() + interval '7 days', now() - interval '7 days')
    ON CONFLICT (id) DO NOTHING;
  END IF;

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Mock data insertion failed: %', SQLERRM;
END $$;

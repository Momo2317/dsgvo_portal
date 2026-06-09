-- Team members: skip personal workspace on invite signup, share owner portals/files

CREATE OR REPLACE FUNCTION public.get_accessible_workspace_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT w.id
  FROM public.workspaces w
  WHERE w.owner_id = auth.uid()
  UNION
  SELECT tm.workspace_id
  FROM public.team_members tm
  WHERE tm.member_user_id = auth.uid()
    AND tm.status = 'active'
    AND tm.workspace_id IS NOT NULL
  UNION
  SELECT w.id
  FROM public.team_members tm
  JOIN public.workspaces w ON w.owner_id = tm.owner_id
  WHERE tm.member_user_id = auth.uid()
    AND tm.status = 'active'
    AND tm.workspace_id IS NULL;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_workspace_id UUID;
  workspace_slug TEXT;
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name, company)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'company', '')
  )
  ON CONFLICT (id) DO NOTHING;

  -- Invited team members join an existing account — no personal portal
  IF EXISTS (
    SELECT 1 FROM public.team_members
    WHERE lower(member_email) = lower(NEW.email)
  ) THEN
    RETURN NEW;
  END IF;

  workspace_slug := lower(regexp_replace(split_part(NEW.email, '@', 1), '[^a-z0-9]', '-', 'g'));
  WHILE EXISTS (SELECT 1 FROM public.workspaces WHERE slug = workspace_slug) LOOP
    workspace_slug := workspace_slug || '-' || substr(md5(random()::text), 1, 4);
  END LOOP;

  INSERT INTO public.workspaces (id, owner_id, slug)
  VALUES (gen_random_uuid(), NEW.id, workspace_slug)
  RETURNING id INTO new_workspace_id;

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

DROP POLICY IF EXISTS "team_members_manage_team_branding" ON public.branding_settings;
CREATE POLICY "team_members_manage_team_branding"
  ON public.branding_settings FOR ALL TO authenticated
  USING (workspace_id IN (SELECT public.get_accessible_workspace_ids()))
  WITH CHECK (workspace_id IN (SELECT public.get_accessible_workspace_ids()));

DROP POLICY IF EXISTS "team_members_manage_team_files" ON public.uploaded_files;
CREATE POLICY "team_members_manage_team_files"
  ON public.uploaded_files FOR ALL TO authenticated
  USING (workspace_id IN (SELECT public.get_accessible_workspace_ids()))
  WITH CHECK (workspace_id IN (SELECT public.get_accessible_workspace_ids()));

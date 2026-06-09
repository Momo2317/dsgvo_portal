-- Kanzlei plan: multiple portals per account + team members

ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  member_email TEXT NOT NULL,
  member_user_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (owner_id, member_email)
);

CREATE INDEX IF NOT EXISTS idx_team_members_owner_id ON public.team_members(owner_id);
CREATE INDEX IF NOT EXISTS idx_team_members_member_user_id ON public.team_members(member_user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_email ON public.team_members(member_email);

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owners_manage_team_members" ON public.team_members;
CREATE POLICY "owners_manage_team_members"
  ON public.team_members FOR ALL TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "members_read_own_team_row" ON public.team_members;
CREATE POLICY "members_read_own_team_row"
  ON public.team_members FOR SELECT TO authenticated
  USING (member_user_id = auth.uid());

-- Create additional workspace with plan limit check
CREATE OR REPLACE FUNCTION public.create_workspace_for_owner(
  p_name TEXT,
  p_slug TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_id UUID := auth.uid();
  v_plan TEXT := 'starter';
  v_max_portals INTEGER := 1;
  v_current_count INTEGER;
  v_clean_slug TEXT;
  v_workspace_id UUID;
  v_owner_email TEXT;
BEGIN
  IF v_owner_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT plan INTO v_plan
  FROM public.subscriptions
  WHERE user_id = v_owner_id
    AND status IN ('active', 'trialing')
  ORDER BY created_at DESC
  LIMIT 1;

  v_plan := COALESCE(v_plan, 'starter');
  v_max_portals := CASE v_plan
    WHEN 'premium' THEN -1
    WHEN 'kanzlei' THEN 5
    ELSE 1
  END;

  SELECT COUNT(*) INTO v_current_count
  FROM public.workspaces
  WHERE owner_id = v_owner_id;

  IF v_max_portals >= 0 AND v_current_count >= v_max_portals THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', format('Ihr Plan erlaubt maximal %s Upload-Link(s).', v_max_portals)
    );
  END IF;

  v_clean_slug := COALESCE(
    NULLIF(trim(p_slug), ''),
    regexp_replace(
      lower(COALESCE(NULLIF(trim(p_name), ''), 'portal')),
      '[^a-z0-9]+',
      '-',
      'g'
    )
  );
  v_clean_slug := regexp_replace(v_clean_slug, '-+', '-', 'g');
  v_clean_slug := trim(both '-' from v_clean_slug);

  IF v_clean_slug = '' THEN
    v_clean_slug := 'portal';
  END IF;

  WHILE EXISTS (SELECT 1 FROM public.workspaces WHERE slug = v_clean_slug) LOOP
    v_clean_slug := v_clean_slug || '-' || substr(md5(random()::text), 1, 4);
  END LOOP;

  INSERT INTO public.workspaces (owner_id, slug, name)
  VALUES (v_owner_id, v_clean_slug, COALESCE(NULLIF(trim(p_name), ''), 'Upload-Portal'))
  RETURNING id INTO v_workspace_id;

  SELECT email INTO v_owner_email FROM public.user_profiles WHERE id = v_owner_id;

  INSERT INTO public.branding_settings (workspace_id, portal_title, welcome_message, notify_email)
  VALUES (
    v_workspace_id,
    COALESCE(NULLIF(trim(p_name), ''), 'Upload-Portal') || ' — Sicherer Dateiupload',
    'Laden Sie Ihre Dokumente hier sicher und DSGVO-konform hoch. Kein Login erforderlich.',
    v_owner_email
  );

  RETURN jsonb_build_object(
    'success', true,
    'workspace_id', v_workspace_id,
    'slug', v_clean_slug
  );
END;
$$;

-- Invite team member with plan limit check
CREATE OR REPLACE FUNCTION public.invite_team_member(
  p_email TEXT,
  p_workspace_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_id UUID := auth.uid();
  v_plan TEXT := 'starter';
  v_max_users INTEGER := 1;
  v_current_count INTEGER;
  v_email TEXT := lower(trim(p_email));
  v_existing_user_id UUID;
BEGIN
  IF v_owner_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  IF v_email = '' OR v_email !~ '^[^@]+@[^@]+\.[^@]+$' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Ungültige E-Mail-Adresse');
  END IF;

  SELECT plan INTO v_plan
  FROM public.subscriptions
  WHERE user_id = v_owner_id
    AND status IN ('active', 'trialing')
  ORDER BY created_at DESC
  LIMIT 1;

  v_plan := COALESCE(v_plan, 'starter');
  v_max_users := CASE v_plan
    WHEN 'premium' THEN -1
    WHEN 'kanzlei' THEN 5
    ELSE 1
  END;

  IF v_max_users >= 0 AND v_max_users <= 1 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Teammitglieder sind im Starter-Plan nicht verfügbar. Bitte upgraden Sie auf Kanzlei.'
    );
  END IF;

  -- Owner + active/pending members
  SELECT 1 + COUNT(*) INTO v_current_count
  FROM public.team_members
  WHERE owner_id = v_owner_id;

  IF v_max_users >= 0 AND v_current_count >= v_max_users THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', format('Maximal %s Benutzer im aktuellen Plan.', v_max_users)
    );
  END IF;

  IF p_workspace_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.workspaces WHERE id = p_workspace_id AND owner_id = v_owner_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Ungültiges Portal');
  END IF;

  SELECT id INTO v_existing_user_id FROM public.user_profiles WHERE lower(email) = v_email LIMIT 1;

  INSERT INTO public.team_members (owner_id, member_email, member_user_id, workspace_id, status)
  VALUES (
    v_owner_id,
    v_email,
    v_existing_user_id,
    p_workspace_id,
    CASE WHEN v_existing_user_id IS NOT NULL THEN 'active' ELSE 'pending' END
  )
  ON CONFLICT (owner_id, member_email) DO UPDATE
  SET workspace_id = COALESCE(EXCLUDED.workspace_id, team_members.workspace_id),
      member_user_id = COALESCE(EXCLUDED.member_user_id, team_members.member_user_id),
      status = CASE
        WHEN team_members.member_user_id IS NOT NULL OR EXCLUDED.member_user_id IS NOT NULL THEN 'active'
        ELSE 'pending'
      END;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- Link pending invites when invited user signs in
CREATE OR REPLACE FUNCTION public.link_team_invites_for_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_email TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

  SELECT lower(email) INTO v_email FROM public.user_profiles WHERE id = v_user_id;
  IF v_email IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.team_members
  SET member_user_id = v_user_id, status = 'active'
  WHERE lower(member_email) = v_email
    AND (member_user_id IS NULL OR status = 'pending');
END;
$$;

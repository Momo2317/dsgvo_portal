-- Fix slug generation: lowercase BEFORE stripping non-alphanumeric chars
-- (uppercase letters were incorrectly removed when lower() ran after regexp_replace)

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

CREATE OR REPLACE FUNCTION public.rename_workspace_slug(
  p_workspace_id UUID,
  p_new_slug TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_id UUID;
  v_slug_exists BOOLEAN;
  v_clean_slug TEXT;
BEGIN
  SELECT owner_id INTO v_owner_id
  FROM public.workspaces
  WHERE id = p_workspace_id;

  IF v_owner_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Workspace not found');
  END IF;

  IF v_owner_id != auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized');
  END IF;

  v_clean_slug := regexp_replace(lower(trim(p_new_slug)), '[^a-z0-9]+', '-', 'g');
  v_clean_slug := regexp_replace(v_clean_slug, '-+', '-', 'g');
  v_clean_slug := trim(both '-' from v_clean_slug);

  IF length(v_clean_slug) < 3 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Slug must be at least 3 characters');
  END IF;

  IF length(v_clean_slug) > 50 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Slug must be at most 50 characters');
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.workspaces
    WHERE slug = v_clean_slug AND id != p_workspace_id
  ) INTO v_slug_exists;

  IF v_slug_exists THEN
    RETURN jsonb_build_object('success', false, 'error', 'This link name is already taken');
  END IF;

  UPDATE public.workspaces
  SET slug = v_clean_slug, updated_at = CURRENT_TIMESTAMP
  WHERE id = p_workspace_id;

  RETURN jsonb_build_object('success', true, 'slug', v_clean_slug);
END;
$$;

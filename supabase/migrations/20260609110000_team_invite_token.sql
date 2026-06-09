-- Secure team invite links with unique tokens

ALTER TABLE public.team_members
  ADD COLUMN IF NOT EXISTS invite_token UUID NOT NULL DEFAULT gen_random_uuid();

CREATE UNIQUE INDEX IF NOT EXISTS idx_team_members_invite_token
  ON public.team_members(invite_token);

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
  v_token UUID := gen_random_uuid();
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

  INSERT INTO public.team_members (
    owner_id, member_email, member_user_id, workspace_id, status, invite_token
  )
  VALUES (
    v_owner_id,
    v_email,
    v_existing_user_id,
    p_workspace_id,
    CASE WHEN v_existing_user_id IS NOT NULL THEN 'active' ELSE 'pending' END,
    v_token
  )
  ON CONFLICT (owner_id, member_email) DO UPDATE
  SET workspace_id = COALESCE(EXCLUDED.workspace_id, team_members.workspace_id),
      member_user_id = COALESCE(EXCLUDED.member_user_id, team_members.member_user_id),
      invite_token = v_token,
      status = CASE
        WHEN team_members.member_user_id IS NOT NULL OR EXCLUDED.member_user_id IS NOT NULL THEN 'active'
        ELSE 'pending'
      END;

  RETURN jsonb_build_object('success', true, 'invite_token', v_token);
END;
$$;

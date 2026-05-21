-- ─── Subscriptions & Plan Limits ─────────────────────────────────────────────
-- Migration: 20260521100000_subscriptions_and_plans.sql

-- Plan type enum
DROP TYPE IF EXISTS public.plan_type CASCADE;
CREATE TYPE public.plan_type AS ENUM ('starter', 'kanzlei', 'premium');

DROP TYPE IF EXISTS public.billing_interval CASCADE;
CREATE TYPE public.billing_interval AS ENUM ('monthly', 'yearly');

DROP TYPE IF EXISTS public.subscription_status CASCADE;
CREATE TYPE public.subscription_status AS ENUM ('active', 'canceled', 'past_due', 'trialing', 'incomplete');

-- Subscriptions table
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  plan public.plan_type NOT NULL DEFAULT 'starter'::public.plan_type,
  billing_interval public.billing_interval NOT NULL DEFAULT 'monthly'::public.billing_interval,
  status public.subscription_status NOT NULL DEFAULT 'active'::public.subscription_status,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  stripe_price_id TEXT,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer_id ON public.subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id ON public.subscriptions(stripe_subscription_id);

-- RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_view_own_subscriptions" ON public.subscriptions;
CREATE POLICY "users_view_own_subscriptions"
  ON public.subscriptions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "users_insert_own_subscriptions" ON public.subscriptions;
CREATE POLICY "users_insert_own_subscriptions"
  ON public.subscriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "users_update_own_subscriptions" ON public.subscriptions;
CREATE POLICY "users_update_own_subscriptions"
  ON public.subscriptions
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Function to get plan limits
CREATE OR REPLACE FUNCTION public.get_plan_limits(p_plan public.plan_type)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  CASE p_plan
    WHEN 'starter' THEN
      RETURN jsonb_build_object(
        'max_users', 1,
        'max_portals', 1,
        'storage_gb', 10,
        'max_file_size_mb', 20,
        'custom_domain', false,
        'auto_delete_days', 14
      );
    WHEN 'kanzlei' THEN
      RETURN jsonb_build_object(
        'max_users', 5,
        'max_portals', 5,
        'storage_gb', 50,
        'max_file_size_mb', 100,
        'custom_domain', true,
        'auto_delete_days', 14
      );
    WHEN 'premium' THEN
      RETURN jsonb_build_object(
        'max_users', -1,
        'max_portals', -1,
        'storage_gb', 250,
        'max_file_size_mb', -1,
        'custom_domain', true,
        'auto_delete_days', 14
      );
    ELSE
      RETURN jsonb_build_object(
        'max_users', 1,
        'max_portals', 1,
        'storage_gb', 10,
        'max_file_size_mb', 20,
        'custom_domain', false,
        'auto_delete_days', 14
      );
  END CASE;
END;
$$;

-- Function to get current user's active plan
CREATE OR REPLACE FUNCTION public.get_user_plan(p_user_id UUID)
RETURNS public.plan_type
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_plan public.plan_type;
BEGIN
  SELECT plan INTO v_plan
  FROM public.subscriptions
  WHERE user_id = p_user_id
    AND status IN ('active', 'trialing')
  ORDER BY created_at DESC
  LIMIT 1;

  RETURN COALESCE(v_plan, 'starter'::public.plan_type);
END;
$$;

-- Updated_at trigger for subscriptions
CREATE OR REPLACE FUNCTION public.update_subscriptions_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_subscriptions_updated_at();

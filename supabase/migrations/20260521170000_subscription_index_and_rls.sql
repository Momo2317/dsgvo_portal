-- Migration: add subscription_required_redirect support
-- This migration ensures the subscriptions table has the correct structure
-- and adds an index for fast user subscription lookups

-- Ensure subscriptions table exists with correct columns (idempotent)
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan text NOT NULL DEFAULT 'starter',
  billing_interval text NOT NULL DEFAULT 'monthly',
  status text NOT NULL DEFAULT 'incomplete',
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast subscription lookup by user_id + status (used in middleware)
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status
  ON public.subscriptions(user_id, status);

-- Enable RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can read their own subscription
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'subscriptions' AND policyname = 'Users can view own subscription'
  ) THEN
    CREATE POLICY "Users can view own subscription"
      ON public.subscriptions
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Service role can upsert subscriptions (webhook)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'subscriptions' AND policyname = 'Service role can manage subscriptions'
  ) THEN
    CREATE POLICY "Service role can manage subscriptions"
      ON public.subscriptions
      FOR ALL
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

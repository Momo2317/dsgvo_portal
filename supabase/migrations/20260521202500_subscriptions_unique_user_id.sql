-- Migration: add unique constraint on subscriptions.user_id
-- Required for upsert with onConflict: 'user_id' to work correctly

-- Add unique constraint on user_id so that each user has at most one subscription row
-- This enables the upsert (ON CONFLICT user_id) in verify-payment route
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_user_id_unique'
  ) THEN
    ALTER TABLE public.subscriptions
      ADD CONSTRAINT subscriptions_user_id_unique UNIQUE (user_id);
  END IF;
END $$;

import type { User } from '@supabase/supabase-js';
import { createClient, ensureSessionRestored } from './client';
import { clearSessionTokens } from './session-storage';

/** Returns the current user after session restore, or null if unauthenticated. */
export async function getAuthenticatedUser(): Promise<User | null> {
  await ensureSessionRestored();
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error) {
    clearSessionTokens();
    await supabase.auth.signOut();
    return null;
  }

  return user;
}

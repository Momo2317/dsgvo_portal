import { createBrowserClient } from '@supabase/ssr';
import { persistSessionTokens, restoreSessionFromStorage } from './session-storage';

let _client: ReturnType<typeof createBrowserClient> | null = null;
let _restorePromise: Promise<boolean> | null = null;

export function createClient() {
  if (!_client) {
    _client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    if (typeof window !== 'undefined') {
      _restorePromise = restoreSessionFromStorage(_client);

      _client.auth.onAuthStateChange((_event, session) => {
        if (!session) return;
        const remember =
          localStorage.getItem('sb_remember_me') === 'true' ||
          sessionStorage.getItem('sb_remember_me') === 'true';
        persistSessionTokens(session, remember);
      });
    }
  }

  return _client;
}

/** Wait for a stored session to be restored (e.g. after Stripe redirect). */
export async function ensureSessionRestored() {
  if (_restorePromise) {
    await _restorePromise;
    _restorePromise = null;
  }
}

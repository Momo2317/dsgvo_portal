import { createBrowserClient } from '@supabase/ssr';
import {
  clearSessionTokens,
  persistSessionTokens,
  restoreSessionFromStorage,
} from './session-storage';

let _client: ReturnType<typeof createBrowserClient> | null = null;
let _restorePromise: Promise<void> | null = null;

async function initSession(client: ReturnType<typeof createBrowserClient>) {
  const restored = await restoreSessionFromStorage(client);
  if (!restored) return;

  const { error } = await client.auth.getUser();
  if (error) {
    clearSessionTokens();
    await client.auth.signOut();
  }
}

export function createClient() {
  if (!_client) {
    _client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    if (typeof window !== 'undefined') {
      _restorePromise = initSession(_client);

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

/** Wait for stored session restore (and validation) to finish. */
export async function ensureSessionRestored() {
  createClient();
  if (_restorePromise) {
    await _restorePromise;
  }
}

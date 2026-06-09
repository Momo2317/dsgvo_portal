const KEYS = {
  remember: 'sb_remember_me',
  access: 'sb_access_token',
  refresh: 'sb_refresh_token',
} as const;

function getStorage(remember: boolean): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return remember ? localStorage : sessionStorage;
  } catch {
    return null;
  }
}

export function persistSessionTokens(
  session: { access_token: string; refresh_token: string },
  remember = true
) {
  const storage = getStorage(remember);
  if (!storage) return;

  try {
    const other = remember ? sessionStorage : localStorage;
    other.removeItem(KEYS.remember);
    other.removeItem(KEYS.access);
    other.removeItem(KEYS.refresh);

    storage.setItem(KEYS.remember, remember ? 'true' : 'false');
    storage.setItem(KEYS.access, session.access_token);
    storage.setItem(KEYS.refresh, session.refresh_token);
  } catch {
    // storage unavailable
  }
}

export function clearSessionTokens() {
  for (const storage of [localStorage, sessionStorage]) {
    try {
      storage.removeItem(KEYS.remember);
      storage.removeItem(KEYS.access);
      storage.removeItem(KEYS.refresh);
    } catch {
      // ignore
    }
  }
}

export function readStoredTokens(): {
  access: string;
  refresh: string;
} | null {
  for (const storage of [localStorage, sessionStorage]) {
    try {
      const access = storage.getItem(KEYS.access);
      const refresh = storage.getItem(KEYS.refresh);
      if (access && refresh) {
        return { access, refresh };
      }
    } catch {
      // ignore
    }
  }
  return null;
}

export async function restoreSessionFromStorage(
  client: { auth: { setSession: (s: { access_token: string; refresh_token: string }) => Promise<{ data: { session: any }; error: any }> } }
): Promise<boolean> {
  const tokens = readStoredTokens();
  if (!tokens) return false;

  const { data, error } = await client.auth.setSession({
    access_token: tokens.access,
    refresh_token: tokens.refresh,
  });

  if (error || !data.session) {
    clearSessionTokens();
    return false;
  }

  const remember =
    localStorage.getItem(KEYS.remember) === 'true' ||
    sessionStorage.getItem(KEYS.remember) === 'true';
  persistSessionTokens(data.session, remember);
  return true;
}

import { createBrowserClient } from '@supabase/ssr';

const PFX = 'sb_';

const canUseCookies = (() => {
  let cache: boolean | null = null;
  return () => {
    if (typeof document === 'undefined') return false;
    if (cache !== null) return cache;
    const k = '__sb_test__';
    document.cookie = `${k}=1; Path=/; SameSite=None; Secure; Partitioned`;
    cache = document.cookie.includes(k);
    document.cookie = `${k}=; Path=/; Max-Age=0; SameSite=None; Secure`;
    return cache;
  };
})();

const fromCookies = () =>
  typeof document === 'undefined'
    ? []
    : document.cookie
        .split(';')
        .filter(Boolean)
        .map((c) => {
          const trimmed = c.trim();
          const idx = trimmed.indexOf('=');
          const name = idx !== -1 ? trimmed.slice(0, idx) : trimmed;
          const value = idx !== -1 ? decodeURIComponent(trimmed.slice(idx + 1)) : '';
          return { name: name.trim(), value };
        })
        .filter((c) => c.name);

const fromStorage = () => {
  try {
    return Object.keys(localStorage)
      .filter((k) => k.startsWith(PFX))
      .map((k) => ({ name: k.slice(PFX.length), value: localStorage.getItem(k) || '' }));
  } catch {
    return [];
  }
};

const setCookie = (name: string, value: string, options?: any) => {
  let s = `${name}=${encodeURIComponent(value)}; Path=${options?.path || '/'}; SameSite=None; Secure; Partitioned`;
  if (options?.maxAge) s += `; Max-Age=${options.maxAge}`;
  if (options?.domain) s += `; Domain=${options.domain}`;
  if (options?.expires) s += `; Expires=${new Date(options.expires).toUTCString()}`;
  document.cookie = s;
};

const deleteCookie = (name: string) => {
  if (typeof document === 'undefined') return;
  const host = typeof window !== 'undefined' ? window.location.hostname : '';
  const domains = ['', host, host ? `.${host}` : ''].filter(Boolean);
  const variants = [
    'Path=/; SameSite=Lax',
    'Path=/; SameSite=None; Secure',
    'Path=/; SameSite=None; Secure; Partitioned',
  ];
  variants.forEach((attrs) => {
    document.cookie = `${name}=; Max-Age=0; ${attrs}`;
    domains.forEach((domain) => {
      document.cookie = `${name}=; Max-Age=0; Domain=${domain}; ${attrs}`;
    });
  });
};

const getToken = () =>
  (canUseCookies() ? fromCookies() : fromStorage()).find((c) =>
    c.name.includes('auth-token')
  )?.value ?? null;

if (typeof window !== 'undefined' && !(window as any).__sb_patched__) {
  (window as any).__sb_patched__ = true;
  const orig = window.fetch.bind(window);
  window.fetch = (input, init) => {
    const token = getToken();
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
        ? input.href
        : (input as Request).url;
    if (token && (url.startsWith('/') || url.startsWith(window.location.origin))) {
      init = { ...(init || {}), headers: { ...(init?.headers || {}), 'x-sb-token': token } };
    }
    return orig(input, init);
  };
}

let _client: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  if (_client) return _client;

  _client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => (canUseCookies() ? fromCookies() : fromStorage()),
        setAll(cookiesToSet) {
          if (typeof document === 'undefined') return;
          if (canUseCookies()) {
            cookiesToSet.forEach(({ name, value, options }) =>
              value ? setCookie(name, value, options) : deleteCookie(name)
            );
          } else {
            cookiesToSet.forEach(({ name, value, options }) => {
              try {
                value
                  ? localStorage.setItem(`${PFX}${name}`, value)
                  : localStorage.removeItem(`${PFX}${name}`);
              } catch {}
              if (value) setCookie(name, value, options);
            });
          }
        },
      },
    }
  );

  // Restore session from localStorage if cookies are blocked and remember_me is set
  if (typeof window !== 'undefined') {
    try {
      const rememberMe = localStorage.getItem('sb_remember_me');
      const accessToken = localStorage.getItem('sb_access_token');
      const refreshToken = localStorage.getItem('sb_refresh_token');
      if (rememberMe === 'true' && accessToken && refreshToken) {
        // Restore the session silently — Supabase will refresh if expired
        _client.auth.setSession({ access_token: accessToken, refresh_token: refreshToken }).catch(() => {
          // If restore fails, clear stale tokens
          localStorage.removeItem('sb_remember_me');
          localStorage.removeItem('sb_access_token');
          localStorage.removeItem('sb_refresh_token');
        });
      }
    } catch {
      // localStorage not available
    }
  }

  return _client;
}

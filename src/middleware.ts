import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

function getProjectRef(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  return url.match(/https:\/\/([^.]+)\./)?.[1] ?? '';
}

function injectTokenFromHeader(request: NextRequest): void {
  const token = request.headers.get('x-sb-token');
  if (!token) return;
  const hasCookie = request.cookies.getAll().some((c) => c.name.includes('auth-token'));
  if (hasCookie) return;
  request.cookies.set(`sb-${getProjectRef()}-auth-token`, token);
}

function loginRedirect(request: NextRequest) {
  const url = request.nextUrl.clone();
  const returnPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  url.pathname = '/sign-up-login-screen';
  url.search = '';
  if (returnPath && returnPath !== '/sign-up-login-screen') {
    url.searchParams.set('next', returnPath);
  }
  return NextResponse.redirect(url);
}

export async function middleware(request: NextRequest) {
  injectTokenFromHeader(request);
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Public post-payment page — no auth required (session restored client-side)
  if (pathname.startsWith('/payment/success')) {
    return supabaseResponse;
  }

  // Team invite registration — public
  if (pathname.startsWith('/einladung/')) {
    return supabaseResponse;
  }

  async function hasDashboardAccess(userId: string) {
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('status')
      .eq('user_id', userId)
      .in('status', ['active', 'trialing'])
      .maybeSingle();

    if (subscription) return true;

    const { data: teamMember } = await supabase
      .from('team_members')
      .select('id')
      .eq('member_user_id', userId)
      .eq('status', 'active')
      .maybeSingle();

    return Boolean(teamMember);
  }

  // Already logged in — skip login screen
  if (user && pathname.startsWith('/sign-up-login-screen')) {
    const next = request.nextUrl.searchParams.get('next');
    if (next && next.startsWith('/') && !next.startsWith('//')) {
      return NextResponse.redirect(new URL(next, request.url));
    }

    const url = request.nextUrl.clone();
    url.pathname = (await hasDashboardAccess(user.id)) ? '/dashboard' : '/choose-plan';
    url.search = '';
    return NextResponse.redirect(url);
  }

  // Not logged in → redirect to sign-in
  if (!user && pathname.startsWith('/dashboard')) {
    return loginRedirect(request);
  }

  if (!user && pathname.startsWith('/choose-plan')) {
    return loginRedirect(request);
  }

  async function isActiveTeamMember(userId: string) {
    const { data: teamMember } = await supabase
      .from('team_members')
      .select('id')
      .eq('member_user_id', userId)
      .eq('status', 'active')
      .maybeSingle();

    return Boolean(teamMember);
  }

  if (user && pathname.startsWith('/choose-plan')) {
    if (await hasDashboardAccess(user.id)) {
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      url.search = '';
      return NextResponse.redirect(url);
    }
  }

  if (
    user &&
    (pathname.startsWith('/dashboard/billing') ||
      pathname.startsWith('/dashboard/team') ||
      pathname.startsWith('/dashboard/portals'))
  ) {
    if (await isActiveTeamMember(user.id)) {
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      url.search = '';
      return NextResponse.redirect(url);
    }
  }

  // Logged in but accessing dashboard → check subscription
  if (user && pathname.startsWith('/dashboard')) {

    const subscriptionSuccess = request.nextUrl.searchParams.get('subscription') === 'success';
    const hasSessionId = request.nextUrl.searchParams.has('session_id');
    if (subscriptionSuccess || hasSessionId) {
      return supabaseResponse;
    }

    if (pathname.startsWith('/api/verify-payment')) {
      return supabaseResponse;
    }

    if (!(await hasDashboardAccess(user.id))) {
      const url = request.nextUrl.clone();
      url.pathname = '/choose-plan';
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

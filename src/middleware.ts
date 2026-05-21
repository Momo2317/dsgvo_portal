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

  // Not logged in → redirect to sign-in
  if (!user && pathname.startsWith('/dashboard')) {
    const url = request.nextUrl.clone();
    url.pathname = '/sign-up-login-screen';
    return NextResponse.redirect(url);
  }

  // Not logged in → redirect to sign-in for choose-plan too
  if (!user && pathname.startsWith('/choose-plan')) {
    const url = request.nextUrl.clone();
    url.pathname = '/sign-up-login-screen';
    return NextResponse.redirect(url);
  }

  // Logged in but accessing dashboard → check subscription
  if (user && pathname.startsWith('/dashboard')) {
    // Allow billing page always (so user can subscribe/manage)
    if (pathname.startsWith('/dashboard/billing')) {
      return supabaseResponse;
    }

    // Allow through when returning from a successful Stripe checkout
    // The dashboard page itself will poll until the subscription is confirmed
    const subscriptionSuccess = request.nextUrl.searchParams.get('subscription') === 'success';
    const hasSessionId = request.nextUrl.searchParams.has('session_id');
    if (subscriptionSuccess || hasSessionId) {
      return supabaseResponse;
    }

    // Allow API verify-payment route (called from client during post-payment confirmation)
    if (pathname.startsWith('/api/verify-payment')) {
      return supabaseResponse;
    }

    // Check for active subscription
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('status')
      .eq('user_id', user.id)
      .in('status', ['active', 'trialing'])
      .maybeSingle();

    if (!subscription) {
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

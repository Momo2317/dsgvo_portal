'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { createClient, ensureSessionRestored } from '@/lib/supabase/client';

function PaymentSuccessInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams?.get('session_id');
  const [statusText, setStatusText] = useState('Zahlung wird bestätigt…');
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      // Restore auth session from storage (survives Stripe redirect)
      await ensureSessionRestored();
      const supabase = createClient();
      await supabase.auth.getSession();

      if (!sessionId) {
        router.replace('/dashboard');
        return;
      }

      let tries = 0;
      const MAX_TRIES = 12;

      const verify = async () => {
        if (cancelled) return;
        tries++;

        try {
          const res = await fetch(`/api/verify-payment?session_id=${sessionId}`);
          if (res.ok) {
            const data = await res.json();
            if (data?.status === 'active') {
              setStatusText('Abonnement aktiviert!');
              setDone(true);
              setTimeout(() => {
                if (!cancelled) router.replace('/dashboard');
              }, 1200);
              return;
            }
          }
        } catch (err) {
          console.error('verify-payment error:', err);
        }

        if (tries >= MAX_TRIES) {
          const { data: { user } } = await supabase.auth.getUser();
          if (!cancelled) {
            router.replace(user ? '/dashboard' : `/sign-up-login-screen?next=${encodeURIComponent('/dashboard')}`);
          }
          return;
        }

        setTimeout(verify, 2000);
      };

      verify();
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [router, sessionId]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-5">
      {done ? (
        <CheckCircle2 size={36} className="text-accent" />
      ) : (
        <Loader2 size={36} className="animate-spin text-primary" />
      )}
      <p className="text-base font-medium text-foreground">{statusText}</p>
      {!done && (
        <p className="text-sm text-muted-foreground">Bitte einen Moment warten…</p>
      )}
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Loader2 size={28} className="animate-spin text-primary" />
        </div>
      }
    >
      <PaymentSuccessInner />
    </Suspense>
  );
}

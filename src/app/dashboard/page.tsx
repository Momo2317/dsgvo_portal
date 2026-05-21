'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, CheckCircle2 } from 'lucide-react';
import DashboardLayout from './components/DashboardLayout';

function SubscriptionConfirming() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams?.get('session_id');
  const [statusText, setStatusText] = useState('Zahlung wird bestätigt…');
  const [done, setDone] = useState(false);

  useEffect(() => {
    // If no session_id, subscription was already confirmed (e.g. webhook fired)
    // Just clean the URL and show the dashboard
    if (!sessionId) {
      router?.replace('/dashboard');
      return;
    }

    let cancelled = false;
    let tries = 0;
    const MAX_TRIES = 10; // 10 × 2.5s = 25s max

    const verify = async () => {
      if (cancelled) return;
      tries++;

      try {
        const res = await fetch(`/api/verify-payment?session_id=${sessionId}`);
        if (res?.ok) {
          const data = await res?.json();

          if (data?.status === 'active') {
            if (!cancelled) {
              setStatusText('Abonnement aktiviert!');
              setDone(true);
              setTimeout(() => {
                if (!cancelled) router?.replace('/dashboard');
              }, 1200);
            }
            return;
          }

          // If there's an error from the API (e.g. missing keys), still let user in
          if (data?.error) {
            console.warn('verify-payment returned error:', data?.error);
            // After a few tries with errors, just redirect to dashboard
            if (tries >= 3) {
              if (!cancelled) router?.replace('/dashboard');
              return;
            }
          }
        } else {
          // Non-2xx response — server error, don't keep hammering
          if (tries >= 3) {
            if (!cancelled) router?.replace('/dashboard');
            return;
          }
        }
      } catch (err) {
        console.error('verify-payment fetch error:', err);
        if (tries >= 3) {
          if (!cancelled) router?.replace('/dashboard');
          return;
        }
      }

      if (tries >= MAX_TRIES) {
        // Timed out — redirect anyway, middleware will decide access
        if (!cancelled) router?.replace('/dashboard');
        return;
      }

      setTimeout(verify, 2500);
    };

    verify();
    return () => { cancelled = true; };
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

function DashboardPageInner() {
  const searchParams = useSearchParams();
  const isPostPayment = searchParams?.get('subscription') === 'success';

  if (isPostPayment) {
    return <SubscriptionConfirming />;
  }

  return <DashboardLayout />;
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 size={28} className="animate-spin text-primary" />
      </div>
    }>
      <DashboardPageInner />
    </Suspense>
  );
}
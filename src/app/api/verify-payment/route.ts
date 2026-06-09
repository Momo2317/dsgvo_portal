import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get('session_id');

  if (!sessionId) {
    return NextResponse.json({ error: 'Missing session_id' }, { status: 400 });
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
  }

  try {
    const stripe = new Stripe(stripeSecretKey);

    // Retrieve the checkout session directly from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription'],
    });

    if (session.payment_status !== 'paid' && session.status !== 'complete') {
      return NextResponse.json({ status: 'pending' });
    }

    // Extract metadata
    const userId = session.metadata?.supabase_user_id;
    const plan = session.metadata?.plan;
    const billingInterval = session.metadata?.billing_interval;

    if (!userId || !plan || !billingInterval) {
      return NextResponse.json({ error: 'Missing metadata in session' }, { status: 400 });
    }

    const subscription = session.subscription as Stripe.Subscription | null;
    const stripeSubId = subscription?.id ?? null;
    const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id ?? null;
    const periodStart = subscription?.current_period_start
      ? new Date(subscription.current_period_start * 1000).toISOString()
      : null;
    const periodEnd = subscription?.current_period_end
      ? new Date(subscription.current_period_end * 1000).toISOString()
      : null;

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: existing } = await supabase
      .from('subscriptions')
      .select('stripe_subscription_id, plan')
      .eq('user_id', userId)
      .maybeSingle();

    const now = new Date().toISOString();
    const { error: upsertError } = await supabase
      .from('subscriptions')
      .upsert(
        {
          user_id: userId,
          plan,
          billing_interval: billingInterval,
          status: 'active',
          stripe_customer_id: customerId,
          stripe_subscription_id: stripeSubId,
          current_period_start: periodStart,
          current_period_end: periodEnd,
          cancel_at_period_end: false,
          updated_at: now,
        },
        { onConflict: 'user_id' }
      );

    if (upsertError) {
      console.error('Supabase upsert error:', upsertError);
      return NextResponse.json({ error: 'DB write failed', detail: upsertError.message }, { status: 500 });
    }

    const previousSubId = existing?.stripe_subscription_id;
    if (
      previousSubId &&
      stripeSubId &&
      previousSubId !== stripeSubId &&
      existing.plan !== plan
    ) {
      try {
        await stripe.subscriptions.cancel(previousSubId);
      } catch (cancelErr: any) {
        console.warn('Could not cancel previous Stripe subscription:', cancelErr.message);
      }
    }

    return NextResponse.json({ status: 'active', plan });
  } catch (err: any) {
    console.error('verify-payment error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

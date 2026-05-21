'use client';

import { createClient } from '@/lib/supabase/client';

export type PlanType = 'starter' | 'kanzlei' | 'premium';
export type BillingInterval = 'monthly' | 'yearly';
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'trialing' | 'incomplete';

export interface Subscription {
  id: string;
  userId: string;
  plan: PlanType;
  billingInterval: BillingInterval;
  status: SubscriptionStatus;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  createdAt: string;
}

export interface PlanLimits {
  maxUsers: number; // -1 = unlimited
  maxPortals: number; // -1 = unlimited
  storageGb: number;
  maxFileSizeMb: number; // -1 = unlimited
  customDomain: boolean;
  autoDeleteDays: number;
}

export const PLAN_LIMITS: Record<PlanType, PlanLimits> = {
  starter: {
    maxUsers: 1,
    maxPortals: 1,
    storageGb: 10,
    maxFileSizeMb: 20,
    customDomain: false,
    autoDeleteDays: 14,
  },
  kanzlei: {
    maxUsers: 5,
    maxPortals: 5,
    storageGb: 50,
    maxFileSizeMb: 100,
    customDomain: true,
    autoDeleteDays: 14,
  },
  premium: {
    maxUsers: -1,
    maxPortals: -1,
    storageGb: 250,
    maxFileSizeMb: -1,
    customDomain: true,
    autoDeleteDays: 14,
  },
};

export const PLAN_PRICES = {
  starter: { monthly: 19, yearly: 190 },
  kanzlei: { monthly: 49, yearly: 490 },
  premium: { monthly: 99, yearly: 990 },
};

export const subscriptionService = {
  async getSubscription(): Promise<Subscription | null> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .in('status', ['active', 'trialing'])
      .order('created_at', { ascending: false })
      .maybeSingle();

    if (error || !data) return null;

    return {
      id: data.id,
      userId: data.user_id,
      plan: data.plan as PlanType,
      billingInterval: data.billing_interval as BillingInterval,
      status: data.status as SubscriptionStatus,
      stripeCustomerId: data.stripe_customer_id,
      stripeSubscriptionId: data.stripe_subscription_id,
      currentPeriodStart: data.current_period_start,
      currentPeriodEnd: data.current_period_end,
      cancelAtPeriodEnd: data.cancel_at_period_end,
      createdAt: data.created_at,
    };
  },

  async getCurrentPlan(): Promise<PlanType> {
    const sub = await this.getSubscription();
    return sub?.plan ?? 'starter';
  },

  async getPlanLimits(): Promise<PlanLimits> {
    const plan = await this.getCurrentPlan();
    return PLAN_LIMITS[plan];
  },

  async createCheckoutSession(
    plan: PlanType,
    interval: BillingInterval,
    fromChoosePlan = false
  ): Promise<{ url: string } | null> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tresorlink.de';

    const successUrl = fromChoosePlan
      ? `${siteUrl}/dashboard?subscription=success`
      : `${siteUrl}/dashboard/billing?success=true`;

    const cancelUrl = fromChoosePlan
      ? `${siteUrl}/choose-plan?canceled=true`
      : `${siteUrl}/dashboard/billing?canceled=true`;

    const { data, error } = await supabase.functions.invoke('create-checkout-session', {
      body: {
        plan,
        interval,
        userId: user.id,
        userEmail: user.email,
        successUrl,
        cancelUrl,
      },
    });

    if (error) {
      console.error('Checkout session error:', error);
      // FunctionsHttpError carries the response body in error.context
      const errMsg =
        (data as any)?.error ||
        (error as any)?.context?.error ||
        error.message ||
        'Checkout failed';
      throw new Error(errMsg);
    }

    if (!(data as any)?.url) {
      throw new Error('No checkout URL returned from server');
    }

    return { url: (data as any).url };
  },
};

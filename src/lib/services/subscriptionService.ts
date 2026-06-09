'use client';

import { createClient } from '@/lib/supabase/client';
import { getAuthenticatedUser } from '@/lib/supabase/auth-helpers';
import { accountService } from '@/lib/services/accountService';
import {
  PLAN_LIMITS,
  type PlanType,
  type PlanLimits,
} from '@/lib/planLimits';

export type { PlanType, PlanLimits };
export type BillingInterval = 'monthly' | 'yearly';
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'trialing' | 'incomplete';

export { PLAN_LIMITS, PLAN_LABELS } from '@/lib/planLimits';

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

export const PLAN_PRICES = {
  starter: { monthly: 19, yearly: 190 },
  kanzlei: { monthly: 49, yearly: 490 },
  premium: { monthly: 99, yearly: 990 },
};

export const subscriptionService = {
  async getSubscription(): Promise<Subscription | null> {
    const supabase = createClient();
    const planOwnerId = await accountService.getPlanOwnerUserId();
    if (!planOwnerId) return null;

    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', planOwnerId)
      .in('status', ['active', 'trialing'])
      .order('updated_at', { ascending: false })
      .limit(1)
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
    const user = await getAuthenticatedUser();
    if (!user) return null;

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tresorlink.de';

    const successUrl = fromChoosePlan
      ? `${siteUrl}/payment/success`
      : `${siteUrl}/dashboard/billing`;

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

  async createBillingPortalSession(): Promise<{ url: string }> {
    const supabase = createClient();
    const user = await getAuthenticatedUser();
    if (!user) throw new Error('Nicht angemeldet');

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tresorlink.de';

    const { data, error } = await supabase.functions.invoke('create-portal-session', {
      body: {
        userId: user.id,
        returnUrl: `${siteUrl}/dashboard/billing`,
      },
    });

    if (error) {
      const errMsg =
        (data as any)?.error ||
        (error as any)?.context?.error ||
        error.message ||
        'Portal konnte nicht geöffnet werden';
      throw new Error(errMsg);
    }

    if (!(data as any)?.url) {
      throw new Error('Keine Portal-URL erhalten');
    }

    return { url: (data as any).url };
  },
};

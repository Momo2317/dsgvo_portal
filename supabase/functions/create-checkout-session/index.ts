import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

declare const Deno: { env: { get(key: string): string | undefined } };

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "*",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecretKey) {
      throw new Error("STRIPE_SECRET_KEY not configured");
    }

    // Supabase Edge Functions automatically inject SUPABASE_SERVICE_ROLE_KEY
    const supabaseServiceKey =
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
      Deno.env.get("SUPABASE_SECRET_KEY");

    if (!supabaseServiceKey) {
      throw new Error("Supabase service key not configured");
    }

    // Do NOT pass apiVersion — Stripe ESM v14 on Deno pins it automatically
    const stripe = new Stripe(stripeSecretKey, {
      httpClient: Stripe.createFetchHttpClient(),
    } as any);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      supabaseServiceKey
    );

    const { plan, interval, userId, userEmail, successUrl, cancelUrl } =
      await req.json();

    if (!plan || !interval || !userId || !userEmail) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields: plan, interval, userId, userEmail",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Get or create Stripe customer
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", userId)
      .maybeSingle();

    let customerId = subscription?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: userEmail,
        metadata: { supabase_user_id: userId },
      });
      customerId = customer.id;
    }

    // Amount map (in cents)
    const AMOUNTS: Record<string, Record<string, number>> = {
      starter: { monthly: 1900, yearly: 19000 },
      kanzlei: { monthly: 4900, yearly: 49000 },
      premium: { monthly: 9900, yearly: 99000 },
    };

    const amount = AMOUNTS[plan]?.[interval];
    if (!amount) {
      throw new Error(`Invalid plan/interval: ${plan}/${interval}`);
    }

    // SITE_URL is set as a plain env var in Supabase Edge Function secrets
    const siteUrl =
      Deno.env.get("SITE_URL") ||
      Deno.env.get("NEXT_PUBLIC_SITE_URL") ||
      "https://tresorlink.de";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      mode: "subscription",
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: `TresorLink ${
                plan.charAt(0).toUpperCase() + plan.slice(1)
              }`,
              description: `${
                interval === "monthly" ? "Monatliches" : "Jährliches"
              } Abonnement`,
            },
            unit_amount: amount,
            recurring: {
              interval: interval === "monthly" ? "month" : "year",
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        supabase_user_id: userId,
        plan,
        billing_interval: interval,
      },
      success_url:
        (successUrl || `${siteUrl}/dashboard?subscription=success`) +
        `&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${siteUrl}/dashboard/billing?canceled=true`,
      locale: "de",
    });

    return new Response(
      JSON.stringify({ sessionId: session.id, url: session.url }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("create-checkout-session error:", error.message, error.stack);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});

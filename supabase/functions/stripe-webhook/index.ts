import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

declare const Deno: { env: { get(key: string): string | undefined } };

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "*",
      },
    });
  }

  try {
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

    if (!stripeSecretKey) throw new Error("STRIPE_SECRET_KEY not configured");

    const stripe = new Stripe(stripeSecretKey, { apiVersion: "2023-10-16" });
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SECRET_KEY")!
    );

    const body = await req.text();
    let event: Stripe.Event;

    if (webhookSecret) {
      const signature = req.headers.get("stripe-signature");
      if (!signature) {
        return new Response(JSON.stringify({ error: "No signature" }), { status: 400 });
      }
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    } else {
      event = JSON.parse(body) as Stripe.Event;
    }

    const supabaseStatusMap: Record<string, string> = {
      active: "active",
      canceled: "canceled",
      past_due: "past_due",
      trialing: "trialing",
      incomplete: "incomplete",
      incomplete_expired: "canceled",
      unpaid: "past_due",
    };

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.supabase_user_id;
        const plan = session.metadata?.plan;
        const billingInterval = session.metadata?.billing_interval;

        if (!userId || !plan) break;

        const subscription = await stripe.subscriptions.retrieve(session.subscription as string);

        const { data: existing } = await supabase
          .from("subscriptions")
          .select("stripe_subscription_id, plan")
          .eq("user_id", userId)
          .maybeSingle();

        await supabase.from("subscriptions").upsert(
          {
            user_id: userId,
            plan: plan,
            billing_interval: billingInterval || "monthly",
            status: supabaseStatusMap[subscription.status] || "active",
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: subscription.id,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            cancel_at_period_end: subscription.cancel_at_period_end,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );

        const previousSubId = existing?.stripe_subscription_id;
        if (
          previousSubId &&
          subscription.id &&
          previousSubId !== subscription.id &&
          existing.plan !== plan
        ) {
          try {
            await stripe.subscriptions.cancel(previousSubId);
          } catch (e: any) {
            console.warn("Could not cancel previous subscription:", e.message);
          }
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.supabase_user_id;

        if (!userId) {
          // Try to find user by stripe_customer_id
          const { data: sub } = await supabase
            .from("subscriptions")
            .select("user_id")
            .eq("stripe_subscription_id", subscription.id)
            .maybeSingle();

          if (sub?.user_id) {
            await supabase
              .from("subscriptions")
              .update({
                status: supabaseStatusMap[subscription.status] || "active",
                current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
                current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
                cancel_at_period_end: subscription.cancel_at_period_end,
                updated_at: new Date().toISOString(),
              })
              .eq("stripe_subscription_id", subscription.id);
          }
          break;
        }

        await supabase
          .from("subscriptions")
          .update({
            status: supabaseStatusMap[subscription.status] || "active",
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            cancel_at_period_end: subscription.cancel_at_period_end,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await supabase
          .from("subscriptions")
          .update({
            status: "canceled",
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_subscription_id", subscription.id);
        break;
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  } catch (error: any) {
    console.error("stripe-webhook error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
});

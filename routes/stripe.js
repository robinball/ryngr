const express = require("express");
const Stripe = require("stripe");
const supabase = require("../lib/supabase");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const router = express.Router();

// ---------------------------------------------------------------------------
// POST /stripe/create-checkout
// Creates a Stripe Checkout session for the $39/mo plan.
// Body: { business_id, email }
// ---------------------------------------------------------------------------
router.post("/create-checkout", async (req, res) => {
  try {
    const { business_id, email } = req.body;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer_email: email,
      line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
      metadata: { business_id },
      success_url: `${req.headers.origin}/dashboard.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin}/onboarding.html?canceled=true`,
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error("Stripe checkout error:", err);
    res.status(500).json({ error: "Failed to create checkout session" });
  }
});

// ---------------------------------------------------------------------------
// POST /stripe/webhook
// Handles Stripe events — activates subscription, provisions Twilio number.
// ---------------------------------------------------------------------------
router.post("/webhook", async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const businessId = session.metadata.business_id;

    // Save Stripe customer + subscription IDs to Supabase
    await supabase
      .from("businesses")
      .update({
        stripe_customer_id: session.customer,
        stripe_subscription_id: session.subscription,
        subscription_status: "active",
      })
      .eq("id", businessId);

    // Provision a Twilio number via the CallmissSMS API
    try {
      const resp = await fetch(`${process.env.API_BASE_URL}/businesses/provision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ business_id: businessId }),
      });
      const data = await resp.json();
      console.log(`Provisioned number for ${businessId}:`, data.phone_number);
    } catch (err) {
      console.error("Failed to provision number:", err);
    }
  }

  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object;
    await supabase
      .from("businesses")
      .update({ subscription_status: "canceled" })
      .eq("stripe_subscription_id", subscription.id);
  }

  res.json({ received: true });
});

// ---------------------------------------------------------------------------
// POST /stripe/create-portal
// Creates a Stripe Customer Portal session for managing subscriptions.
// Body: { customer_id }
// ---------------------------------------------------------------------------
router.post("/create-portal", async (req, res) => {
  try {
    const { customer_id } = req.body;
    const session = await stripe.billingPortal.sessions.create({
      customer: customer_id,
      return_url: `${req.headers.origin}/settings.html`,
    });
    res.json({ url: session.url });
  } catch (err) {
    console.error("Portal error:", err);
    res.status(500).json({ error: "Failed to create portal session" });
  }
});

module.exports = router;

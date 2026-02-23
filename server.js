require("dotenv").config();
const express = require("express");
const path = require("path");
const stripeRoutes = require("./routes/stripe");
const apiRoutes = require("./routes/api");

const app = express();

// Stripe webhooks need the raw body — mount BEFORE json parser
app.use("/stripe/webhook", express.raw({ type: "application/json" }));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Serve static frontend files
app.use(express.static(path.join(__dirname, "public")));

// Pass env vars the frontend needs (Supabase + Stripe publishable key)
app.get("/config", (_req, res) => {
  res.json({
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
    stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
  });
});

// Routes
app.use("/stripe", stripeRoutes);
app.use("/api", apiRoutes);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Ryngr running on port ${PORT}`));

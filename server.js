require("dotenv").config();
const express = require("express");
const cors = require("cors");
const stripeRoutes = require("./routes/stripe");
const apiRoutes = require("./routes/api");

const app = express();

// CORS — allow Lovable frontend
app.use(cors({
  origin: process.env.FRONTEND_URL || "https://ryngr.lovable.app",
  credentials: true,
}));

// Stripe webhooks need the raw body — mount BEFORE json parser
app.use("/stripe/webhook", express.raw({ type: "application/json" }));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Routes
app.use("/stripe", stripeRoutes);
app.use("/api", apiRoutes);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Ryngr running on port ${PORT}`));

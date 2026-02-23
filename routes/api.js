const express = require("express");
const supabase = require("../lib/supabase");

const router = express.Router();

// ---------------------------------------------------------------------------
// GET /api/business/:id
// Fetches a business record from Supabase.
// ---------------------------------------------------------------------------
router.get("/business/:id", async (req, res) => {
  const { data, error } = await supabase
    .from("businesses")
    .select("*")
    .eq("id", req.params.id)
    .single();

  if (error) return res.status(404).json({ error: "Business not found" });
  res.json(data);
});

// ---------------------------------------------------------------------------
// POST /api/business
// Creates a new business record (called during onboarding step 1).
// Body: { user_id, business_name, phone_number }
// ---------------------------------------------------------------------------
router.post("/business", async (req, res) => {
  const { user_id, business_name, phone_number } = req.body;

  const { data, error } = await supabase
    .from("businesses")
    .insert({ user_id, business_name, phone_number })
    .select()
    .single();

  if (error) {
    console.error("Create business error:", error);
    return res.status(500).json({ error: "Failed to create business" });
  }
  res.json(data);
});

// ---------------------------------------------------------------------------
// PUT /api/business/:id
// Updates a business record (onboarding steps 2-4, settings page).
// ---------------------------------------------------------------------------
router.put("/business/:id", async (req, res) => {
  const allowed = [
    "business_name", "phone_number", "owner_whatsapp",
    "booking_url", "sms_template",
  ];
  const updates = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }

  const { data, error } = await supabase
    .from("businesses")
    .update(updates)
    .eq("id", req.params.id)
    .select()
    .single();

  if (error) {
    console.error("Update business error:", error);
    return res.status(500).json({ error: "Failed to update business" });
  }
  res.json(data);
});

// ---------------------------------------------------------------------------
// GET /api/business-by-user/:user_id
// Fetches a business by the owning user's auth ID.
// ---------------------------------------------------------------------------
router.get("/business-by-user/:user_id", async (req, res) => {
  const { data, error } = await supabase
    .from("businesses")
    .select("*")
    .eq("user_id", req.params.user_id)
    .single();

  if (error) return res.status(404).json({ error: "Business not found" });
  res.json(data);
});

// ---------------------------------------------------------------------------
// GET /api/missed-calls/:business_id
// Fetches missed call logs from Supabase.
// ---------------------------------------------------------------------------
router.get("/missed-calls/:business_id", async (req, res) => {
  const { data, error } = await supabase
    .from("missed_calls")
    .select("*")
    .eq("business_id", req.params.business_id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("Missed calls error:", error);
    return res.status(500).json({ error: "Failed to fetch missed calls" });
  }
  res.json(data);
});

module.exports = router;

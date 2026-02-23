const { createClient } = require("@supabase/supabase-js");

// Server-side Supabase client (uses service role key for admin access)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

module.exports = supabase;

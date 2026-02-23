// ============================================================
// app.js — Shared utilities: Supabase init, auth guard, helpers
// Loaded on every page via <script src="/js/app.js">
// ============================================================

let supabaseClient = null;
let appConfig = null;

// Fetch server config (Supabase URL/key, Stripe key) and init Supabase
async function initApp() {
  if (appConfig) return appConfig;
  const res = await fetch("/config");
  appConfig = await res.json();

  // Load Supabase JS from CDN if not already present
  if (!window.supabase) {
    await loadScript("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js");
  }
  supabaseClient = window.supabase.createClient(appConfig.supabaseUrl, appConfig.supabaseAnonKey);
  return appConfig;
}

// Get current logged-in user (or null)
async function getUser() {
  await initApp();
  const { data: { user } } = await supabaseClient.auth.getUser();
  return user;
}

// Redirect to login if not authenticated
async function requireAuth() {
  const user = await getUser();
  if (!user) {
    window.location.href = "/login.html";
    return null;
  }
  return user;
}

// Redirect to login if not authenticated AND subscription not active
async function requireActiveSubscription() {
  const user = await requireAuth();
  if (!user) return null;

  const res = await fetch(`/api/business-by-user/${user.id}`);
  if (!res.ok) {
    window.location.href = "/onboarding.html";
    return null;
  }

  const business = await res.json();
  if (business.subscription_status !== "active") {
    window.location.href = "/onboarding.html";
    return null;
  }
  return business;
}

// Load a script tag dynamically
function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

// Toast notification
function showToast(msg, duration = 3000) {
  const el = document.getElementById("toast");
  if (!el) return;
  el.textContent = msg;
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), duration);
}

// Wire up logout links
document.addEventListener("DOMContentLoaded", () => {
  const logoutLink = document.getElementById("logout-link");
  if (logoutLink) {
    logoutLink.addEventListener("click", async (e) => {
      e.preventDefault();
      await initApp();
      await supabaseClient.auth.signOut();
      window.location.href = "/login.html";
    });
  }
});

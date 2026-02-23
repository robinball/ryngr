// ============================================================
// auth.js — Signup / Login page logic
// ============================================================

let isSignUp = true;

const form = document.getElementById("auth-form");
const title = document.getElementById("auth-title");
const subtitle = document.getElementById("auth-subtitle");
const btn = document.getElementById("auth-btn");
const toggleText = document.getElementById("toggle-text");
const toggleLink = document.getElementById("toggle-link");
const errorMsg = document.getElementById("error-msg");

// Toggle between sign-up and sign-in modes
toggleLink.addEventListener("click", (e) => {
  e.preventDefault();
  isSignUp = !isSignUp;
  title.textContent = isSignUp ? "Sign Up" : "Sign In";
  subtitle.textContent = isSignUp ? "Create your Ryngr account" : "Welcome back";
  btn.textContent = isSignUp ? "Create Account" : "Sign In";
  toggleText.textContent = isSignUp ? "Already have an account?" : "Don't have an account?";
  toggleLink.textContent = isSignUp ? "Sign in" : "Sign up";
  errorMsg.style.display = "none";
});

function showError(msg) {
  errorMsg.textContent = msg;
  errorMsg.style.display = "block";
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorMsg.style.display = "none";
  btn.disabled = true;
  btn.textContent = "Loading...";

  await initApp();

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  if (isSignUp) {
    const { error } = await supabaseClient.auth.signUp({ email, password });
    if (error) {
      showError(error.message);
      btn.disabled = false;
      btn.textContent = "Create Account";
      return;
    }
    // After signup, redirect to onboarding
    window.location.href = "/onboarding.html";
  } else {
    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) {
      showError(error.message);
      btn.disabled = false;
      btn.textContent = "Sign In";
      return;
    }
    // Check if they have a business with active sub → dashboard, else onboarding
    const user = await getUser();
    const res = await fetch(`/api/business-by-user/${user.id}`);
    if (res.ok) {
      const biz = await res.json();
      if (biz.subscription_status === "active") {
        window.location.href = "/dashboard.html";
        return;
      }
    }
    window.location.href = "/onboarding.html";
  }
});

// If already logged in, redirect away
(async () => {
  const user = await getUser();
  if (user) {
    const res = await fetch(`/api/business-by-user/${user.id}`);
    if (res.ok) {
      const biz = await res.json();
      if (biz.subscription_status === "active") {
        window.location.href = "/dashboard.html";
        return;
      }
    }
    window.location.href = "/onboarding.html";
  }
})();

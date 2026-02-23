// ============================================================
// onboarding.js — 5-step onboarding flow with Stripe checkout
// ============================================================

let currentStep = 1;
let businessId = null;

const steps = document.querySelectorAll(".onboarding-step");
const progressSteps = document.querySelectorAll(".progress-bar .step");

function showStep(n) {
  steps.forEach((el) => (el.style.display = "none"));
  document.getElementById(`step-${n}`).style.display = "block";
  progressSteps.forEach((el) => {
    el.classList.toggle("active", parseInt(el.dataset.step) <= n);
  });
  currentStep = n;
}

async function nextStep(from) {
  if (from === 1) {
    const name = document.getElementById("business-name").value.trim();
    const phone = document.getElementById("phone-number").value.trim();
    if (!name || !phone) return alert("Please fill in all fields.");

    // Create or update business in Supabase
    const user = await getUser();
    if (!businessId) {
      const res = await fetch("/api/business", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.id, business_name: name, phone_number: phone }),
      });
      const data = await res.json();
      businessId = data.id;
    } else {
      await fetch(`/api/business/${businessId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ business_name: name, phone_number: phone }),
      });
    }
  }

  if (from === 2) {
    const wa = document.getElementById("whatsapp-number").value.trim();
    if (!wa) return alert("Please enter your WhatsApp number.");
    await fetch(`/api/business/${businessId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ owner_whatsapp: wa }),
    });
  }

  if (from === 3) {
    const url = document.getElementById("booking-url").value.trim();
    await fetch(`/api/business/${businessId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ booking_url: url || null }),
    });
    // Pre-fill SMS template
    prefillTemplate();
  }

  if (from === 4) {
    const template = document.getElementById("sms-template").value.trim();
    if (!template) return alert("Please write an SMS template.");
    await fetch(`/api/business/${businessId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sms_template: template }),
    });
    // Populate the checkout summary
    populateSummary();
  }

  showStep(from + 1);
}

function prevStep(from) {
  showStep(from - 1);
}

// Pre-fill the SMS template with business name + booking URL
function prefillTemplate() {
  const name = document.getElementById("business-name").value.trim();
  const url = document.getElementById("booking-url").value.trim();
  // Only pre-fill if the textarea is empty (don't overwrite user edits)
  if (document.getElementById("sms-template").value.trim()) return;
  let template = `Hey! Sorry we missed your call at ${name}. We'll get back to you as soon as possible.`;
  if (url) template += `\n\nBook an appointment: ${url}`;
  document.getElementById("sms-template").value = template;
  updatePreview();
}

// Live preview
function updatePreview() {
  const text = document.getElementById("sms-template").value;
  document.getElementById("sms-preview").textContent = text || "(Your SMS will appear here)";
}

document.getElementById("sms-template").addEventListener("input", updatePreview);

// Populate checkout summary with the data they entered
function populateSummary() {
  document.getElementById("summary-name").textContent = document.getElementById("business-name").value.trim();
  document.getElementById("summary-whatsapp").textContent = document.getElementById("whatsapp-number").value.trim();
  const bookingUrl = document.getElementById("booking-url").value.trim();
  const bookingRow = document.getElementById("summary-booking-row");
  if (bookingUrl) {
    document.getElementById("summary-booking").textContent = bookingUrl;
    bookingRow.style.display = "block";
  } else {
    bookingRow.style.display = "none";
  }
}

// Step 5: Redirect to Stripe Checkout
async function goToCheckout() {
  const btn = document.getElementById("checkout-btn");
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Redirecting to Stripe...';

  try {
    const user = await getUser();
    const res = await fetch("/stripe/create-checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ business_id: businessId, email: user.email }),
    });

    if (!res.ok) throw new Error("Failed to create checkout session");

    const { url } = await res.json();
    window.location.href = url;
  } catch (err) {
    console.error("Checkout error:", err);
    btn.disabled = false;
    btn.textContent = "Pay $39/mo & Activate";
    alert("Something went wrong. Please try again.");
  }
}

// On load: check auth, handle canceled redirect, resume onboarding
(async () => {
  const user = await requireAuth();
  if (!user) return;

  // Show canceled banner if returning from Stripe
  const params = new URLSearchParams(window.location.search);
  if (params.get("canceled") === "true") {
    document.getElementById("canceled-banner").style.display = "block";
  }

  // Check if user already has a business (resuming onboarding)
  const res = await fetch(`/api/business-by-user/${user.id}`);
  if (res.ok) {
    const biz = await res.json();
    businessId = biz.id;

    // If already subscribed, go to dashboard
    if (biz.subscription_status === "active") {
      window.location.href = "/dashboard.html";
      return;
    }

    // Pre-fill fields if data exists
    if (biz.business_name) document.getElementById("business-name").value = biz.business_name;
    if (biz.phone_number) document.getElementById("phone-number").value = biz.phone_number;
    if (biz.owner_whatsapp) document.getElementById("whatsapp-number").value = biz.owner_whatsapp;
    if (biz.booking_url) document.getElementById("booking-url").value = biz.booking_url;
    if (biz.sms_template) document.getElementById("sms-template").value = biz.sms_template;

    // If they canceled from Stripe, jump them to step 5
    if (params.get("canceled") === "true" && biz.sms_template) {
      populateSummary();
      showStep(5);
    }
  }
})();

// ============================================================
// settings.js — Settings page logic
// ============================================================

let currentBusiness = null;

(async () => {
  const business = await requireActiveSubscription();
  if (!business) return;
  currentBusiness = business;

  // Populate form fields
  document.getElementById("s-business-name").value = business.business_name || "";
  document.getElementById("s-phone-number").value = business.phone_number || "";
  document.getElementById("s-whatsapp").value = business.owner_whatsapp || "";
  document.getElementById("s-booking-url").value = business.booking_url || "";
  document.getElementById("s-sms-template").value = business.sms_template || "";
  updateSettingsPreview();
})();

// Live preview for SMS template
function updateSettingsPreview() {
  const text = document.getElementById("s-sms-template").value;
  document.getElementById("s-sms-preview").textContent = text || "(Your SMS will appear here)";
}
document.getElementById("s-sms-template").addEventListener("input", updateSettingsPreview);

// Save settings
document.getElementById("settings-form").addEventListener("submit", async (e) => {
  e.preventDefault();

  const updates = {
    business_name: document.getElementById("s-business-name").value.trim(),
    phone_number: document.getElementById("s-phone-number").value.trim(),
    owner_whatsapp: document.getElementById("s-whatsapp").value.trim(),
    booking_url: document.getElementById("s-booking-url").value.trim() || null,
    sms_template: document.getElementById("s-sms-template").value.trim(),
  };

  const res = await fetch(`/api/business/${currentBusiness.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });

  if (res.ok) {
    showToast("Settings saved!");
  } else {
    showToast("Failed to save. Please try again.");
  }
});

// Manage billing via Stripe Customer Portal
document.getElementById("manage-billing-btn").addEventListener("click", async () => {
  if (!currentBusiness?.stripe_customer_id) {
    showToast("No billing account found.");
    return;
  }

  const res = await fetch("/stripe/create-portal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ customer_id: currentBusiness.stripe_customer_id }),
  });

  const { url } = await res.json();
  window.location.href = url;
});

// ============================================================
// dashboard.js — Dashboard page logic
// ============================================================

(async () => {
  const business = await requireActiveSubscription();
  if (!business) return;

  // Show success banner if returning from Stripe checkout
  const params = new URLSearchParams(window.location.search);
  if (params.get("session_id")) {
    document.getElementById("success-banner").style.display = "block";
    // Clean the URL so the banner doesn't persist on refresh
    window.history.replaceState({}, "", "/dashboard.html");
  }

  // Display Twilio number
  const numberEl = document.getElementById("twilio-number");
  numberEl.textContent = business.twilio_number || "Provisioning...";

  // Fill in forwarding instruction placeholders
  document.querySelectorAll(".fwd-number").forEach((el) => {
    el.textContent = business.twilio_number || "your Ryngr number";
  });

  // Fetch missed calls
  const res = await fetch(`/api/missed-calls/${business.id}`);
  const calls = res.ok ? await res.json() : [];

  // Stats
  const total = calls.length;
  const replied = calls.filter((c) => c.replied).length;
  const rate = total > 0 ? Math.round((replied / total) * 100) : 0;

  document.getElementById("stat-total").textContent = total;
  document.getElementById("stat-replied").textContent = replied;
  document.getElementById("stat-rate").textContent = `${rate}%`;

  // Render table
  const tbody = document.getElementById("calls-table");
  if (calls.length === 0) {
    tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; color:var(--gray-400);">No missed calls yet. Once you set up call forwarding, they'll appear here.</td></tr>`;
    return;
  }

  tbody.innerHTML = calls
    .map((c) => {
      const time = new Date(c.created_at).toLocaleString();
      const badge = c.replied
        ? `<span class="badge badge-yes">Yes</span>`
        : `<span class="badge badge-no">No</span>`;
      return `<tr><td>${c.caller_number}</td><td>${time}</td><td>${badge}</td></tr>`;
    })
    .join("");
})();

// Copy Twilio number to clipboard
function copyNumber() {
  const num = document.getElementById("twilio-number").textContent;
  navigator.clipboard.writeText(num).then(() => showToast("Number copied!"));
}

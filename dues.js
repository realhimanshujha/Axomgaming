const API_URL = "https://script.google.com/macros/s/AKfycbzhYFcW9RB7zFKMsn0CURttmL-t3j3Uk8PFTyx-FKUBA8mQKXVu0Yb5R4RDsZcGh6Gy4g/exec";

const token = sessionStorage.getItem("axomToken") || "";

const $ = id => document.getElementById(id);

let duesData = {
  outstanding: [],
  history: []
};

let selectedDue = null;

const money = value =>
  "₹" + Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

const esc = value =>
  String(value ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[c]));

async function api(action, payload = {}) {
  if (!token) {
    throw new Error(
      "Your admin session is missing. Log in on the main dashboard, then open Dues Management."
    );
  }

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=utf-8"
    },
    body: JSON.stringify({
      action,
      token,
      ...payload
    })
  });

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.message || "Request failed.");
  }

  return result;
}

function showNotice(message, error = false) {
  $("notice").textContent = message;
  $("notice").classList.toggle("error", error);
  $("notice").classList.remove("hidden");

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

function hideNotice() {
  $("notice").classList.add("hidden");
}

function renderDues() {
  const q = $("searchDues").value.trim().toLowerCase();

  const list = duesData.outstanding.filter(x =>
    [
      x.customerName,
      x.phone,
      x.bookingId,
      x.console
    ].some(v =>
      String(v || "").toLowerCase().includes(q)
    )
  );

  $("duesBody").innerHTML = list.length
    ? list.map(x => `
      <tr>
        <td>
          <div class="customer-name">${esc(x.customerName)}</div>
          <span class="muted">${esc(x.phone || "No phone number")}</span>
        </td>
        <td>
          ${esc(x.bookingId)}
          <span class="muted">${esc(x.date || "—")}</span>
        </td>
        <td>${esc(x.console)}</td>
        <td>${money(x.finalBill)}</td>
        <td class="amount-due">${money(x.dueAmount)}</td>
        <td>
          <button class="collect-button"
            data-booking="${esc(x.bookingId)}">
            Collect payment
          </button>
        </td>
      </tr>
    `).join("")
    : `
      <tr>
        <td colspan="6" class="empty">
          ${q
            ? "No matching dues found."
            : "No outstanding dues. All customer balances are cleared."
          }
        </td>
      </tr>
    `;

  $("dueCount").textContent =
    `${list.length} record${list.length === 1 ? "" : "s"}`;

  $("totalOutstanding").textContent =
    money(duesData.totalOutstanding);

  $("outstandingCustomers").textContent =
    duesData.outstandingCustomers || 0;

  $("collectedToday").textContent =
    money(duesData.collectedToday);
}

function renderHistory() {
  $("historyBody").innerHTML = duesData.history.length
    ? duesData.history.map(x => `
      <tr>
        <td>${esc(x.createdAt || x.paymentDate)}</td>
        <td>
          <strong>${esc(x.customerName)}</strong>
          <span class="muted">${esc(x.phone)}</span>
        </td>
        <td>${esc(x.bookingId)}</td>
        <td>${esc(x.paymentMethod)}</td>
        <td class="amount-due">${money(x.amount)}</td>
      </tr>
    `).join("")
    : `
      <tr>
        <td colspan="5" class="empty">
          No due payments have been collected yet.
        </td>
      </tr>
    `;
}

async function loadData() {
  hideNotice();

  $("refreshBtn").disabled = true;
  $("refreshBtn").textContent = "Loading…";

  try {
    duesData = await api("getDuesData");

    renderDues();
    renderHistory();

  } catch (err) {
    showNotice(err.message, true);

    $("duesBody").innerHTML = `
      <tr>
        <td colspan="6" class="empty">
          ${esc(err.message)}
        </td>
      </tr>
    `;

  } finally {
    $("refreshBtn").disabled = false;
    $("refreshBtn").textContent = "↻ Refresh";
  }
}

function openModal(due) {
  selectedDue = due;

  $("bookingId").value = due.bookingId;

  $("customerDetails").textContent =
    `${due.customerName} · ${due.phone || "No phone"} · ${due.bookingId}`;

  $("modalDue").textContent = money(due.dueAmount);

  $("paymentAmount").value = due.dueAmount.toFixed(2);

  $("paymentAmount").max = due.dueAmount;

  $("formError").textContent = "";

  $("submitPayment").disabled = false;
  $("submitPayment").textContent = "Record payment";

  $("paymentModal").classList.remove("hidden");

  setTimeout(() => $("paymentAmount").focus(), 50);
}

function closeModal() {
  $("paymentModal").classList.add("hidden");
  selectedDue = null;
}

$("duesBody").addEventListener("click", event => {
  const button = event.target.closest("[data-booking]");

  if (!button) return;

  const due = duesData.outstanding.find(
    x => x.bookingId === button.dataset.booking
  );

  if (due) {
    openModal(due);
  }
});

$("searchDues").addEventListener("input", renderDues);

$("refreshBtn").addEventListener("click", loadData);

$("closeModal").addEventListener("click", closeModal);

$("cancelPayment").addEventListener("click", closeModal);

$("paymentModal").addEventListener("click", e => {
  if (e.target === $("paymentModal")) {
    closeModal();
  }
});

$("collectForm").addEventListener("submit", async event => {
  event.preventDefault();

  if (!selectedDue) return;

  const amount = Number($("paymentAmount").value);
  const method = $("paymentMethod").value;

  if (!Number.isFinite(amount) || amount <= 0) {
    $("formError").textContent = "Enter a valid payment amount.";
    return;
  }

  if (amount > selectedDue.dueAmount) {
    $("formError").textContent =
      `Amount cannot exceed ${money(selectedDue.dueAmount)}.`;
    return;
  }

  const button = $("submitPayment");

  button.disabled = true;
  button.textContent = "Saving…";

  $("formError").textContent = "";

  try {
    const result = await api("collectDuePayment", {
      bookingId: selectedDue.bookingId,
      amount,
      paymentMethod: method
    });

    closeModal();

    await loadData();

    showNotice(result.message);

  } catch (err) {
    $("formError").textContent = err.message;

  } finally {
    button.disabled = false;
    button.textContent = "Record payment";
  }
});

if (!token) {
  showNotice(
    "Please log in through the main admin dashboard first.",
    true
  );
} else {
  loadData();
}
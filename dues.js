const API_URL = "https://script.google.com/macros/s/AKfycbzhYFcW9RB7zFKMsn0CURttmL-t3j3Uk8PFTyx-FKUBA8mQKXVu0Yb5R4RDsZcGh6Gy4g/exec";

const token = localStorage.getItem("axomToken") ||
              sessionStorage.getItem("axomToken") || "";

const $ = id => document.getElementById(id);

let state = {
  gaming: [],
  manual: [],
  history: []
};


const money = n =>
  "₹" + Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });


const esc = s =>
  String(s ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[c]));


async function api(action, payload = {}) {

  if (!token) {
    throw Error(
      "Admin session missing. Log in on the main dashboard first."
    );
  }

  const r = await fetch(API_URL, {
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

  const d = await r.json();

  if (!d.success) {
    throw Error(d.message || "Request failed.");
  }

  return d;
}


function notice(msg, isError = false) {

  $("notice").textContent = msg;

  $("notice").classList.toggle("error", isError);

  $("notice").classList.remove("hidden");

}


function dateText(v) {

  if (!v) return "—";

  const d = new Date(v);

  return isNaN(d)
    ? esc(v)
    : d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
      });

}


/* LOAD DATA */

async function load() {

  $("gamingBody").innerHTML =
    '<tr><td colspan="7" class="empty">Loading...</td></tr>';

  try {

    const d = await api("getDuesData");

    state.gaming = d.gaming || [];
    state.manual = d.manual || [];
    state.history = d.history || [];

    render();

    $("notice").classList.add("hidden");

  } catch (e) {

    notice(e.message, true);

    $("gamingBody").innerHTML =
      '<tr><td colspan="7" class="empty">Could not load dues.</td></tr>';

  }

}


/* RENDER DATA */

function render() {

  const g = state.gaming.reduce(
    (s, x) => s + Number(x.dueAmount || 0),
    0
  );

  const m = state.manual.reduce(
    (s, x) => s + Number(x.dueAmount || 0),
    0
  );


  $("gamingTotal").textContent = money(g);

  $("manualTotal").textContent = money(m);

  $("combinedTotal").textContent = money(g + m);


  /* GAMING DUES */

  $("gamingBody").innerHTML = state.gaming.length

    ? state.gaming.map(x => `

      <tr>

        <td>${esc(x.customerName)}</td>

        <td>${esc(x.phone || "—")}</td>

        <td>${esc(x.bookingId)}</td>

        <td>${dateText(x.date)}</td>

        <td>${money(x.finalBill)}</td>

        <td class="due">${money(x.dueAmount)}</td>

        <td>

          <button
            class="small-btn"
            data-pay="gaming"
            data-id="${esc(x.bookingId)}"
            data-due="${Number(x.dueAmount)}"
            data-name="${esc(x.customerName)}">

            Collect

          </button>

        </td>

      </tr>

    `).join("")

    : `
      <tr>
        <td colspan="7" class="empty">
          No outstanding gaming dues.
        </td>
      </tr>
    `;


  /* MANUAL DUES */

  const q = $("searchManual").value.trim().toLowerCase();

  const list = state.manual.filter(x =>

    [
      x.customerName,
      x.phone,
      x.description,
      x.manualDueId

    ].some(v =>
      String(v || "").toLowerCase().includes(q)
    )

  );


  $("manualBody").innerHTML = list.length

    ? list.map(x => `

      <tr>

        <td>${esc(x.customerName)}</td>

        <td>${esc(x.phone || "—")}</td>

        <td>${esc(x.description)}</td>

        <td>${dateText(x.dueDate)}</td>

        <td>${money(x.totalAmount)}</td>

        <td>${money(x.paidAmount)}</td>

        <td class="due">${money(x.dueAmount)}</td>

        <td>

          <button
            class="small-btn"
            data-pay="manual"
            data-id="${esc(x.manualDueId)}"
            data-due="${Number(x.dueAmount)}"
            data-name="${esc(x.customerName)}">

            Collect

          </button>

        </td>

      </tr>

    `).join("")

    : `
      <tr>
        <td colspan="8" class="empty">
          No outstanding manual dues found.
        </td>
      </tr>
    `;


  /* PAYMENT HISTORY */

  $("historyBody").innerHTML = state.history.length

    ? state.history.slice(0, 100).map(x => `

      <tr>

        <td>${dateText(x.paymentDate)}</td>

        <td>${esc(x.customerName)}</td>

        <td>${esc(x.type)}</td>

        <td>${esc(x.reference || "—")}</td>

        <td>${esc(x.paymentMethod)}</td>

        <td>${money(x.amount)}</td>

      </tr>

    `).join("")

    : `
      <tr>
        <td colspan="6" class="empty">
          No collections recorded yet.
        </td>
      </tr>
    `;

}


/* ADD MANUAL DUE */

$("manualForm").addEventListener("submit", async e => {

  e.preventDefault();

  const b = $("addDueBtn");

  b.disabled = true;

  try {

    const f = new FormData(e.currentTarget);

    await api("addManualDue", {

      customerName: f.get("customerName"),

      phone: f.get("phone"),

      dueDate: f.get("dueDate"),

      amount: f.get("amount"),

      description: f.get("description"),

      notes: f.get("notes")

    });


    e.currentTarget.reset();

    $("dueDate").value = new Date().toLocaleDateString("en-CA");

    notice("Manual due added.");

    await load();

  } catch (err) {

    notice(err.message, true);

  } finally {

    b.disabled = false;

  }

});


/* OPEN PAYMENT MODAL */

$("manualBody").addEventListener("click", e => {

  const b = e.target.closest("[data-pay]");

  if (b) openPayment(b);

});


$("gamingBody").addEventListener("click", e => {

  const b = e.target.closest("[data-pay]");

  if (b) openPayment(b);

});


function openPayment(b) {

  $("paymentType").value = b.dataset.pay;

  $("paymentId").value = b.dataset.id;

  $("paymentCustomer").textContent =
    `${b.dataset.name} · Outstanding ${money(b.dataset.due)}`;

  $("paymentBalance").textContent = money(b.dataset.due);

  $("paymentAmount").max = b.dataset.due;

  $("paymentAmount").value = b.dataset.due;

  $("paymentError").textContent = "";

  $("paymentModal").classList.remove("hidden");

}


function closePayment() {

  $("paymentModal").classList.add("hidden");

}


$("closeModal").addEventListener("click", closePayment);

$("cancelPayment").addEventListener("click", closePayment);


$("paymentModal").addEventListener("click", e => {

  if (e.target === $("paymentModal")) {
    closePayment();
  }

});


/* UPDATE PAYMENT DISPLAY */

$("paymentAmount").addEventListener("input", function () {

  $("paymentBalance").textContent = money(this.value);

});


/* COLLECT PAYMENT */

$("paymentForm").addEventListener("submit", async e => {

  e.preventDefault();

  const btn = $("collectBtn");

  btn.disabled = true;

  try {

    const f = new FormData(e.currentTarget);

    await api("collectDuePayment", {

      type: f.get("type"),

      id: f.get("id"),

      amount: f.get("amount"),

      paymentMethod: f.get("paymentMethod")

    });


    closePayment();

    notice("Payment recorded and balance updated.");

    await load();

  } catch (err) {

    $("paymentError").textContent = err.message;

  } finally {

    btn.disabled = false;

  }

});


/* REFRESH AND SEARCH */

$("refreshBtn").addEventListener("click", load);

$("searchManual").addEventListener("input", render);


/* DEFAULT DATE */

$("dueDate").value = new Date().toLocaleDateString("en-CA");


/* INITIAL LOAD */

load();
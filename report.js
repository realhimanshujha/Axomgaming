const API_URL = "https://script.google.com/macros/s/AKfycbzhYFcW9RB7zFKMsn0CURttmL-t3j3Uk8PFTyx-FKUBA8mQKXVu0Yb5R4RDsZcGh6Gy4g/exec";

const token = localStorage.getItem("axomToken") ||
              sessionStorage.getItem("axomToken") || "";

const $ = id => document.getElementById(id);

const money = n =>
  "₹" + Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });


async function api(action, payload = {}) {

  if (!token) {
    throw Error("Admin session missing. Log in from the main dashboard first.");
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
    throw Error(d.message || "Report request failed.");
  }

  return d;
}


function set(id, value) {
  $(id).textContent = value;
}


async function loadReport() {

  const month = $("monthPicker").value;

  if (!month) return;

  $("dailyBody").innerHTML =
    '<tr><td colspan="5" class="empty">Loading report…</td></tr>';

  try {

    const d = await api("getMonthlyReport", {
      month
    });

    set("monthLabel", d.monthLabel);

    set("totalSales", money(d.totalSales));
    set("gamingSales", money(d.gamingSales));
    set("grossGamingSales", money(d.grossGamingSales));
    set("totalDiscount", money(d.totalDiscount));
    set("snackSales", money(d.snackSales));
    set("totalDues", money(d.totalDues));

    set("cashCollected", money(d.cashCollected));
    set("upiCollected", money(d.upiCollected));
    set("otherCollected", money(d.otherCollected));
    set("dueCollections",money((Number(d.cashCollected) || 0) +(Number(d.upiCollected) || 0) +(Number(d.otherCollected) || 0)));

    set("sessionCount", d.sessionCount || 0);
    set("snackQty", d.snackQty || 0);

    set("gamingDues", money(d.gamingDues));
    set("manualDues", money(d.manualDues));
    set("duesGrand", money(d.totalDues));

    $("dailyBody").innerHTML = (d.daily || []).length

      ? d.daily.map(x => `
        <tr>
          <td>${x.date}</td>
          <td>${money(x.gamingSales)}</td>
          <td>${money(x.snackSales)}</td>
          <td><b>${money(x.totalSales)}</b></td>
          <td>${x.sessions}</td>
        </tr>
      `).join("")

      : '<tr><td colspan="5" class="empty">No sales recorded for this month.</td></tr>';

    $("notice").classList.add("hidden");

  } catch (e) {

    $("notice").textContent = e.message;
    $("notice").classList.remove("hidden");

    $("dailyBody").innerHTML =
      '<tr><td colspan="5" class="empty">Could not load report.</td></tr>';

  }
}


// Set current month automatically

const now = new Date();

$("monthPicker").value =
  `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;


// Event listeners

$("monthPicker").addEventListener("change", loadReport);

$("refreshBtn").addEventListener("click", loadReport);

$("printBtn").addEventListener("click", () => {
  window.print();
});


// Load report

loadReport();
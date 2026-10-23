const API_URL =
  "https://script.google.com/macros/s/AKfycbzhYFcW9RB7zFKMsn0CURttmL-t3j3Uk8PFTyx-FKUBA8mQKXVu0Yb5R4RDsZcGh6Gy4g/exec";

const $ = id => document.getElementById(id);

let sessionToken = sessionStorage.getItem("axomToken") || "";

let appData = {
  consoles: [],
  prices: [],
  snacks: []
};

let selectedSnacks = [];


/* =====================================
   API REQUEST
===================================== */

async function apiRequest(payload) {
  const response = await fetch(API_URL, {
    method: "POST",
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error("Unable to connect to the server.");
  }

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.message || "Request failed.");
  }

  return result;
}


/* =====================================
   CUSTOM TOAST NOTIFICATIONS
===================================== */

function showToast(message, type = "info", duration = 3600) {
  const region = $("toastRegion");

  if (!region) {
    console.log(message);
    return;
  }

  const toast = document.createElement("div");
  toast.className = `app-toast ${type}`;

  const icon = document.createElement("span");
  icon.className = "app-toast-icon";

  icon.textContent =
    type === "success" ? "✓" :
    type === "error" ? "!" : "i";

  const text = document.createElement("div");
  text.className = "app-toast-text";
  text.textContent = String(message);

  const close = document.createElement("button");
  close.type = "button";
  close.className = "app-toast-close";
  close.setAttribute("aria-label", "Dismiss notification");
  close.textContent = "×";

  close.addEventListener("click", () => toast.remove());

  toast.append(icon, text, close);
  region.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add("visible");
  });

  window.setTimeout(() => {
    toast.classList.remove("visible");

    window.setTimeout(() => {
      toast.remove();
    }, 220);
  }, duration);
}


/* =====================================
   CUSTOM DIALOGS
===================================== */

function appDialog({
  title = "Please confirm",
  message = "",
  confirmText = "Continue",
  cancelText = "Cancel",
  input = false,
  inputType = "text",
  inputValue = "",
  placeholder = "",
  danger = false,
  icon = "i"
} = {}) {
  return new Promise(resolve => {
    const modal = $("appDialog");
    const inputWrap = $("appDialogInputWrap");
    const inputEl = $("appDialogInput");
    const confirmButton = $("appDialogConfirm");
    const cancelButton = $("appDialogCancel");

    $("appDialogTitle").textContent = title;
    $("appDialogMessage").textContent = message;
    $("appDialogIcon").textContent = icon;

    confirmButton.textContent = confirmText;
    cancelButton.textContent = cancelText;

    confirmButton.classList.toggle("danger", danger);
    inputWrap.classList.toggle("hidden", !input);

    inputEl.type = inputType;
    inputEl.value = inputValue;
    inputEl.placeholder = placeholder;

    cancelButton.classList.remove("hidden");

    modal.classList.remove("hidden");
    document.body.classList.add("dialog-open");

    let settled = false;

    const finish = value => {
      if (settled) return;

      settled = true;

      modal.classList.add("hidden");
      document.body.classList.remove("dialog-open");

      confirmButton.removeEventListener("click", onConfirm);
      cancelButton.removeEventListener("click", onCancel);
      modal.removeEventListener("click", onBackdrop);
      document.removeEventListener("keydown", onKeydown);

      resolve(value);
    };

    const onConfirm = () => {
      finish(input ? inputEl.value : true);
    };

    const onCancel = () => {
      finish(input ? null : false);
    };

    const onBackdrop = event => {
      if (event.target === modal) {
        finish(input ? null : false);
      }
    };

    const onKeydown = event => {
      if (event.key === "Escape") {
        finish(input ? null : false);
      }

      if (
        event.key === "Enter" &&
        input &&
        document.activeElement === inputEl
      ) {
        event.preventDefault();
        finish(inputEl.value);
      }
    };

    confirmButton.addEventListener("click", onConfirm);
    cancelButton.addEventListener("click", onCancel);
    modal.addEventListener("click", onBackdrop);
    document.addEventListener("keydown", onKeydown);

    setTimeout(() => {
      input ? inputEl.focus() : confirmButton.focus();
    }, 40);
  });
}


function showConfirm(message, options = {}) {
  return appDialog({
    title: options.title || "Please confirm",
    message,
    confirmText: options.confirmText || "Continue",
    cancelText: options.cancelText || "Cancel",
    danger: Boolean(options.danger),
    icon: options.danger ? "!" : "?"
  });
}


function showPrompt(message, options = {}) {
  return appDialog({
    title: options.title || "Enter details",
    message,
    input: true,
    inputType: options.inputType || "text",
    inputValue: options.inputValue || "",
    placeholder: options.placeholder || "",
    confirmText: options.confirmText || "Continue",
    cancelText: "Cancel",
    icon: "✎"
  });
}


/* =====================================
   LOGIN
===================================== */

$("loginForm").addEventListener("submit", async event => {
  event.preventDefault();

  const button = $("loginButton");
  const message = $("loginMessage");

  button.disabled = true;
  button.textContent = "LOGGING IN...";

  message.textContent = "";
  message.className = "message";

  try {
    const result = await apiRequest({
      action: "login",
      username: $("username").value.trim(),
      password: $("password").value
    });

    sessionToken = result.token;

    sessionStorage.setItem("axomToken", sessionToken);

    $("password").value = "";

    await loadDashboard();

  } catch (error) {
    message.textContent = error.message;
    message.className = "message error";

  } finally {
    button.disabled = false;
    button.textContent = "LOGIN";
  }
});


/* =====================================
   LOAD DASHBOARD
===================================== */

async function loadDashboard() {
  try {
    const data = await apiRequest({
      action: "getInitialData",
      token: sessionToken
    });

    appData.consoles = data.consoles;
    appData.prices = data.prices;
    appData.snacks = data.snacks;

    $("loginPage").classList.add("hidden");
    $("dashboardPage").classList.remove("hidden");

    $("todayDate").textContent =
      new Date().toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
      });

    $("bookingDate").value =
      new Date().toLocaleDateString("en-CA");

    populateConsoles();
    populateSnacks();

    updateEndTime();
    updateBill();

    await loadDailySummary();
    await loadLiveSessions();

  } catch (error) {
    sessionStorage.removeItem("axomToken");
    sessionToken = "";

    $("dashboardPage").classList.add("hidden");
    $("loginPage").classList.remove("hidden");

    $("loginMessage").textContent =
      error.message + " Please log in again.";

    $("loginMessage").className = "message error";
  }
}


/* =====================================
   POPULATE CONSOLES
===================================== */

function populateConsoles() {
  const select = $("console");

  select.innerHTML =
    '<option value="">Select Console</option>';

  appData.consoles.forEach(consoleItem => {
    const option = document.createElement("option");

    option.value = consoleItem.consoleName;
    option.textContent = consoleItem.consoleName;

    select.appendChild(option);
  });
}


/* =====================================
   POPULATE SNACKS
===================================== */

function populateSnacks() {
  const select = $("snackSelect");

  select.innerHTML =
    '<option value="">Select Snack</option>';

  appData.snacks.forEach(snack => {
    const option = document.createElement("option");

    option.value = snack.snackId;

    option.textContent =
      `${snack.snackName} — ₹${snack.sellingPrice} | Stock: ${snack.currentStock}`;

    select.appendChild(option);
  });
}

/* =====================================
   PRICING & BILL CALCULATION
===================================== */

function getSelectedPrice() {
  const consoleName = $("console").value;
  const players = $("players").value;
  const duration = Number($("duration").value);

  if (!consoleName || !players || !duration) {
    return 0;
  }

  const consoleType = consoleName.startsWith("PS5")
    ? "PS5"
    : "PS4";

  const price = appData.prices.find(item =>
    item.consoleType === consoleType &&
    String(item.players).toLowerCase() ===
      String(players).toLowerCase() &&
    Number(item.durationMinutes) === duration
  );

  if (price) {
    return Number(price.price) || 0;
  }

  const hourlyPrice = appData.prices.find(item =>
    item.consoleType === consoleType &&
    String(item.players).toLowerCase() ===
      String(players).toLowerCase() &&
    Number(item.durationMinutes) === 60
  );

  if (hourlyPrice) {
    return Math.round(
      (Number(hourlyPrice.price) * duration / 60) * 100
    ) / 100;
  }

  return 0;
}


function updateEndTime() {
  const startTime = $("startTime").value;
  const duration = Number($("duration").value);

  if (!startTime || !duration) {
    $("endTime").value = "";
    return;
  }

  const [hours, minutes] = startTime.split(":").map(Number);

  const totalMinutes = hours * 60 + minutes + duration;

  const endHours = Math.floor(totalMinutes / 60);
  const endMinutes = totalMinutes % 60;

  $("endTime").value =
    String(endHours).padStart(2, "0") + ":" +
    String(endMinutes).padStart(2, "0");
}


function updateBill() {
  const gamingAmount = getSelectedPrice();

  const snacksAmount = selectedSnacks.reduce(
    (total, snack) => total + snack.quantity * snack.price,
    0
  );

  $("gamingAmount").textContent =
    "₹" + gamingAmount.toFixed(2);

  $("snacksAmount").textContent =
    "₹" + snacksAmount.toFixed(2);

  $("grandTotal").textContent =
    "₹" + (gamingAmount + snacksAmount).toFixed(2);

  updateEndTime();
}


/* =====================================
   BOOKING FORM EVENTS
===================================== */

["console", "players", "duration", "startTime"].forEach(id => {
  $(id).addEventListener("change", updateBill);
});


/* =====================================
   ADD SNACK TO BOOKING
===================================== */

$("addSnackButton").addEventListener("click", () => {
  const snackId = $("snackSelect").value;
  const quantity = Number($("snackQuantity").value);

  if (!snackId) {
    showToast("Please select a snack.", "error");
    return;
  }

  if (!Number.isInteger(quantity) || quantity < 1) {
    showToast("Enter a valid snack quantity.", "error");
    return;
  }

  const snack = appData.snacks.find(
    item => String(item.snackId) === String(snackId)
  );

  if (!snack) {
    showToast("Snack not found.", "error");
    return;
  }

  if (quantity > Number(snack.currentStock)) {
    showToast("Not enough snack stock available.", "error");
    return;
  }

  const existing = selectedSnacks.find(
    item => String(item.snackId) === String(snackId)
  );

  const existingQuantity = existing ? existing.quantity : 0;

  if (existingQuantity + quantity > Number(snack.currentStock)) {
    showToast("Selected quantity exceeds available stock.", "error");
    return;
  }

  if (existing) {
    existing.quantity += quantity;
  } else {
    selectedSnacks.push({
      snackId: snack.snackId,
      snackName: snack.snackName,
      quantity,
      price: Number(snack.sellingPrice)
    });
  }

  renderSelectedSnacks();
  updateBill();

  $("snackQuantity").value = 1;
  $("snackSelect").value = "";
});


function renderSelectedSnacks() {
  const tbody = $("snackTableBody");

  tbody.innerHTML = "";

  if (selectedSnacks.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="4" class="empty-state">
          No snacks added yet.
        </td>
      </tr>
    `;

    return;
  }

  selectedSnacks.forEach((snack, index) => {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${escapeHTML(snack.snackName)}</td>
      <td>${snack.quantity}</td>
      <td>₹${(snack.quantity * snack.price).toFixed(2)}</td>
      <td>
        <button type="button"
                class="remove-snack"
                data-remove-snack="${index}">
          Remove
        </button>
      </td>
    `;

    tbody.appendChild(row);
  });
}


$("snackTableBody").addEventListener("click", event => {
  const button = event.target.closest("[data-remove-snack]");

  if (!button) return;

  const index = Number(button.dataset.removeSnack);

  selectedSnacks.splice(index, 1);

  renderSelectedSnacks();
  updateBill();
});


/* =====================================
   START LIVE SESSION WITH SNACKS
===================================== */

$("bookingForm").addEventListener("submit", async event => {
  event.preventDefault();

  const customerName = $("customerName").value.trim();
  const phone = $("phone").value.trim();
  const bookingDate = $("bookingDate").value;
  const startTime = $("startTime").value;
  const duration = Number($("duration").value);
  const consoleName = $("console").value;
  const players = $("players").value;

  if (
    !customerName ||
    !phone ||
    !bookingDate ||
    !startTime ||
    !duration ||
    !consoleName ||
    !players
  ) {
    showToast("Please complete all required fields.", "error");
    return;
  }

  const gamingAmount = getSelectedPrice();

  if (gamingAmount <= 0) {
    showToast("Unable to calculate the gaming price.", "error");
    return;
  }

  // Save the selected snacks before resetting the form.
  const snacksToAdd = selectedSnacks.map(snack => ({
    snackId: snack.snackId,
    quantity: snack.quantity
  }));

  const button = $("saveBookingButton");

  button.disabled = true;
  button.textContent = "STARTING SESSION...";

  let sessionCreated = false;

  try {
    // STEP 1: Start the gaming session.
    const result = await apiRequest({
      action: "startSession",
      token: sessionToken,
      customerName,
      phone,
      date: bookingDate,
      startTime,
      durationMinutes: duration,
      consoleName: consoleName,
      players
    });

    sessionCreated = true;

    // STEP 2: Add selected snacks to the new session.
    if (snacksToAdd.length > 0) {
      button.textContent = "ADDING SNACKS...";

      await apiRequest({
        action: "addSessionSnacks",
        token: sessionToken,
        sessionId: result.sessionId,
        snacks: snacksToAdd
      });
    }

    // STEP 3: Clear the form after successful processing.
    selectedSnacks = [];

    $("bookingForm").reset();

    $("bookingDate").value =
      new Date().toLocaleDateString("en-CA");

    renderSelectedSnacks();
    updateBill();

    // STEP 4: Refresh the dashboard and live session cards.
    await loadDashboard();

    showToast(
      snacksToAdd.length > 0
        ? "Gaming session started and snacks added successfully!"
        : "Gaming session started successfully!",
      "success"
    );

  } catch (error) {

    if (sessionCreated) {
      // The session exists, but adding snacks or refreshing
      // the dashboard may have failed.
      selectedSnacks = [];

      $("bookingForm").reset();

      $("bookingDate").value =
        new Date().toLocaleDateString("en-CA");

      renderSelectedSnacks();
      updateBill();

      try {
        await loadDashboard();
      } catch (refreshError) {
        console.error("Dashboard refresh failed:", refreshError);
      }

      showToast(
        "The gaming session was created, but a later step failed: " +
        error.message +
        ". Check Live Gaming before trying again.",
        "error",
        7000
      );

    } else {
      showToast(error.message, "error");
    }

  } finally {
    button.disabled = false;
    button.textContent = "SAVE BOOKING";
  }
});


/* =====================================
   DAILY EARNINGS
===================================== */

async function loadDailySummary() {
  try {
    const result = await apiRequest({
      action: "getDailySummary",
      token: sessionToken
    });

    $("dailyGaming").textContent =
      formatMoney(result.gamingRevenue);

    $("dailySnacks").textContent =
      formatMoney(result.snacksRevenue);

    $("dailyTotal").textContent =
      formatMoney(result.totalRevenue);

    $("dailyCash").textContent =
      formatMoney(result.cashRevenue);

    $("dailyUPI").textContent =
      formatMoney(result.upiRevenue);

    $("dailyCustomers").textContent =
      Number(result.customerCount || 0);

  } catch (error) {
    showToast(
      "Unable to load today's earnings: " + error.message,
      "error"
    );
  }
}


/* =====================================
   FORMATTING HELPERS
===================================== */

function formatMoney(amount) {
  return "₹" + (Number(amount) || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
}


function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

/* =====================================
   LIVE SESSION MANAGEMENT
===================================== */

let liveSessions = [];
let liveRefreshTimer = null;
let countdownTimer = null;


/* =====================================
   LOAD ACTIVE SESSIONS
===================================== */

async function loadLiveSessions() {
  try {
    const result = await apiRequest({
      action: "getLiveSessions",
      token: sessionToken
    });

    liveSessions = result.sessions || [];

    renderLiveSessions();
    updateSessionTimers();

  } catch (error) {
    showToast(
      "Unable to load live sessions: " + error.message,
      "error"
    );
  }
}


/* =====================================
   RENDER LIVE SESSION CARDS
===================================== */

function renderLiveSessions() {
  const container = $("liveSessionsContainer");

  if (!container) return;

  $("activeSessionCount").textContent = liveSessions.length;

  const gamingRevenue = liveSessions.reduce(
    (sum, session) => sum + Number(session.gamingAmount || 0),
    0
  );

  const snacksRevenue = liveSessions.reduce(
    (sum, session) => sum + Number(session.snacksAmount || 0),
    0
  );

  $("activeGamingRevenue").textContent =
    formatMoney(gamingRevenue);

  $("activeSnacksRevenue").textContent =
    formatMoney(snacksRevenue);

  if (liveSessions.length === 0) {
    container.innerHTML = `
      <div class="empty-live-state">
        <h3>No Active Sessions</h3>
        <p>New gaming sessions will appear here.</p>
      </div>
    `;

    return;
  }

  container.innerHTML = "";

  liveSessions.forEach(session => {
    const card = document.createElement("div");
    card.className = "session-card";

    const total =
      Number(session.gamingAmount || 0) +
      Number(session.snacksAmount || 0);

    card.innerHTML = `
      <div class="session-card-header">
        <div>
          <h3>${escapeHTML(session.customerName)}</h3>
          <p>${escapeHTML(session.phone)}</p>
        </div>

        <span class="session-status">ACTIVE</span>
      </div>

      <div class="session-details">
        <div>
          <span>Console</span>
          <strong>${escapeHTML(session.console)}</strong>
        </div>

        <div>
          <span>Players</span>
          <strong>${escapeHTML(session.players)}</strong>
        </div>

        <div>
          <span>Start Time</span>
          <strong>${escapeHTML(session.startTime)}</strong>
        </div>

        <div>
          <span>Scheduled End</span>
          <strong>${escapeHTML(session.endTime)}</strong>
        </div>
      </div>

      <div class="session-timer">
        <span>TIME REMAINING</span>
        <strong
          class="remaining-time"
          data-date="${escapeHTML(session.date)}"
          data-end="${escapeHTML(session.endTime)}"
        >--:--:--</strong>
      </div>

      <div class="session-bill">
        <div class="session-bill-row">
          <span>Gaming</span>
          <strong>${formatMoney(session.gamingAmount)}</strong>
        </div>

        <div class="session-bill-row">
          <span>Snacks</span>
          <strong>${formatMoney(session.snacksAmount)}</strong>
        </div>

        <div class="session-bill-row total">
          <span>Running Bill</span>
          <strong>${formatMoney(total)}</strong>
        </div>
      </div>

      <div class="session-actions">
        <button
          type="button"
          class="extend-button"
          data-action="extend"
          data-id="${escapeHTML(session.sessionId)}"
        >
          Extend Time
        </button>

        <button
          type="button"
          class="add-snacks-button"
          data-action="snacks"
          data-id="${escapeHTML(session.sessionId)}"
        >
          Add Snacks
        </button>

        <button
          type="button"
          class="end-session-button"
          data-action="close"
          data-id="${escapeHTML(session.sessionId)}"
        >
          End Session & Collect Payment
        </button>
      </div>
    `;

    container.appendChild(card);
  });

  updateSessionTimers();
}


/* =====================================
   LIVE COUNTDOWN
===================================== */

function updateSessionTimers() {
  document.querySelectorAll(".remaining-time").forEach(element => {
    const date = element.dataset.date;
    const endTime = element.dataset.end;

    if (
      !date ||
      !endTime ||
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      !/^\d{2}:\d{2}$/.test(endTime)
    ) {
      element.textContent = "Invalid session time";
      return;
    }

    const [year, month, day] = date.split("-").map(Number);
    const [hours, minutes] = endTime.split(":").map(Number);

    const end = new Date(
      year,
      month - 1,
      day,
      hours,
      minutes,
      0
    );

    const now = new Date();

    let remaining = Math.floor(
      (end.getTime() - now.getTime()) / 1000
    );

    const card = element.closest(".session-card");

    if (remaining <= 0) {
      element.textContent = "00:00:00";

      if (card) {
        card.classList.add("overdue");

        const badge = card.querySelector(".session-status");

        if (badge) {
          badge.textContent = "TIME EXCEEDED";
          badge.classList.add("overdue-status");
        }
      }

      return;
    }

    if (card) {
      card.classList.remove("overdue");

      const badge = card.querySelector(".session-status");

      if (badge) {
        badge.textContent = "ACTIVE";
        badge.classList.remove("overdue-status");
      }
    }

    const h = Math.floor(remaining / 3600);
    const m = Math.floor((remaining % 3600) / 60);
    const s = remaining % 60;

    element.textContent =
      String(h).padStart(2, "0") + ":" +
      String(m).padStart(2, "0") + ":" +
      String(s).padStart(2, "0");
  });
}


/* =====================================
   EXTEND GAMING SESSION
===================================== */

/* =====================================
   EXTEND GAMING SESSION
===================================== */

async function extendSession(sessionId) {
  const input = await showPrompt(
    "How many additional minutes?",
    {
      title: "Extend Gaming Time",
      placeholder: "15, 30, 45, 60, 90...",
      inputType: "number",
      confirmText: "Continue"
    }
  );

  if (input === null) return;

  const addedMinutes = Number(input);

  if (
    !Number.isInteger(addedMinutes) ||
    addedMinutes < 15 ||
    addedMinutes % 15 !== 0
  ) {
    showToast(
      "Enter a valid duration in 15-minute intervals.",
      "error"
    );
    return;
  }

  const confirmed = await showConfirm(
    `Extend this session by ${addedMinutes} minutes?`,
    {
      title: "Extend Session",
      confirmText: "Extend Time"
    }
  );

  if (!confirmed) return;

  try {
    const result = await apiRequest({
      action: "extendSession",
      token: sessionToken,
      sessionId,
      addedMinutes
    });

    showToast(
      result.message ||
        `Session extended by ${addedMinutes} minutes. Additional charge: ₹${result.addedAmount}.`,
      "success"
    );

    await loadLiveSessions();

  } catch (error) {
    showToast(error.message, "error");
  }
}

/* =====================================
   ADD SNACKS TO LIVE SESSION
===================================== */

async function addSnacksToSession(sessionId) {
  if (!appData.snacks.length) {
    showToast("No snacks are available.", "error");
    return;
  }

  const menu = appData.snacks
    .map((snack, index) =>
      `${index + 1}. ${snack.snackName} — ₹${snack.sellingPrice} (Stock: ${snack.currentStock})`
    )
    .join("\n");

  const choice = await showPrompt(
    "Enter the snack number:\n\n" + menu,
    {
      title: "Add Snacks",
      placeholder: "Enter menu number",
      inputType: "number",
      confirmText: "Next"
    }
  );

  if (choice === null) return;

  const index = Number(choice) - 1;

  if (
    !Number.isInteger(index) ||
    index < 0 ||
    index >= appData.snacks.length
  ) {
    showToast("Invalid snack selection.", "error");
    return;
  }

  const snack = appData.snacks[index];

  const quantityInput = await showPrompt(
    `How many packets of ${snack.snackName}?`,
    {
      title: "Snack Quantity",
      placeholder: "Enter quantity",
      inputType: "number",
      confirmText: "Continue"
    }
  );

  if (quantityInput === null) return;

  const quantity = Number(quantityInput);

  if (
    !Number.isInteger(quantity) ||
    quantity < 1
  ) {
    showToast("Enter a valid quantity.", "error");
    return;
  }

  if (quantity > Number(snack.currentStock)) {
    showToast("Not enough stock available.", "error");
    return;
  }

  const confirmed = await showConfirm(
    `Add ${quantity} × ${snack.snackName}?\nAmount: ${formatMoney(quantity * Number(snack.sellingPrice))}`,
    {
      title: "Confirm Snack Order",
      confirmText: "Add Snacks"
    }
  );

  if (!confirmed) return;

  try {
    const result = await apiRequest({
      action: "addSessionSnacks",
      token: sessionToken,
      sessionId,
      snackId: snack.snackId,
      quantity
    });

    showToast(
      result.message || "Snacks added successfully.",
      "success"
    );

    await loadDashboard();

  } catch (error) {
    showToast(error.message, "error");
  }
}


/* =====================================
   LIVE SESSION BUTTON HANDLERS
===================================== */

$("liveSessionsContainer").addEventListener("click", async event => {
  const button = event.target.closest("[data-action]");

  if (!button) return;

  const sessionId = button.dataset.id;
  const action = button.dataset.action;

  if (action === "extend") {
    await extendSession(sessionId);
  }

  if (action === "snacks") {
    await addSnacksToSession(sessionId);
  }

  if (action === "close") {
    closeSession(sessionId);
  }
});


/* =====================================
   REFRESH BUTTON
===================================== */

$("refreshSessionsButton").addEventListener("click", async () => {
  await loadLiveSessions();

  showToast(
    "Live sessions refreshed.",
    "success"
  );
});


/* =====================================
   AUTOMATIC REFRESH
===================================== */

if (liveRefreshTimer) {
  clearInterval(liveRefreshTimer);
}

if (countdownTimer) {
  clearInterval(countdownTimer);
}

liveRefreshTimer = setInterval(() => {
  if (sessionToken) {
    loadLiveSessions();
  }
}, 30000);

countdownTimer = setInterval(() => {
  if (sessionToken) {
    updateSessionTimers();
  }
}, 1000);

/* =====================================
   PAYMENT MODAL
===================================== */

let paymentSessionId = null;


function closeSession(sessionId) {
  const session = liveSessions.find(
    item => String(item.sessionId) === String(sessionId)
  );

  if (!session) {
    showToast("Session not found.", "error");
    return;
  }

  paymentSessionId = sessionId;

  $("paymentCustomer").textContent =
    `${session.customerName} | ${session.console}`;

  const originalBill = Math.round(
    (
      Number(session.gamingAmount || 0) +
      Number(session.snacksAmount || 0)
    ) * 100
  ) / 100;

  $("paymentOriginalBill").textContent =
    formatMoney(originalBill);

  $("paymentDiscount").value = "0";
  $("paymentCash").value = "0";
  $("paymentUPI").value = "0";
  $("paymentOther").value = "0";

  $("paymentError").textContent = "";

  $("paymentModal").classList.remove("hidden");

  calculatePayment();
}


/* =====================================
   CALCULATE PAYMENT
===================================== */

function calculatePayment() {
  if (!paymentSessionId) return;

  const session = liveSessions.find(
    item => String(item.sessionId) === String(paymentSessionId)
  );

  if (!session) return;

  const originalBill = Math.round(
    (
      Number(session.gamingAmount || 0) +
      Number(session.snacksAmount || 0)
    ) * 100
  );

  const discount = Math.round(
    Number($("paymentDiscount").value || 0) * 100
  );

  const cash = Math.round(
    Number($("paymentCash").value || 0) * 100
  );

  const upi = Math.round(
    Number($("paymentUPI").value || 0) * 100
  );

  const other = Math.round(
    Number($("paymentOther").value || 0) * 100
  );

  const finalBill = originalBill - discount;
  const totalReceived = cash + upi + other;
  const due = finalBill - totalReceived;

  $("paymentFinalBill").textContent =
    formatMoney(finalBill / 100);

  $("paymentTotalReceived").textContent =
    formatMoney(totalReceived / 100);

  $("paymentDue").textContent =
    formatMoney(Math.max(due, 0) / 100);

  const valid =
    [discount, cash, upi, other].every(Number.isFinite) &&
    discount >= 0 &&
    discount <= originalBill &&
    cash >= 0 &&
    upi >= 0 &&
    other >= 0 &&
    totalReceived <= finalBill;

  $("confirmPaymentButton").disabled = !valid;

  $("paymentError").textContent = valid
    ? ""
    : "Invalid amounts. Payments cannot exceed the final bill.";
}


/* =====================================
   LIVE PAYMENT CALCULATIONS
===================================== */

[
  "paymentDiscount",
  "paymentCash",
  "paymentUPI",
  "paymentOther"
].forEach(id => {
  $(id).addEventListener("input", calculatePayment);
});


/* =====================================
   CANCEL PAYMENT
===================================== */

$("cancelPaymentButton").addEventListener("click", () => {
  $("paymentModal").classList.add("hidden");
  paymentSessionId = null;
});


/* =====================================
   CONFIRM PAYMENT AND CLOSE SESSION
===================================== */

$("confirmPaymentButton").addEventListener("click", async () => {
  if (!paymentSessionId) return;

  calculatePayment();

  const button = $("confirmPaymentButton");

  if (button.disabled) return;

  const sessionId = paymentSessionId;

  const discount = Number($("paymentDiscount").value || 0);
  const cashPaid = Number($("paymentCash").value || 0);
  const upiPaid = Number($("paymentUPI").value || 0);
  const otherPaid = Number($("paymentOther").value || 0);

  const session = liveSessions.find(
    item => String(item.sessionId) === String(sessionId)
  );

  if (!session) {
    showToast("Session not found.", "error");
    return;
  }

  const originalBill = Math.round(
    (
      Number(session.gamingAmount || 0) +
      Number(session.snacksAmount || 0)
    ) * 100
  ) / 100;

  const finalBill = Math.round(
    (originalBill - discount) * 100
  ) / 100;

  const totalPaid = Math.round(
    (cashPaid + upiPaid + otherPaid) * 100
  ) / 100;

  const due = Math.round(
    (finalBill - totalPaid) * 100
  ) / 100;

  const confirmationMessage =
    `Original Bill: ${formatMoney(originalBill)}\n` +
    `Discount: ${formatMoney(discount)}\n` +
    `Final Bill: ${formatMoney(finalBill)}\n` +
    `Cash: ${formatMoney(cashPaid)}\n` +
    `UPI: ${formatMoney(upiPaid)}\n` +
    `Other: ${formatMoney(otherPaid)}\n` +
    `Total Received: ${formatMoney(totalPaid)}\n` +
    `Outstanding Due: ${formatMoney(due)}\n\n` +
    "Confirm session closure?";

  const confirmed = await showConfirm(
    confirmationMessage,
    {
      title: "Review Final Bill",
      confirmText: "Close Session",
      danger: due > 0
    }
  );

  if (!confirmed) return;

  button.disabled = true;
  button.textContent = "PROCESSING...";

  try {
    const result = await apiRequest({
      action: "closeSession",
      token: sessionToken,
      sessionId,
      discount,
      cashPaid,
      upiPaid,
      otherPaid
    });

    $("paymentModal").classList.add("hidden");
    paymentSessionId = null;

    showToast(
      result.message ||
        `Session closed. Due: ${formatMoney(result.dueAmount)}`,
      "success",
      5000
    );

    await loadDashboard();

  } catch (error) {
    $("paymentError").textContent = error.message;

    showToast(
      "Unable to close session: " + error.message,
      "error"
    );

  } finally {
    button.disabled = false;
    button.textContent = "Collect Payment & End Session";
  }
});


/* =====================================
   LOGOUT
===================================== */

$("logoutButton").addEventListener("click", async () => {
  const confirmed = await showConfirm(
    "Are you sure you want to log out?",
    {
      title: "Logout",
      confirmText: "Logout",
      danger: true
    }
  );

  if (!confirmed) return;

  try {
    await apiRequest({
      action: "logout",
      token: sessionToken
    });

  } catch (error) {
    console.warn("Logout request failed:", error.message);

  } finally {
    sessionStorage.removeItem("axomToken");

    sessionToken = "";
    liveSessions = [];
    selectedSnacks = [];

    if (liveRefreshTimer) {
      clearInterval(liveRefreshTimer);
      liveRefreshTimer = null;
    }

    if (countdownTimer) {
      clearInterval(countdownTimer);
      countdownTimer = null;
    }

    $("dashboardPage").classList.add("hidden");
    $("loginPage").classList.remove("hidden");

    $("loginForm").reset();

    showToast("You have been logged out.", "success");
  }
});


/* =====================================
   INITIAL PAGE SETUP
===================================== */

renderSelectedSnacks();

if (sessionToken) {
  loadDashboard();
}
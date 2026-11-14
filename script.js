const API_URL =
  "https://script.google.com/macros/s/AKfycbzhYFcW9RB7zFKMsn0CURttmL-t3j3Uk8PFTyx-FKUBA8mQKXVu0Yb5R4RDsZcGh6Gy4g/exec";

const $ = id => document.getElementById(id);

let sessionToken =
  localStorage.getItem("axomToken") ||
  sessionStorage.getItem("axomToken") ||
  "";

// Migrate an existing session to persistent storage
if (sessionToken) {
  localStorage.setItem("axomToken", sessionToken);
}

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
   CUSTOM TOASTS + DIALOGS
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
  icon.textContent = type === "success" ? "✓" : type === "error" ? "!" : "i";

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

  requestAnimationFrame(() => toast.classList.add("visible"));
  window.setTimeout(() => {
    toast.classList.remove("visible");
    window.setTimeout(() => toast.remove(), 220);
  }, duration);
}

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
    cancelButton.classList.toggle("hidden", false);

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
    const onConfirm = () => finish(input ? inputEl.value : true);
    const onCancel = () => finish(input ? null : false);
    const onBackdrop = event => {
      if (event.target === modal) finish(input ? null : false);
    };
    const onKeydown = event => {
      if (event.key === "Escape") finish(input ? null : false);
      if (event.key === "Enter" && input && document.activeElement === inputEl) {
        event.preventDefault();
        finish(inputEl.value);
      }
    };

    confirmButton.addEventListener("click", onConfirm);
    cancelButton.addEventListener("click", onCancel);
    modal.addEventListener("click", onBackdrop);
    document.addEventListener("keydown", onKeydown);

    setTimeout(() => input ? inputEl.focus() : confirmButton.focus(), 40);
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

    localStorage.setItem("axomToken", sessionToken);

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

    console.error("Dashboard loading error:", error);

    const sessionExpired =
      /session expired|invalid session|unauthorized/i.test(
        String(error.message || "")
      );

    if (sessionExpired) {

      localStorage.removeItem("axomToken");
      sessionStorage.removeItem("axomToken");

      sessionToken = "";

      $("dashboardPage").classList.add("hidden");
      $("loginPage").classList.remove("hidden");

      $("loginMessage").textContent =
        "Your session has expired. Please log in again.";

      $("loginMessage").className = "message error";

    } else {

      // Keep the existing login token during temporary errors.
      $("loginMessage").textContent =
        "Unable to connect to the server. Your login session has been preserved. Please refresh and try again.";

      $("loginMessage").className = "message error";

    }

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
   GAMING PRICE
===================================== */

function getGamingAmount() {
  const consoleItem = appData.consoles.find(item =>
    item.consoleName === $("console").value
  );

  if (!consoleItem) return 0;

  const consoleType = consoleItem.consoleType;
  const players = $("players").value;
  const duration = Number($("duration").value);

  const exactPrice = appData.prices.find(item =>
    item.consoleType === consoleType &&
    item.players === players &&
    item.durationMinutes === duration
  );

  if (exactPrice) return exactPrice.price;

  const hourlyPrice = appData.prices.find(item =>
    item.consoleType === consoleType &&
    item.players === players &&
    item.durationMinutes === 60
  );

  if (!hourlyPrice) return 0;

  return Math.round(
    hourlyPrice.price * duration / 60
  );
}


/* =====================================
   END TIME
===================================== */

function updateEndTime() {
  const startTime = $("startTime").value;
  const duration = Number($("duration").value);

  if (!startTime) {
    $("endTime").value = "";
    updateBill();
    return;
  }

  const parts = startTime.split(":").map(Number);

  const totalMinutes =
    parts[0] * 60 + parts[1] + duration;

  if (totalMinutes > 24 * 60) {
    $("endTime").value = "";
    updateBill();
    return;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  $("endTime").value =
    String(hours).padStart(2, "0") +
    ":" +
    String(minutes).padStart(2, "0");

  updateBill();
}


/* =====================================
   SNACK MANAGEMENT
===================================== */

$("addSnackButton").addEventListener("click", () => {
  const snackId = $("snackSelect").value;
  const quantity = Number($("snackQuantity").value);

  const snack = appData.snacks.find(item =>
    item.snackId === snackId
  );

  if (!snack) {
    showToast("Please select a snack.");
    return;
  }

  if (!Number.isInteger(quantity) || quantity < 1) {
    showToast("Enter a valid quantity.");
    return;
  }

  const existing = selectedSnacks.find(item =>
    item.snackId === snackId
  );

  const existingQuantity = existing
    ? existing.quantity
    : 0;

  if (
    existingQuantity + quantity >
    snack.currentStock
  ) {
    showToast(
      `Only ${snack.currentStock} packets of ${snack.snackName} are available.`
    );
    return;
  }

  if (existing) {
    existing.quantity += quantity;
  } else {
    selectedSnacks.push({
      snackId: snack.snackId,
      snackName: snack.snackName,
      sellingPrice: snack.sellingPrice,
      quantity: quantity
    });
  }

  $("snackQuantity").value = 1;

  renderSnackTable();
  updateBill();
});


function removeSnack(snackId) {
  selectedSnacks = selectedSnacks.filter(item =>
    item.snackId !== snackId
  );

  renderSnackTable();
  updateBill();
}


function renderSnackTable() {
  const tbody = $("snackTableBody");

  tbody.replaceChildren();

  if (selectedSnacks.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");

    cell.colSpan = 5;
    cell.className = "empty-state";
    cell.textContent = "No snacks added.";

    row.appendChild(cell);
    tbody.appendChild(row);

    return;
  }

  selectedSnacks.forEach(snack => {
    const row = document.createElement("tr");

    const values = [
      snack.snackName,
      `₹${snack.sellingPrice}`,
      snack.quantity,
      `₹${snack.sellingPrice * snack.quantity}`
    ];

    values.forEach(value => {
      const cell = document.createElement("td");

      cell.textContent = value;
      row.appendChild(cell);
    });

    const actionCell = document.createElement("td");
    const button = document.createElement("button");

    button.type = "button";
    button.className = "remove-snack";
    button.textContent = "Remove";

    button.addEventListener("click", () => {
      removeSnack(snack.snackId);
    });

    actionCell.appendChild(button);
    row.appendChild(actionCell);

    tbody.appendChild(row);
  });
}


/* =====================================
   BILL CALCULATION
===================================== */


function updateBill() {
  const gamingAmount = getGamingAmount();

  const snacksAmount = selectedSnacks.reduce(
    (sum, item) =>
      sum + item.sellingPrice * item.quantity,
    0
  );

  const total = gamingAmount + snacksAmount;

  $("gamingAmount").textContent =
    `₹${gamingAmount.toFixed(2)}`;

  $("snacksAmount").textContent =
    `₹${snacksAmount.toFixed(2)}`;

  $("grandTotal").textContent =
    `₹${total.toFixed(2)}`;
}

/* =====================================
   START LIVE SESSION
===================================== */

$("bookingForm").addEventListener("submit", async event => {
  event.preventDefault();

  const button = $("saveBookingButton");
  const message = $("bookingMessage");

  if (!$("console").value) {
    message.textContent = "Please select a console.";
    message.className = "message error";
    return;
  }

  if (!$("endTime").value) {
    message.textContent = "Please select a valid starting time.";
    message.className = "message error";
    return;
  }

  button.disabled = true;
  button.textContent = "STARTING SESSION...";

  try {
    // STEP 1: Save selected snacks before resetting the form.
    const snacksToAdd = selectedSnacks
      .map(item => ({
        snackId: item.snackId,
        quantity: Number(item.quantity)
      }))
      .filter(item => item.snackId && item.quantity > 0);

    // STEP 2: Create the gaming session.
    const result = await apiRequest({
      action: "startSession",
      token: sessionToken,

      customerName: $("customerName").value.trim(),
      phone: $("phone").value.trim(),

      date: $("bookingDate").value,
      startTime: $("startTime").value,

      durationMinutes: Number($("duration").value),

      consoleName: $("console").value,
      players: $("players").value
    });

    // STEP 3: Add snacks to the newly created session.
    let snackError = "";

    if (snacksToAdd.length > 0) {
      try {
        await apiRequest({
          action: "addSessionSnacks",
          token: sessionToken,
          sessionId: result.sessionId,
          snacks: snacksToAdd
        });

      } catch (error) {
        snackError = error.message || "Unable to add snacks.";
      }
    }

    // STEP 4: Reset the form.
    selectedSnacks = [];

    $("bookingForm").reset();

    $("bookingDate").value =
      new Date().toLocaleDateString("en-CA");

    renderSnackTable();
    updateEndTime();
    updateBill();

    // STEP 5: Show result.
    if (snackError) {
      message.textContent =
        `Session started, but snacks were NOT added: ${snackError}. Session ID: ${result.sessionId}`;

      message.className = "message error";

    } else {
      message.textContent =
        snacksToAdd.length > 0
          ? `Session started successfully with snacks! ID: ${result.sessionId}`
          : `Session started successfully! ID: ${result.sessionId}`;

      message.className = "message success";
    }

    // STEP 6: Refresh dashboard and live sessions.
    await loadDashboard();
    await loadLiveSessions();

  } catch (error) {
    message.textContent = error.message;
    message.className = "message error";

  } finally {
    button.disabled = false;
    button.textContent = "START SESSION";
  }
});

/* =====================================
   FORM EVENTS
===================================== */

[
  "console",
  "players",
  "duration"
].forEach(id => {
  $(id).addEventListener("change", updateBill);
});

[
  "startTime",
  "duration"
].forEach(id => {
  $(id).addEventListener("change", updateEndTime);
});


$("bookingForm").addEventListener("reset", () => {
  selectedSnacks = [];

  setTimeout(() => {
    renderSnackTable();
    updateEndTime();
    updateBill();
  }, 0);
});


/* =====================================
   LOGOUT
===================================== */

$("logoutButton").addEventListener("click", async () => {
  try {
    await apiRequest({
      action: "logout",
      token: sessionToken
    });
  } catch (error) {
    console.error(error);
  }

  localStorage.removeItem("axomToken");
  sessionStorage.removeItem("axomToken");

  sessionToken = "";
  selectedSnacks = [];

  $("dashboardPage").classList.add("hidden");
  $("loginPage").classList.remove("hidden");

  $("loginForm").reset();
});


/* =====================================
   INITIALIZATION
===================================== */

if (sessionToken) {
  loadDashboard();
}


async function loadDailySummary() {
  const data = await apiRequest({
    action: "getDailySummary",
    token: sessionToken
  });

  const elements = {
    dailyGaming: data.gamingRevenue,
    dailySnacks: data.snacksRevenue,
    dailyTotal: data.totalRevenue,
    dailyCash: data.cashRevenue,
    dailyUPI: data.upiRevenue,
    dailyCustomers: data.customerCount
  };

  for (const [id, value] of Object.entries(elements)) {
    const element = document.getElementById(id);

    if (!element) {
      console.error(`Missing HTML element: #${id}`);
      continue;
    }

    element.textContent =
      id === "dailyCustomers" ? value : `₹${value}`;
  }
}

/* =====================================
   LIVE SESSION MANAGEMENT
===================================== */

let liveSessions = [];

let liveRefreshTimer = null;


/* LOAD LIVE SESSIONS */

async function loadLiveSessions() {
  try {
    const result = await apiRequest({
      action: "getLiveSessions",
      token: sessionToken
    });

    liveSessions = result.sessions || [];

    renderLiveSessions();

  } catch (error) {
    $("liveMessage").textContent = error.message;
    $("liveMessage").className = "message error";
  }
}


/* RENDER LIVE SESSION CARDS */

function renderLiveSessions() {
  const container = $("liveSessionsContainer");

  container.replaceChildren();

  $("activeSessionCount").textContent =
    liveSessions.length;

  $("activeGamingRevenue").textContent =
    "₹" + liveSessions.reduce(
      (sum, item) => sum + Number(item.gamingAmount || 0),
      0
    );

  $("activeSnacksRevenue").textContent =
    "₹" + liveSessions.reduce(
      (sum, item) => sum + Number(item.snacksAmount || 0),
      0
    );

  if (!liveSessions.length) {
    const empty = document.createElement("div");

    empty.className = "empty-live-state";

    const heading = document.createElement("h3");
    heading.textContent = "No Active Sessions";

    const paragraph = document.createElement("p");
    paragraph.textContent =
      "Start a new gaming session to see it here.";

    empty.append(heading, paragraph);
    container.appendChild(empty);

    return;
  }

  liveSessions.forEach(session => {
    const card = document.createElement("article");

    card.className = "session-card";

    const header = document.createElement("div");
    header.className = "session-card-header";

    const titleArea = document.createElement("div");

    const title = document.createElement("h3");
    title.textContent = session.console;

    const customer = document.createElement("p");
    customer.textContent =
    `${session.customerName} · ${session.phone || "Phone not provided"}`;

    titleArea.append(title, customer);

    const status = document.createElement("span");
    status.className = "session-status";
    status.textContent = "ACTIVE";

    header.append(titleArea, status);

    const details = document.createElement("div");
    details.className = "session-details";

    // Players
    addDetail(details, "Players", session.players);

    // Starting Time
    const startBox = document.createElement("div");
    startBox.className = "session-time-box starting-time";

    const startLabel = document.createElement("span");
    startLabel.textContent = "🟢 STARTING TIME";

    const startValue = document.createElement("strong");
    startValue.textContent = session.startTime;

    startBox.append(startLabel, startValue);

    // Finishing Time
    const endBox = document.createElement("div");
    endBox.className = "session-time-box finishing-time";

    const endLabel = document.createElement("span");
    endLabel.textContent = "🔴 FINISHING TIME";

    const endValue = document.createElement("strong");
    endValue.textContent = session.endTime;

    endBox.append(endLabel, endValue);

    details.append(startBox, endBox);

    // Session ID
    addDetail(details, "Session ID", session.sessionId);

    const timer = document.createElement("div");
    timer.className = "session-timer";

    const timerLabel = document.createElement("span");
    timerLabel.textContent = "Time Remaining";

    const timerValue = document.createElement("strong");
    timerValue.className = "remaining-time";

    timerValue.dataset.date = session.date;
    timerValue.dataset.end = session.endTime;

    timer.append(timerLabel, timerValue);

    const bill = document.createElement("div");
    bill.className = "session-bill";

    bill.append(
      billRow("Gaming", session.gamingAmount),
      billRow("Snacks", session.snacksAmount),
      billRow("Current Total", session.grandTotal, true)
    );

    const actions = document.createElement("div");
    actions.className = "session-actions";

    const extend = document.createElement("button");
    extend.className = "extend-button";
    extend.textContent = "Extend Time";

    extend.addEventListener("click", () => {
      extendSession(session.sessionId);
    });

    const snacks = document.createElement("button");
    snacks.className = "add-snacks-button";
    snacks.textContent = "Add Snacks";

    snacks.addEventListener("click", () => {
      addSnacksToSession(session.sessionId);
    });

    const finish = document.createElement("button");
    finish.className = "end-session-button";
    finish.textContent = "End Session & Collect Payment";

    finish.addEventListener("click", () => {
      closeSession(session.sessionId);
    });

    actions.append(extend, snacks, finish);

    card.append(header, details, timer, bill, actions);

    container.appendChild(card);
  });

  updateSessionTimers();
}


function addDetail(parent, label, value) {
  const wrapper = document.createElement("div");

  const caption = document.createElement("span");
  caption.textContent = label;

  const content = document.createElement("strong");
  content.textContent = value;

  wrapper.append(caption, content);

  parent.appendChild(wrapper);
}


function billRow(label, amount, isTotal = false) {
  const row = document.createElement("div");

  row.className = isTotal
    ? "session-bill-row total"
    : "session-bill-row";

  const caption = document.createElement("span");
  caption.textContent = label;

  const value = document.createElement("strong");
  value.textContent = "₹" + Number(amount || 0);

  row.append(caption, value);

  return row;
}


/* REMAINING TIME */

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

    const end = new Date(year, month - 1, day, hours, minutes, 0);
    const now = new Date();

    let remaining = Math.floor((end.getTime() - now.getTime()) / 1000);

    if (remaining <= 0) {
      element.textContent = "Time exceeded";
      return;
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


/* EXTEND SESSION */

async function extendSession(sessionId) {
  const duration = await showPrompt(
    "Enter additional gaming time in minutes.\n" +
    "Allowed: 15, 30, 60, 90, 120, etc."
  );

  if (duration === null) return;

  const addedMinutes = Number(duration);

  if (
    !Number.isInteger(addedMinutes) ||
    addedMinutes < 15 ||
    (addedMinutes !== 15 && addedMinutes % 30 !== 0)
  ) {
    showToast(
      "Enter 15 minutes or a duration in 30-minute intervals."
    );
    return;
  }

  if (!(await showConfirm(
    `Extend this session by ${addedMinutes} minutes?`,
    {
      title: "Extend session",
      confirmText: "Extend time"
    }
  ))) {
    return;
  }

  try {
    const result = await apiRequest({
      action: "extendSession",
      token: sessionToken,
      sessionId: sessionId,
      addedMinutes: addedMinutes
    });

    showToast(
      "Session extended successfully.\n" +
      "New ending time: " + result.newEndTime +
      "\nAdditional charge: ₹" + result.addedAmount
    );

    await loadLiveSessions();

  } catch (error) {
    showToast(error.message);
  }
}


/* ADD SNACKS */

async function addSnacksToSession(sessionId) {

  if (!appData.snacks.length) {
    showToast("No snacks are currently available.");
    return;
  }

  const available = appData.snacks.filter(
    item => Number(item.currentStock) > 0
  );

  if (!available.length) {
    showToast("All snacks are out of stock.");
    return;
  }

  // CREATE MODAL
  const overlay = document.createElement("div");
  overlay.className = "snack-modal-overlay";

  const modal = document.createElement("div");
  modal.className = "snack-modal";

  // HEADER
  const header = document.createElement("div");
  header.className = "snack-modal-header";

  const heading = document.createElement("div");

  const title = document.createElement("h2");
  title.textContent = "ADD SNACKS";

  const subtitle = document.createElement("p");
  subtitle.textContent = "Select snacks to add to this gaming session.";

  heading.append(title, subtitle);

  const closeBtn = document.createElement("button");
  closeBtn.className = "snack-close";
  closeBtn.textContent = "×";

  header.append(heading, closeBtn);

  // SEARCH BAR
  const searchWrapper = document.createElement("div");
  searchWrapper.className = "snack-search-wrapper";

  const searchInput = document.createElement("input");
  searchInput.type = "search";
  searchInput.className = "snack-search-input";
  searchInput.placeholder = "Search snacks by name...";
  searchInput.autocomplete = "off";

  searchWrapper.appendChild(searchInput);

  // PRODUCT LIST
  const productList = document.createElement("div");
  productList.className = "snack-product-list";

  // ORDER SUMMARY
  const summary = document.createElement("div");
  summary.className = "snack-order-summary";

  const summaryLabel = document.createElement("span");
  summaryLabel.textContent = "SELECTED SNACKS";

  const summaryCount = document.createElement("strong");
  summaryCount.textContent = "0 items";

  const totalLabel = document.createElement("span");
  totalLabel.textContent = "SNACK TOTAL";

  const totalAmount = document.createElement("strong");
  totalAmount.textContent = "₹0";

  const summaryTop = document.createElement("div");
  summaryTop.className = "snack-summary-top";
  summaryTop.append(summaryLabel, summaryCount);

  const summaryBottom = document.createElement("div");
  summaryBottom.className = "snack-summary-bottom";
  summaryBottom.append(totalLabel, totalAmount);

  summary.append(summaryTop, summaryBottom);

  // FOOTER
  const footer = document.createElement("div");
  footer.className = "snack-modal-footer";

  const cancelBtn = document.createElement("button");
  cancelBtn.className = "snack-cancel-btn";
  cancelBtn.textContent = "Cancel";

  const addBtn = document.createElement("button");
  addBtn.className = "snack-add-btn";
  addBtn.textContent = "Add to Session";
  addBtn.disabled = true;

  footer.append(cancelBtn, addBtn);

  modal.append(header, searchWrapper, productList, summary, footer);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  // QUANTITY TRACKER
  const quantities = new Map();

  available.forEach(snack => {
    quantities.set(String(snack.snackId), 0);
  });

  function updateSummary() {

    let count = 0;
    let total = 0;

    available.forEach(snack => {

      const quantity = quantities.get(String(snack.snackId)) || 0;

      count += quantity;

      total += quantity * Number(snack.sellingPrice);
    });

    summaryCount.textContent =
      `${count} ${count === 1 ? "item" : "items"}`;

    totalAmount.textContent = "₹" + total;

    addBtn.disabled = count === 0;

    addBtn.textContent = count > 0
      ? `Add to Session · ₹${total}`
      : "Add to Session";
  }

  // CREATE PRODUCT CARDS
  available.forEach(snack => {

    const card = document.createElement("div");
    card.className = "snack-product-card";

    card.dataset.searchName = snack.snackName.toLowerCase();

    const info = document.createElement("div");
    info.className = "snack-product-info";

    const name = document.createElement("h3");
    name.textContent = snack.snackName;

    const price = document.createElement("strong");
    price.textContent = "₹" + snack.sellingPrice;

    const stock = document.createElement("span");
    stock.textContent = `${snack.currentStock} available`;

    info.append(name, price, stock);

    const controls = document.createElement("div");
    controls.className = "snack-quantity-controls";

    const minus = document.createElement("button");
    minus.textContent = "−";
    minus.type = "button";
    minus.className = "snack-qty-btn";

    const quantity = document.createElement("strong");
    quantity.className = "snack-quantity";
    quantity.textContent = "0";

    const plus = document.createElement("button");
    plus.textContent = "+";
    plus.type = "button";
    plus.className = "snack-qty-btn";

    minus.disabled = true;

    minus.addEventListener("click", () => {

      let current = quantities.get(String(snack.snackId));

      if (current > 0) {
        current--;
        quantities.set(String(snack.snackId), current);

        quantity.textContent = current;
        minus.disabled = current === 0;
        plus.disabled = false;

        updateSummary();
      }
    });

    plus.addEventListener("click", () => {

      let current = quantities.get(String(snack.snackId));

      if (current < Number(snack.currentStock)) {

        current++;
        quantities.set(String(snack.snackId), current);

        quantity.textContent = current;
        minus.disabled = false;

        plus.disabled =
          current >= Number(snack.currentStock);

        updateSummary();
      }
    });

    controls.append(minus, quantity, plus);

    card.append(info, controls);

    productList.appendChild(card);
  });

  // LIVE SNACK SEARCH
  searchInput.addEventListener("input", () => {

    const query = searchInput.value.trim().toLowerCase();

    productList.querySelectorAll(".snack-product-card")
      .forEach(card => {

        const name = card.dataset.searchName || "";

        card.style.display = name.includes(query)
          ? "flex"
          : "none";
      });
  });

  // CLOSE MODAL
  function closeModal() {
    overlay.remove();
  }

  closeBtn.addEventListener("click", closeModal);
  cancelBtn.addEventListener("click", closeModal);

  overlay.addEventListener("click", event => {
    if (event.target === overlay) {
      closeModal();
    }
  });

  // ADD SNACKS TO SESSION
  addBtn.addEventListener("click", async () => {

    const selectedSnacks = available
      .map(snack => ({
        snackId: snack.snackId,
        quantity: quantities.get(String(snack.snackId)) || 0
      }))
      .filter(item => item.quantity > 0);

    if (!selectedSnacks.length) return;

    addBtn.disabled = true;
    addBtn.textContent = "Adding...";

    try {

      const result = await apiRequest({
        action: "addSessionSnacks",
        token: sessionToken,
        sessionId: sessionId,
        snacks: selectedSnacks
      });

      closeModal();

      showToast(
        "Snacks added successfully.\n" +
        "New total: ₹" + result.grandTotal
      );

      await loadDashboard();
      await loadLiveSessions();

    } catch (error) {

      addBtn.disabled = false;
      updateSummary();

      showToast(error.message);
    }
  });

  updateSummary();
}


/* END SESSION */

let paymentSessionId = null;

function closeSession(sessionId) {
  const session = liveSessions.find(
    item => item.sessionId === sessionId
  );

  if (!session) {
    showToast("Session not found.");
    return;
  }

  paymentSessionId = sessionId;

  $("paymentCustomer").textContent =
    `${session.customerName} | ${session.console}`;

  $("paymentOriginalBill").textContent =
    "₹" + Number(session.grandTotal).toFixed(2);

  $("paymentDiscount").value = 0;
  $("paymentCash").value = 0;
  $("paymentUPI").value = 0;
  $("paymentOther").value = 0;

  $("paymentError").textContent = "";

  $("paymentModal").classList.remove("hidden");

  calculatePayment();
}


function calculatePayment() {
  if (!paymentSessionId) return;

  const session = liveSessions.find(
    item => item.sessionId === paymentSessionId
  );

  if (!session) return;

  const originalBill = Math.round(
    Number(session.grandTotal) * 100
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
    "₹" + (finalBill / 100).toFixed(2);

  $("paymentTotalReceived").textContent =
    "₹" + (totalReceived / 100).toFixed(2);

  $("paymentDue").textContent =
    "₹" + (Math.max(due, 0) / 100).toFixed(2);

  const valid = [
    originalBill,
    discount,
    cash,
    upi,
    other
  ].every(Number.isFinite) &&
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


// Update calculations while typing
[
  "paymentDiscount",
  "paymentCash",
  "paymentUPI",
  "paymentOther"
].forEach(id => {
  $(id).addEventListener("input", calculatePayment);
});


// Cancel payment
$("cancelPaymentButton").addEventListener("click", () => {
  $("paymentModal").classList.add("hidden");
  paymentSessionId = null;
});


// Confirm payment and close session
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
    item => item.sessionId === sessionId
  );

  if (!session) {
    showToast("Session not found.");
    return;
  }

  const finalBill = session.grandTotal - discount;
  const totalPaid = cashPaid + upiPaid + otherPaid;
  const due = Math.round((finalBill - totalPaid) * 100) / 100;

  const confirmation = due > 0
    ? `Close session with ₹${due.toFixed(2)} outstanding due?`
    : "Confirm payment and close this session?";

  if (!(await showConfirm(confirmation, { title: "Confirm session closure", confirmText: "Close session", danger: due > 0 }))) return;

  button.disabled = true;
  button.textContent = "PROCESSING...";

  try {
    const result = await apiRequest({
      action: "closeSession",
      token: sessionToken,
      sessionId: sessionId,
      discount: discount,
      cashPaid: cashPaid,
      upiPaid: upiPaid,
      otherPaid: otherPaid
    });

    $("paymentModal").classList.add("hidden");
    paymentSessionId = null;

    showToast(
      "Session completed successfully!\n" +
      "Final Bill: ₹" + result.finalBill + "\n" +
      "Total Received: ₹" + result.totalPaid + "\n" +
      "Outstanding Due: ₹" + result.dueAmount
    );

    await loadDashboard();

  } catch (error) {
    $("paymentError").textContent = error.message;
  } finally {
    button.disabled = false;
    button.textContent = "Collect Payment & End Session";
  }
});

/* MANUAL REFRESH */

$("refreshSessionsButton").addEventListener(
  "click",
  loadLiveSessions
);


/* AUTOMATIC REFRESH */

if (liveRefreshTimer) {
  clearInterval(liveRefreshTimer);
}

// Update countdown every second
liveRefreshTimer = setInterval(() => {
  if (sessionToken) {
    updateSessionTimers();
  }
}, 1000);

// Refresh session data from Google Sheets every 30 seconds
setInterval(() => {
  if (sessionToken) {
    loadLiveSessions();
  }
}, 30000);


const AXOM_FIREBASE_CONFIG = {
  apiKey: "AIzaSyDTNRP1WNdq1Xl87ATWcxdvQtz0oATsCqM",
  authDomain: "axom-gaming-26a40.firebaseapp.com",
  projectId: "axom-gaming-26a40",
  storageBucket: "axom-gaming-26a40.firebasestorage.app",
  messagingSenderId: "866787050834",
  appId: "1:866787050834:web:9ee0e6f620af249fc0a68b"
};

const AXOM_VAPID_KEY =
  "BNo_T1iP6GA-1tO17Ebyv68wbb53YwDdSXh_BXmIJD94l4yytIOnVvRPjQhKt1AIAYLCY8rrUFGtwP65F7nWAJI";

const notificationModal = $("notificationModal");

$("notificationSettingsButton")?.addEventListener("click", () => {
  notificationModal.classList.remove("hidden");
  updateNotificationStatus();
});

$("closeNotificationModal")?.addEventListener("click", () => {
  notificationModal.classList.add("hidden");
});

notificationModal?.addEventListener("click", event => {
  if (event.target === notificationModal) {
    notificationModal.classList.add("hidden");
  }
});

function getAxomMessaging() {
  if (!firebase.apps.length) {
    firebase.initializeApp(AXOM_FIREBASE_CONFIG);
  }
  return firebase.messaging();
}

async function updateNotificationStatus() {
  const status = $("notificationStatus");
  const enable = $("enablePushButton");
  const disable = $("disablePushButton");

  if (!status || !enable || !disable) return;

  if (!("Notification" in window)) {
    status.textContent = "Notifications are not supported by this browser.";
    enable.style.display = "none";
    disable.style.display = "none";
    return;
  }

  if (Notification.permission === "denied") {
    status.textContent = "Notifications are blocked in browser settings.";
    enable.style.display = "none";
    disable.style.display = "none";
    return;
  }

  if (Notification.permission === "granted") {
    status.textContent = "Permission granted. Checking device registration...";
    enable.style.display = "block";
    disable.style.display = "none";
  } else {
    status.textContent = "Notifications are currently disabled.";
    enable.style.display = "block";
    disable.style.display = "none";
  }
}

$("enablePushButton")?.addEventListener("click", async () => {
  const button = $("enablePushButton");

  try {
    if (!sessionToken) throw new Error("Please log in first.");

    button.disabled = true;
    button.textContent = "Enabling...";

    if (!("serviceWorker" in navigator)) {
      throw new Error("Service workers are not supported.");
    }

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      throw new Error("Notification permission was not granted.");
    }

    const registration = await navigator.serviceWorker.register(
      "./service-worker.js"
    );

    await navigator.serviceWorker.ready;

    const messaging = getAxomMessaging();
    const fcmToken = await messaging.getToken({
      vapidKey: AXOM_VAPID_KEY,
      serviceWorkerRegistration: registration
    });

    if (!fcmToken) throw new Error("Unable to create device token.");

    const platform = /iPhone|iPad|iPod/i.test(navigator.userAgent)
      ? "iOS PWA"
      : /Android/i.test(navigator.userAgent)
        ? "Android"
        : "Web";

    await apiRequest({
      action: "registerPushToken",
      token: sessionToken,
      fcmToken,
      platform
    });

    showToast("Notifications enabled successfully.", "success");
    await updateNotificationStatus();

  } catch (error) {
    console.error(error);
    showToast(error.message, "error");
  } finally {
    button.disabled = false;
    button.textContent = "Enable Notifications";
  }
});

$("disablePushButton")?.addEventListener("click", async () => {
  const button = $("disablePushButton");

  try {
    button.disabled = true;
    button.textContent = "Disabling...";

    const messaging = getAxomMessaging();
    const fcmToken = await messaging.getToken({
      vapidKey: AXOM_VAPID_KEY,
      serviceWorkerRegistration: await navigator.serviceWorker.ready
    });

    if (fcmToken) {
      await apiRequest({
        action: "unregisterPushToken",
        token: sessionToken,
        fcmToken
      });

      await messaging.deleteToken();
    }

    showToast("Notifications disabled on this device.", "success");
    await updateNotificationStatus();

  } catch (error) {
    console.error(error);
    showToast(error.message, "error");
  } finally {
    button.disabled = false;
    button.textContent = "Disable Notifications";
  }
});

const CONFIG = {
  SESSION_HOURS: 12,
  TIMEZONE: "Asia/Kolkata",

  SHEETS: {
    ADMIN: "Admin",
    CONSOLES: "Consoles",
    PRICES: "Gaming_Prices",
    STOCK: "Snacks_Stock",
    GAMING_SALES: "Gaming_Sales",
    SNACK_SALES: "Snack_Sales",
    PURCHASES: "Stock_Purchases",
    ADJUSTMENTS: "Stock_Adjustments",
    SETTINGS: "Settings"
  }
};

const ADMIN_RESET_EMAIL = "axomgaming2026@gmail.com";


/* =====================================
   ADMIN INITIALIZATION
===================================== */

function setupAdmin() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEETS.ADMIN);

  if (!sheet) {
    throw new Error("Admin sheet not found.");
  }

  if (sheet.getLastRow() > 1) {
    ui.alert(
      "An admin already exists. Use the password reset procedure instead."
    );
    return;
  }

  const usernameResponse = ui.prompt(
    "Create Admin",
    "Enter your admin username:",
    ui.ButtonSet.OK_CANCEL
  );

  if (usernameResponse.getSelectedButton() !== ui.Button.OK) {
    return;
  }

  const username = usernameResponse.getResponseText().trim();

  if (!/^[a-zA-Z0-9_.-]{3,40}$/.test(username)) {
    ui.alert(
      "Username must be 3-40 characters and contain only letters, numbers, dots, underscores, or hyphens."
    );
    return;
  }

  const passwordResponse = ui.prompt(
    "Create Admin Password",
    "Enter a strong password of at least 6 characters:",
    ui.ButtonSet.OK_CANCEL
  );

  if (passwordResponse.getSelectedButton() !== ui.Button.OK) {
    return;
  }

  const password = passwordResponse.getResponseText();

  if (password.length < 6) {
    ui.alert("Password must contain at least 6 characters.");
    return;
  }

  const salt = Utilities.getUuid() + Utilities.getUuid();

  const passwordHash = hashPassword_(password, salt);

  sheet.appendRow([
    username,
    passwordHash,
    salt,
    true,
    "Admin"
  ]);

  ui.alert(
    "Admin created successfully. Keep your password private."
  );
}


/* =====================================
   STAFF ACCOUNT CREATION
   Edit the two values below, then run
   createStaffUser() manually once.
===================================== */

function createStaffUser() {
  const username = "CHANGE_STAFF_USERNAME";
  const password = "CHANGE_TO_A_STRONG_TEMPORARY_PASSWORD";

  if (
    username === "CHANGE_STAFF_USERNAME" ||
    password === "CHANGE_TO_A_STRONG_TEMPORARY_PASSWORD"
  ) {
    throw new Error("Edit the staff username and temporary password first.");
  }

  if (!/^[a-zA-Z0-9_.-]{3,40}$/.test(username)) {
    throw new Error("Username must be 3-40 characters and use letters, numbers, dots, underscores or hyphens.");
  }

  if (password.length < 12) {
    throw new Error("Use a temporary password of at least 12 characters.");
  }

  const sheet = getSheet_(CONFIG.SHEETS.ADMIN);
  const rows = sheet.getDataRange().getValues();

  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]).toLowerCase() === username.toLowerCase()) {
      throw new Error("That username already exists.");
    }
  }

  const salt = Utilities.getUuid() + Utilities.getUuid();
  const passwordHash = hashPassword_(password, salt);

  sheet.appendRow([username, passwordHash, salt, true, "Staff"]);
  SpreadsheetApp.flush();

  Logger.log("Staff account created: " + username);
  Logger.log("Role: Staff (restricted access)");
  Logger.log("Give the temporary password to the staff member securely, then remove it from this source code.");
}


/* =====================================
   PASSWORD HASHING
===================================== */

function hashPassword_(password, salt) {
  const bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    salt + password,
    Utilities.Charset.UTF_8
  );

  return Utilities.base64Encode(bytes);
}


/* =====================================
   WEB APP ENTRY POINT
===================================== */

function doGet() {
  return jsonResponse_({
    success: true,
    message: "AXOM GAMING API is running."
  });
}


function doPost(e) {
  try {
    const body = e && e.postData
      ? JSON.parse(e.postData.contents || "{}")
      : {};

    const action = body.action;

    // Every authenticated API request is checked here as well as in
    // sensitive handlers. UI hiding is never treated as authorization.
    const publicActions = [
      "login",
      "requestAdminPasswordReset",
      "completeAdminPasswordReset"
    ];

    if (!publicActions.includes(action)) {
      const user = getSessionUser_(body.token);
      const adminOnlyActions = [
        "getMonthlyReport",
        "setupMembershipSheets",
        "addMember",
        "renewMember",
        "adjustStock",
        "addNewSnack",
        "editSnackStock",
        "registerPushToken",
        "unregisterPushToken"
      ];
      if (user.role !== "Admin" && adminOnlyActions.includes(action)) {
        throw new Error("Access denied. This action requires owner/admin permission.");
      }
    }

    let result;

    switch (action) {
      case "login":
        result = login_(body);
        break;

      case "requestAdminPasswordReset":
        result = requestAdminPasswordReset_(body);
        break;

      case "completeAdminPasswordReset":
        result = completeAdminPasswordReset_(body);
        break;
      
      case "adjustSessionDuration":
        result = adjustLiveSessionDuration_(body);
        break;

      case "getInitialData":
        result = getInitialData_(body);
        break;

      case "getDailySummary":
        result = getDailySummary_(body);
        break;

      case "getMonthlyReport":
        result = getMonthlyReport_(body);
        break;

      case "createBooking":
        result = createBooking_(body);
        break;

      case "logout":
        result = logout_(body);
        break;

      case "startSession":
        result = startLiveSession_(body);
        break;

      case "getLiveSessions":
        result = getLiveSessions_(body);
        break;

      case "extendSession":
        result = extendLiveSession_(body);
        break;

      case "addSessionSnacks":
        result = addSessionSnacks_(body);
        break;

      case "closeSession":
        result = closeLiveSession_(body);
        break;

      case "registerPushToken":
        result = registerPushToken_(body);
        break;

      case "unregisterPushToken":
        result = unregisterPushToken_(body);
        break;

      case "getStockManagementData":
        result = getStockManagementData_(body);
        break;

      case "addStockPurchase":
        result = addStockPurchase_(body);
        break;

      case "getStockPurchaseHistory":
        result = getStockPurchaseHistory_(body);
        break;

      case "adjustStock":
        result = adjustStock_(body);
        break;

      case "addNewSnack":
        result = addNewSnack_(body);
        break;

      case "editSnackStock":
        result = editSnackStock_(body);
        break;

      case "setupMembershipSheets":
        result = setupMembershipSheets_(body);
        break;

      case "getMembershipData":
        result = getMembershipData_(body);
        break;

      case "addMember":
        result = addMember_(body);
        break;

      case "renewMember":
        result = renewMember_(body);
        break;

      case "createMembershipBooking":
        result = createMembershipBooking_(body);
        break;

      case "getDuesData":
        result = getDuesData_(body);
        break;

      case "addManualDue":
        result = addManualDue_(body);
        break;

      case "collectDuePayment":
        result = collectDuePayment_(body);
        break;

      default:
        throw new Error("Unknown action.");
    }

    return jsonResponse_(result);

  } catch (error) {
    return jsonResponse_({
      success: false,
      message: error.message || "An unexpected error occurred."
    });
  }
}


/* =====================================
   JSON RESPONSE
===================================== */

function jsonResponse_(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}


/* =====================================
   ADMIN LOGIN
===================================== */

function login_(body) {
  const username = String(body.username || "").trim();
  const password = String(body.password || "");

  if (!username || !password) {
    throw new Error("Enter username and password.");
  }

  const sheet = getSheet_(CONFIG.SHEETS.ADMIN);
  const rows = sheet.getDataRange().getValues();
  let matchedUser = null;

  for (let i = 1; i < rows.length; i++) {
    if (
      String(rows[i][0]) === username &&
      rows[i][3] === true
    ) {
      matchedUser = {
        username: String(rows[i][0]),
        passwordHash: String(rows[i][1]),
        salt: String(rows[i][2]),
        role: String(rows[i][4] || "Admin")
      };
      break;
    }
  }

  if (!matchedUser) {
    throw new Error("Invalid username or password.");
  }

  const submittedHash = hashPassword_(password, matchedUser.salt);
  if (submittedHash !== matchedUser.passwordHash) {
    throw new Error("Invalid username or password.");
  }

  const role = matchedUser.role.toLowerCase() === "staff" ? "Staff" : "Admin";
  const token = Utilities.getUuid() + Utilities.getUuid();
  const expiresInSeconds = CONFIG.SESSION_HOURS * 60 * 60;

  const sessionData = {
    username: matchedUser.username,
    role: role,
    expiresAt: Date.now() + expiresInSeconds * 1000
  };

  PropertiesService.getScriptProperties().setProperty(
    sessionKey_(token),
    JSON.stringify(sessionData)
  );

  return {
    success: true,
    token: token,
    username: matchedUser.username,
    role: role,
    expiresInSeconds: expiresInSeconds
  };
}


/* =====================================
   AUTHENTICATION
===================================== */

function sessionKey_(token) {
  const digest = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    token,
    Utilities.Charset.UTF_8
  );

  return "ADMIN_SESSION_" +
    Utilities.base64EncodeWebSafe(digest).replace(/=+$/, "");
}


function authenticate_(token) {
  if (!token || typeof token !== "string") {
    throw new Error("Session expired. Please log in again.");
  }

  const properties = PropertiesService.getScriptProperties();
  const key = sessionKey_(token);
  const storedSession = properties.getProperty(key);

  if (!storedSession) {
    throw new Error("Session expired. Please log in again.");
  }

  let session;

  try {
    session = JSON.parse(storedSession);
  } catch (error) {
    properties.deleteProperty(key);
    throw new Error("Invalid session. Please log in again.");
  }

  if (!session.username || Date.now() >= session.expiresAt) {
    properties.deleteProperty(key);
    throw new Error("Session expired. Please log in again.");
  }

  return session.username;
}

function getSessionUser_(token) {
  if (!token || typeof token !== "string") {
    throw new Error("Session expired. Please log in again.");
  }

  const props = PropertiesService.getScriptProperties();
  const key = sessionKey_(token);
  const raw = props.getProperty(key);
  if (!raw) throw new Error("Session expired. Please log in again.");

  let session;
  try {
    session = JSON.parse(raw);
  } catch (error) {
    props.deleteProperty(key);
    throw new Error("Invalid session. Please log in again.");
  }

  if (!session.username || Date.now() >= Number(session.expiresAt || 0)) {
    props.deleteProperty(key);
    throw new Error("Session expired. Please log in again.");
  }

  return {
    username: session.username,
    role: session.role === "Staff" ? "Staff" : "Admin"
  };
}

function requireAdmin_(token) {
  const user = getSessionUser_(token);
  if (user.role !== "Admin") {
    throw new Error("Access denied. Admin permission is required.");
  }
  return user;
}



/* =====================================
   LOGOUT
===================================== */

function logout_(body) {
  const token = body.token;

  if (token && typeof token === "string") {
    PropertiesService.getScriptProperties()
      .deleteProperty(sessionKey_(token));
  }

  return {
    success: true,
    message: "Logged out successfully."
  };
}


/* =====================================
   SHEET HELPERS
===================================== */

function getSheet_(name) {
  const sheet = SpreadsheetApp
    .getActiveSpreadsheet()
    .getSheetByName(name);

  if (!sheet) {
    throw new Error("Missing sheet: " + name);
  }

  return sheet;
}


function getRecords_(sheetName) {
  const sheet = getSheet_(sheetName);
  const values = sheet.getDataRange().getValues();

  if (values.length < 2) {
    return [];
  }

  const headers = values[0];

  return values.slice(1)
    .filter(row => row.some(value => value !== ""))
    .map(row => {
      const record = {};

      headers.forEach((header, index) => {
        record[header] = row[index];
      });

      return record;
    });
}


/* =====================================
   LOAD WEBSITE DATA
===================================== */

function getInitialData_(body) {
  const currentUser = getSessionUser_(body.token);

  const consoles = getRecords_(
    CONFIG.SHEETS.CONSOLES
  )
    .filter(item => item.Active === true)
    .map(item => ({
      consoleId: String(item.ConsoleID),
      consoleName: String(item.ConsoleName),
      consoleType: String(item.ConsoleType)
    }));

  const prices = getRecords_(
    CONFIG.SHEETS.PRICES
  ).map(item => ({
    consoleType: String(item.ConsoleType),
    players: String(item.Players),
    durationMinutes: Number(item.DurationMinutes),
    price: Number(item.Price)
  }));

  const snacks = getRecords_(
    CONFIG.SHEETS.STOCK
  )
    .filter(item =>
      item.Active === true &&
      Number(item.CurrentStock) > 0
    )
    .map(item => ({
      snackId: String(item.SnackID),
      snackName: String(item.SnackName),
      category: String(item.Category),
      sellingPrice: Number(item.SellingPrice),
      currentStock: Number(item.CurrentStock)
    }));

  const settings = {};

  getRecords_(CONFIG.SHEETS.SETTINGS)
    .forEach(item => {
      settings[String(item.Setting)] = item.Value;
    });

  return {
    success: true,
    username: currentUser.username,
    role: currentUser.role,
    consoles: consoles,
    prices: prices,
    snacks: snacks,
    settings: currentUser.role === "Admin" ? settings : {}
  };
}


/* =====================================
   PRICE CALCULATION
===================================== */

function calculateGamingAmount_(consoleType, players, durationMinutes) {
  if (
    !Number.isInteger(durationMinutes) ||
    durationMinutes < 15 ||
    durationMinutes % 15 !== 0
  ) {
    throw new Error("Duration must be at least 15 minutes in 15-minute intervals.");
  }

  const matchingPrices = getRecords_(CONFIG.SHEETS.PRICES).filter(item =>
    String(item.ConsoleType).trim().toUpperCase() ===
      String(consoleType).trim().toUpperCase() &&
    String(item.Players).trim().toUpperCase() ===
      String(players).trim().toUpperCase()
  );

  if (!matchingPrices.length) {
    throw new Error("No prices configured for this console and player type.");
  }

  const exactPrice = matchingPrices.find(item =>
    Number(item.DurationMinutes) === durationMinutes
  );

  if (exactPrice) return Number(exactPrice.Price);

  const price30Row = matchingPrices.find(item =>
    Number(item.DurationMinutes) === 30
  );

  const price60Row = matchingPrices.find(item =>
    Number(item.DurationMinutes) === 60
  );

  const price60 = price60Row
    ? Number(price60Row.Price)
    : price30Row
      ? Number(price30Row.Price) * 2
      : 0;

  const price30 = price30Row
    ? Number(price30Row.Price)
    : price60Row
      ? Number(price60Row.Price) / 2
      : 0;

  if (!price30 || !price60) {
    throw new Error("Configure either a 30-minute or 60-minute price.");
  }

  let remaining = durationMinutes;
  let total = 0;

  while (remaining >= 60) {
    total += price60;
    remaining -= 60;
  }

  if (remaining >= 30) {
    total += price30;
    remaining -= 30;
  }

  if (remaining >= 15) {
    total += price30 / 2;
    remaining -= 15;
  }

  return Math.round(total);
}

/* =====================================
   CREATE BOOKING
===================================== */

function createBooking_(body) {
  authenticate_(body.token);

  const customerName = String(
    body.customerName || ""
  ).trim();

  const phone = String(body.phone || "").trim();

  const consoleName = String(
    body.consoleName || ""
  ).trim();

  const players = String(body.players || "");

  const date = String(body.date || "");

  const startTime = String(
    body.startTime || ""
  );

  const durationMinutes = Number(
    body.durationMinutes
  );

  const paymentMethod = String(
    body.paymentMethod || ""
  );

  if (!customerName) {
    throw new Error("Customer name is required.");
  }

  if (phone && !/^\d{10}$/.test(phone)) {
    throw new Error("Enter a valid 10-digit phone number.");
  }

  if (!["Solo", "Duo", "Trio", "Quad"].includes(players)) {
    throw new Error("Invalid player selection.");
  }

  if (!["Cash", "UPI", "Other"].includes(paymentMethod)) {
    throw new Error("Invalid payment method.");
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error("Invalid booking date.");
  }

  if (!/^\d{2}:\d{2}$/.test(startTime)) {
    throw new Error("Invalid starting time.");
  }

  const timeParts = startTime.split(":").map(Number);

  if (
    timeParts[0] > 23 ||
    timeParts[1] > 59
  ) {
    throw new Error("Invalid starting time.");
  }

  const startMinutes =
    timeParts[0] * 60 + timeParts[1];

  const endMinutes =
    startMinutes + durationMinutes;

  if (
    endMinutes > 24 * 60 ||
    startMinutes < 10 * 60 ||
    endMinutes > 22 * 60
  ) {
    throw new Error(
      "Booking must fall within cafe operating hours, 10 AM to 10 PM."
    );
  }

  const endTime =
    String(Math.floor(endMinutes / 60)).padStart(2, "0") +
    ":" +
    String(endMinutes % 60).padStart(2, "0");

  const validDate = Utilities.parseDate(
    date,
    CONFIG.TIMEZONE,
    "yyyy-MM-dd"
  );

  if (
    Utilities.formatDate(
      validDate,
      CONFIG.TIMEZONE,
      "yyyy-MM-dd"
    ) !== date
  ) {
    throw new Error("Invalid booking date.");
  }

  const selectedConsole = getRecords_(
    CONFIG.SHEETS.CONSOLES
  ).find(item =>
    String(item.ConsoleName) === consoleName &&
    item.Active === true
  );

  if (!selectedConsole) {
    throw new Error("Selected console is unavailable.");
  }

  const consoleType = String(
    selectedConsole.ConsoleType
  );

  const gamingAmount = calculateGamingAmount_(
    consoleType,
    players,
    durationMinutes
  );

  const snacks = Array.isArray(body.snacks)
    ? body.snacks
    : [];

  if (snacks.length > 30) {
    throw new Error("Too many snack items.");
  }

  const lock = LockService.getScriptLock();

  lock.waitLock(20000);

  try {
    const stockSheet = getSheet_(
      CONFIG.SHEETS.STOCK
    );

    const stockRows = stockSheet
      .getDataRange()
      .getValues();

    const stockHeaders = stockRows[0];

    const stockColumns = {};

    stockHeaders.forEach((header, index) => {
      stockColumns[header] = index;
    });

    const snackIndex = {};

    for (let i = 1; i < stockRows.length; i++) {
      const row = stockRows[i];

      snackIndex[String(
        row[stockColumns.SnackID]
      )] = {
        rowNumber: i + 1,
        name: String(
          row[stockColumns.SnackName]
        ),
        price: Number(
          row[stockColumns.SellingPrice]
        ),
        quantity: Number(
          row[stockColumns.CurrentStock]
        ),
        active: row[stockColumns.Active] === true
      };
    }

    const aggregated = {};

    snacks.forEach(item => {
      const snackId = String(
        item.snackId || ""
      );

      const quantity = Number(item.quantity);

      if (
        !Number.isInteger(quantity) ||
        quantity < 1 ||
        quantity > 1000
      ) {
        throw new Error("Invalid snack quantity.");
      }

      if (!snackIndex[snackId]) {
        throw new Error(
          "A selected snack does not exist."
        );
      }

      if (!snackIndex[snackId].active) {
        throw new Error(
          "A selected snack is inactive."
        );
      }

      if (!aggregated[snackId]) {
        aggregated[snackId] = 0;
      }

      aggregated[snackId] += quantity;
    });

    const saleItems = [];

    let snacksAmount = 0;

    Object.keys(aggregated).forEach(snackId => {
      const snack = snackIndex[snackId];

      const quantity = aggregated[snackId];

      if (snack.quantity < quantity) {
        throw new Error(
          "Insufficient stock for " + snack.name +
          ". Available: " + snack.quantity
        );
      }

      const total = quantity * snack.price;

      snacksAmount += total;

      saleItems.push({
        snackId: snackId,
        snackName: snack.name,
        quantity: quantity,
        unitPrice: snack.price,
        totalAmount: total,
        stockRow: snack.rowNumber,
        remainingStock: snack.quantity - quantity
      });
    });

    const grandTotal = gamingAmount + snacksAmount;

    const bookingId =
      "AG-" + Utilities.getUuid().slice(0, 8).toUpperCase();

    const createdAt = new Date();

    const bookingDate = Utilities.parseDate(
      date,
      CONFIG.TIMEZONE,
      "yyyy-MM-dd"
    );

    const gamingSheet = getSheet_(
      CONFIG.SHEETS.GAMING_SALES
    );

    const snackSalesSheet = getSheet_(
      CONFIG.SHEETS.SNACK_SALES
    );

    // Save the booking with an audit identity for the staff member.
    let gamingHeaders = gamingSheet.getRange(1, 1, 1, gamingSheet.getLastColumn()).getValues()[0].map(h => String(h).trim());
    if (!gamingHeaders.includes("CreatedBy")) {
      gamingSheet.getRange(1, gamingHeaders.length + 1).setValue("CreatedBy");
      gamingHeaders.push("CreatedBy");
    }
    const bookingRecord = {
      BookingID: bookingId, CreatedAt: createdAt, Date: bookingDate,
      CustomerName: customerName, Phone: phone, StartTime: startTime,
      DurationMinutes: durationMinutes, EndTime: endTime, Console: consoleName,
      Players: players, GamingAmount: gamingAmount, SnacksAmount: snacksAmount,
      GrandTotal: grandTotal, PaymentMethod: paymentMethod,
      CreatedBy: getSessionUser_(body.token).username
    };
    gamingSheet.appendRow(gamingHeaders.map(header =>
      bookingRecord[header] !== undefined ? bookingRecord[header] : ""
    ));

    // Save snack sales with the same staff audit identity and deduct stock.
    let snackHeaders = snackSalesSheet.getRange(1, 1, 1, snackSalesSheet.getLastColumn()).getValues()[0].map(h => String(h).trim());
    if (!snackHeaders.includes("SoldBy")) {
      snackSalesSheet.getRange(1, snackHeaders.length + 1).setValue("SoldBy");
      snackHeaders.push("SoldBy");
    }
    saleItems.forEach(item => {
      const saleId =
        "SS-" + Utilities.getUuid().slice(0, 8).toUpperCase();
      const snackSaleRecord = {
        SaleID: saleId, BookingID: bookingId, Date: bookingDate,
        SnackID: item.snackId, SnackName: item.snackName,
        Quantity: item.quantity, UnitPrice: item.unitPrice,
        TotalAmount: item.totalAmount,
        SoldBy: getSessionUser_(body.token).username
      };
      snackSalesSheet.appendRow(snackHeaders.map(header =>
        snackSaleRecord[header] !== undefined ? snackSaleRecord[header] : ""
      ));

      stockSheet.getRange(
        item.stockRow,
        stockColumns.CurrentStock + 1
      ).setValue(item.remainingStock);
    });

    SpreadsheetApp.flush();

    return {
      success: true,
      bookingId: bookingId,
      customerName: customerName,
      console: consoleName,
      startTime: startTime,
      endTime: endTime,
      durationMinutes: durationMinutes,
      gamingAmount: gamingAmount,
      snacksAmount: snacksAmount,
      grandTotal: grandTotal,
      paymentMethod: paymentMethod,
      snacks: saleItems.map(item => ({
        snackName: item.snackName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalAmount: item.totalAmount
      }))
    };

  } finally {
    lock.releaseLock();
  }
}

function getDailySummary_(body) {
  getSessionUser_(body.token);

  const today = Utilities.formatDate(
    new Date(),
    CONFIG.TIMEZONE,
    "yyyy-MM-dd"
  );

  const records = getRecords_(CONFIG.SHEETS.GAMING_SALES);

  let gamingRevenue = 0;
  let snacksRevenue = 0;
  let totalRevenue = 0;
  let cashRevenue = 0;
  let upiRevenue = 0;
  let otherRevenue = 0;
  let customerCount = 0;

  records.forEach(record => {
    const recordDate = record.Date instanceof Date
      ? Utilities.formatDate(
          record.Date,
          CONFIG.TIMEZONE,
          "yyyy-MM-dd"
        )
      : String(record.Date).trim();

    if (recordDate !== today) return;

    const gaming = Number(record.GamingAmount) || 0;
    const snacks = Number(record.SnacksAmount) || 0;
    const discount = Number(record.Discount) || 0;

    const originalBill =
      Number(record.GrandTotal) || (gaming + snacks);

    // Use FinalBill when available; otherwise calculate it.
    const finalBill = record.FinalBill !== "" &&
      record.FinalBill !== null &&
      record.FinalBill !== undefined
        ? Number(record.FinalBill)
        : Math.max(0, originalBill - discount);

    // Match the monthly report's treatment of discounts.
    gamingRevenue += Math.max(0, gaming - discount);
    snacksRevenue += snacks;
    totalRevenue += finalBill;

    customerCount++;

    // Actual collections, not the original bill.
    cashRevenue += Number(record.CashPaid) || 0;
    upiRevenue += Number(record.UPIPaid) || 0;
    otherRevenue += Number(record.OtherPaid) || 0;
  });

  return {
    success: true,
    date: today,
    gamingRevenue: Math.round(gamingRevenue * 100) / 100,
    snacksRevenue: Math.round(snacksRevenue * 100) / 100,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    cashRevenue: Math.round(cashRevenue * 100) / 100,
    upiRevenue: Math.round(upiRevenue * 100) / 100,
    otherRevenue: Math.round(otherRevenue * 100) / 100,
    customerCount: customerCount
  };
}


function setupLiveSessionSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const definitions = {
    Live_Sessions: [
      "SessionID",
      "BookingID",
      "CustomerName",
      "Phone",
      "Console",
      "Players",
      "Date",
      "StartTime",
      "ScheduledEndTime",
      "OriginalDurationMinutes",
      "ExtendedMinutes",
      "GamingAmount",
      "SnacksAmount",
      "GrandTotal",
      "Status",
      "PaymentStatus",
      "CreatedAt",
      "CompletedAt"
    ],

    Session_Extensions: [
      "ExtensionID",
      "SessionID",
      "Date",
      "PreviousEndTime",
      "NewEndTime",
      "AddedMinutes",
      "AddedAmount",
      "CreatedAt"
    ],

    Session_Payments: [
      "PaymentID",
      "SessionID",
      "Date",
      "Amount",
      "PaymentMethod",
      "CreatedAt"
    ]
  };

  Object.entries(definitions).forEach(([name, headers]) => {
    let sheet = ss.getSheetByName(name);

    if (!sheet) {
      sheet = ss.insertSheet(name);
    }

    // Only initialize an empty sheet.
    // Never overwrite existing records.
    if (sheet.getLastRow() === 0) {
      sheet.getRange(1, 1, 1, headers.length)
        .setValues([headers]);

      sheet.setFrozenRows(1);

      sheet.getRange(1, 1, 1, headers.length)
        .setFontWeight("bold");

      sheet.autoResizeColumns(1, headers.length);
    }
  });

  console.log("Live gaming sheets created successfully!");
}

/* =========================================
   LIVE SESSION HELPERS
========================================= */

function getLiveSessionById_(sessionId) {
  const sheet = getSheet_("Live_Sessions");
  const values = sheet.getDataRange().getValues();

  if (values.length < 2) {
    throw new Error("Session not found.");
  }

  const headers = values[0];

  const idColumn = headers.indexOf("SessionID");
  const statusColumn = headers.indexOf("Status");

  for (let i = 1; i < values.length; i++) {
    if (String(values[i][idColumn]) === String(sessionId)) {
      const record = {};

      headers.forEach((header, index) => {
        record[header] = values[i][index];
      });

      return {
        rowNumber: i + 1,
        record: record,
        statusColumn: statusColumn + 1
      };
    }
  }

  throw new Error("Session not found.");
}


function updateLiveSession_(sessionId, updates) {
  const sheet = getSheet_("Live_Sessions");
  const session = getLiveSessionById_(sessionId);

  Object.entries(updates).forEach(([columnName, value]) => {
    const column = sheet.getRange(1, 1, 1, sheet.getLastColumn())
      .getValues()[0]
      .indexOf(columnName);

    if (column === -1) {
      throw new Error("Missing column: " + columnName);
    }

    sheet.getRange(session.rowNumber, column + 1)
      .setValue(value);
  });
}

function sessionTimeToMinutes_(value) {
  let timeText = "";

  // Google Sheets may return a time as a Date object.
  if (value instanceof Date) {
    timeText = Utilities.formatDate(
      value,
      CONFIG.TIMEZONE,
      "HH:mm"
    );
  }

  // Google Sheets may return a time as a decimal number.
  else if (typeof value === "number") {
    const totalMinutes = Math.round(value * 24 * 60);
    const hours = Math.floor(totalMinutes / 60) % 24;
    const minutes = totalMinutes % 60;

    timeText =
      String(hours).padStart(2, "0") + ":" +
      String(minutes).padStart(2, "0");
  }

  // Handle text such as "15:00" or a Date string containing a time.
  else {
    const text = String(value || "").trim();
    const match = text.match(/(\d{1,2}):(\d{2})(?::\d{2})?/);

    if (match) {
      timeText =
        String(match[1]).padStart(2, "0") + ":" +
        match[2];
    }
  }

  const match = timeText.match(/^(\d{2}):(\d{2})$/);

  if (!match) {
    throw new Error("Invalid session time: " + String(value));
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (hours > 23 || minutes > 59) {
    throw new Error("Invalid session time: " + String(value));
  }

  return hours * 60 + minutes;
}


function sessionEndTime_(startTime, durationMinutes) {
  const total = sessionTimeToMinutes_(startTime) +
    durationMinutes;

  if (total > 22 * 60 || total <= 0) {
    throw new Error(
      "Session must end by 10:00 PM."
    );
  }

  return String(Math.floor(total / 60)).padStart(2, "0") +
    ":" +
    String(total % 60).padStart(2, "0");
}


/* =========================================
   START LIVE SESSION
========================================= */

function startLiveSession_(body) {
  authenticate_(body.token);

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);

  try {
    const customerName = String(body.customerName || "").trim();
    const phone = String(body.phone || "").trim();
    const consoleName = String(body.consoleName || "").trim();
    const players = String(body.players || "");
    const date = String(body.date || "");
    const startTime = String(body.startTime || "");
    const duration = Number(body.durationMinutes);

    if (!customerName) {
      throw new Error("Customer name is required.");
    }

    if (phone !== "" && !/^\d{10}$/.test(phone)) {
      throw new Error("Enter a valid 10-digit phone number.");
    }

    if (!["Solo", "Duo", "Trio", "Quad"].includes(players)) {
      throw new Error("Invalid player selection.");
    }

    if (!Number.isInteger(duration) || duration < 30 ||
        duration % 30 !== 0) {
      throw new Error("Invalid session duration.");
    }

    const validDate = Utilities.parseDate(
      date,
      CONFIG.TIMEZONE,
      "yyyy-MM-dd"
    );

    if (
      Utilities.formatDate(validDate, CONFIG.TIMEZONE, "yyyy-MM-dd")
      !== date
    ) {
      throw new Error("Invalid session date.");
    }

    const endTime = sessionEndTime_(startTime, duration);

    const consoles = getRecords_("Consoles");

    const consoleItem = consoles.find(item => {
      const sheetConsoleName = String(item.ConsoleName || "").trim();
      const activeValue = String(item.Active).trim().toLowerCase();

      const isActive = [
        "true",
        "yes",
        "active",
        "1"
      ].includes(activeValue);

      return sheetConsoleName === consoleName && isActive;
    });

    if (!consoleItem) {
      const availableConsoles = consoles.map(item => ({
        name: String(item.ConsoleName || ""),
        active: String(item.Active)
      }));

      throw new Error(
        "Console not found or inactive. Received: '" +
        consoleName +
        "'. Check the Consoles sheet. Available consoles: " +
        JSON.stringify(availableConsoles)
      );
    }

    const startMinutes = sessionTimeToMinutes_(startTime);
    const endMinutes = startMinutes + duration;

    // Prevent overlapping active sessions on the same console.
    const activeSessions = getRecords_("Live_Sessions");

    const conflict = activeSessions.some(item => {
      if (item.Status !== "Active") return false;
      if (String(item.Console) !== consoleName) return false;
      if (String(item.Date) !== date) return false;

      const existingStart = sessionTimeToMinutes_(item.StartTime);
      const existingEnd = sessionTimeToMinutes_(
        item.ScheduledEndTime
      );

      return startMinutes < existingEnd &&
        endMinutes > existingStart;
    });

    if (conflict) {
      throw new Error(
        "This console already has an overlapping active session."
      );
    }

    const gamingAmount = calculateGamingAmount_(
      String(consoleItem.ConsoleType),
      players,
      duration
    );

    const sessionId =
      "SES-" + Utilities.getUuid().slice(0, 10).toUpperCase();

    const bookingId =
      "AG-" + Utilities.getUuid().slice(0, 8).toUpperCase();

    const liveSheet = getSheet_("Live_Sessions");
    let liveHeaders = liveSheet.getRange(1, 1, 1, liveSheet.getLastColumn()).getValues()[0].map(h => String(h).trim());
    if (!liveHeaders.includes("StartedBy")) {
      liveSheet.getRange(1, liveHeaders.length + 1).setValue("StartedBy");
      liveHeaders.push("StartedBy");
    }
    const liveRecord = {
      SessionID: sessionId, BookingID: bookingId, CustomerName: customerName,
      Phone: phone, Console: consoleName, Players: players, Date: validDate,
      StartTime: startTime, ScheduledEndTime: endTime,
      OriginalDurationMinutes: duration, ExtendedMinutes: 0,
      GamingAmount: gamingAmount, SnacksAmount: 0, GrandTotal: gamingAmount,
      Status: "Active", PaymentStatus: "Unpaid", CreatedAt: new Date(),
      CompletedAt: "", StartedBy: getSessionUser_(body.token).username
    };
    liveSheet.appendRow(liveHeaders.map(header =>
      liveRecord[header] !== undefined ? liveRecord[header] : ""
    ));

    SpreadsheetApp.flush();

    return {
      success: true,
      sessionId: sessionId,
      bookingId: bookingId,
      customerName: customerName,
      console: consoleName,
      startTime: startTime,
      endTime: endTime,
      gamingAmount: gamingAmount,
      snacksAmount: 0,
      grandTotal: gamingAmount
    };

  } finally {
    lock.releaseLock();
  }
}


/* =========================================
   GET LIVE SESSIONS
========================================= */

function getLiveSessions_(body) {
  authenticate_(body.token);

  const sessions = getRecords_("Live_Sessions")
    .filter(item => item.Status === "Active")
    .map(item => ({
      sessionId: String(item.SessionID),
      customerName: String(item.CustomerName),
      phone: String(item.Phone),
      console: String(item.Console),
      players: String(item.Players),

      date: item.Date instanceof Date
        ? Utilities.formatDate(item.Date, CONFIG.TIMEZONE, "yyyy-MM-dd")
        : String(item.Date).trim(),

      startTime: formatSessionTime_(item.StartTime),
      endTime: formatSessionTime_(item.ScheduledEndTime),

      durationMinutes:
        Number(item.OriginalDurationMinutes || 0) +
        Number(item.ExtendedMinutes || 0),

      gamingAmount: Number(item.GamingAmount) || 0,
      snacksAmount: Number(item.SnacksAmount) || 0,
      grandTotal: Number(item.GrandTotal) || 0,

      status: String(item.Status),
      paymentStatus: String(item.PaymentStatus)
    }));

  return {
    success: true,
    sessions: sessions
  };
}


/* =========================================
   EXTEND LIVE SESSION
========================================= */

function extendLiveSession_(body) {
  authenticate_(body.token);

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);

  try {
    const sessionId = String(body.sessionId || "").trim();
    const addedMinutes = Number(body.addedMinutes);

    if (
      !Number.isInteger(addedMinutes) ||
      addedMinutes < 15 ||
      addedMinutes % 15 !== 0
    ) {
      throw new Error("Extension must be in 15-minute intervals.");
    }

    const session = getLiveSessionById_(sessionId).record;

    if (session.Status !== "Active") {
      throw new Error("This session is not active.");
    }

    const oldDuration =
      Number(session.OriginalDurationMinutes || 0) +
      Number(session.ExtendedMinutes || 0);

    const newDuration = oldDuration + addedMinutes;

    const previousEnd = formatSessionTime_(session.ScheduledEndTime);
    const newEnd = sessionEndTime_(session.StartTime, newDuration);

    const startMinutes = sessionTimeToMinutes_(session.StartTime);
    const newEndMinutes = startMinutes + newDuration;

    const sessionDate = session.Date instanceof Date
      ? Utilities.formatDate(session.Date, CONFIG.TIMEZONE, "yyyy-MM-dd")
      : String(session.Date).trim();

    const conflict = getRecords_("Live_Sessions").some(item => {
      if (String(item.SessionID) === sessionId) return false;
      if (item.Status !== "Active") return false;
      if (String(item.Console) !== String(session.Console)) return false;

      const otherDate = item.Date instanceof Date
        ? Utilities.formatDate(item.Date, CONFIG.TIMEZONE, "yyyy-MM-dd")
        : String(item.Date).trim();

      if (otherDate !== sessionDate) return false;

      const otherStart = sessionTimeToMinutes_(item.StartTime);
      const otherEnd = sessionTimeToMinutes_(item.ScheduledEndTime);

      return startMinutes < otherEnd && newEndMinutes > otherStart;
    });

    if (conflict) {
      throw new Error("New duration conflicts with another active session.");
    }

    const consoleItem = getRecords_("Consoles").find(item =>
      String(item.ConsoleName).trim() === String(session.Console).trim()
    );

    if (!consoleItem) {
      throw new Error("Console configuration not found.");
    }

    const newGamingAmount = calculateGamingAmount_(
      String(consoleItem.ConsoleType),
      String(session.Players),
      newDuration
    );

    const oldGamingAmount = Number(session.GamingAmount || 0);
    const priceDifference = newGamingAmount - oldGamingAmount;
    const newGrandTotal =
      newGamingAmount + Number(session.SnacksAmount || 0);

    const extensionId =
      "EXT-" + Utilities.getUuid().slice(0, 8).toUpperCase();

    getSheet_("Session_Extensions").appendRow([
      extensionId,
      sessionId,
      session.Date,
      previousEnd,
      newEnd,
      addedMinutes,
      priceDifference,
      new Date()
    ]);

    updateLiveSession_(sessionId, {
      ScheduledEndTime: newEnd,
      ExtendedMinutes:
        Number(session.ExtendedMinutes || 0) + addedMinutes,
      GamingAmount: newGamingAmount,
      GrandTotal: newGrandTotal
    });

    SpreadsheetApp.flush();

    return {
      success: true,
      sessionId: sessionId,
      previousEndTime: previousEnd,
      newEndTime: newEnd,
      durationMinutes: newDuration,
      newGamingAmount: newGamingAmount,
      newGrandTotal: newGrandTotal,
      addedAmount: priceDifference,
      message: "Session extended and total price recalculated."
    };

  } finally {
    lock.releaseLock();
  }
}


/* =========================================
   ADD SNACKS TO A LIVE SESSION
========================================= */

function addSessionSnacks_(body) {
  authenticate_(body.token);

  const sessionId = String(body.sessionId || "").trim();
  const snacks = Array.isArray(body.snacks) ? body.snacks : [];

  if (!sessionId) throw new Error("Session ID is missing.");
  if (!snacks.length) throw new Error("Select at least one snack.");

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);

  try {
    const session = getLiveSessionById_(sessionId).record;

    if (session.Status !== "Active") {
      throw new Error("This session is not active.");
    }

    const stockSheet = getSheet_(CONFIG.SHEETS.STOCK);
    const stockRows = stockSheet.getDataRange().getValues();

    if (stockRows.length < 2) {
      throw new Error("No snack inventory records found.");
    }

    // Normalize headers to avoid whitespace mismatches.
    const headers = stockRows[0].map(h => String(h).trim());
    const col = {};

    headers.forEach((header, index) => {
      col[header] = index;
    });

    const required = [
      "SnackID",
      "SnackName",
      "SellingPrice",
      "CurrentStock",
      "Active"
    ];

    const missing = required.filter(h => col[h] === undefined);

    if (missing.length) {
      throw new Error(
        "Missing Snacks_Stock columns: " + missing.join(", ")
      );
    }

    const stockById = {};

    for (let i = 1; i < stockRows.length; i++) {
      const row = stockRows[i];
      const id = String(row[col.SnackID] || "").trim();

      if (!id) continue;

      const activeValue = row[col.Active];

      stockById[id] = {
        rowNumber: i + 1,
        name: String(row[col.SnackName] || ""),
        price: Number(row[col.SellingPrice]),
        stock: Number(row[col.CurrentStock]),
        active:
          activeValue === true ||
          String(activeValue).trim().toLowerCase() === "true"
      };
    }

    // Combine duplicate snack IDs.
    const quantities = {};

    snacks.forEach(item => {
      const id = String(item.snackId || "").trim();
      const quantity = Number(item.quantity);

      if (!id) throw new Error("A selected snack has no ID.");

      if (!Number.isInteger(quantity) || quantity < 1) {
        throw new Error("Invalid snack quantity.");
      }

      quantities[id] = (quantities[id] || 0) + quantity;
    });

    const items = [];

    Object.entries(quantities).forEach(([id, quantity]) => {
      const snack = stockById[id];

      if (!snack || !snack.active) {
        throw new Error("Snack not found or inactive: " + id);
      }

      if (!Number.isFinite(snack.price) || snack.price <= 0) {
        throw new Error("Invalid selling price for " + snack.name);
      }

      if (!Number.isFinite(snack.stock) || snack.stock < quantity) {
        throw new Error(
          "Insufficient stock for " + snack.name +
          ". Available: " + snack.stock
        );
      }

      items.push({
        id,
        name: snack.name,
        price: snack.price,
        quantity,
        amount: snack.price * quantity,
        rowNumber: snack.rowNumber,
        remaining: snack.stock - quantity
      });
    });

    // Validate Snack_Sales headers before writing.
    const salesSheet = getSheet_(CONFIG.SHEETS.SNACK_SALES);
    const salesHeaders = salesSheet
      .getRange(1, 1, 1, salesSheet.getLastColumn())
      .getValues()[0]
      .map(h => String(h).trim());

    const salesRecords = [];

    let addedSnacksAmount = 0;

    items.forEach(item => {
      const sale = {
        SaleID: "SS-" + Utilities.getUuid().slice(0, 8).toUpperCase(),
        BookingID: session.BookingID,
        Date: session.Date,
        SnackID: item.id,
        SnackName: item.name,
        Quantity: item.quantity,
        UnitPrice: item.price,
        TotalAmount: item.amount
      };

      const row = salesHeaders.map(header =>
        sale[header] !== undefined ? sale[header] : ""
      );

      salesRecords.push(row);
      addedSnacksAmount += item.amount;
    });

    // Save snack sales.
    if (salesRecords.length) {
      salesSheet.getRange(
        salesSheet.getLastRow() + 1,
        1,
        salesRecords.length,
        salesHeaders.length
      ).setValues(salesRecords);
    }

    // Deduct inventory.
    items.forEach(item => {
      stockSheet.getRange(
        item.rowNumber,
        col.CurrentStock + 1
      ).setValue(item.remaining);
    });

    // Update the active session.
    const newSnacksAmount =
      Number(session.SnacksAmount || 0) + addedSnacksAmount;

    const newGrandTotal =
      Number(session.GrandTotal || 0) + addedSnacksAmount;

    updateLiveSession_(sessionId, {
      SnacksAmount: newSnacksAmount,
      GrandTotal: newGrandTotal
    });

    SpreadsheetApp.flush();

    return {
      success: true,
      sessionId,
      addedSnacksAmount,
      snacksAmount: newSnacksAmount,
      grandTotal: newGrandTotal,
      message: "Snacks added successfully."
    };

  } finally {
    lock.releaseLock();
  }
}


/* =========================================
   CLOSE LIVE SESSION
========================================= */

function closeLiveSession_(body) {
  authenticate_(body.token);

  const sessionId = String(body.sessionId || "");

  const discount = Number(body.discount || 0);
  const cashPaid = Number(body.cashPaid || 0);
  const upiPaid = Number(body.upiPaid || 0);
  const otherPaid = Number(body.otherPaid || 0);

  const amounts = {
    discount,
    cashPaid,
    upiPaid,
    otherPaid
  };

  // Validate all amounts.
  Object.entries(amounts).forEach(([name, amount]) => {
    if (!Number.isFinite(amount) || amount < 0) {
      throw new Error("Invalid amount: " + name);
    }

    if (Math.round(amount * 100) !== amount * 100) {
      throw new Error(
        name + " cannot have more than two decimal places."
      );
    }
  });

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);

  try {
    const sessionInfo = getLiveSessionById_(sessionId);
    const session = sessionInfo.record;

    if (session.Status !== "Active") {
      throw new Error(
        "This session has already been completed or cancelled."
      );
    }

    const gamingAmount = Number(session.GamingAmount) || 0;
    const snacksAmount = Number(session.SnacksAmount) || 0;

    const originalBill = Math.round(
      (gamingAmount + snacksAmount) * 100
    ) / 100;

    if (discount > originalBill) {
      throw new Error(
        "Discount cannot exceed the original bill."
      );
    }

    const finalBill = Math.round(
      (originalBill - discount) * 100
    ) / 100;

    const totalPaid = Math.round(
      (cashPaid + upiPaid + otherPaid) * 100
    ) / 100;

    if (totalPaid > finalBill) {
      throw new Error(
        "Total payment cannot exceed the final bill."
      );
    }

    const dueAmount = Math.round(
      (finalBill - totalPaid) * 100
    ) / 100;

    const paymentStatus = dueAmount === 0 ? "Paid" : "Due";
    const currentUser = getSessionUser_(body.token);
    const staffDueLimit = getStaffManualDueLimit_();
    if (currentUser.role === "Staff" && dueAmount > staffDueLimit) {
      throw new Error(
        "Staff may leave a maximum outstanding due of ₹" + staffDueLimit +
        ". Collect more payment or ask the owner to approve the balance."
      );
    }

    const now = new Date();

    const dateValue = session.Date instanceof Date
      ? session.Date
      : Utilities.parseDate(
          String(session.Date),
          CONFIG.TIMEZONE,
          "yyyy-MM-dd"
        );

    const bookingId = String(session.BookingID);

    // Prepare the final gaming sale.
    const salesSheet = getSheet_("Gaming_Sales");

    const salesHeaders = salesSheet
      .getRange(1, 1, 1, salesSheet.getLastColumn())
      .getValues()[0]
      .map(header => String(header).trim());

    if (!salesHeaders.includes("CreatedBy")) {
      salesSheet.getRange(1, salesHeaders.length + 1).setValue("CreatedBy");
      salesHeaders.push("CreatedBy");
    }

    const sale = {
      BookingID: bookingId,
      CreatedAt: now,
      Date: dateValue,
      CustomerName: session.CustomerName,
      Phone: session.Phone,
      StartTime: formatSessionTime_(session.StartTime),
      DurationMinutes:
        Number(session.OriginalDurationMinutes) +
        Number(session.ExtendedMinutes || 0),
      EndTime: formatSessionTime_(session.ScheduledEndTime),
      Console: session.Console,
      Players: session.Players,
      GamingAmount: gamingAmount,
      SnacksAmount: snacksAmount,
      GrandTotal: originalBill,
      PaymentMethod:
        cashPaid > 0 && upiPaid > 0
          ? "Split"
          : cashPaid > 0
            ? "Cash"
            : upiPaid > 0
              ? "UPI"
              : otherPaid > 0
                ? "Other"
                : "Due",
      Discount: discount,
      FinalBill: finalBill,
      CashPaid: cashPaid,
      UPIPaid: upiPaid,
      OtherPaid: otherPaid,
      DueAmount: dueAmount,
      PaymentStatus: paymentStatus,
      CreatedBy: currentUser.username
    };

    // Verify the columns before saving.
    const missingHeaders = Object.keys(sale)
      .filter(header => !salesHeaders.includes(header));

    if (missingHeaders.length) {
      throw new Error(
        "Missing Gaming_Sales columns: " +
        missingHeaders.join(", ") +
        ". Run upgradePaymentSheets() first."
      );
    }

    const saleRow = salesHeaders.map(header =>
      Object.prototype.hasOwnProperty.call(sale, header)
        ? sale[header]
        : ""
    );

    // Record the final sale.
    salesSheet.appendRow(saleRow);

    // Record each payment separately.
    const paymentsSheet = getSheet_("Session_Payments");

    const paymentEntries = [
      ["Cash", cashPaid],
      ["UPI", upiPaid],
      ["Other", otherPaid]
    ];

    paymentEntries.forEach(([method, amount]) => {
      if (amount <= 0) return;

      paymentsSheet.appendRow([
        "PAY-" + Utilities.getUuid().slice(0, 8).toUpperCase(),
        sessionId,
        dateValue,
        amount,
        method,
        now
      ]);
    });

    // Update the live session with final payment details.
    updateLiveSession_(sessionId, {
      Status: "Completed",
      PaymentStatus: paymentStatus,
      CompletedAt: now,
      Discount: discount,
      FinalBill: finalBill,
      CashPaid: cashPaid,
      UPIPaid: upiPaid,
      OtherPaid: otherPaid,
      DueAmount: dueAmount,
      GrandTotal: originalBill
    });

    SpreadsheetApp.flush();

    return {
      success: true,
      sessionId: sessionId,
      originalBill: originalBill,
      discount: discount,
      finalBill: finalBill,
      cashPaid: cashPaid,
      upiPaid: upiPaid,
      otherPaid: otherPaid,
      totalPaid: totalPaid,
      dueAmount: dueAmount,
      paymentStatus: paymentStatus,
      message: dueAmount > 0
        ? "Session completed. Outstanding due: ₹" + dueAmount
        : "Session completed and fully paid."
    };

  } finally {
    lock.releaseLock();
  }
}

/* =====================================
   OUTSTANDING DUES MANAGEMENT
===================================== */

function getDuesData_(body) {
  requireAdmin_(body.token);
  authenticate_(body.token);

  const salesSheet = getSheet_("Gaming_Sales");
  const salesValues = salesSheet.getDataRange().getValues();
  if (!salesValues.length) throw new Error("Gaming_Sales has no header row.");

  const headers = salesValues[0].map(h => String(h).trim());
  const required = ["BookingID", "Date", "CustomerName", "Phone", "Console", "FinalBill", "CashPaid", "UPIPaid", "OtherPaid", "DueAmount", "PaymentStatus"];
  const missing = required.filter(h => !headers.includes(h));
  if (missing.length) throw new Error("Gaming_Sales is missing columns: " + missing.join(", "));

  const idx = {};
  headers.forEach((h, i) => idx[h] = i);
  const outstanding = [];
  let totalOutstanding = 0;

  salesValues.slice(1).forEach((row, offset) => {
    const due = Math.round((Number(row[idx.DueAmount]) || 0) * 100) / 100;
    if (due <= 0) return;
    totalOutstanding += due;
    const dateValue = row[idx.Date];
    const date = dateValue instanceof Date
      ? Utilities.formatDate(dateValue, CONFIG.TIMEZONE, "yyyy-MM-dd")
      : String(dateValue || "");
    outstanding.push({
      rowNumber: offset + 2,
      bookingId: String(row[idx.BookingID] || ""),
      date: date,
      customerName: String(row[idx.CustomerName] || "Customer"),
      phone: String(row[idx.Phone] || ""),
      console: String(row[idx.Console] || "—"),
      finalBill: Number(row[idx.FinalBill]) || 0,
      cashPaid: Number(row[idx.CashPaid]) || 0,
      upiPaid: Number(row[idx.UPIPaid]) || 0,
      otherPaid: Number(row[idx.OtherPaid]) || 0,
      dueAmount: due,
      paymentStatus: String(row[idx.PaymentStatus] || "Due")
    });
  });

  const dueSheet = getSheet_("Due_Payments");
  const paymentValues = dueSheet.getDataRange().getValues();
  const paymentHeaders = (paymentValues[0] || []).map(h => String(h).trim());
  const pidx = {};
  paymentHeaders.forEach((h, i) => pidx[h] = i);
  const today = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, "yyyy-MM-dd");
  let collectedToday = 0;
  const history = paymentValues.slice(1).filter(row => row.some(v => v !== "")).map(row => {
    const d = row[pidx.PaymentDate];
    const date = d instanceof Date ? Utilities.formatDate(d, CONFIG.TIMEZONE, "yyyy-MM-dd") : String(d || "");
    const amount = Number(row[pidx.Amount]) || 0;
    if (date === today) collectedToday += amount;
    return {
      paymentId: String(row[pidx.PaymentID] || ""),
      bookingId: String(row[pidx.BookingID] || ""),
      customerName: String(row[pidx.CustomerName] || ""),
      phone: String(row[pidx.Phone] || ""),
      paymentDate: date,
      amount: amount,
      paymentMethod: String(row[pidx.PaymentMethod] || ""),
      createdAt: row[pidx.CreatedAt] instanceof Date
        ? Utilities.formatDate(row[pidx.CreatedAt], CONFIG.TIMEZONE, "dd MMM yyyy, hh:mm a")
        : String(row[pidx.CreatedAt] || "")
    };
  }).reverse().slice(0, 100);

  return {
    success: true,
    outstanding: outstanding,
    history: history,
    totalOutstanding: Math.round(totalOutstanding * 100) / 100,
    outstandingCustomers: outstanding.length,
    collectedToday: Math.round(collectedToday * 100) / 100
  };
}

function collectDuePayment_(body) {
  requireAdmin_(body.token);
  const username = authenticate_(body.token);
  const bookingId = String(body.bookingId || "").trim();
  const amount = Number(body.amount);
  const method = String(body.paymentMethod || "").trim();
  if (!bookingId) throw new Error("Select a customer due first.");
  if (!Number.isFinite(amount) || amount <= 0 || Math.round(amount * 100) !== amount * 100) {
    throw new Error("Enter a valid payment amount with up to two decimal places.");
  }
  if (!["Cash", "UPI"].includes(method)) throw new Error("Choose Cash or UPI as the payment method.");

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const salesSheet = getSheet_("Gaming_Sales");
    const values = salesSheet.getDataRange().getValues();
    if (values.length < 2) throw new Error("No gaming sales were found.");
    const headers = values[0].map(h => String(h).trim());
    const idx = {};
    headers.forEach((h, i) => idx[h] = i);
    ["BookingID", "CustomerName", "Phone", "DueAmount", "PaymentStatus", "CashPaid", "UPIPaid", "OtherPaid", "PaymentMethod"].forEach(h => {
      if (idx[h] === undefined) throw new Error("Gaming_Sales is missing column: " + h);
    });

    let rowIndex = -1;
    for (let i = 1; i < values.length; i++) {
      if (String(values[i][idx.BookingID]) === bookingId) { rowIndex = i; break; }
    }
    if (rowIndex < 0) throw new Error("The selected booking could not be found.");

    const row = values[rowIndex];
    const oldDue = Math.round((Number(row[idx.DueAmount]) || 0) * 100) / 100;
    if (oldDue <= 0) throw new Error("This due has already been cleared.");
    if (amount > oldDue) throw new Error("Payment cannot exceed the outstanding due of ₹" + oldDue.toFixed(2) + ".");

    const newDue = Math.round((oldDue - amount) * 100) / 100;
    const cash = Math.round(((Number(row[idx.CashPaid]) || 0) + (method === "Cash" ? amount : 0)) * 100) / 100;
    const upi = Math.round(((Number(row[idx.UPIPaid]) || 0) + (method === "UPI" ? amount : 0)) * 100) / 100;
    const hasCash = cash > 0;
    const hasUpi = upi > 0;
    const hasOther = (Number(row[idx.OtherPaid]) || 0) > 0;
    const methodCount = [hasCash, hasUpi, hasOther].filter(Boolean).length;
    const paymentMethod = methodCount > 1 ? "Split" : hasCash ? "Cash" : hasUpi ? "UPI" : hasOther ? "Other" : "Due";
    const paymentStatus = newDue === 0 ? "Paid" : "Partial";
    const now = new Date();
    const dueSheet = getSheet_("Due_Payments");
    const dueHeaders = dueSheet.getRange(1, 1, 1, dueSheet.getLastColumn()).getValues()[0].map(h => String(h).trim());
    const entry = {
      PaymentID: "DUE-" + Utilities.getUuid().slice(0, 8).toUpperCase(),
      BookingID: bookingId,
      SessionID: "",
      CustomerName: String(row[idx.CustomerName] || ""),
      Phone: String(row[idx.Phone] || ""),
      PaymentDate: now,
      Amount: amount,
      PaymentMethod: method,
      CreatedAt: now
    };
    const missingDueHeaders = Object.keys(entry).filter(h => !dueHeaders.includes(h));
    if (missingDueHeaders.length) throw new Error("Due_Payments is missing columns: " + missingDueHeaders.join(", "));

    const sheetRow = rowIndex + 1;
    const oldCells = {
      cash: row[idx.CashPaid], upi: row[idx.UPIPaid], due: row[idx.DueAmount],
      status: row[idx.PaymentStatus], method: row[idx.PaymentMethod]
    };
    try {
      salesSheet.getRange(sheetRow, idx.CashPaid + 1).setValue(cash);
      salesSheet.getRange(sheetRow, idx.UPIPaid + 1).setValue(upi);
      salesSheet.getRange(sheetRow, idx.DueAmount + 1).setValue(newDue);
      salesSheet.getRange(sheetRow, idx.PaymentStatus + 1).setValue(paymentStatus);
      salesSheet.getRange(sheetRow, idx.PaymentMethod + 1).setValue(paymentMethod);
      dueSheet.appendRow(dueHeaders.map(h => Object.prototype.hasOwnProperty.call(entry, h) ? entry[h] : ""));
      SpreadsheetApp.flush();
    } catch (err) {
      salesSheet.getRange(sheetRow, idx.CashPaid + 1).setValue(oldCells.cash);
      salesSheet.getRange(sheetRow, idx.UPIPaid + 1).setValue(oldCells.upi);
      salesSheet.getRange(sheetRow, idx.DueAmount + 1).setValue(oldCells.due);
      salesSheet.getRange(sheetRow, idx.PaymentStatus + 1).setValue(oldCells.status);
      salesSheet.getRange(sheetRow, idx.PaymentMethod + 1).setValue(oldCells.method);
      throw err;
    }

    return {
      success: true,
      bookingId: bookingId,
      customerName: String(row[idx.CustomerName] || ""),
      amountCollected: amount,
      remainingDue: newDue,
      paymentStatus: paymentStatus,
      collectedBy: username,
      message: newDue === 0 ? "Payment received. Outstanding due fully cleared." : "Payment received. Remaining due: ₹" + newDue.toFixed(2)
    };
  } finally {
    lock.releaseLock();
  }
}

function formatSessionTime_(value) {
  if (value instanceof Date) {
    return Utilities.formatDate(
      value,
      CONFIG.TIMEZONE,
      "HH:mm"
    );
  }

  if (typeof value === "number") {
    const totalMinutes = Math.round(value * 24 * 60);
    const hours = Math.floor(totalMinutes / 60) % 24;
    const minutes = totalMinutes % 60;

    return String(hours).padStart(2, "0") + ":" +
      String(minutes).padStart(2, "0");
  }

  const text = String(value || "").trim();
  const match = text.match(/(\d{1,2}):(\d{2})(?::\d{2})?/);

  if (match) {
    return match[1].padStart(2, "0") + ":" + match[2];
  }

  throw new Error("Unable to format session time: " + text);
}

function upgradePaymentSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // Add payment-related columns without deleting existing data.
  const upgrades = {
    Live_Sessions: [
      "Discount",
      "FinalBill",
      "CashPaid",
      "UPIPaid",
      "OtherPaid",
      "DueAmount"
    ],

    Gaming_Sales: [
      "Discount",
      "FinalBill",
      "CashPaid",
      "UPIPaid",
      "OtherPaid",
      "DueAmount",
      "PaymentStatus"
    ]
  };

  Object.entries(upgrades).forEach(([sheetName, newHeaders]) => {
    const sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
      throw new Error("Missing sheet: " + sheetName);
    }

    const lastColumn = sheet.getLastColumn();

    const existingHeaders = lastColumn > 0
      ? sheet.getRange(1, 1, 1, lastColumn)
          .getValues()[0]
          .map(value => String(value).trim())
      : [];

    newHeaders.forEach(header => {
      if (!existingHeaders.includes(header)) {
        const newColumn = sheet.getLastColumn() + 1;

        sheet.getRange(1, newColumn).setValue(header);
        sheet.getRange(1, newColumn).setFontWeight("bold");

        existingHeaders.push(header);
      }
    });

    sheet.setFrozenRows(1);
    sheet.autoResizeColumns(1, sheet.getLastColumn());
  });

  // Create a separate ledger for collecting old outstanding dues.
  let dueSheet = ss.getSheetByName("Due_Payments");

  if (!dueSheet) {
    dueSheet = ss.insertSheet("Due_Payments");

    dueSheet.appendRow([
      "PaymentID",
      "BookingID",
      "SessionID",
      "CustomerName",
      "Phone",
      "PaymentDate",
      "Amount",
      "PaymentMethod",
      "CreatedAt"
    ]);

    dueSheet.setFrozenRows(1);

    dueSheet.getRange(1, 1, 1, 9)
      .setFontWeight("bold");

    dueSheet.autoResizeColumns(1, 9);
  }

  console.log("Payment sheets upgraded successfully.");
}

/* =========================================
   STOCK MANAGEMENT
========================================= */

function getStockManagementData_(body) {
  authenticate_(body.token);

  const stock = getRecords_(CONFIG.SHEETS.STOCK)
    .map(item => ({
      snackId: String(item.SnackID),
      snackName: String(item.SnackName),
      category: String(item.Category),
      sellingPrice: Number(item.SellingPrice) || 0,
      purchasePrice: Number(item.PurchasePrice) || 0,
      currentStock: Number(item.CurrentStock) || 0,
      active: item.Active === true
    }));

  return {
    success: true,
    stock: stock
  };
}


/* =========================================
   ADD STOCK PURCHASE
========================================= */

function addStockPurchase_(body) {
  authenticate_(body.token);

  const snackId = String(body.snackId || "").trim();
  const quantity = Number(body.quantity);
  const purchasePrice = Number(body.purchasePrice);
  const notes = String(body.notes || "").trim();

  if (!snackId) {
    throw new Error("Please select a snack.");
  }

  if (
    !Number.isInteger(quantity) ||
    quantity < 1 ||
    quantity > 100000
  ) {
    throw new Error("Enter a valid purchase quantity.");
  }

  if (
    !Number.isFinite(purchasePrice) ||
    purchasePrice <= 0
  ) {
    throw new Error("Enter a valid purchase price.");
  }

  if (purchasePrice > 10000000) {
    throw new Error("Purchase price is too high.");
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);

  try {
    const stockSheet = getSheet_(CONFIG.SHEETS.STOCK);
    const purchaseSheet = getSheet_(CONFIG.SHEETS.PURCHASES);

    const stockData = stockSheet.getDataRange().getValues();
    const stockHeaders = stockData[0];

    const stockColumns = {};

    stockHeaders.forEach((header, index) => {
      stockColumns[String(header).trim()] = index;
    });

    const requiredStockColumns = [
      "SnackID",
      "SnackName",
      "PurchasePrice",
      "CurrentStock",
      "Active"
    ];

    requiredStockColumns.forEach(column => {
      if (stockColumns[column] === undefined) {
        throw new Error(
          "Missing Snacks_Stock column: " + column
        );
      }
    });

    let stockRowNumber = -1;
    let snackName = "";
    let currentStock = 0;

    for (let i = 1; i < stockData.length; i++) {
      if (
        String(stockData[i][stockColumns.SnackID]).trim() === snackId
      ) {
        stockRowNumber = i + 1;
        snackName = String(
          stockData[i][stockColumns.SnackName]
        );

        currentStock =
          Number(stockData[i][stockColumns.CurrentStock]) || 0;

        if (stockData[i][stockColumns.Active] !== true) {
          throw new Error("This snack is inactive.");
        }

        break;
      }
    }

    if (stockRowNumber === -1) {
      throw new Error("Selected snack was not found.");
    }

    if (
      currentStock < 0 ||
      currentStock + quantity > 1000000
    ) {
      throw new Error("Invalid resulting stock quantity.");
    }

    const purchaseHeaders = purchaseSheet
      .getRange(1, 1, 1, purchaseSheet.getLastColumn())
      .getValues()[0]
      .map(header => String(header).trim());

    const requiredPurchaseColumns = [
      "PurchaseID",
      "Date",
      "SnackID",
      "SnackName",
      "Quantity",
      "PurchasePrice",
      "TotalCost",
      "Notes"
    ];

    requiredPurchaseColumns.forEach(column => {
      if (!purchaseHeaders.includes(column)) {
        throw new Error(
          "Missing Stock_Purchases column: " + column
        );
      }
    });

    if (!purchaseHeaders.includes("PurchasedBy")) {
      purchaseSheet.getRange(1, purchaseHeaders.length + 1).setValue("PurchasedBy");
      purchaseHeaders.push("PurchasedBy");
    }

    const totalCost = Math.round(
      quantity * purchasePrice * 100
    ) / 100;

    const purchaseId =
      "PUR-" + Utilities.getUuid().slice(0, 8).toUpperCase();

    const purchaseRecord = {
      PurchaseID: purchaseId,
      Date: new Date(),
      SnackID: snackId,
      SnackName: snackName,
      Quantity: quantity,
      PurchasePrice: purchasePrice,
      TotalCost: totalCost,
      Notes: notes,
      PurchasedBy: getSessionUser_(body.token).username
    };

    // Save the purchase record using the existing headers.
    purchaseSheet.appendRow(
      purchaseHeaders.map(header =>
        purchaseRecord[header] !== undefined
          ? purchaseRecord[header]
          : ""
      )
    );

    // Increase stock and update the latest purchase price.
    stockSheet.getRange(
      stockRowNumber,
      stockColumns.CurrentStock + 1
    ).setValue(currentStock + quantity);

    stockSheet.getRange(
      stockRowNumber,
      stockColumns.PurchasePrice + 1
    ).setValue(purchasePrice);

    SpreadsheetApp.flush();

    return {
      success: true,
      message: "Stock added successfully.",
      purchaseId: purchaseId,
      snackName: snackName,
      previousStock: currentStock,
      quantityAdded: quantity,
      currentStock: currentStock + quantity,
      purchasePrice: purchasePrice,
      totalCost: totalCost
    };

  } finally {
    lock.releaseLock();
  }
}


/* =========================================
   PURCHASE HISTORY
========================================= */

function getStockPurchaseHistory_(body) {
  authenticate_(body.token);

  const purchases = getRecords_(CONFIG.SHEETS.PURCHASES)
    .map(item => ({
      purchaseId: String(item.PurchaseID || ""),
      date: item.Date instanceof Date
        ? Utilities.formatDate(
            item.Date,
            CONFIG.TIMEZONE,
            "dd-MM-yyyy HH:mm"
          )
        : String(item.Date || ""),
      snackId: String(item.SnackID || ""),
      snackName: String(item.SnackName || ""),
      quantity: Number(item.Quantity) || 0,
      purchasePrice: Number(item.PurchasePrice) || 0,
      totalCost: Number(item.TotalCost) || 0,
      notes: String(item.Notes || "")
    }))
    .reverse();

  return {
    success: true,
    purchases: purchases
  };
}


/* =========================================
   STOCK ADJUSTMENT
========================================= */

function adjustStock_(body) {
  requireAdmin_(body.token);
  authenticate_(body.token);

  const snackId = String(body.snackId || "").trim();
  const quantityChange = Number(body.quantityChange);
  const reason = String(body.reason || "").trim();
  const notes = String(body.notes || "").trim();

  if (!snackId) {
    throw new Error("Please select a snack.");
  }

  if (
    !Number.isInteger(quantityChange) ||
    quantityChange === 0 ||
    Math.abs(quantityChange) > 100000
  ) {
    throw new Error("Enter a valid stock adjustment.");
  }

  if (!reason) {
    throw new Error("Please provide an adjustment reason.");
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);

  try {
    const stockSheet = getSheet_(CONFIG.SHEETS.STOCK);
    const adjustmentSheet = getSheet_(CONFIG.SHEETS.ADJUSTMENTS);

    const stockData = stockSheet.getDataRange().getValues();
    const stockHeaders = stockData[0];

    const stockColumns = {};

    stockHeaders.forEach((header, index) => {
      stockColumns[String(header).trim()] = index;
    });

    let rowNumber = -1;
    let snackName = "";
    let currentStock = 0;

    for (let i = 1; i < stockData.length; i++) {
      if (
        String(stockData[i][stockColumns.SnackID]).trim() === snackId
      ) {
        rowNumber = i + 1;
        snackName = String(
          stockData[i][stockColumns.SnackName]
        );
        currentStock =
          Number(stockData[i][stockColumns.CurrentStock]) || 0;
        break;
      }
    }

    if (rowNumber === -1) {
      throw new Error("Selected snack was not found.");
    }

    const newStock = currentStock + quantityChange;

    if (newStock < 0) {
      throw new Error(
        "Adjustment would make stock negative."
      );
    }

    const adjustmentHeaders = adjustmentSheet
      .getRange(1, 1, 1, adjustmentSheet.getLastColumn())
      .getValues()[0]
      .map(header => String(header).trim());

    const adjustmentRecord = {
      AdjustmentID:
        "ADJ-" + Utilities.getUuid().slice(0, 8).toUpperCase(),
      Date: new Date(),
      SnackID: snackId,
      SnackName: snackName,
      QuantityChange: quantityChange,
      Reason: reason,
      Notes: notes
    };

    Object.keys(adjustmentRecord).forEach(column => {
      if (!adjustmentHeaders.includes(column)) {
        throw new Error(
          "Missing Stock_Adjustments column: " + column
        );
      }
    });

    adjustmentSheet.appendRow(
      adjustmentHeaders.map(header =>
        adjustmentRecord[header] !== undefined
          ? adjustmentRecord[header]
          : ""
      )
    );

    stockSheet.getRange(
      rowNumber,
      stockColumns.CurrentStock + 1
    ).setValue(newStock);

    SpreadsheetApp.flush();

    return {
      success: true,
      message: "Stock adjusted successfully.",
      snackName: snackName,
      previousStock: currentStock,
      quantityChange: quantityChange,
      currentStock: newStock
    };

  } finally {
    lock.releaseLock();
  }
}

function addNewSnack_(body) {
  requireAdmin_(body.token);
  authenticate_(body.token);

  const snackName = String(body.snackName || "").trim();
  const quantity = Number(body.quantity);
  const sellingPrice = Number(body.sellingPrice);

  if (!snackName) {
    throw new Error("Please enter the snack name.");
  }

  if (snackName.length > 100) {
    throw new Error("Snack name must be under 100 characters.");
  }

  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new Error("Quantity must be at least 1.");
  }

  if (!Number.isFinite(sellingPrice) || sellingPrice <= 0) {
    throw new Error("Enter a valid selling price.");
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);

  try {
    const sheet = getSheet_(CONFIG.SHEETS.STOCK);
    const data = sheet.getDataRange().getValues();

    const headers = data[0].map(header => String(header).trim());
    const columns = {};

    headers.forEach((header, index) => {
      columns[header] = index;
    });

    const requiredColumns = [
      "SnackID",
      "SnackName",
      "Category",
      "SellingPrice",
      "PurchasePrice",
      "CurrentStock",
      "Active"
    ];

    requiredColumns.forEach(column => {
      if (columns[column] === undefined) {
        throw new Error(
          "Missing column in Snacks_Stock: " + column
        );
      }
    });

    // Prevent duplicate snack names.
    for (let i = 1; i < data.length; i++) {
      const existingName = String(
        data[i][columns.SnackName] || ""
      ).trim();

      if (existingName.toLowerCase() === snackName.toLowerCase()) {
        throw new Error(
          "This snack already exists. Please use a different name."
        );
      }
    }

    // Generate the next available SnackID.
    let highestId = 0;

    for (let i = 1; i < data.length; i++) {
      const existingId = String(
        data[i][columns.SnackID] || ""
      ).trim();

      const match = existingId.match(/^SN(\d+)$/i);

      if (match) {
        highestId = Math.max(highestId, Number(match[1]));
      }
    }

    const snackId = "SN" + String(highestId + 1).padStart(3, "0");

    const newProduct = {
      SnackID: snackId,
      SnackName: snackName,
      Category: "Snacks",
      SellingPrice: sellingPrice,
      PurchasePrice: 0,
      CurrentStock: quantity,
      Active: true
    };

    sheet.appendRow(
      headers.map(header =>
        newProduct[header] !== undefined
          ? newProduct[header]
          : ""
      )
    );

    SpreadsheetApp.flush();

    return {
      success: true,
      message: "New snack added successfully!",
      snackId: snackId,
      snackName: snackName,
      quantity: quantity,
      sellingPrice: sellingPrice
    };

  } finally {
    lock.releaseLock();
  }
}

function editSnackStock_(body) {
  requireAdmin_(body.token);
  authenticate_(body.token);

  const snackId = String(body.snackId || "").trim();
  const quantity = Number(body.quantity);
  const sellingPrice = Number(body.sellingPrice);

  if (!snackId) {
    throw new Error("Please select a snack.");
  }

  if (!Number.isInteger(quantity) || quantity < 0) {
    throw new Error("Quantity must be zero or a positive whole number.");
  }

  if (!Number.isFinite(sellingPrice) || sellingPrice <= 0) {
    throw new Error("Enter a valid selling price.");
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);

  try {
    const sheet = getSheet_(CONFIG.SHEETS.STOCK);
    const data = sheet.getDataRange().getValues();
    const headers = data[0].map(h => String(h).trim());
    const columns = {};

    headers.forEach((header, index) => {
      columns[header] = index;
    });

    const required = [
      "SnackID",
      "SnackName",
      "SellingPrice",
      "CurrentStock"
    ];

    required.forEach(column => {
      if (columns[column] === undefined) {
        throw new Error("Missing column: " + column);
      }
    });

    for (let i = 1; i < data.length; i++) {
      if (String(data[i][columns.SnackID]).trim() === snackId) {
        sheet.getRange(i + 1, columns.CurrentStock + 1)
          .setValue(quantity);

        sheet.getRange(i + 1, columns.SellingPrice + 1)
          .setValue(sellingPrice);

        SpreadsheetApp.flush();

        return {
          success: true,
          message: "Stock updated successfully.",
          snackName: String(data[i][columns.SnackName]),
          quantity: quantity,
          sellingPrice: sellingPrice
        };
      }
    }

    throw new Error("Snack not found.");

  } finally {
    lock.releaseLock();
  }
}

/* =========================================
   MEMBERSHIP MANAGEMENT
   Run setupMembershipSheets() once manually
   from the Apps Script editor to create tabs.
========================================= */

function setupMembershipSheets() {
  return setupMembershipSheets_({ token: "" }, true);
}

function setupMembershipSheets_(body, manualRun) {
  if (!manualRun) authenticate_(body.token);

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const definitions = {
    Members: [
      "MemberID", "CreatedAt", "Name", "Phone", "Email",
      "PlanName", "PricePaid", "TotalHours", "UsedHours",
      "RemainingHours", "ValidityDays", "StartDate", "ExpiryDate",
      "MaxPlayers", "Status"
    ],
    Membership_Bookings: [
      "BookingID", "CreatedAt", "MemberID", "MemberName", "Phone",
      "Email", "BookingDate", "StartTime", "EndTime", "DurationMinutes",
      "Console", "Players", "HoursDeducted", "HoursUsedBefore",
      "HoursRemainingAfter", "HoursUsedTodayAfter", "Status", "EmailStatus"
    ],
    Membership_Renewals: [
      "RenewalID", "RenewedAt", "MemberID", "MemberName", "Phone", "Email",
      "PlanName", "AmountPaid", "HoursAdded", "ValidityDays", "PreviousExpiry",
      "NewExpiry", "RemainingHoursAfter", "MaxPlayers"
    ]
  };

  Object.entries(definitions).forEach(([name, headers]) => {
    let sheet = ss.getSheetByName(name);
    if (!sheet) sheet = ss.insertSheet(name);

    if (sheet.getLastRow() === 0) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.setFrozenRows(1);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
      sheet.autoResizeColumns(1, headers.length);
    } else {
      // Add missing headers to the right; never overwrite existing records.
      const existing = sheet.getRange(1, 1, 1, sheet.getLastColumn())
        .getValues()[0].map(v => String(v).trim());
      headers.forEach(header => {
        if (!existing.includes(header)) {
          sheet.getRange(1, sheet.getLastColumn() + 1).setValue(header);
          sheet.getRange(1, sheet.getLastColumn()).setFontWeight("bold");
          existing.push(header);
        }
      });
    }
  });

  return { success: true, message: "Membership sheets are ready." };
}

function membershipDateString_(value) {
  if (value instanceof Date) {
    return Utilities.formatDate(value, CONFIG.TIMEZONE, "yyyy-MM-dd");
  }
  const raw = String(value || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  if (!raw) return "";
  const parsed = new Date(raw);
  return isNaN(parsed.getTime()) ? raw :
    Utilities.formatDate(parsed, CONFIG.TIMEZONE, "yyyy-MM-dd");
}

function membershipTimeMinutes_(value) {
  return sessionTimeToMinutes_(value);
}

function getMembershipData_(body) {
  authenticate_(body.token);
  const today = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, "yyyy-MM-dd");
  const members = getRecords_("Members").map(m => {
    const id = String(m.MemberID || "");
    const bookings = getRecords_("Membership_Bookings")
      .filter(b => String(b.MemberID) === id && String(b.Status) === "Confirmed");
    const used = bookings.reduce((sum, b) => sum + (Number(b.HoursDeducted) || 0), 0);
    const usedToday = bookings.filter(b => membershipDateString_(b.BookingDate) === today)
      .reduce((sum, b) => sum + (Number(b.HoursDeducted) || 0), 0);
    return {
      memberId: id, name: String(m.Name || ""), phone: String(m.Phone || ""),
      email: String(m.Email || ""), planName: String(m.PlanName || ""),
      pricePaid: Number(m.PricePaid) || 0, totalHours: Number(m.TotalHours) || 0,
      usedHours: used, remainingHours: Math.max(0, (Number(m.TotalHours) || 0) - used),
      validityDays: Number(m.ValidityDays) || 0,
      startDate: membershipDateString_(m.StartDate),
      expiryDate: membershipDateString_(m.ExpiryDate),
      maxPlayers: Number(m.MaxPlayers) || 2,
      status: String(m.Status || "Active"),
      usedToday: usedToday
    };
  }).map(m => {
    if (m.status === "Active" && m.expiryDate && m.expiryDate < today) m.status = "Expired";
    if (m.remainingHours <= 0 && m.status === "Active") m.status = "Hours Exhausted";
    return m;
  }).reverse();

  const consoles = getRecords_("Consoles")
    .filter(c => c.Active === true && String(c.ConsoleType).toUpperCase() === "PS5")
    .map(c => ({ consoleId: String(c.ConsoleID || ""), consoleName: String(c.ConsoleName || "") }));

  return { success: true, members, consoles, today };
}

function addMember_(body) {
  requireAdmin_(body.token);
  authenticate_(body.token);
  const name = String(body.name || "").trim();
  const phone = String(body.phone || "").trim();
  const email = String(body.email || "").trim();
  const planName = String(body.planName || "PS5 Membership").trim();
  const pricePaid = Number(body.pricePaid);
  const totalHours = Number(body.totalHours);
  const validityDays = Number(body.validityDays);
  const maxPlayers = Number(body.maxPlayers || 2);

  if (!name) throw new Error("Member name is required.");
  if (!/^\d{10}$/.test(phone)) throw new Error("Enter a valid 10-digit mobile number.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Enter a valid email address.");
  if (!Number.isFinite(pricePaid) || pricePaid < 0) throw new Error("Enter a valid amount paid.");
  if (!Number.isFinite(totalHours) || totalHours <= 0 || totalHours > 1000) throw new Error("Enter valid membership hours.");
  if (!Number.isInteger(validityDays) || validityDays < 1 || validityDays > 3650) throw new Error("Enter validity in whole days.");
  if (![1, 2, 3, 4].includes(maxPlayers)) throw new Error("Maximum players must be between 1 and 4.");

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const existingMembers = getRecords_("Members");
    const normalizedEmail = email.toLowerCase();
    const duplicate = existingMembers.find(m =>
      String(m.Email || "").trim().toLowerCase() === normalizedEmail ||
      String(m.Phone || "").replace(/\D/g, "") === phone
    );
    if (duplicate) {
      throw new Error(
        "A member already exists with this email address or mobile number. " +
        "Use Membership Renewal instead. Existing Member ID: " + String(duplicate.MemberID)
      );
    }

    const today = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, "yyyy-MM-dd");
    const start = Utilities.parseDate(today, CONFIG.TIMEZONE, "yyyy-MM-dd");
    const expiry = new Date(start.getTime());
    expiry.setDate(expiry.getDate() + validityDays);
    const memberId = "AXM-M-" + Utilities.getUuid().slice(0, 8).toUpperCase();

    getSheet_("Members").appendRow([
      memberId, new Date(), name, phone, email, planName, pricePaid,
      totalHours, 0, totalHours, validityDays, start, expiry, maxPlayers, "Active"
    ]);
    SpreadsheetApp.flush();

    let emailStatus = "Sent";

      try {
        const expiryText = Utilities.formatDate(
          expiry,
          CONFIG.TIMEZONE,
          "dd MMM yyyy"
        );

        const startText = Utilities.formatDate(
          start,
          CONFIG.TIMEZONE,
          "dd MMM yyyy"
        );

        const subject = "Welcome to AXOM GAMING | Your Membership Card";

          const htmlBody = `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta name="x-apple-disable-message-reformatting">
            <title>Welcome to AXOM GAMING</title>
          </head>

          <body style="margin:0;padding:0;background:#08090d;font-family:Arial,Helvetica,sans-serif;color:#f5f6f8;">

          <div style="display:none;max-height:0;overflow:hidden;">
            Your AXOM GAMING membership is active. Your next session starts here.
          </div>

          <table width="100%" cellpadding="0" cellspacing="0" border="0"
          style="background:#08090d;padding:30px 12px;">
          <tr>
          <td align="center">

          <table width="620" cellpadding="0" cellspacing="0" border="0"
          style="width:100%;max-width:620px;background:#11141b;border:1px solid #292f39;border-radius:18px;overflow:hidden;">

          <!-- RED TOP BORDER -->
          <tr>
          <td height="5" style="background:#ed1c2e;font-size:0;">&nbsp;</td>
          </tr>

          <!-- HEADER -->
          <tr>
          <td style="padding:27px 30px;background:#0d1016;border-bottom:1px solid #252b35;">

          <div style="font-size:11px;letter-spacing:3px;font-weight:bold;color:#aab2bf;">
          YOUR GAMING DESTINATION
          </div>

          <div style="margin-top:7px;font-size:25px;font-weight:900;color:#fff;">
          AXOM <span style="color:#f12b3b;">GAMING</span>
          </div>

          <div style="margin-top:7px;font-size:9px;letter-spacing:3px;font-weight:bold;color:#87909e;">
          PLAY &nbsp; • &nbsp; COMPETE &nbsp; • &nbsp; REPEAT
          </div>

          <div style="margin-top:15px;display:inline-block;padding:8px 11px;border:1px solid #315b49;border-radius:20px;background:#10251d;color:#77e0a9;font-size:9px;font-weight:bold;">
          ● MEMBERSHIP ACTIVE
          </div>

          </td>
          </tr>

          <!-- WELCOME -->
          <tr>
          <td style="padding:32px 30px 20px;">

          <div style="font-size:10px;letter-spacing:2px;font-weight:bold;color:#f15a66;">
          WELCOME TO THE CREW
          </div>

          <h1 style="margin:11px 0 12px;font-size:30px;line-height:1.2;color:#fff;">
          You're in.<br>
          <span style="color:#f12b3b;">Game on.</span>
          </h1>

          <p style="margin:0;font-size:14px;line-height:1.8;color:#b3bdca;">
          Hi <strong style="color:#fff;">${escapeEmailHtml_(name)}</strong>,<br><br>
          Your AXOM GAMING membership has been successfully created.
          Your membership details are ready below. Keep this email handy
          when booking your PS5 sessions.
          </p>

          </td>
          </tr>

          <!-- MEMBER CARD -->
          <tr>
          <td style="padding:8px 30px 22px;">

          <table width="100%" cellpadding="0" cellspacing="0"
          style="background:#191e28;border:1px solid #3a424f;border-radius:14px;">

          <tr>
          <td style="padding:21px 22px;">

          <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
          <td style="font-size:9px;letter-spacing:2px;font-weight:bold;color:#9da8b7;">
          AXOM GAMING MEMBER CARD
          </td>
          <td align="right" style="font-size:9px;color:#f36a75;font-weight:bold;">
          DIGITAL MEMBERSHIP
          </td>
          </tr>
          </table>

          <div style="margin-top:19px;font-size:10px;letter-spacing:1.5px;color:#a5afbd;">
          MEMBERSHIP PLAN
          </div>

          <div style="margin-top:5px;font-size:23px;font-weight:bold;color:#fff;">
          ${escapeEmailHtml_(planName)}
          </div>

          <div style="margin-top:19px;padding:14px 15px;background:#0d1118;border:1px dashed #4b5665;border-radius:9px;">

          <div style="font-size:9px;letter-spacing:2px;font-weight:bold;color:#8d99a9;">
          YOUR UNIQUE MEMBER ID
          </div>

          <div style="margin-top:7px;font-size:22px;font-weight:800;letter-spacing:1px;color:#fff;word-break:break-word;">
          ${escapeEmailHtml_(memberId)}
          </div>

          </div>

          <div style="margin-top:12px;font-size:11px;line-height:1.6;color:#9ba6b5;">
          Keep your Member ID safe. You may need it for membership verification and booking assistance.
          </div>

          </td>
          </tr>
          </table>

          </td>
          </tr>

          <!-- STATS -->
          <tr>
          <td style="padding:0 24px 22px;">

          <table width="100%" cellpadding="0" cellspacing="0">
          <tr>

          <td width="50%" valign="top" style="padding:6px;">
          <table width="100%" cellpadding="0" cellspacing="0"
          style="background:#171c25;border:1px solid #2c3440;border-radius:11px;">
          <tr>
          <td style="padding:17px 16px;">
          <div style="font-size:9px;letter-spacing:1.5px;font-weight:bold;color:#9aa5b4;">
          PLAYING HOURS
          </div>
          <div style="margin-top:8px;font-size:27px;font-weight:800;color:#fff;">
          ${escapeEmailHtml_(totalHours)}
          </div>
          <div style="margin-top:5px;font-size:10px;color:#8994a3;">
          Hours included
          </div>
          </td>
          </tr>
          </table>
          </td>

          <td width="50%" valign="top" style="padding:6px;">
          <table width="100%" cellpadding="0" cellspacing="0"
          style="background:#171c25;border:1px solid #2c3440;border-radius:11px;">
          <tr>
          <td style="padding:17px 16px;">
          <div style="font-size:9px;letter-spacing:1.5px;font-weight:bold;color:#9aa5b4;">
          AMOUNT PAID
          </div>
          <div style="margin-top:8px;font-size:27px;font-weight:800;color:#fff;">
          &#8377;${escapeEmailHtml_(pricePaid)}
          </div>
          <div style="margin-top:5px;font-size:10px;color:#8994a3;">
          Membership fee
          </div>
          </td>
          </tr>
          </table>
          </td>

          </tr>
          </table>
          </td>
          </tr>

          <!-- DETAILS -->
          <tr>
          <td style="padding:0 30px 25px;">

          <div style="margin-bottom:12px;font-size:15px;font-weight:bold;color:#fff;">
          Membership details
          </div>

          <table width="100%" cellpadding="0" cellspacing="0"
          style="font-size:12px;line-height:1.5;">

          <tr>
          <td style="padding:12px 0;border-bottom:1px solid #29313c;color:#9ca8b7;">
          Hours remaining
          </td>
          <td align="right" style="padding:12px 0;border-bottom:1px solid #29313c;color:#75dfa8;font-weight:bold;">
          ${escapeEmailHtml_(totalHours)} hours
          </td>
          </tr>

          <tr>
          <td style="padding:12px 0;border-bottom:1px solid #29313c;color:#9ca8b7;">
          Maximum players
          </td>
          <td align="right" style="padding:12px 0;border-bottom:1px solid #29313c;color:#fff;font-weight:bold;">
          ${escapeEmailHtml_(maxPlayers)} players
          </td>
          </tr>

          <tr>
          <td style="padding:12px 0;border-bottom:1px solid #29313c;color:#9ca8b7;">
          Start date
          </td>
          <td align="right" style="padding:12px 0;border-bottom:1px solid #29313c;color:#fff;">
          ${escapeEmailHtml_(startText)}
          </td>
          </tr>

          <tr>
          <td style="padding:12px 0;color:#9ca8b7;">
          Expiry date
          </td>
          <td align="right" style="padding:12px 0;color:#ff8791;font-weight:bold;">
          ${escapeEmailHtml_(expiryText)}
          </td>
          </tr>

          </table>
          </td>
          </tr>

          <!-- BOOKING CALLOUT -->
          <tr>
          <td style="padding:0 30px 30px;">

          <table width="100%" cellpadding="0" cellspacing="0"
          style="background:#21171d;border:1px solid #55303a;border-left:4px solid #f12b3b;border-radius:10px;">

          <tr>
          <td style="padding:17px 18px;">

          <div style="font-size:13px;font-weight:bold;color:#fff;">
          Ready for your next session?
          </div>

          <p style="margin:7px 0 0;font-size:12px;line-height:1.8;color:#c0aeb2;">
          Contact AXOM GAMING to arrange your gaming session.
          Bookings are subject to membership terms, available slots and console availability.
          </p>

          </td>
          </tr>
          </table>

          </td>
          </tr>

          <!-- FOOTER -->
          <tr>
          <td align="center" style="padding:23px 25px;background:#0d1016;border-top:1px solid #252b35;">

          <div style="font-size:18px;font-weight:900;letter-spacing:2px;color:#fff;">
          AXOM <span style="color:#f12b3b;">GAMING</span>
          </div>

          <div style="margin-top:7px;font-size:9px;letter-spacing:2px;font-weight:bold;color:#9aa4b2;">
          PLAY &nbsp; • &nbsp; COMPETE &nbsp; • &nbsp; REPEAT
          </div>

          <p style="margin:14px 0 0;font-size:10px;line-height:1.7;color:#778291;">
          This email confirms your membership registration.<br>
          Please retain it for your records.
          </p>

          </td>
          </tr>

          </table>

          <div style="padding:15px 10px 0;font-size:9px;color:#5f6875;text-align:center;">
          © AXOM GAMING · MEMBERSHIP CONFIRMATION
          </div>

          </td>
          </tr>
          </table>

          </body>
          </html>
          `;

          const plainBody =
            "Hi " + name + ",\n\n" +
            "Welcome to AXOM GAMING!\n\n" +
            "Member ID: " + memberId + "\n" +
            "Plan: " + planName + "\n" +
            "Amount Paid: ₹" + pricePaid + "\n" +
            "Total Playing Hours: " + totalHours + "\n" +
            "Hours Remaining: " + totalHours + "\n" +
            "Maximum Players: " + maxPlayers + "\n" +
            "Start Date: " + startText + "\n" +
            "Expiry Date: " + expiryText + "\n\n" +
            "Play. Compete. Repeat.\nAXOM GAMING";

          MailApp.sendEmail({
            to: email,
            subject: subject,
            body: plainBody,
            htmlBody: htmlBody,
            name: "AXOM GAMING"
          });

      } catch (emailError) {
        emailStatus = "Failed: " + emailError.message;
      }

    return {
      success: true, memberId, name, email, totalHours, remainingHours: totalHours,
      expiryDate: Utilities.formatDate(expiry, CONFIG.TIMEZONE, "yyyy-MM-dd"),
      emailStatus,
      message: emailStatus === "Sent"
        ? "Member created and welcome email sent."
        : "Member created, but welcome email failed: " + emailStatus
    };
  } finally {
    lock.releaseLock();
  }
}


function renewMember_(body) {
  requireAdmin_(body.token);
  authenticate_(body.token);

  const memberId = String(body.memberId || "").trim();
  const planName = String(body.planName || "").trim();
  const pricePaid = Number(body.pricePaid);
  const hoursAdded = Number(body.totalHours);
  const validityDays = Number(body.validityDays);
  const maxPlayers = Number(body.maxPlayers || 2);

  if (!memberId) throw new Error("Select an existing member.");
  if (!planName) throw new Error("Enter the renewal plan name.");
  if (!Number.isFinite(pricePaid) || pricePaid < 0) throw new Error("Enter a valid renewal amount.");
  if (!Number.isFinite(hoursAdded) || hoursAdded <= 0 || hoursAdded > 1000) throw new Error("Enter valid renewal hours.");
  if (!Number.isInteger(validityDays) || validityDays < 1 || validityDays > 3650) throw new Error("Enter validity in whole days.");
  if (![1, 2, 3, 4].includes(maxPlayers)) throw new Error("Maximum players must be between 1 and 4.");

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sheet = getSheet_("Members");
    const data = sheet.getDataRange().getValues();
    if (data.length < 2) throw new Error("No members are registered.");

    const headers = data[0].map(h => String(h).trim());
    const col = {};
    headers.forEach((h, i) => col[h] = i);

    const rowIndex = data.findIndex((row, i) => i > 0 && String(row[col.MemberID]) === memberId);
    if (rowIndex < 1) throw new Error("Member not found. Refresh the page and try again.");

    const row = data[rowIndex];
    const todayText = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, "yyyy-MM-dd");
    const today = Utilities.parseDate(todayText, CONFIG.TIMEZONE, "yyyy-MM-dd");
    const oldExpiryText = membershipDateString_(row[col.ExpiryDate]);
    const oldExpiry = oldExpiryText
      ? Utilities.parseDate(oldExpiryText, CONFIG.TIMEZONE, "yyyy-MM-dd")
      : today;
    const baseDate = oldExpiry && oldExpiry.getTime() > today.getTime() ? oldExpiry : today;
    const newExpiry = new Date(baseDate.getTime());
    newExpiry.setDate(newExpiry.getDate() + validityDays);

    const oldTotalHours = Number(row[col.TotalHours]) || 0;
    const newTotalHours = oldTotalHours + hoursAdded;
    const oldPricePaid = Number(row[col.PricePaid]) || 0;
    const updatedValues = {
      Name: String(row[col.Name] || ""),
      Phone: String(row[col.Phone] || ""),
      Email: String(row[col.Email] || ""),
      PlanName: planName,
      PricePaid: oldPricePaid + pricePaid,
      TotalHours: newTotalHours,
      ValidityDays: validityDays,
      StartDate: today,
      ExpiryDate: newExpiry,
      MaxPlayers: maxPlayers,
      Status: "Active"
    };

    Object.keys(updatedValues).forEach(header => {
      if (col[header] === undefined) throw new Error("Members sheet is missing column: " + header);
      sheet.getRange(rowIndex + 1, col[header] + 1).setValue(updatedValues[header]);
    });

    const usedHours = getRecords_("Membership_Bookings")
      .filter(b => String(b.MemberID) === memberId && String(b.Status) === "Confirmed")
      .reduce((sum, b) => sum + (Number(b.HoursDeducted) || 0), 0);
    const remainingHours = Math.max(0, newTotalHours - usedHours);

    const renewalId = "AXM-R-" + Utilities.getUuid().slice(0, 8).toUpperCase();
    const renewalSheet = getSheet_("Membership_Renewals");
    renewalSheet.appendRow([
      renewalId, new Date(), memberId, updatedValues.Name, updatedValues.Phone,
      updatedValues.Email, planName, pricePaid, hoursAdded, validityDays,
      oldExpiryText, Utilities.formatDate(newExpiry, CONFIG.TIMEZONE, "yyyy-MM-dd"),
      remainingHours, maxPlayers
    ]);

    SpreadsheetApp.flush();

    let emailStatus = "Sent";

try {
  const expiryText = Utilities.formatDate(
    newExpiry,
    CONFIG.TIMEZONE,
    "dd MMM yyyy"
  );

  const safeName = escapeEmailHtml_(updatedValues.Name);
  const safeMemberId = escapeEmailHtml_(memberId);

  const subject = "Membership Renewed Successfully | AXOM GAMING";

  const plainBody =
    "Hi " + updatedValues.Name + ",\n\n" +
    "Your AXOM GAMING membership has been successfully renewed!\n\n" +
    "Member ID: " + memberId + "\n" +
    "Hours Added: " + hoursAdded + " hours\n" +
    "Remaining Balance: " + remainingHours + " hours\n" +
    "New Expiry Date: " + expiryText + "\n\n" +
    "Thank you for being part of AXOM GAMING.\n\n" +
    "Train Hard. Play Better.\n" +
    "AXOM GAMING";

  const htmlBody = `
  <div style="margin:0;padding:35px 12px;background-color:#08090d;font-family:Arial,Helvetica,sans-serif;">

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
      style="max-width:580px;margin:auto;background:#11141b;border:1px solid #292d36;border-radius:14px;overflow:hidden;">

      <!-- HEADER -->
      <tr>
        <td style="padding:28px 25px;text-align:center;border-bottom:1px solid #292d36;">
          <div style="font-size:27px;font-weight:900;letter-spacing:1px;color:#ffffff;">
            AXOM <span style="color:#ed1c2e;">GAMING</span>
          </div>
          <div style="font-size:10px;letter-spacing:4px;color:#9298a5;margin-top:8px;">
            TRAIN HARD. PLAY BETTER.
          </div>
        </td>
      </tr>

      <!-- SUCCESS MESSAGE -->
      <tr>
        <td style="padding:35px 25px 20px;text-align:center;">

          <div style="display:inline-block;background:#17291f;color:#4ade80;
            padding:8px 16px;border-radius:30px;font-size:11px;
            font-weight:bold;letter-spacing:1px;">
            ✓ RENEWAL SUCCESSFUL
          </div>

          <h1 style="font-size:27px;color:#ffffff;margin:22px 0 10px;">
            MEMBERSHIP<br>
            <span style="color:#ed1c2e;">RENEWED!</span>
          </h1>

          <p style="font-size:14px;line-height:23px;color:#b8bdc8;margin:0;">
            Hi <strong style="color:#ffffff;">${safeName}</strong>,<br>
            Your AXOM GAMING membership has been successfully renewed.
            Get ready for more gaming sessions!
          </p>

        </td>
      </tr>

      <!-- MEMBER ID -->
      <tr>
        <td style="padding:10px 25px 22px;">
          <div style="background:#1a1e28;border:1px solid #303541;
            border-radius:9px;padding:15px;text-align:center;">
            <div style="font-size:10px;color:#9298a5;letter-spacing:2px;">
              YOUR MEMBER ID
            </div>
            <div style="font-size:18px;font-weight:bold;color:#ffffff;margin-top:7px;">
              ${safeMemberId}
            </div>
          </div>
        </td>
      </tr>

      <!-- MEMBERSHIP DETAILS -->
      <tr>
        <td style="padding:0 25px 25px;">

          <div style="font-size:13px;font-weight:bold;color:#ffffff;
            letter-spacing:1px;margin-bottom:15px;">
            YOUR MEMBERSHIP SUMMARY
          </div>

          <table role="presentation" width="100%" cellpadding="0" cellspacing="8">

            <tr>
              <td width="50%" style="background:#1a1e28;padding:17px 12px;
                border-radius:9px;border:1px solid #303541;">
                <div style="font-size:11px;color:#9298a5;">HOURS ADDED</div>
                <div style="font-size:25px;font-weight:bold;color:#ed1c2e;margin-top:7px;">
                  +${hoursAdded}
                </div>
                <div style="font-size:11px;color:#9298a5;">Hours</div>
              </td>

              <td width="50%" style="background:#1a1e28;padding:17px 12px;
                border-radius:9px;border:1px solid #303541;">
                <div style="font-size:11px;color:#9298a5;">AVAILABLE BALANCE</div>
                <div style="font-size:25px;font-weight:bold;color:#ffffff;margin-top:7px;">
                  ${remainingHours}
                </div>
                <div style="font-size:11px;color:#9298a5;">Hours remaining</div>
              </td>
            </tr>

            <tr>
              <td colspan="2" style="background:#1a1e28;padding:17px 12px;
                border-radius:9px;border:1px solid #303541;">
                <div style="font-size:11px;color:#9298a5;">NEW MEMBERSHIP EXPIRY</div>
                <div style="font-size:20px;font-weight:bold;color:#ffffff;margin-top:7px;">
                  ${expiryText}
                </div>
              </td>
            </tr>

          </table>
        </td>
      </tr>

      <!-- FOOTER -->
      <tr>
        <td style="padding:23px 25px;text-align:center;
          background:#0c0e13;border-top:1px solid #292d36;">

          <div style="font-size:15px;font-weight:bold;color:#ffffff;">
            READY TO PLAY?
          </div>

          <p style="font-size:12px;line-height:20px;color:#9298a5;margin:10px 0;">
            Thank you for choosing AXOM GAMING.<br>
            We look forward to seeing you at the arena!
          </p>

          <div style="font-size:13px;font-weight:bold;color:#ed1c2e;
            letter-spacing:1px;margin-top:15px;">
            TRAIN HARD. PLAY BETTER.
          </div>

          <div style="font-size:10px;color:#666d7a;margin-top:20px;">
            © AXOM GAMING | All Rights Reserved
          </div>

        </td>
      </tr>

    </table>

  </div>
  `;

  MailApp.sendEmail({
    to: updatedValues.Email,
    subject: subject,
    body: plainBody,
    htmlBody: htmlBody,
    name: "AXOM GAMING"
  });

} catch (emailError) {
  emailStatus = "Failed: " + emailError.message;
  Logger.log("Renewal email error: " + emailError.message);
}

    return {
      success: true,
      message: "Membership renewed successfully.",
      renewalId: renewalId,
      memberId: memberId,
      totalHours: newTotalHours,
      remainingHours: remainingHours,
      expiryDate: Utilities.formatDate(newExpiry, CONFIG.TIMEZONE, "yyyy-MM-dd"),
      emailStatus: emailStatus
    };
  } finally {
    lock.releaseLock();
  }
}

function createMembershipBooking_(body) {
  authenticate_(body.token);
  const memberId = String(body.memberId || "").trim();
  const date = String(body.date || "").trim();
  const startTime = String(body.startTime || "").trim();
  const durationMinutes = Number(body.durationMinutes);
  const consoleName = String(body.consoleName || "").trim();
  const players = Number(body.players || 1);

  if (!memberId) throw new Error("Select a member.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Invalid booking date.");
  if (!/^\d{2}:\d{2}$/.test(startTime)) throw new Error("Invalid starting time.");
  if (
  !Number.isInteger(durationMinutes) ||
    durationMinutes < 30 ||
    durationMinutes % 30 !== 0
  ) {
    throw new Error(
      "Booking duration must be at least 30 minutes and use 30-minute intervals."
    );
  }
  if (![1, 2, 3, 4].includes(players)) throw new Error("Invalid player count.");

  const timeParts = startTime.split(":").map(Number);
  const startMinutes = timeParts[0] * 60 + timeParts[1];
  const endMinutes = startMinutes + durationMinutes;
  if (timeParts[0] > 23 || timeParts[1] > 59 ||
      startMinutes < 600 || endMinutes > 1320) {
    throw new Error("Bookings must be between 10:00 AM and 10:00 PM.");
  }
  const endTime = String(Math.floor(endMinutes / 60)).padStart(2, "0") + ":" +
    String(endMinutes % 60).padStart(2, "0");
  const validDate = Utilities.parseDate(date, CONFIG.TIMEZONE, "yyyy-MM-dd");
  if (Utilities.formatDate(validDate, CONFIG.TIMEZONE, "yyyy-MM-dd") !== date) {
    throw new Error("Invalid booking date.");
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const members = getRecords_("Members");
    const memberRow = members.find(m => String(m.MemberID) === memberId);
    if (!memberRow) throw new Error("Member not found.");

    const today = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, "yyyy-MM-dd");
    const expiryDate = membershipDateString_(memberRow.ExpiryDate);
    if (String(memberRow.Status) !== "Active" || expiryDate < today) throw new Error("This membership is not active.");

// Prevent bookings for past dates.
if (date < today) {
  throw new Error("You cannot book a past date.");
}

// Prevent bookings for times that have already passed today.
if (date === today) {
  const currentTime = Utilities.formatDate(
    new Date(),
    CONFIG.TIMEZONE,
    "HH:mm"
  );

  const currentParts = currentTime.split(":").map(Number);
  const currentMinutes = currentParts[0] * 60 + currentParts[1];

  if (startMinutes <= currentMinutes) {
    throw new Error(
      "This time has already passed. Please select a future time."
    );
  }
}


    if (players > Number(memberRow.MaxPlayers || 2)) throw new Error("This membership allows a maximum of " + memberRow.MaxPlayers + " player(s).");

    const existingBookings = getRecords_("Membership_Bookings")
      .filter(b => String(b.Status) === "Confirmed");
    const memberBookings = existingBookings.filter(b => String(b.MemberID) === memberId);
    const hoursUsed = memberBookings.reduce((sum, b) => sum + (Number(b.HoursDeducted) || 0), 0);
    const requestedHours = durationMinutes / 60;
    const remainingHours = Number(memberRow.TotalHours) - hoursUsed;
    if (requestedHours > remainingHours) throw new Error("Not enough membership hours remaining. Balance: " + Math.max(0, remainingHours) + " hours.");

    const activeConsole = getRecords_("Consoles").find(c =>
      String(c.ConsoleName) === consoleName &&
      String(c.ConsoleType).toUpperCase() === "PS5" &&
      c.Active === true
    );
    if (!activeConsole) throw new Error("Select an active PS5 console.");

    // Check overlapping membership bookings.
    const overlaps = (bDate, bStart, bEnd) => {
      if (membershipDateString_(bDate) !== date) return false;
      const existingStart = membershipTimeMinutes_(bStart);
      const existingEnd = membershipTimeMinutes_(bEnd);
      return startMinutes < existingEnd && endMinutes > existingStart;
    };
    const memberConflict = existingBookings.some(b =>
      String(b.Console) === consoleName && overlaps(b.BookingDate, b.StartTime, b.EndTime)
    );
    if (memberConflict) throw new Error("This console already has a membership booking at that time.");

    // Also check ordinary sales already booked on this console.
    const normalBookings = getRecords_("Gaming_Sales");
    const normalConflict = normalBookings.some(b => {
      if (membershipDateString_(b.Date) !== date || String(b.Console) !== consoleName) return false;
      const s = membershipTimeMinutes_(b.StartTime);
      const e = membershipTimeMinutes_(b.EndTime);
      return startMinutes < e && endMinutes > s;
    });
    if (normalConflict) throw new Error("This console is already booked during the selected time.");

    // Also avoid collisions with live sessions that have not yet been posted to Gaming_Sales.
    const liveSessionsSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Live_Sessions");
    if (liveSessionsSheet && liveSessionsSheet.getLastRow() > 1) {
      const liveSessions = getRecords_("Live_Sessions");
      const liveConflict = liveSessions.some(b => {
        if (String(b.Status) !== "Active" ||
            membershipDateString_(b.Date) !== date ||
            String(b.Console) !== consoleName) return false;
        const s = membershipTimeMinutes_(b.StartTime);
        const e = membershipTimeMinutes_(b.ScheduledEndTime);
        return startMinutes < e && endMinutes > s;
      });
      if (liveConflict) throw new Error("This console has an active session during the selected time.");
    }

    const usedTodayBefore = existingBookings
      .filter(b => String(b.MemberID) === memberId && membershipDateString_(b.BookingDate) === date)
      .reduce((sum, b) => sum + (Number(b.HoursDeducted) || 0), 0);
    const usedAfter = hoursUsed + requestedHours;
    const remainingAfter = Number(memberRow.TotalHours) - usedAfter;
    const usedTodayAfter = usedTodayBefore + requestedHours;
    const bookingId = "AXM-B-" + Utilities.getUuid().slice(0, 8).toUpperCase();
    const membershipBookingSheet = getSheet_("Membership_Bookings");
    let bookingHeaders = membershipBookingSheet.getRange(1, 1, 1, membershipBookingSheet.getLastColumn()).getValues()[0].map(h => String(h).trim());
    if (!bookingHeaders.includes("BookedBy")) {
      membershipBookingSheet.getRange(1, bookingHeaders.length + 1).setValue("BookedBy");
      bookingHeaders.push("BookedBy");
    }
    const bookingRecord = {
      BookingID: bookingId,
      CreatedAt: new Date(),
      MemberID: memberId,
      MemberName: String(memberRow.Name),
      Phone: String(memberRow.Phone),
      Email: String(memberRow.Email),
      BookingDate: validDate,
      StartTime: startTime,
      EndTime: endTime,
      DurationMinutes: durationMinutes,
      Console: consoleName,
      Players: players,
      HoursDeducted: requestedHours,
      HoursUsedBefore: hoursUsed,
      HoursRemainingAfter: remainingAfter,
      HoursUsedTodayAfter: usedTodayAfter,
      Status: "Confirmed",
      EmailStatus: "Pending",
      BookedBy: getSessionUser_(body.token).username
    };
    membershipBookingSheet.appendRow(bookingHeaders.map(header =>
      bookingRecord[header] !== undefined ? bookingRecord[header] : ""
    ));
    SpreadsheetApp.flush();

    let emailStatus = "Sent";

      try {
        const emailDate = Utilities.formatDate(
          validDate,
          CONFIG.TIMEZONE,
          "dd MMM yyyy"
        );

        const emailExpiry = Utilities.formatDate(
          new Date(expiryDate),
          CONFIG.TIMEZONE,
          "dd MMM yyyy"
        );

        const durationLabel = requestedHours === 0.5
          ? "30 minutes"
          : requestedHours < 1
            ? (requestedHours * 60) + " minutes"
            : (Math.floor(requestedHours) === requestedHours
                ? requestedHours + " hour" + (requestedHours === 1 ? "" : "s")
                : Math.floor(requestedHours) + " hour " +
                  ((requestedHours % 1) * 60) + " minutes");

        const htmlBody = `
          <!DOCTYPE html>
          <html lang="en">
          <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <meta name="x-apple-disable-message-reformatting">
          <title>Booking Confirmed | AXOM GAMING</title>
          </head>

          <body style="margin:0;padding:0;background:#08090d;font-family:Arial,Helvetica,sans-serif;color:#f5f6f8;">

          <div style="display:none;max-height:0;overflow:hidden;">
          Your AXOM GAMING PS5 session is confirmed. Get ready to play!
          </div>

          <table width="100%" cellpadding="0" cellspacing="0" border="0"
          style="background:#08090d;padding:30px 12px;">
          <tr>
          <td align="center">

          <table width="620" cellpadding="0" cellspacing="0" border="0"
          style="width:100%;max-width:620px;background:#11141b;border:1px solid #292f39;border-radius:16px;overflow:hidden;">

          <!-- RED TOP BORDER -->
          <tr>
          <td height="5" style="background:#ed1c2e;font-size:0;">&nbsp;</td>
          </tr>

          <!-- HEADER -->
          <tr>
          <td style="padding:27px 30px;background:#0d1016;border-bottom:1px solid #252b35;">

          <div style="font-size:11px;letter-spacing:3px;font-weight:bold;color:#aab2bf;">
          YOUR GAMING DESTINATION
          </div>

          <div style="margin-top:7px;font-size:25px;font-weight:900;color:#fff;">
          AXOM <span style="color:#f12b3b;">GAMING</span>
          </div>

          <div style="margin-top:7px;font-size:9px;letter-spacing:3px;font-weight:bold;color:#87909e;">
          PLAY &nbsp; • &nbsp; COMPETE &nbsp; • &nbsp; REPEAT
          </div>

          <div style="display:inline-block;margin-top:16px;padding:9px 13px;
          background:#10251d;border:1px solid #315b49;border-radius:30px;
          color:#77e0a9;font-size:10px;font-weight:bold;letter-spacing:1px;">
          &#10003; BOOKING CONFIRMED
          </div>

          </td>
          </tr>

          <!-- GREETING -->
          <tr>
          <td style="padding:30px 30px 20px;">

          <div style="font-size:10px;letter-spacing:2px;font-weight:bold;color:#f15a66;">
          YOUR NEXT SESSION
          </div>

          <h1 style="margin:12px 0;font-size:29px;line-height:1.2;color:#fff;">
          Hey ${escapeEmailHtml_(memberRow.Name)},<br>
          <span style="color:#f12b3b;">Game time is locked in.</span>
          </h1>

          <p style="margin:0;font-size:13px;line-height:1.8;color:#b3bdca;">
          Your PS5 membership booking has been successfully confirmed.
          Here are your session details. Keep this email handy!
          </p>

          </td>
          </tr>

          <!-- GAMING SESSION CARD -->
          <tr>
          <td style="padding:10px 25px 22px;">

          <table width="100%" cellpadding="0" cellspacing="0"
          style="background:#191e28;border:1px solid #77303a;border-radius:14px;">

          <tr>
          <td style="padding:23px;">

          <div style="font-size:10px;letter-spacing:2px;font-weight:bold;color:#ff7884;">
          YOUR GAMING SESSION
          </div>

          <div style="margin-top:18px;font-size:26px;font-weight:800;color:#fff;">
          ${escapeEmailHtml_(emailDate)}
          </div>

          <div style="margin-top:9px;font-size:23px;font-weight:bold;color:#ff5968;">
          ${escapeEmailHtml_(startTime)} – ${escapeEmailHtml_(endTime)}
          </div>

          <div style="margin-top:9px;font-size:12px;color:#aab5c4;">
          ${escapeEmailHtml_(durationLabel)}
          </div>

          <div style="margin-top:22px;padding:15px;background:#0d1118;
          border:1px dashed #505a68;border-radius:9px;">

          <div style="font-size:9px;letter-spacing:2px;font-weight:bold;color:#8995a5;">
          BOOKING REFERENCE
          </div>

          <div style="margin-top:8px;font-size:22px;font-weight:800;
          letter-spacing:1px;color:#fff;word-break:break-word;">
          ${escapeEmailHtml_(bookingId)}
          </div>

          </div>

          </td>
          </tr>
          </table>

          </td>
          </tr>

          <!-- SESSION DETAILS -->
          <tr>
          <td style="padding:0 30px 25px;">

          <div style="font-size:16px;font-weight:bold;color:#fff;margin-bottom:12px;">
          Session details
          </div>

          <table width="100%" cellpadding="0" cellspacing="0"
          style="font-size:12px;line-height:1.6;">

          <tr>
          <td style="padding:12px 0;border-bottom:1px solid #29313c;color:#9ca8b7;">
          Member ID
          </td>
          <td align="right" style="padding:12px 0;border-bottom:1px solid #29313c;color:#fff;font-weight:bold;">
          ${escapeEmailHtml_(memberId)}
          </td>
          </tr>

          <tr>
          <td style="padding:12px 0;border-bottom:1px solid #29313c;color:#9ca8b7;">
          Console
          </td>
          <td align="right" style="padding:12px 0;border-bottom:1px solid #29313c;color:#fff;font-weight:bold;">
          ${escapeEmailHtml_(consoleName)}
          </td>
          </tr>

          <tr>
          <td style="padding:12px 0;border-bottom:1px solid #29313c;color:#9ca8b7;">
          Players
          </td>
          <td align="right" style="padding:12px 0;border-bottom:1px solid #29313c;color:#fff;">
          ${escapeEmailHtml_(players)}
          </td>
          </tr>

          <tr>
          <td style="padding:12px 0;color:#9ca8b7;">
          Membership expires
          </td>
          <td align="right" style="padding:12px 0;color:#ff8791;font-weight:bold;">
          ${escapeEmailHtml_(emailExpiry)}
          </td>
          </tr>

          </table>
          </td>
          </tr>

          <!-- MEMBERSHIP BALANCE -->
          <tr>
          <td style="padding:0 25px 25px;">

          <table width="100%" cellpadding="0" cellspacing="0"
          style="background:#151d1d;border:1px solid #285442;border-radius:13px;">

          <tr>
          <td style="padding:22px;">

          <div style="font-size:10px;letter-spacing:2px;font-weight:bold;color:#78dca9;">
          MEMBERSHIP BALANCE
          </div>

          <div style="margin-top:12px;font-size:35px;font-weight:800;color:#70e0a5;">
          ${escapeEmailHtml_(remainingAfter)}
          <span style="font-size:15px;font-weight:normal;color:#b6c9bf;">
          hours left
          </span>
          </div>

          <div style="margin-top:7px;font-size:11px;color:#9eb4a8;">
          Your remaining playing time after this booking.
          </div>

          <table width="100%" cellpadding="0" cellspacing="0"
          style="margin-top:20px;font-size:12px;line-height:1.6;">

          <tr>
          <td style="padding:11px 0;border-top:1px solid #294438;color:#a8b9af;">
          Hours deducted
          </td>
          <td align="right" style="padding:11px 0;border-top:1px solid #294438;color:#fff;font-weight:bold;">
          ${escapeEmailHtml_(requestedHours)} hours
          </td>
          </tr>

          <tr>
          <td style="padding:11px 0;border-top:1px solid #294438;color:#a8b9af;">
          Total hours used
          </td>
          <td align="right" style="padding:11px 0;border-top:1px solid #294438;color:#fff;">
          ${escapeEmailHtml_(usedAfter)} hours
          </td>
          </tr>

          <tr>
          <td style="padding:11px 0;border-top:1px solid #294438;color:#a8b9af;">
          Hours used today
          </td>
          <td align="right" style="padding:11px 0;border-top:1px solid #294438;color:#fff;">
          ${escapeEmailHtml_(usedTodayAfter)} hours
          </td>
          </tr>

          </table>

          </td>
          </tr>
          </table>

          </td>
          </tr>

          <!-- REMINDER -->
          <tr>
          <td style="padding:0 25px 28px;">

          <table width="100%" cellpadding="0" cellspacing="0"
          style="background:#21171d;border:1px solid #55303a;border-left:4px solid #f12b3b;border-radius:10px;">

          <tr>
          <td style="padding:18px;">

          <div style="font-size:14px;font-weight:bold;color:#fff;">
          &#9200; Game time is approaching!
          </div>

          <p style="margin:8px 0 0;font-size:12px;line-height:1.8;color:#c0aeb2;">
          Please arrive on time for your session. Keep your booking reference handy if you need assistance with your reservation.
          </p>

          </td>
          </tr>
          </table>

          </td>
          </tr>

          <!-- FOOTER -->
          <tr>
          <td align="center" style="padding:25px;background:#0d1016;border-top:1px solid #252b35;">

          <div style="font-size:20px;font-weight:900;letter-spacing:2px;color:#fff;">
          AXOM <span style="color:#f12b3b;">GAMING</span>
          </div>

          <div style="margin-top:8px;font-size:9px;letter-spacing:2px;font-weight:bold;color:#9aa4b2;">
          PLAY &nbsp; • &nbsp; COMPETE &nbsp; • &nbsp; REPEAT
          </div>

          <p style="margin:15px 0 0;font-size:10px;line-height:1.7;color:#778291;">
          This email confirms your membership booking.<br>
          Please retain it for your records.
          </p>

          </td>
          </tr>

          </table>

          <div style="padding:15px 10px 0;font-size:9px;color:#5f6875;text-align:center;">
          © AXOM GAMING · BOOKING CONFIRMATION
          </div>

          </td>
          </tr>
          </table>

          </body>
          </html>
          `;

          const plainBody =
            "Hi " + memberRow.Name + ",\\n\\n" +
            "Your AXOM GAMING membership booking is confirmed.\\n\\n" +
            "Booking ID: " + bookingId + "\\n" +
            "Date: " + emailDate + "\\n" +
            "Time: " + startTime + " to " + endTime + "\\n" +
            "Duration: " + durationLabel + "\\n" +
            "Console: " + consoleName + "\\n" +
            "Players: " + players + "\\n\\n" +
            "MEMBERSHIP BALANCE\\n" +
            "Hours deducted: " + requestedHours + "\\n" +
            "Total hours used: " + usedAfter + "\\n" +
            "Hours used today: " + usedTodayAfter + "\\n" +
            "Hours remaining: " + remainingAfter + "\\n" +
            "Membership expiry: " + emailExpiry + "\\n\\n" +
            "Play. Compete. Repeat.\\nAXOM GAMING";

          MailApp.sendEmail({
            to: String(memberRow.Email),
            subject: "Booking Confirmed | AXOM GAMING — " + bookingId,
            body: plainBody,
            htmlBody: htmlBody,
            name: "AXOM GAMING"
          });

        getSheet_("Membership_Bookings").getRange(
          getSheet_("Membership_Bookings").getLastRow(),
          18
        ).setValue("Sent");

      } catch (emailError) {
        emailStatus = "Failed: " + emailError.message;

        getSheet_("Membership_Bookings").getRange(
          getSheet_("Membership_Bookings").getLastRow(),
          18
        ).setValue(emailStatus);
      }

    return {
      success: true, bookingId, memberId, memberName: String(memberRow.Name),
      date, startTime, endTime, durationHours: requestedHours,
      hoursUsedBefore: hoursUsed, hoursUsedTodayAfter: usedTodayAfter,
      totalHoursUsedAfter: usedAfter, remainingHours: remainingAfter,
      emailStatus,
      message: emailStatus === "Sent" ? "Membership booking confirmed and email sent." :
        "Booking saved, but email failed: " + emailStatus
    };
  } finally {
    lock.releaseLock();
  }
}

function escapeEmailHtml_(value) {
  return String(value ?? "").replace(/[&<>"']/g, function (char) {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[char];
  });
}

/* =====================================================
   AXOM GAMING WEB PUSH NOTIFICATIONS (FCM HTTP v1)
   Additive feature: does not alter booking/session logic.
===================================================== */

const PUSH_CONFIG = {
  PROJECT_ID: "axom-gaming-26a40",
  APP_URL: "https://realhimanshujha.github.io/Axomgaming/",
  SUBSCRIPTIONS_SHEET: "Push_Subscriptions",
  REMINDERS_SHEET: "Push_Reminders",
  REMINDER_MINUTES_MIN: 3,
  REMINDER_MINUTES_MAX: 6
};

/** Run once manually to create sheets and install the minute trigger. */
function setupPushNotifications() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const definitions = {};
  definitions[PUSH_CONFIG.SUBSCRIPTIONS_SHEET] = [
    "Username", "FCMToken", "Platform", "CreatedAt", "UpdatedAt"
  ];
  definitions[PUSH_CONFIG.REMINDERS_SHEET] = [
    "SessionID", "SentAt", "SuccessfulDevices"
  ];

  Object.keys(definitions).forEach(name => {
    let sheet = ss.getSheetByName(name);
    if (!sheet) sheet = ss.insertSheet(name);
    if (sheet.getLastRow() === 0) {
      const headers = definitions[name];
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.setFrozenRows(1);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
    }
  });

  ScriptApp.getProjectTriggers().forEach(trigger => {
    if (trigger.getHandlerFunction() === "checkSessionEndingReminders_") {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  ScriptApp.newTrigger("checkSessionEndingReminders_")
    .timeBased().everyMinutes(1).create();

  return "Push notification sheets are ready and the one-minute reminder trigger is installed.";
}

function registerPushToken_(body) {
  requireAdmin_(body.token);
  const username = authenticate_(body.token);
  const fcmToken = String(body.fcmToken || "").trim();
  const platform = String(body.platform || "web").slice(0, 30);
  if (!fcmToken || fcmToken.length < 50) {
    throw new Error("Invalid push notification token.");
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sheet = getSheet_(PUSH_CONFIG.SUBSCRIPTIONS_SHEET);
    const values = sheet.getDataRange().getValues();
    const headers = values[0];
    const userCol = headers.indexOf("Username");
    const tokenCol = headers.indexOf("FCMToken");
    const platformCol = headers.indexOf("Platform");
    const createdCol = headers.indexOf("CreatedAt");
    const updatedCol = headers.indexOf("UpdatedAt");
    if ([userCol, tokenCol, platformCol, createdCol, updatedCol].some(i => i < 0)) {
      throw new Error("Push_Subscriptions sheet headers are invalid. Run setupPushNotifications().");
    }

    const now = new Date();
    let rowNumber = -1;
    for (let i = 1; i < values.length; i++) {
      if (String(values[i][tokenCol]) === fcmToken) {
        rowNumber = i + 1;
        break;
      }
    }

    if (rowNumber > 0) {
      sheet.getRange(rowNumber, userCol + 1).setValue(username);
      sheet.getRange(rowNumber, platformCol + 1).setValue(platform);
      sheet.getRange(rowNumber, updatedCol + 1).setValue(now);
    } else {
      sheet.appendRow([username, fcmToken, platform, now, now]);
    }
    return { success: true, message: "This device is registered for AXOM GAMING alerts." };
  } finally {
    lock.releaseLock();
  }
}

function unregisterPushToken_(body) {
  requireAdmin_(body.token);
  const username = authenticate_(body.token);
  const fcmToken = String(body.fcmToken || "").trim();
  if (!fcmToken) throw new Error("Push token is required.");

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sheet = getSheet_(PUSH_CONFIG.SUBSCRIPTIONS_SHEET);
    const values = sheet.getDataRange().getValues();
    if (values.length < 2) return { success: true };
    const headers = values[0];
    const userCol = headers.indexOf("Username");
    const tokenCol = headers.indexOf("FCMToken");
    for (let i = values.length - 1; i >= 1; i--) {
      if (String(values[i][tokenCol]) === fcmToken && String(values[i][userCol]) === username) {
        sheet.deleteRow(i + 1);
      }
    }
    return { success: true, message: "This device has been unsubscribed." };
  } finally {
    lock.releaseLock();
  }
}

function checkSessionEndingReminders_() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) return;
  try {
    const sessionsSheet = getSheet_("Live_Sessions");
    const rows = sessionsSheet.getDataRange().getValues();
    if (rows.length < 2) return;
    const headers = rows[0];
    const col = {};
    headers.forEach((h, i) => col[h] = i);
    ["SessionID", "CustomerName", "Console", "Date", "ScheduledEndTime", "Status"].forEach(h => {
      if (col[h] === undefined) throw new Error("Live_Sessions is missing column: " + h);
    });

    const reminderSheet = getSheet_(PUSH_CONFIG.REMINDERS_SHEET);
    const reminderValues = reminderSheet.getDataRange().getValues();
    const sentIds = new Set(reminderValues.slice(1).map(r => String(r[0])));
    const subscriptions = getPushSubscriptions_();
    if (!subscriptions.length) return;

    const now = new Date();
    let accessToken;
    rows.slice(1).forEach(row => {
      const sessionId = String(row[col.SessionID] || "");
      if (!sessionId || sentIds.has(sessionId) || String(row[col.Status]) !== "Active") return;

      const dateValue = row[col.Date];
      const dateText = dateValue instanceof Date
        ? Utilities.formatDate(dateValue, CONFIG.TIMEZONE, "yyyy-MM-dd")
        : String(dateValue).trim();
      const timeText = formatSessionTime_(row[col.ScheduledEndTime]);
      const endAt = Utilities.parseDate(dateText + " " + timeText, CONFIG.TIMEZONE, "yyyy-MM-dd HH:mm");
      const minutesRemaining = (endAt.getTime() - now.getTime()) / 60000;
      if (minutesRemaining < PUSH_CONFIG.REMINDER_MINUTES_MIN || minutesRemaining > PUSH_CONFIG.REMINDER_MINUTES_MAX) return;

      const customer = String(row[col.CustomerName] || "Customer");
      const consoleName = String(row[col.Console] || "console");
      const title = "AXOM GAMING";
      const body = "5 minutes remaining! " + customer + "'s session on " + consoleName + " will end soon.";
      let successCount = 0;
      let attempted = 0;

      subscriptions.forEach(sub => {
        attempted++;
        try {
          if (!accessToken) accessToken = getFcmAccessToken_();
          const response = sendFcmWebPush_(accessToken, sub.fcmToken, title, body, sessionId);
          const code = response.getResponseCode();
          if (code >= 200 && code < 300) {
            successCount++;
          } else {
            const responseText = response.getContentText();
            if (/UNREGISTERED|registration-token-not-registered|INVALID_ARGUMENT/i.test(responseText)) {
              deletePushToken_(sub.fcmToken);
            } else {
              console.error("FCM send failed (" + code + "): " + responseText);
            }
          }
        } catch (err) {
          console.error("Push send failed: " + err.message);
        }
      });

      // Mark only after at least one device accepted the message; this avoids losing
      // the alert if FCM is temporarily unavailable or no devices are registered.
      if (successCount > 0) {
        reminderSheet.appendRow([sessionId, new Date(), successCount + "/" + attempted]);
        sentIds.add(sessionId);
      }
    });
  } finally {
    lock.releaseLock();
  }
}

function getPushSubscriptions_() {
  const sheet = getSheet_(PUSH_CONFIG.SUBSCRIPTIONS_SHEET);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values[0];
  const userCol = headers.indexOf("Username");
  const tokenCol = headers.indexOf("FCMToken");
  if (userCol < 0 || tokenCol < 0) throw new Error("Push_Subscriptions headers are invalid.");
  return values.slice(1).filter(r => r[tokenCol]).map(r => ({
    username: String(r[userCol]),
    fcmToken: String(r[tokenCol])
  }));
}

function deletePushToken_(fcmToken) {
  const sheet = getSheet_(PUSH_CONFIG.SUBSCRIPTIONS_SHEET);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return;
  const tokenCol = values[0].indexOf("FCMToken");
  for (let i = values.length - 1; i >= 1; i--) {
    if (String(values[i][tokenCol]) === String(fcmToken)) sheet.deleteRow(i + 1);
  }
}

function getFcmAccessToken_() {
  const cache = CacheService.getScriptCache();
  const cached = cache.get("fcm_access_token");
  if (cached) return cached;

  const raw = PropertiesService.getScriptProperties().getProperty("FCM_SERVICE_ACCOUNT_JSON");
  if (!raw) throw new Error("Missing FCM_SERVICE_ACCOUNT_JSON in Script Properties.");
  const serviceAccount = JSON.parse(raw);
  if (!serviceAccount.client_email || !serviceAccount.private_key) {
    throw new Error("FCM service account JSON is incomplete.");
  }

  const now = Math.floor(Date.now() / 1000);
  const header = base64UrlEncode_(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = base64UrlEncode_(JSON.stringify({
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600
  }));
  const unsignedJwt = header + "." + claim;
  const signature = Utilities.computeRsaSha256Signature(unsignedJwt, serviceAccount.private_key);
  const jwt = unsignedJwt + "." + Utilities.base64EncodeWebSafe(signature).replace(/=+$/, "");

  const response = UrlFetchApp.fetch("https://oauth2.googleapis.com/token", {
    method: "post",
    contentType: "application/x-www-form-urlencoded",
    payload: { grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt },
    muteHttpExceptions: true
  });
  const code = response.getResponseCode();
  const data = JSON.parse(response.getContentText() || "{}");
  if (code < 200 || code >= 300 || !data.access_token) {
    throw new Error("Could not obtain FCM access token: " + response.getContentText());
  }
  cache.put("fcm_access_token", data.access_token, Math.min(3300, Number(data.expires_in || 3600) - 60));
  return data.access_token;
}

function base64UrlEncode_(value) {
  return Utilities.base64EncodeWebSafe(value, Utilities.Charset.UTF_8).replace(/=+$/, "");
}

function sendFcmWebPush_(accessToken, fcmToken, title, body, sessionId) {
  const payload = {
    message: {
      token: fcmToken,
      notification: { title: title, body: body },
      webpush: {
        headers: { Urgency: "high", TTL: "300" },
        fcm_options: { link: PUSH_CONFIG.APP_URL },
        notification: {
          icon: PUSH_CONFIG.APP_URL + "icon-192.png",
          badge: PUSH_CONFIG.APP_URL + "icon-192.png",
          tag: "axom-session-ending-" + String(sessionId),
          renotify: false
        }
      }
    }
  };
  return UrlFetchApp.fetch(
    "https://fcm.googleapis.com/v1/projects/" + PUSH_CONFIG.PROJECT_ID + "/messages:send",
    {
      method: "post",
      contentType: "application/json",
      headers: { Authorization: "Bearer " + accessToken },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    }
  );
}

/* =========================================
   AXOM GAMING DUES MANAGEMENT
========================================= */

function ensureDuesSheet_(name, headers) {

  const ss = SpreadsheetApp.getActiveSpreadsheet();

  let sh = ss.getSheetByName(name);

  if (!sh) {
    sh = ss.insertSheet(name);
  }

  if (sh.getLastRow() === 0) {

    sh.appendRow(headers);

    sh.setFrozenRows(1);

  } else {

    const current = sh
      .getRange(1, 1, 1, sh.getLastColumn())
      .getValues()[0]
      .map(String);

    const missing = headers.filter(
      h => !current.includes(h)
    );

    if (missing.length) {

      throw new Error(
        name + " is missing columns: " +
        missing.join(", ") +
        ". Add these headers manually at the end."
      );

    }

  }

  return sh;

}


function duesHeaders_(sheet) {

  return sheet
    .getRange(1, 1, 1, sheet.getLastColumn())
    .getValues()[0]
    .map(v => String(v).trim());

}


function duesCol_(headers, name) {

  const i = headers.indexOf(name);

  if (i < 0) {
    throw new Error("Missing column: " + name);
  }

  return i + 1;

}


function duesDate_(v) {

  if (v instanceof Date) {

    return Utilities.formatDate(
      v,
      CONFIG.TIMEZONE,
      "yyyy-MM-dd"
    );

  }

  return String(v || "").slice(0, 10);

}


function duesMoney_(v) {

  return Math.round((Number(v) || 0) * 100) / 100;

}


/* =========================================
   GET DUES DATA
========================================= */

function getDuesData_(body) {

  authenticate_(body.token);

  const sales = getSheet_("Gaming_Sales");

  const sv = sales.getDataRange().getValues();

  const sh = sv.length ? sv[0].map(String) : [];

  const ix = {};

  sh.forEach((h, i) => ix[h] = i);

  [
    "BookingID",
    "CustomerName",
    "Phone",
    "DueAmount"
  ].forEach(h => {

    if (ix[h] === undefined) {
      throw new Error("Gaming_Sales missing " + h);
    }

  });

  const gaming = [];

  for (let r = 1; r < sv.length; r++) {

    const row = sv[r];

    const due = duesMoney_(row[ix.DueAmount]);

    if (due > 0) {

      gaming.push({

        bookingId: String(row[ix.BookingID] || ""),

        customerName: String(row[ix.CustomerName] || ""),

        phone: String(row[ix.Phone] || ""),

        date: ix.Date === undefined
          ? ""
          : duesDate_(row[ix.Date]),

        finalBill: duesMoney_(
          ix.FinalBill === undefined
            ? row[ix.GrandTotal]
            : row[ix.FinalBill]
        ),

        dueAmount: due

      });

    }

  }


  // MANUAL DUES SHEET

  const manualSheet = ensureDuesSheet_(
    "Manual_Dues",
    [
      "ManualDueID",
      "CreatedAt",
      "DueDate",
      "CustomerName",
      "Phone",
      "Description",
      "TotalAmount",
      "PaidAmount",
      "DueAmount",
      "Status",
      "Notes"
    ]
  );


  const manual = getRecords_("Manual_Dues")

    .filter(x => duesMoney_(x.DueAmount) > 0)

    .map(x => ({

      manualDueId: String(x.ManualDueID),

      customerName: String(x.CustomerName || ""),

      phone: String(x.Phone || ""),

      description: String(x.Description || ""),

      dueDate: duesDate_(x.DueDate),

      totalAmount: duesMoney_(x.TotalAmount),

      paidAmount: duesMoney_(x.PaidAmount),

      dueAmount: duesMoney_(x.DueAmount)

    }))

    .reverse();


  // PAYMENT SHEETS

  const paySheet = ensureDuesSheet_(
    "Manual_Due_Payments",
    [
      "PaymentID",
      "ManualDueID",
      "CustomerName",
      "Phone",
      "PaymentDate",
      "Amount",
      "PaymentMethod",
      "CreatedAt"
    ]
  );


  const oldPaySheet = ensureDuesSheet_(
    "Due_Payments",
    [
      "PaymentID",
      "BookingID",
      "SessionID",
      "CustomerName",
      "Phone",
      "PaymentDate",
      "Amount",
      "PaymentMethod",
      "CreatedAt"
    ]
  );


  // PAYMENT HISTORY

  const history = [];

  function addHistory(sh, type, refCol) {

    const a = sh.getDataRange().getValues();

    if (a.length < 2) return;

    const h = a[0].map(String);

    const p = {};

    h.forEach((v, i) => p[v] = i);

    for (let i = 1; i < a.length; i++) {

      const row = a[i];

      history.push({

        paymentDate: duesDate_(
          row[p.PaymentDate] || row[p.CreatedAt]
        ),

        customerName: String(
          row[p.CustomerName] || ""
        ),

        type: type,

        reference: String(
          row[p[refCol]] || ""
        ),

        paymentMethod: String(
          row[p.PaymentMethod] || ""
        ),

        amount: duesMoney_(row[p.Amount])

      });

    }

  }


  addHistory(
    oldPaySheet,
    "Gaming",
    "BookingID"
  );

  addHistory(
    paySheet,
    "Manual",
    "ManualDueID"
  );


  history.sort((a, b) =>
    String(b.paymentDate).localeCompare(
      String(a.paymentDate)
    )
  );


  const currentUser = getSessionUser_(body.token);
  return {
    success: true,
    gaming: gaming,
    manual: manual,
    history: history,
    role: currentUser.role,
    maxManualDue: currentUser.role === "Staff" ? getStaffManualDueLimit_() : null
  };
}


/* =========================================
   STAFF DUE LIMIT
========================================= */

function getStaffManualDueLimit_() {
  const DEFAULT_LIMIT = 500;
  const settings = getRecords_(CONFIG.SHEETS.SETTINGS);
  const setting = settings.find(row =>
    String(row.Setting || "").trim() === "STAFF_MAX_MANUAL_DUE"
  );
  const value = setting ? Number(setting.Value) : DEFAULT_LIMIT;
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_LIMIT;
}

function ensureDuesAuditColumn_(sheet, headerName) {
  const headers = duesHeaders_(sheet);
  let index = headers.indexOf(headerName);
  if (index === -1) {
    index = headers.length;
    sheet.getRange(1, index + 1).setValue(headerName);
  }
  return index + 1;
}

/* =========================================
   ADD MANUAL DUE
========================================= */

function addManualDue_(body) {
  const user = getSessionUser_(body.token);

  const name = String(
    body.customerName || ""
  ).trim();

  const phone = String(
    body.phone || ""
  ).trim();

  const description = String(
    body.description || ""
  ).trim();

  const notes = String(
    body.notes || ""
  ).trim();

  const amount = duesMoney_(body.amount);

  const dateText = String(
    body.dueDate || ""
  );


  if (!name) {
    throw new Error("Customer name is required.");
  }

  if (phone && !/^\d{10}$/.test(phone)) {
    throw new Error("Phone must be a 10-digit number.");
  }

  if (!description) {
    throw new Error("Enter what the due is for.");
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Enter a valid due amount.");
  }

  const staffDueLimit = getStaffManualDueLimit_();
  if (user.role === "Staff" && amount > staffDueLimit) {
    throw new Error(
      "Staff due limit is ₹" + staffDueLimit + ". Ask the owner to approve a higher amount."
    );
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateText)) {
    throw new Error("Select a valid due date.");
  }


  const lock = LockService.getScriptLock();

  lock.waitLock(20000);

  try {

    const sh = ensureDuesSheet_(
      "Manual_Dues",
      [
        "ManualDueID",
        "CreatedAt",
        "DueDate",
        "CustomerName",
        "Phone",
        "Description",
        "TotalAmount",
        "PaidAmount",
        "DueAmount",
        "Status",
        "Notes"
      ]
    );


    const createdByColumn = ensureDuesAuditColumn_(sh, "CreatedBy");
    const headers = duesHeaders_(sh);
    const id = "MD-" +
      Utilities.getUuid()
        .slice(0, 10)
        .toUpperCase();

    const date = Utilities.parseDate(
      dateText,
      CONFIG.TIMEZONE,
      "yyyy-MM-dd"
    );


    const dueRecord = {
      ManualDueID: id,
      CreatedAt: new Date(),
      DueDate: date,
      CustomerName: name,
      Phone: phone,
      Description: description,
      TotalAmount: amount,
      PaidAmount: 0,
      DueAmount: amount,
      Status: "Due",
      Notes: notes,
      CreatedBy: user.username
    };
    sh.appendRow(headers.map(header =>
      dueRecord[header] !== undefined ? dueRecord[header] : ""
    ));


    SpreadsheetApp.flush();


    return {

      success: true,

      manualDueId: id,

      message: "Manual due added."

    };

  } finally {

    lock.releaseLock();

  }

}


/* =========================================
   COLLECT DUE PAYMENT
========================================= */

function collectDuePayment_(body) {

  authenticate_(body.token);

  const type = String(
    body.type || ""
  ).toLowerCase();

  const id = String(
    body.id || ""
  ).trim();

  const amount = duesMoney_(body.amount);

  const method = String(
    body.paymentMethod || ""
  ).trim();


  if (!id) {
    throw new Error("Due reference is missing.");
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Enter a valid payment amount.");
  }

  if (!["Cash", "UPI", "Other"].includes(method)) {
    throw new Error("Choose Cash, UPI or Other.");
  }


  const lock = LockService.getScriptLock();

  lock.waitLock(20000);

  try {

    const now = new Date();


    /* MANUAL DUE PAYMENT */

    if (type === "manual") {

      const sh = getSheet_("Manual_Dues");

      const values = sh.getDataRange().getValues();

      const h = values[0].map(String);

      const c = {};

      h.forEach((v, i) => c[v] = i);


      const rowIndex = values.findIndex(
        (r, i) =>
          i > 0 &&
          String(r[c.ManualDueID]) === id
      );


      if (rowIndex < 1) {
        throw new Error("Manual due not found.");
      }


      const row = values[rowIndex];

      const due = duesMoney_(
        row[c.DueAmount]
      );


      if (due <= 0) {
        throw new Error("This due is already paid.");
      }

      if (amount > due) {
        throw new Error(
          "Payment cannot exceed outstanding balance of ₹" + due + "."
        );
      }


      const remaining = duesMoney_(
        due - amount
      );

      const paid = duesMoney_(
        Number(row[c.PaidAmount] || 0) + amount
      );


      const pay = ensureDuesSheet_(
        "Manual_Due_Payments",
        [
          "PaymentID",
          "ManualDueID",
          "CustomerName",
          "Phone",
          "PaymentDate",
          "Amount",
          "PaymentMethod",
          "CreatedAt"
        ]
      );
      const collectedByColumn = ensureDuesAuditColumn_(pay, "CollectedBy");
      const payHeaders = duesHeaders_(pay);

      const paymentRecord = {

        PaymentID: "MDP-" + Utilities.getUuid().slice(0, 10).toUpperCase(),
        ManualDueID: id,
        CustomerName: String(row[c.CustomerName]),
        Phone: String(row[c.Phone] || ""),
        PaymentDate: now,
        Amount: amount,
        PaymentMethod: method,
        CreatedAt: now,
        CollectedBy: getSessionUser_(body.token).username
      };
      pay.appendRow(payHeaders.map(header =>
        paymentRecord[header] !== undefined ? paymentRecord[header] : ""
      ));


      sh.getRange(
        rowIndex + 1,
        duesCol_(h, "PaidAmount")
      ).setValue(paid);


      sh.getRange(
        rowIndex + 1,
        duesCol_(h, "DueAmount")
      ).setValue(remaining);


      sh.getRange(
        rowIndex + 1,
        duesCol_(h, "Status")
      ).setValue(
        remaining === 0 ? "Paid" : "Due"
      );


      SpreadsheetApp.flush();


      return {

        success: true,

        remaining: remaining,

        message: remaining === 0
          ? "Manual due fully paid."
          : "Partial payment recorded. Remaining due: ₹" + remaining

      };

    }


    /* GAMING DUE PAYMENT */

    if (type === "gaming") {

      const sh = getSheet_("Gaming_Sales");

      const values = sh.getDataRange().getValues();

      const h = values[0].map(String);

      const c = {};

      h.forEach((v, i) => c[v] = i);


      [
        "BookingID",
        "DueAmount",
        "CustomerName",
        "Phone"
      ].forEach(k => {

        if (c[k] === undefined) {
          throw new Error("Gaming_Sales missing " + k);
        }

      });


      const rowIndex = values.findIndex(
        (r, i) =>
          i > 0 &&
          String(r[c.BookingID]) === id
      );


      if (rowIndex < 1) {
        throw new Error("Gaming sale not found.");
      }


      const row = values[rowIndex];

      const due = duesMoney_(
        row[c.DueAmount]
      );


      if (due <= 0) {
        throw new Error("This gaming due is already paid.");
      }

      if (amount > due) {
        throw new Error(
          "Payment cannot exceed outstanding balance of ₹" + due + "."
        );
      }


      const remaining = duesMoney_(
        due - amount
      );


      const paidCol = method === "Cash"
        ? "CashPaid"
        : method === "UPI"
          ? "UPIPaid"
          : "OtherPaid";


      if (c[paidCol] === undefined) {
        throw new Error(
          "Gaming_Sales missing " + paidCol +
          " column. Run upgradePaymentSheets()."
        );
      }


      const ledger = ensureDuesSheet_(
        "Due_Payments",
        [
          "PaymentID",
          "BookingID",
          "SessionID",
          "CustomerName",
          "Phone",
          "PaymentDate",
          "Amount",
          "PaymentMethod",
          "CreatedAt"
        ]
      );


      ensureDuesAuditColumn_(ledger, "CollectedBy");
      const ledgerHeaders = duesHeaders_(ledger);
      const gamingPaymentRecord = {
        PaymentID: "DYP-" + Utilities.getUuid().slice(0, 10).toUpperCase(),
        BookingID: id,
        SessionID: "",
        CustomerName: String(row[c.CustomerName]),
        Phone: String(row[c.Phone] || ""),
        PaymentDate: now,
        Amount: amount,
        PaymentMethod: method,
        CreatedAt: now,
        CollectedBy: getSessionUser_(body.token).username
      };
      ledger.appendRow(ledgerHeaders.map(header =>
        gamingPaymentRecord[header] !== undefined ? gamingPaymentRecord[header] : ""
      ));


      sh.getRange(
        rowIndex + 1,
        c.DueAmount + 1
      ).setValue(remaining);


      sh.getRange(
        rowIndex + 1,
        c[paidCol] + 1
      ).setValue(
        duesMoney_(
          Number(row[c[paidCol]] || 0) + amount
        )
      );


      if (c.PaymentStatus !== undefined) {

        sh.getRange(
          rowIndex + 1,
          c.PaymentStatus + 1
        ).setValue(
          remaining === 0 ? "Paid" : "Due"
        );

      }


      SpreadsheetApp.flush();


      return {

        success: true,

        remaining: remaining,

        message: remaining === 0
          ? "Gaming due fully paid."
          : "Partial payment recorded. Remaining due: ₹" + remaining

      };

    }


    throw new Error("Unknown due type.");

  } finally {

    lock.releaseLock();

  }

}

// ========================================
// AXOM GAMING - MONTHLY REPORT BACKEND
// ========================================

function reportDateKey_(value) {
  if (value instanceof Date) {
    return Utilities.formatDate(
      value,
      CONFIG.TIMEZONE,
      "yyyy-MM-dd"
    );
  }

  const s = String(value || "").trim();

  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    return s.slice(0, 10);
  }

  const d = new Date(s);

  return isNaN(d)
    ? ""
    : Utilities.formatDate(d, CONFIG.TIMEZONE, "yyyy-MM-dd");
}

function reportMonthKey_(value) {
  return reportDateKey_(value).slice(0, 7);
}


function getMonthlyReport_(body) {
  requireAdmin_(body.token);

  authenticate_(body.token);

  const month = String(body.month || "");

  if (!/^\d{4}-\d{2}$/.test(month)) {
    throw new Error("Select a valid report month.");
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const sales = getRecords_("Gaming_Sales");
  const snackRows = getRecords_("Snack_Sales");

  let gamingSales = 0;
  let grossGamingSales = 0;
  let totalDiscount = 0;
  let snackSales = 0;
  let sessionCount = 0;
  let snackQty = 0;

  let cashCollected = 0;
  let upiCollected = 0;
  let otherCollected = 0;

  const dailyMap = {};

  // ========================================
  // GAMING SALES
  // ========================================

  sales.forEach(r => {

    const date = reportDateKey_(r.Date);

    if (!date || date.slice(0, 7) !== month) return;

    // Original gaming amount
    const grossGaming = Number(r.GamingAmount) || 0;

    // Discount applied to the bill
    const discount = Number(r.Discount) || 0;

    // Net gaming revenue after discount
    const gaming = Math.max(0, grossGaming - discount);

    // Monthly totals
    grossGamingSales += grossGaming;
    totalDiscount += discount;
    gamingSales += gaming;

    sessionCount++;

    const day = dailyMap[date] || (dailyMap[date] = {
      date: date,
      gamingSales: 0,
      snackSales: 0,
      totalSales: 0,
      sessions: 0
    });

    day.gamingSales += gaming;
    day.sessions++;

    cashCollected += Number(r.CashPaid) || 0;
    upiCollected += Number(r.UPIPaid) || 0;
    otherCollected += Number(r.OtherPaid) || 0;

  });


  // ========================================
  // SNACK SALES
  // ========================================

  snackRows.forEach(r => {

    const date = reportDateKey_(r.Date);

    if (!date || date.slice(0, 7) !== month) return;

    const amount = Number(r.TotalAmount) || 0;
    const quantity = Number(r.Quantity) || 0;

    snackSales += amount;
    snackQty += quantity;

    const day = dailyMap[date] || (dailyMap[date] = {
      date: date,
      gamingSales: 0,
      snackSales: 0,
      totalSales: 0,
      sessions: 0
    });

    day.snackSales += amount;

  });


  // ========================================
  // DAILY TOTALS
  // ========================================

  Object.keys(dailyMap).forEach(date => {

    const day = dailyMap[date];

    day.totalSales =
      day.gamingSales + day.snackSales;

  });


  // ========================================
  // GAMING DUES
  // ========================================

  const gamingDues = sales.reduce((sum, r) => {

    return sum + Math.max(
      0,
      Number(r.DueAmount) || 0
    );

  }, 0);


  // ========================================
  // MANUAL DUES
  // ========================================

  let manualDues = 0;

  const manualSheet = ss.getSheetByName("Manual_Dues");

  if (manualSheet && manualSheet.getLastRow() > 1) {

    manualDues = getRecords_("Manual_Dues").reduce((sum, r) => {

      return sum + Math.max(
        0,
        Number(r.DueAmount) || 0
      );

    }, 0);

  }


// ========================================
// DUE COLLECTIONS
// Do not add these payments again to Cash/UPI.
// Gaming_Sales already contains updated payment totals.
// ========================================

let dueCollections = 0;

[
  "Due_Payments",
  "Manual_Due_Payments"
].forEach(sheetName => {

  const sheet = ss.getSheetByName(sheetName);

  if (!sheet || sheet.getLastRow() < 2) return;

  getRecords_(sheetName).forEach(r => {

    const paymentDate = reportMonthKey_(
      r.PaymentDate || r.CreatedAt
    );

    if (paymentDate !== month) return;

    dueCollections += Number(r.Amount) || 0;

  });

});


  // ========================================
  // MONTH LABEL
  // ========================================

  const monthLabel = Utilities.formatDate(
    new Date(
      Number(month.slice(0, 4)),
      Number(month.slice(5, 7)) - 1,
      1
    ),
    CONFIG.TIMEZONE,
    "MMMM yyyy"
  );


  // ========================================
  // FINAL REPORT
  // ========================================

  return {

    success: true,

    month: month,
    monthLabel: monthLabel,

    gamingSales: Math.round(gamingSales * 100) / 100,

    snackSales: Math.round(snackSales * 100) / 100,

    totalSales: Math.round(
      (gamingSales + snackSales) * 100
    ) / 100,

    grossGamingSales: Math.round(grossGamingSales * 100) / 100,

    totalDiscount: Math.round(totalDiscount * 100) / 100,

    cashCollected: Math.round(cashCollected * 100) / 100,

    upiCollected: Math.round(upiCollected * 100) / 100,

    otherCollected: Math.round(otherCollected * 100) / 100,

    dueCollections: Math.round(dueCollections * 100) / 100,

    gamingDues: Math.round(gamingDues * 100) / 100,

    manualDues: Math.round(manualDues * 100) / 100,

    totalDues: Math.round(
      (gamingDues + manualDues) * 100
    ) / 100,

    sessionCount: sessionCount,

    snackQty: snackQty,

    daily: Object.keys(dailyMap)
      .sort()
      .map(date => dailyMap[date])

  };

}


/* =====================================
   ADMIN PASSWORD RESET
===================================== */

function requestAdminPasswordReset_(body) {
  const email = String(body.email || "").trim().toLowerCase();

  // Always return a generic response.
  const genericMessage =
    "If the registered recovery email is correct, a verification code has been sent.";

  if (email !== ADMIN_RESET_EMAIL.toLowerCase()) {
    return { success: true, message: genericMessage };
  }

  const props = PropertiesService.getScriptProperties();
  const lock = LockService.getScriptLock();

  lock.waitLock(10000);

  try {
    const now = Date.now();

    const lastSent = Number(
      props.getProperty("ADMIN_RESET_LAST_SENT") || 0
    );

    if (now - lastSent < 60000) {
      throw new Error("Please wait 60 seconds before requesting another code.");
    }

    const today = Utilities.formatDate(
      new Date(),
      CONFIG.TIMEZONE,
      "yyyy-MM-dd"
    );

    let count = Number(
      props.getProperty("ADMIN_RESET_DAILY_COUNT") || 0
    );

    const countDate = props.getProperty("ADMIN_RESET_COUNT_DATE");

    if (countDate !== today) {
      count = 0;
    }

    if (count >= 5) {
      throw new Error("Password reset limit reached. Try again tomorrow.");
    }

    const adminSheet = getSheet_(CONFIG.SHEETS.ADMIN);
    const admins = adminSheet.getDataRange().getValues();

    const activeAdminExists = admins.slice(1).some(row => row[3] === true);

    if (!activeAdminExists) {
      throw new Error("No active admin account found.");
    }

    const otp = String(
      Math.floor(100000 + Math.random() * 900000)
    );

    const salt = Utilities.getUuid();

    props.setProperties({
      ADMIN_RESET_OTP_HASH: hashPassword_(otp, salt),
      ADMIN_RESET_OTP_SALT: salt,
      ADMIN_RESET_EXPIRES: String(now + 10 * 60 * 1000),
      ADMIN_RESET_ATTEMPTS: "0",
      ADMIN_RESET_LAST_SENT: String(now),
      ADMIN_RESET_COUNT_DATE: today,
      ADMIN_RESET_DAILY_COUNT: String(count + 1)
    });

    MailApp.sendEmail({
      to: ADMIN_RESET_EMAIL,
      subject: "AXOM GAMING - Password Reset Code",
      body:
        "Hello Admin,\n\n" +
        "Your AXOM GAMING password reset verification code is:\n\n" +
        otp + "\n\n" +
        "This code expires in 10 minutes.\n" +
        "You have a maximum of 5 verification attempts.\n\n" +
        "If you did not request this reset, ignore this email.\n\n" +
        "AXOM GAMING Security Team"
    });

    return {
      success: true,
      message: genericMessage
    };

  } finally {
    lock.releaseLock();
  }
}


function completeAdminPasswordReset_(body) {
  const otp = String(body.otp || "").trim();
  const newPassword = String(body.newPassword || "");

  if (!/^\d{6}$/.test(otp)) {
    throw new Error("Enter the valid 6-digit verification code.");
  }

  if (newPassword.length < 12) {
    throw new Error("New password must contain at least 12 characters.");
  }

  const props = PropertiesService.getScriptProperties();
  const lock = LockService.getScriptLock();

  lock.waitLock(10000);

  try {
    const storedHash = props.getProperty("ADMIN_RESET_OTP_HASH");
    const salt = props.getProperty("ADMIN_RESET_OTP_SALT");
    const expires = Number(
      props.getProperty("ADMIN_RESET_EXPIRES") || 0
    );

    let attempts = Number(
      props.getProperty("ADMIN_RESET_ATTEMPTS") || 0
    );

    if (!storedHash || !salt) {
      throw new Error("Request a new verification code.");
    }

    if (Date.now() > expires) {
      clearAdminReset_();
      throw new Error("Verification code expired. Request a new one.");
    }

    if (attempts >= 5) {
      clearAdminReset_();
      throw new Error("Too many incorrect attempts. Request a new code.");
    }

    const submittedHash = hashPassword_(otp, salt);

    if (submittedHash !== storedHash) {
      attempts++;

      props.setProperty(
        "ADMIN_RESET_ATTEMPTS",
        String(attempts)
      );

      if (attempts >= 5) {
        clearAdminReset_();
        throw new Error("Too many incorrect attempts. Request a new code.");
      }

      throw new Error(
        "Incorrect verification code. Attempts remaining: " +
        (5 - attempts)
      );
    }

    const sheet = getSheet_(CONFIG.SHEETS.ADMIN);
    const admins = sheet.getDataRange().getValues();

    let adminRow = -1;
    let adminUsername = "AXOM GAMING Admin";

    for (let i = 1; i < admins.length; i++) {
      if (
        admins[i][3] === true &&
        String(admins[i][4] || "Admin").toLowerCase() === "admin"
      ) {
        adminRow = i + 1;
        adminUsername = String(admins[i][0] || adminUsername);
        break;
      }
    }

    if (adminRow === -1) {
      throw new Error("No active admin account found.");
    }

    const newSalt = Utilities.getUuid() + Utilities.getUuid();
    const newHash = hashPassword_(newPassword, newSalt);

    // Update the stored password hash and salt.
    // The plain-text password is never stored in the spreadsheet.
    sheet.getRange(adminRow, 2).setValue(newHash);
    sheet.getRange(adminRow, 3).setValue(newSalt);

    // OTP must be consumed whether or not the email succeeds.
    clearAdminReset_();

    // Email the newly chosen password to the registered recovery address.
    // WARNING: this sends the password in plain text over email.
    let emailSent = false;
    let emailErrorMessage = "";

    try {
      MailApp.sendEmail({
        to: ADMIN_RESET_EMAIL,
        subject: "AXOM GAMING - Your Admin Password Was Reset",
        name: "AXOM GAMING",
        body:
          "Hello " + adminUsername + ",\n\n" +
          "Your AXOM GAMING admin password has been changed successfully.\n\n" +
          "Your new password is:\n" +
          newPassword + "\n\n" +
          "For security, sign in and change this password if you did not personally request the reset.\n\n" +
          "Reset time: " +
          Utilities.formatDate(new Date(), CONFIG.TIMEZONE, "dd MMM yyyy, hh:mm a") +
          "\n\nAXOM GAMING Security Team",
        htmlBody:
          '<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px;color:#202124">' +
            '<h2 style="color:#d71920">AXOM GAMING</h2>' +
            '<h3>Admin password changed</h3>' +
            '<p>Hello ' + adminUsername.replace(/[&<>"']/g, c => ({
              "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
            }[c])) + ',</p>' +
            '<p>Your admin password has been changed successfully.</p>' +
            '<p>Your new password is:</p>' +
            '<div style="padding:16px;background:#f1f1f1;border-radius:8px;font-size:18px;font-weight:bold;word-break:break-all">' +
              newPassword.replace(/[&<>"']/g, c => ({
                "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
              }[c])) +
            '</div>' +
            '<p><strong>Security notice:</strong> This email contains your password. Delete it after noting the password. If you did not request this reset, secure your Google account and reset the admin password again.</p>' +
            '<p>Reset time: ' +
              Utilities.formatDate(new Date(), CONFIG.TIMEZONE, "dd MMM yyyy, hh:mm a") +
            '</p>' +
            '<p>AXOM GAMING Security Team</p>' +
          '</div>'
      });

      emailSent = true;
    } catch (emailError) {
      emailErrorMessage = emailError.message || "Email could not be sent.";
      console.error("Password reset email failed: " + emailErrorMessage);
    }

    return {
      success: true,
      emailSent: emailSent,
      message: emailSent
        ? "Admin password changed successfully. Your new password has been emailed to " + ADMIN_RESET_EMAIL + "."
        : "Your admin password was changed, but the email could not be sent. Check Apps Script email authorization and quota, then contact the administrator."
    };

  } finally {
    lock.releaseLock();
  }
}


function clearAdminReset_() {
  const props = PropertiesService.getScriptProperties();

  [
    "ADMIN_RESET_OTP_HASH",
    "ADMIN_RESET_OTP_SALT",
    "ADMIN_RESET_EXPIRES",
    "ADMIN_RESET_ATTEMPTS",
    "ADMIN_RESET_LAST_SENT"
  ].forEach(key => props.deleteProperty(key));
}


/* Run this function manually once to authorize email sending. */
function authorizePasswordResetEmail() {
  const quota = MailApp.getRemainingDailyQuota();
  Logger.log("Email sending authorized. Remaining quota: " + quota);
}


function adjustLiveSessionDuration_(body) {
  authenticate_(body.token);

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);

  try {
    const sessionId = String(body.sessionId || "").trim();
    const newDuration = Number(body.durationMinutes);

    if (
      !Number.isInteger(newDuration) ||
      newDuration < 15 ||
      newDuration % 15 !== 0
    ) {
      throw new Error("Enter a duration in 15-minute intervals.");
    }

    const session = getLiveSessionById_(sessionId).record;

    if (session.Status !== "Active") {
      throw new Error("This session is not active.");
    }

    const sessionDate = session.Date instanceof Date
      ? Utilities.formatDate(session.Date, CONFIG.TIMEZONE, "yyyy-MM-dd")
      : String(session.Date).trim();

    const startTime = formatSessionTime_(session.StartTime);

    const startDateTime = Utilities.parseDate(
      sessionDate + " " + startTime,
      CONFIG.TIMEZONE,
      "yyyy-MM-dd HH:mm"
    );

    const elapsedMinutes = Math.max(
      0,
      (Date.now() - startDateTime.getTime()) / 60000
    );

    const minimumDuration = Math.max(
      15,
      Math.ceil(elapsedMinutes / 15) * 15
    );

    if (newDuration < minimumDuration) {
      throw new Error(
        "The customer has already played for approximately " +
        Math.ceil(elapsedMinutes) +
        " minutes. Minimum allowed total duration is " +
        minimumDuration + " minutes."
      );
    }

    const newEnd = sessionEndTime_(startTime, newDuration);
    const startMinutes = sessionTimeToMinutes_(startTime);
    const newEndMinutes = startMinutes + newDuration;

    const conflict = getRecords_("Live_Sessions").some(item => {
      if (String(item.SessionID) === sessionId) return false;
      if (item.Status !== "Active") return false;
      if (String(item.Console) !== String(session.Console)) return false;

      const otherDate = item.Date instanceof Date
        ? Utilities.formatDate(item.Date, CONFIG.TIMEZONE, "yyyy-MM-dd")
        : String(item.Date).trim();

      if (otherDate !== sessionDate) return false;

      const otherStart = sessionTimeToMinutes_(item.StartTime);
      const otherEnd = sessionTimeToMinutes_(item.ScheduledEndTime);

      return startMinutes < otherEnd && newEndMinutes > otherStart;
    });

    if (conflict) {
      throw new Error("The adjusted duration conflicts with another session.");
    }

    const consoleItem = getRecords_("Consoles").find(item =>
      String(item.ConsoleName).trim() === String(session.Console).trim()
    );

    if (!consoleItem) {
      throw new Error("Console configuration not found.");
    }

    const oldGamingAmount = Number(session.GamingAmount || 0);

    const newGamingAmount = calculateGamingAmount_(
      String(consoleItem.ConsoleType),
      String(session.Players),
      newDuration
    );

    const newGrandTotal =
      newGamingAmount + Number(session.SnacksAmount || 0);

    // Keep an audit trail of every duration adjustment.
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let adjustmentSheet = ss.getSheetByName("Session_Adjustments");

    if (!adjustmentSheet) {
      adjustmentSheet = ss.insertSheet("Session_Adjustments");

      adjustmentSheet.appendRow([
        "AdjustmentID",
        "SessionID",
        "Date",
        "PreviousDurationMinutes",
        "NewDurationMinutes",
        "PreviousEndTime",
        "NewEndTime",
        "PreviousGamingAmount",
        "NewGamingAmount",
        "PriceDifference",
        "CreatedAt"
      ]);

      adjustmentSheet.setFrozenRows(1);
    }

    const oldDuration =
      Number(session.OriginalDurationMinutes || 0) +
      Number(session.ExtendedMinutes || 0);

    adjustmentSheet.appendRow([
      "ADJ-" + Utilities.getUuid().slice(0, 8).toUpperCase(),
      sessionId,
      session.Date,
      oldDuration,
      newDuration,
      formatSessionTime_(session.ScheduledEndTime),
      newEnd,
      oldGamingAmount,
      newGamingAmount,
      newGamingAmount - oldGamingAmount,
      new Date()
    ]);

    updateLiveSession_(sessionId, {
      OriginalDurationMinutes: newDuration,
      ExtendedMinutes: 0,
      ScheduledEndTime: newEnd,
      GamingAmount: newGamingAmount,
      GrandTotal: newGrandTotal
    });

    SpreadsheetApp.flush();

    return {
      success: true,
      sessionId: sessionId,
      previousDurationMinutes: oldDuration,
      durationMinutes: newDuration,
      newEndTime: newEnd,
      oldGamingAmount: oldGamingAmount,
      newGamingAmount: newGamingAmount,
      newGrandTotal: newGrandTotal,
      priceDifference: newGamingAmount - oldGamingAmount,
      message: "Session duration and price updated successfully."
    };

  } finally {
    lock.releaseLock();
  }
}

// ========================================
// AXOM GAMING - STOCK MANAGEMENT
// ========================================

const STOCK_API_URL =
  "https://script.google.com/macros/s/AKfycbzhYFcW9RB7zFKMsn0CURttmL-t3j3Uk8PFTyx-FKUBA8mQKXVu0Yb5R4RDsZcGh6Gy4g/exec";

const stockToken = sessionStorage.getItem("axomToken");

// Add Stock elements
const form = document.getElementById("addStockForm");
const saveButton = document.getElementById("saveButton");
const message = document.getElementById("message");
const stockList = document.getElementById("stockList");

// Edit Stock elements
const editStockModal = document.getElementById("editStockModal");
const openEditStockModal =
  document.getElementById("openEditStockModal");
const closeEditStockModal =
  document.getElementById("closeEditStockModal");

const editForm = document.getElementById("editStockForm");
const editSelect = document.getElementById("editSnackId");
const editQuantity = document.getElementById("editQuantity");
const editSellingPrice = document.getElementById("editSellingPrice");
const editStockButton = document.getElementById("editStockButton");
const editMessage = document.getElementById("editMessage");


// ========================================
// MESSAGE HELPER
// ========================================

function showMessage(element, text, type) {
  element.textContent = text;
  element.className = type || "";
}


// ========================================
// API REQUEST
// ========================================

async function stockRequest(payload) {
  const response = await fetch(STOCK_API_URL, {
    method: "POST",
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error("Could not connect to the server.");
  }

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.message || "Something went wrong.");
  }

  return result;
}


// ========================================
// SAFE TEXT ELEMENT HELPER
// ========================================

function addTextCell(parent, text, className = "") {
  const element = document.createElement("div");

  element.textContent = text;

  if (className) {
    element.className = className;
  }

  parent.appendChild(element);

  return element;
}


// ========================================
// LOAD CURRENT STOCK
// ========================================

async function loadCurrentStock() {
  if (!stockToken) {
    stockList.textContent =
      "Please log in through the admin dashboard first.";

    return;
  }

  try {
    const previousSelection = editSelect.value;

    const result = await stockRequest({
      action: "getStockManagementData",
      token: stockToken
    });

    const products = (result.stock || []).filter(
      product => product.active === true ||
        String(product.active).toLowerCase() === "true"
    );

    // Update the stock list
    stockList.replaceChildren();

    if (products.length === 0) {
      const emptyMessage = document.createElement("p");

      emptyMessage.className = "empty-state";
      emptyMessage.textContent = "No products added yet.";

      stockList.appendChild(emptyMessage);
    } else {
      products.forEach(product => {
        const row = document.createElement("div");
        row.className = "stock-item";

        const left = document.createElement("div");

        addTextCell(
          left,
          product.snackName,
          "stock-item-name"
        );

        addTextCell(
          left,
          `${product.snackId} · ₹${product.sellingPrice} each`,
          "muted"
        );

        const right = document.createElement("div");

        right.className = "stock-quantity";
        right.textContent = `${product.currentStock} packets`;

        row.append(left, right);

        stockList.appendChild(row);
      });
    }

    // Update the Edit Stock dropdown
    editSelect.replaceChildren();

    const placeholder = document.createElement("option");

    placeholder.value = "";
    placeholder.textContent = "Select a snack";

    editSelect.appendChild(placeholder);

    products.forEach(product => {
      const option = document.createElement("option");

      option.value = product.snackId;
      option.textContent = product.snackName;

      option.dataset.quantity = product.currentStock;
      option.dataset.price = product.sellingPrice;

      editSelect.appendChild(option);
    });

    // Preserve the previously selected snack when possible
    const selectionExists = Array.from(editSelect.options).some(
      option => option.value === previousSelection
    );

    if (selectionExists) {
      editSelect.value = previousSelection;
    }

    updateEditFields();

  } catch (error) {
    stockList.textContent = error.message;

    showMessage(
      editMessage,
      error.message,
      "error"
    );
  }
}


// ========================================
// ADD NEW STOCK
// ========================================

form.addEventListener("submit", async event => {
  event.preventDefault();

  if (!stockToken) {
    showMessage(
      message,
      "Your admin session has expired. Return to the dashboard and log in again.",
      "error"
    );

    return;
  }

  const snackName =
    document.getElementById("snackName").value.trim();

  const quantity =
    Number(document.getElementById("quantity").value);

  const sellingPrice =
    Number(document.getElementById("sellingPrice").value);

  if (!snackName) {
    showMessage(message, "Enter a snack name.", "error");
    return;
  }

  if (!Number.isInteger(quantity) || quantity < 1) {
    showMessage(message, "Enter a valid quantity.", "error");
    return;
  }

  if (!Number.isFinite(sellingPrice) || sellingPrice <= 0) {
    showMessage(message, "Enter a valid selling price.", "error");
    return;
  }

  saveButton.disabled = true;
  saveButton.textContent = "ADDING STOCK...";

  try {
    const result = await stockRequest({
      action: "addNewSnack",
      token: stockToken,
      snackName: snackName,
      quantity: quantity,
      sellingPrice: sellingPrice
    });

    showMessage(
      message,
      `${result.message} ${result.snackName} added with ` +
      `${result.quantity} packets at ₹${result.sellingPrice} each.`,
      "success"
    );

    form.reset();

    await loadCurrentStock();

  } catch (error) {
    showMessage(message, error.message, "error");

  } finally {
    saveButton.disabled = false;
    saveButton.textContent = "+ ADD STOCK";
  }
});


// ========================================
// EDIT STOCK FIELD AUTO-FILL
// ========================================

function updateEditFields() {
  const option = editSelect.options[editSelect.selectedIndex];

  if (option && option.value) {
    editQuantity.value = option.dataset.quantity || "";
    editSellingPrice.value = option.dataset.price || "";
  } else {
    editQuantity.value = "";
    editSellingPrice.value = "";
  }
}

editSelect.addEventListener("change", updateEditFields);


// ========================================
// OPEN AND CLOSE EDIT STOCK MODAL
// ========================================

function openStockModal() {
  editStockModal.classList.add("active");
  editStockModal.setAttribute("aria-hidden", "false");

  document.body.classList.add("modal-open");

  showMessage(editMessage, "", "");

  // Put keyboard focus on the snack dropdown
  editSelect.focus();
}

function closeStockModal() {
  editStockModal.classList.remove("active");
  editStockModal.setAttribute("aria-hidden", "true");

  document.body.classList.remove("modal-open");
}

openEditStockModal.addEventListener("click", async () => {
  openStockModal();

  // Refresh products whenever the popup opens
  await loadCurrentStock();
});

closeEditStockModal.addEventListener("click", closeStockModal);


// Close when clicking outside the popup
editStockModal.addEventListener("click", event => {
  if (event.target === editStockModal) {
    closeStockModal();
  }
});


// Close with Escape key
document.addEventListener("keydown", event => {
  if (
    event.key === "Escape" &&
    editStockModal.classList.contains("active")
  ) {
    closeStockModal();
  }
});


// ========================================
// SAVE EDITED STOCK
// ========================================

editForm.addEventListener("submit", async event => {
  event.preventDefault();

  if (!stockToken) {
    showMessage(
      editMessage,
      "Your admin session has expired. Please log in again.",
      "error"
    );

    return;
  }

  const snackId = editSelect.value;
  const quantity = Number(editQuantity.value);
  const sellingPrice = Number(editSellingPrice.value);

  if (!snackId) {
    showMessage(
      editMessage,
      "Please select a snack.",
      "error"
    );

    return;
  }

  if (!Number.isInteger(quantity) || quantity < 0) {
    showMessage(
      editMessage,
      "Enter a valid stock quantity.",
      "error"
    );

    return;
  }

  if (!Number.isFinite(sellingPrice) || sellingPrice <= 0) {
    showMessage(
      editMessage,
      "Enter a valid selling price.",
      "error"
    );

    return;
  }

  const confirmed = window.confirm(
    "Save these changes?\n\n" +
    "The stock quantity will be SET to " +
    quantity +
    " packets, not increased by that amount."
  );

  if (!confirmed) {
    return;
  }

  editStockButton.disabled = true;
  editStockButton.textContent = "SAVING...";

  try {
    const result = await stockRequest({
      action: "editSnackStock",
      token: stockToken,
      snackId: snackId,
      quantity: quantity,
      sellingPrice: sellingPrice
    });

    showMessage(
      editMessage,
      `${result.message} ${result.snackName}: ` +
      `${result.quantity} packets.`,
      "success"
    );

    // Refresh the inventory once, then close the popup
    await loadCurrentStock();

    closeStockModal();

    showMessage(
      message,
      `${result.snackName} updated successfully. ` +
      `Stock: ${result.quantity} packets.`,
      "success"
    );

  } catch (error) {
    showMessage(editMessage, error.message, "error");

  } finally {
    editStockButton.disabled = false;
    editStockButton.textContent = "SAVE CHANGES";
  }
});


// ========================================
// INITIAL PAGE LOAD
// ========================================

if (!stockToken) {
  showMessage(
    message,
    "Please log in through the admin dashboard first.",
    "error"
  );

  stockList.textContent =
    "Log in through the admin dashboard to view stock.";

} else {
  loadCurrentStock();
}

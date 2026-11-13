const STOCK_API_URL =
  "https://script.google.com/macros/s/AKfycbzhYFcW9RB7zFKMsn0CURttmL-t3j3Uk8PFTyx-FKUBA8mQKXVu0Yb5R4RDsZcGh6Gy4g/exec";

const stockToken = sessionStorage.getItem("axomToken");

const form = document.getElementById("addStockForm");
const saveButton = document.getElementById("saveButton");
const message = document.getElementById("message");
const stockList = document.getElementById("stockList");

function showMessage(text, type) {
  message.textContent = text;
  message.className = type;
}

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

function addTextCell(parent, text, tag = "div") {
  const element = document.createElement(tag);
  element.textContent = text;
  parent.appendChild(element);
  return element;
}

async function loadCurrentStock() {
  try {
    const result = await stockRequest({
      action: "getStockManagementData",
      token: stockToken
    });

    stockList.replaceChildren();

    const editSelect = document.getElementById("editSnackId");
    const previousSelection = editSelect.value;

    editSelect.replaceChildren();

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Select a snack";
    editSelect.appendChild(placeholder);

    (result.stock || []).forEach(product => {
    if (!product.active) return;

    const option = document.createElement("option");
    option.value = product.snackId;
    option.textContent = product.snackName;

    option.dataset.quantity = product.currentStock;
    option.dataset.price = product.sellingPrice;

    editSelect.appendChild(option);
    });

    if ([...editSelect.options].some(
    option => option.value === previousSelection
    )) {
    editSelect.value = previousSelection;
    }

    updateEditFields();

    const products = (result.stock || [])
      .filter(product => product.active);

    if (products.length === 0) {
      stockList.textContent = "No products added yet.";
      return;
    }

    products.forEach(product => {
      const row = document.createElement("div");
      row.className = "stock-item";

      const left = document.createElement("div");

      addTextCell(left, product.snackName);

      const details = document.createElement("div");
      details.className = "muted";
      details.textContent = `${product.snackId} · ₹${product.sellingPrice} each`;

      left.appendChild(details);

      const right = document.createElement("div");
      right.style.textAlign = "right";
      right.textContent = `${product.currentStock} packets`;

      row.append(left, right);
      stockList.appendChild(row);
    });

  } catch (error) {
    stockList.textContent = error.message;
  }
}

form.addEventListener("submit", async event => {
  event.preventDefault();

  if (!stockToken) {
    showMessage(
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
    showMessage("Enter a snack name.", "error");
    return;
  }

  if (!Number.isInteger(quantity) || quantity < 1) {
    showMessage("Enter a valid quantity.", "error");
    return;
  }

  if (!Number.isFinite(sellingPrice) || sellingPrice <= 0) {
    showMessage("Enter a valid selling price.", "error");
    return;
  }

  saveButton.disabled = true;
  saveButton.textContent = "ADDING STOCK...";

  try {
    const result = await stockRequest({
      action: "addNewSnack",
      token: stockToken,
      snackName,
      quantity,
      sellingPrice
    });

    showMessage(
      `${result.message} ${result.snackName} added with ` +
      `${result.quantity} packets at ₹${result.sellingPrice} each.`,
      "success"
    );

    form.reset();

    await loadCurrentStock();

  } catch (error) {
    showMessage(error.message, "error");

  } finally {
    saveButton.disabled = false;
    saveButton.textContent = "+ ADD STOCK";
  }
});

if (!stockToken) {
  showMessage(
    "Please log in through the admin dashboard first.",
    "error"
  );
} else {
  loadCurrentStock();
}

function updateEditFields() {
  const select = document.getElementById("editSnackId");
  const option = select.options[select.selectedIndex];

  document.getElementById("editQuantity").value =
    option && option.value ? option.dataset.quantity : "";

  document.getElementById("editSellingPrice").value =
    option && option.value ? option.dataset.price : "";
}

document.getElementById("editSnackId").addEventListener(
  "change",
  updateEditFields
);

document.getElementById("editStockForm").addEventListener(
  "submit",
  async event => {
    event.preventDefault();

    const select = document.getElementById("editSnackId");
    const button = document.getElementById("editStockButton");
    const message = document.getElementById("editMessage");

    const snackId = select.value;
    const quantity = Number(
      document.getElementById("editQuantity").value
    );
    const sellingPrice = Number(
      document.getElementById("editSellingPrice").value
    );

    if (!snackId) {
      message.textContent = "Please select a snack.";
      message.className = "error";
      return;
    }

    if (!Number.isInteger(quantity) || quantity < 0) {
      message.textContent = "Enter a valid stock quantity.";
      message.className = "error";
      return;
    }

    if (!Number.isFinite(sellingPrice) || sellingPrice <= 0) {
      message.textContent = "Enter a valid selling price.";
      message.className = "error";
      return;
    }

    const confirmed = confirm(
      "Save these changes?\n\n" +
      "Stock will be SET to " + quantity +
      " packets, not increased by that amount."
    );

    if (!confirmed) return;

    button.disabled = true;
    button.textContent = "SAVING...";

    try {
      const result = await stockRequest({
        action: "editSnackStock",
        token: stockToken,
        snackId: snackId,
        quantity: quantity,
        sellingPrice: sellingPrice
      });

      message.textContent =
        result.message + " " + result.snackName +
        ": " + result.quantity + " packets.";

      message.className = "success";

      closeStockModal();
        await loadCurrentStock();   

      await loadCurrentStock();

    } catch (error) {
      message.textContent = error.message;
      message.className = "error";

    } finally {
      button.disabled = false;
      button.textContent = "SAVE CHANGES";
    }
  }
);

// Edit Stock Modal
const editStockModal = document.getElementById("editStockModal");
const openEditStockModal = document.getElementById("openEditStockModal");
const closeEditStockModal = document.getElementById("closeEditStockModal");

function openStockModal() {
  editStockModal.classList.add("active");
  document.body.classList.add("modal-open");
}

function closeStockModal() {
  editStockModal.classList.remove("active");
  document.body.classList.remove("modal-open");
}

openEditStockModal.addEventListener("click", () => {
  openStockModal();
});

closeEditStockModal.addEventListener("click", () => {
  closeStockModal();
});

// Close when clicking outside the popup
editStockModal.addEventListener("click", (event) => {
  if (event.target === editStockModal) {
    closeStockModal();
  }
});

// Close when pressing Escape
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && editStockModal.classList.contains("active")) {
    closeStockModal();
  }
});
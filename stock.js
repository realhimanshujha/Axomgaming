const STOCK_API_URL =
  "https://script.google.com/macros/s/AKfycbzhYFcW9RB7zFKMsn0CURttmL-t3j3Uk8PFTyx-FKUBA8mQKXVu0Yb5R4RDsZcGh6Gy4g/exec";

const stockToken = sessionStorage.getItem("axomToken") || localStorage.getItem("axomToken") || "";
const stockRole = (localStorage.getItem("axomRole") || "Admin").toLowerCase();

const form = document.getElementById("addStockForm");
const saveButton = document.getElementById("saveButton");
const message = document.getElementById("message");
const stockList = document.getElementById("stockList");
const stockSearch = document.getElementById("stockSearch");

let activeStockProducts = [];

function showMessage(text, type) {
  message.textContent = text;
  message.className = type || "";
}

document.querySelectorAll("[data-admin-only]").forEach(el => {
  el.style.display = stockRole === "staff" ? "none" : "";
});

if (stockRole === "staff") {
  const copy = document.querySelector(".page-heading p");
  if (copy) copy.textContent = "View available inventory and record stock purchases.";
}

async function stockRequest(payload) {
  const response = await fetch(STOCK_API_URL, {
    method: "POST",
    body: JSON.stringify(payload)
  });

  if (!response.ok) throw new Error("Could not connect to the server.");

  const result = await response.json();
  if (!result.success) throw new Error(result.message || "Something went wrong.");
  return result;
}

function createElement(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = String(text);
  return el;
}

function renderStockProducts(query = "") {
  const term = query.trim().toLowerCase();
  const filtered = activeStockProducts.filter(product =>
    String(product.snackName || "").toLowerCase().includes(term) ||
    String(product.snackId || "").toLowerCase().includes(term)
  );

  stockList.replaceChildren();

  const count = document.getElementById("visibleProductCount");
  if (count) {
    count.textContent = term
      ? `${filtered.length} of ${activeStockProducts.length} products`
      : `${activeStockProducts.length} products`;
  }

  if (!filtered.length) {
    const empty = createElement(
      "div",
      "inventory-empty",
      term ? "No products match your search." : "No products in inventory yet."
    );
    stockList.appendChild(empty);
    return;
  }

  filtered.forEach(product => {
    const row = createElement("article", "stock-item");
    const left = createElement("div", "stock-product");
    const firstLetter = String(product.snackName || "?").trim().charAt(0).toUpperCase();
    const icon = createElement("span", "stock-product-icon", firstLetter || "?");
    const copy = createElement("div", "stock-product-copy");
    const name = createElement("strong", "stock-item-name", product.snackName || "Unnamed product");
    const details = createElement(
      "small",
      "stock-item-details",
      `${product.snackId || "SKU"} · ₹${product.sellingPrice} per packet`
    );

    copy.append(name, details);
    left.append(icon, copy);

    const quantity = Number(product.currentStock) || 0;
    const right = createElement("div", quantity <= 2 ? "stock-quantity low" : "stock-quantity");
    right.append(
      createElement("strong", "", quantity),
      createElement("small", "", quantity === 1 ? "packet" : "packets")
    );

    row.append(left, right);
    stockList.appendChild(row);
  });
}

if (stockSearch) {
  stockSearch.addEventListener("input", () => renderStockProducts(stockSearch.value));
}

function updateOverview(products) {
  const totalProducts = document.getElementById("totalProducts");
  const totalPackets = document.getElementById("totalPackets");
  const lowStockCount = document.getElementById("lowStockCount");

  if (totalProducts) totalProducts.textContent = products.length;
  if (totalPackets) {
    totalPackets.textContent = products.reduce(
      (sum, product) => sum + (Number(product.currentStock) || 0), 0
    );
  }
  if (lowStockCount) {
    lowStockCount.textContent = products.filter(
      product => Number(product.currentStock) <= 2
    ).length;
  }
}

async function loadCurrentStock() {
  try {
    const result = await stockRequest({
      action: "getStockManagementData",
      token: stockToken
    });

    const allProducts = result.stock || [];
    activeStockProducts = allProducts.filter(product => product.active);

    const purchaseSelect = document.getElementById("purchaseSnackId");
    if (purchaseSelect) {
      const previousPurchase = purchaseSelect.value;
      purchaseSelect.replaceChildren();
      purchaseSelect.appendChild(createElement("option", "", "Select a product"));
      purchaseSelect.options[0].value = "";

      activeStockProducts.forEach(product => {
        const option = createElement(
          "option",
          "",
          `${product.snackName} · Current: ${product.currentStock}`
        );
        option.value = product.snackId;
        purchaseSelect.appendChild(option);
      });

      if ([...purchaseSelect.options].some(option => option.value === previousPurchase)) {
        purchaseSelect.value = previousPurchase;
      }
    }

    const editSelect = document.getElementById("editSnackId");
    if (editSelect) {
      const previousSelection = editSelect.value;
      editSelect.replaceChildren();
      const placeholder = createElement("option", "", "Select a product");
      placeholder.value = "";
      editSelect.appendChild(placeholder);

      activeStockProducts.forEach(product => {
        const option = createElement("option", "", product.snackName);
        option.value = product.snackId;
        option.dataset.quantity = product.currentStock;
        option.dataset.price = product.sellingPrice;
        editSelect.appendChild(option);
      });

      if ([...editSelect.options].some(option => option.value === previousSelection)) {
        editSelect.value = previousSelection;
      }
      updateEditFields();
      refreshEditProductDropdown();
    }

    updateOverview(activeStockProducts);
    renderStockProducts(stockSearch ? stockSearch.value : "");

  } catch (error) {
    stockList.replaceChildren(createElement("div", "inventory-empty error", error.message));
    const count = document.getElementById("visibleProductCount");
    if (count) count.textContent = "Unable to load";
    ["totalProducts", "totalPackets", "lowStockCount"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = "—";
    });
  }
}

form.addEventListener("submit", async event => {
  event.preventDefault();

  if (!stockToken) {
    showMessage("Your session has expired. Log in again through the dashboard.", "error");
    return;
  }

  const snackName = document.getElementById("snackName").value.trim();
  const quantity = Number(document.getElementById("quantity").value);
  const sellingPrice = Number(document.getElementById("sellingPrice").value);

  if (!snackName) return showMessage("Enter a product name.", "error");
  if (!Number.isInteger(quantity) || quantity < 1) {
    return showMessage("Enter a valid opening quantity.", "error");
  }
  if (!Number.isFinite(sellingPrice) || sellingPrice <= 0) {
    return showMessage("Enter a valid selling price.", "error");
  }

  saveButton.disabled = true;
  saveButton.textContent = "ADDING PRODUCT…";

  try {
    const result = await stockRequest({
      action: "addNewSnack",
      token: stockToken,
      snackName,
      quantity,
      sellingPrice
    });

    showMessage(
      `${result.message} ${result.snackName} added: ${result.quantity} packets at ₹${result.sellingPrice} each.`,
      "success"
    );
    form.reset();
    await loadCurrentStock();
  } catch (error) {
    showMessage(error.message, "error");
  } finally {
    saveButton.disabled = false;
    saveButton.innerHTML = "<span>＋</span> Add product to stock";
  }
});

if (!stockToken) {
  showMessage("Please log in through the admin dashboard first.", "error");
} else {
  loadCurrentStock();
}

function updateEditFields() {
  const select = document.getElementById("editSnackId");
  const option = select && select.options[select.selectedIndex];

  document.getElementById("editQuantity").value =
    option && option.value ? option.dataset.quantity : "";
  document.getElementById("editSellingPrice").value =
    option && option.value ? option.dataset.price : "";
}

document.getElementById("editSnackId").addEventListener("change", updateEditFields);

document.getElementById("editStockForm").addEventListener("submit", async event => {
  event.preventDefault();

  const select = document.getElementById("editSnackId");
  const button = document.getElementById("editStockButton");
  const messageEl = document.getElementById("editMessage");
  const snackId = select.value;
  const quantity = Number(document.getElementById("editQuantity").value);
  const sellingPrice = Number(document.getElementById("editSellingPrice").value);

  if (!snackId) {
    messageEl.textContent = "Please select a product.";
    messageEl.className = "error";
    return;
  }
  if (!Number.isInteger(quantity) || quantity < 0) {
    messageEl.textContent = "Enter a valid stock quantity.";
    messageEl.className = "error";
    return;
  }
  if (!Number.isFinite(sellingPrice) || sellingPrice <= 0) {
    messageEl.textContent = "Enter a valid selling price.";
    messageEl.className = "error";
    return;
  }

  if (!confirm(
    `Save changes to this product?\n\nStock will be SET to ${quantity} packets, not added to the current quantity.`
  )) return;

  button.disabled = true;
  button.textContent = "SAVING…";

  try {
    const result = await stockRequest({
      action: "editSnackStock",
      token: stockToken,
      snackId,
      quantity,
      sellingPrice
    });

    messageEl.textContent =
      `${result.message} ${result.snackName}: ${result.quantity} packets.`;
    messageEl.className = "success";
    closeStockModal();
    await loadCurrentStock();
  } catch (error) {
    messageEl.textContent = error.message;
    messageEl.className = "error";
  } finally {
    button.disabled = false;
    button.textContent = "Save changes";
  }
});

const editStockModal = document.getElementById("editStockModal");
function openStockModal() {
  editStockModal.classList.add("active");
  document.body.classList.add("modal-open");
}
function closeStockModal() {
  editStockModal.classList.remove("active");
  document.body.classList.remove("modal-open");
}
document.getElementById("openEditStockModal").addEventListener("click", openStockModal);
document.getElementById("closeEditStockModal").addEventListener("click", closeStockModal);
editStockModal.addEventListener("click", event => {
  if (event.target === editStockModal) closeStockModal();
});
document.addEventListener("keydown", event => {
  if (event.key === "Escape" && editStockModal.classList.contains("active")) {
    closeStockModal();
  }
});

const purchaseForm = document.getElementById("purchaseStockForm");
purchaseForm.addEventListener("submit", async event => {
  event.preventDefault();

  const button = document.getElementById("purchaseButton");
  const messageEl = document.getElementById("purchaseMessage");
  const snackId = document.getElementById("purchaseSnackId").value;
  const quantity = Number(document.getElementById("purchaseQuantity").value);
  const purchasePrice = Number(document.getElementById("purchasePrice").value);
  const notes = document.getElementById("purchaseNotes").value.trim();

  if (!snackId) {
    messageEl.textContent = "Select a product.";
    messageEl.className = "error";
    return;
  }
  if (!Number.isInteger(quantity) || quantity < 1) {
    messageEl.textContent = "Enter a valid purchase quantity.";
    messageEl.className = "error";
    return;
  }
  if (!Number.isFinite(purchasePrice) || purchasePrice <= 0) {
    messageEl.textContent = "Enter a valid purchase price.";
    messageEl.className = "error";
    return;
  }

  button.disabled = true;
  button.textContent = "RECORDING PURCHASE…";

  try {
    const result = await stockRequest({
      action: "addStockPurchase",
      token: stockToken,
      snackId,
      quantity,
      purchasePrice,
      notes
    });

    messageEl.textContent =
      `${result.message} ${result.snackName}: ${result.previousStock} + ${result.quantityAdded} = ${result.currentStock} packets. Total purchase ₹${result.totalCost}.`;
    messageEl.className = "success";
    purchaseForm.reset();
    await loadCurrentStock();
  } catch (error) {
    messageEl.textContent = error.message;
    messageEl.className = "error";
  } finally {
    button.disabled = false;
    button.textContent = "＋ Record purchase";
  }
});

// CUSTOM SEARCHABLE EDIT STOCK DROPDOWN

const editProductSelect = document.getElementById("editSnackId");
const editProductDropdown = document.getElementById("editProductDropdown");
const editProductTrigger = document.getElementById("editProductTrigger");
const editProductSelected = document.getElementById("editProductSelected");
const editProductMenu = document.getElementById("editProductMenu");
const editProductSearch = document.getElementById("editProductSearch");
const editProductOptions = document.getElementById("editProductOptions");

function renderEditProductOptions(search = "") {
    const term = search.toLowerCase().trim();

    editProductOptions.replaceChildren();

    const options = [...editProductSelect.options].filter(option =>
        option.value &&
        option.textContent.toLowerCase().includes(term)
    );

    if (!options.length) {
        editProductOptions.innerHTML =
            '<div class="product-option-empty">No products found.</div>';
        return;
    }

    options.forEach(option => {
        const button = document.createElement("button");

        button.type = "button";
        button.className = "product-option";

        if (option.value === editProductSelect.value) {
            button.classList.add("selected");
        }

        button.textContent = option.textContent;

        button.addEventListener("click", () => {
            editProductSelect.value = option.value;

            editProductSelect.dispatchEvent(
                new Event("change", { bubbles: true })
            );

            editProductSelected.textContent = option.textContent;

            editProductDropdown.classList.remove("open");
            editProductSearch.value = "";

            renderEditProductOptions();
        });

        editProductOptions.appendChild(button);
    });
}

function refreshEditProductDropdown() {
    const selected = editProductSelect.options[
        editProductSelect.selectedIndex
    ];

    editProductSelected.textContent =
        selected && selected.value
            ? selected.textContent
            : "Select a product";

    renderEditProductOptions();
}

editProductTrigger.addEventListener("click", () => {
    const isOpen = editProductDropdown.classList.toggle("open");

    if (isOpen) {
        editProductSearch.value = "";
        renderEditProductOptions();
        editProductSearch.focus();
    }
});

editProductSearch.addEventListener("input", () => {
    renderEditProductOptions(editProductSearch.value);
});

document.addEventListener("click", event => {
    if (!editProductDropdown.contains(event.target)) {
        editProductDropdown.classList.remove("open");
    }
});

editProductSelect.addEventListener("change", refreshEditProductDropdown);
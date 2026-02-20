(function () {
  const user = window.KGL.auth.getUser();
  const role = user?.role || "";

  const productsTable = document.getElementById("productsTable");
  const btnLoadProducts = document.getElementById("btnLoadProducts");
  const productSearch = document.getElementById("productSearch");

  const btnShowAddProduct = document.getElementById("btnShowAddProduct");
  const addProductCard = document.getElementById("addProductCard");
  const btnCloseAddProduct = document.getElementById("btnCloseAddProduct");

  const addProductForm = document.getElementById("addProductForm");
  const addProductError = document.getElementById("addProductError");
  const addProductSuccess = document.getElementById("addProductSuccess");
  const addProductHint = document.getElementById("addProductHint");
  const btnCreateProduct = document.getElementById("btnCreateProduct");

  let allProducts = [];
  // Modal elements
const productModalEl = document.getElementById("productModal");
const productModal = productModalEl ? new bootstrap.Modal(productModalEl) : null;

const pmId = document.getElementById("pmId");
const pmTitle = document.getElementById("pmTitle");
const pmSub = document.getElementById("pmSub");

const pmName = document.getElementById("pmName");
const pmCategory = document.getElementById("pmCategory");
const pmUnit = document.getElementById("pmUnit");
const pmBuyingPrice = document.getElementById("pmBuyingPrice");
const pmSellingPrice = document.getElementById("pmSellingPrice");
const pmStockQty = document.getElementById("pmStockQty");
const pmIsActive = document.getElementById("pmIsActive");

const pmError = document.getElementById("pmError");
const pmSuccess = document.getElementById("pmSuccess");
const pmSaveBtn = document.getElementById("pmSaveBtn");
const pmMeta = document.getElementById("pmMeta");

const productEditForm = document.getElementById("productEditForm");

  function money(n) {
    return Number(n || 0).toLocaleString();
  }

  function escapeHtml(str) {
    return String(str ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
  const LOW_STOCK = 10;

  function lowBadge(p) {
    const qty = Number(p.stockQty || 0);
    if (p.isActive !== false && qty <= LOW_STOCK) {
      return ` <span class="badge text-bg-warning ms-2">LOW</span>`;
    }
    return "";
  }

  function updateLowStockUI(products) {
    const low = (products || []).filter(p => (p.isActive !== false) && Number(p.stockQty || 0) <= LOW_STOCK);

    const elCount = document.getElementById("lowStockCount");
    const elTh = document.getElementById("lowStockThreshold");
    if (elCount) elCount.textContent = low.length;
    if (elTh) elTh.textContent = LOW_STOCK;

    // Toast only for manager
    if (role === "manager" && low.length > 0) {
      window.KGL.ui.showToast(`${low.length} item(s) are low on stock`, "warning");
    }
  }


  function modalMsg(type, msg) {
  pmError.classList.add("d-none");
  pmSuccess.classList.add("d-none");

  if (type === "error") {
    pmError.textContent = msg;
    pmError.classList.remove("d-none");
  } else if (type === "success") {
    pmSuccess.textContent = msg;
    pmSuccess.classList.remove("d-none");
  }
}

function setModalEditable(editable) {
  const inputs = [pmName, pmCategory, pmUnit, pmBuyingPrice, pmSellingPrice, pmStockQty, pmIsActive];
  inputs.forEach((i) => (i.disabled = !editable));

  if (role === "manager") {
    pmSaveBtn.classList.toggle("d-none", !editable);
  } else {
    pmSaveBtn.classList.add("d-none");
  }
}

  function showError(msg) {
    addProductError.textContent = msg;
    addProductError.classList.remove("d-none");
    addProductSuccess.classList.add("d-none");
  }

  function showSuccess(msg) {
    addProductSuccess.textContent = msg;
    addProductSuccess.classList.remove("d-none");
    addProductError.classList.add("d-none");
  }

  function clearMessages() {
    addProductError.classList.add("d-none");
    addProductSuccess.classList.add("d-none");
    addProductHint.textContent = "";
  }

  function renderProducts(list) {
    if (!list.length) {
      productsTable.innerHTML = `<tr><td colspan="6" class="text-muted ps-3 py-4">No products found.</td></tr>`;
      return;
    }

    productsTable.innerHTML = list.map((p) => {
      return `
        <tr>
          <td class="ps-3 fw-semibold">${escapeHtml(p.name)}${lowBadge(p)}</td>
          <td>${escapeHtml(p.category || "-")}</td>
          <td>${escapeHtml(p.unit || "-")}</td>
          <td class="text-end">${money(p.sellingPrice)}</td>
          <td class="text-end">${money(p.stockQty)}</td>
          <td class="text-end pe-3">
            <button class="btn btn-sm btn-outline-secondary" data-view="${p._id}">View</button>
          </td>
        </tr>
      `;
    }).join("");
  }
  document.getElementById("btnViewLowStock")?.addEventListener("click", (e) => {
  e.preventDefault();
  // click the sidebar menu link for Products
  document.querySelector('#menu a[data-page="products"]')?.click();
});

  async function loadProducts() {
    productsTable.innerHTML = `<tr><td colspan="6" class="text-muted ps-3 py-4">Loading...</td></tr>`;
    try {
      const data = await window.KGL.api("/api/products");
      allProducts = data.products || [];
      applySearch();
      updateLowStockUI(allProducts);
    } catch (err) {
      productsTable.innerHTML = `<tr><td colspan="6" class="text-danger ps-3 py-4">Failed: ${escapeHtml(err.message)}</td></tr>`;
    }
    // Exposed loader so dashboard can call it when switching panels
    window.KGLProducts = {
      load: loadProducts,
    };
  }

  function applySearch() {
    const q = (productSearch?.value || "").trim().toLowerCase();
    if (!q) return renderProducts(allProducts);

    const filtered = allProducts.filter((p) => {
      const name = (p.name || "").toLowerCase();
      const cat = (p.category || "").toLowerCase();
      return name.includes(q) || cat.includes(q);
    });

    renderProducts(filtered);
  }

  // Manager: show add form button
  if (btnShowAddProduct && role === "manager") {
    btnShowAddProduct.classList.remove("d-none");
  }

  btnLoadProducts?.addEventListener("click", () => {
    loadProducts();
    window.KGL.ui.showToast("Products refreshed", "success");
  });

  productSearch?.addEventListener("input", applySearch);

  btnShowAddProduct?.addEventListener("click", () => {
    clearMessages();
    addProductCard.classList.remove("d-none");
    addProductCard.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  btnCloseAddProduct?.addEventListener("click", () => {
    addProductCard.classList.add("d-none");
    clearMessages();
  });

  addProductForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearMessages();

    if (role !== "manager") {
      showError("Only manager can add products.");
      return;
    }

    const payload = {
      name: document.getElementById("pName").value.trim(),
      category: document.getElementById("pCategory").value.trim(),
      unit: document.getElementById("pUnit").value.trim(),
      buyingPrice: Number(document.getElementById("pBuyingPrice").value),
      sellingPrice: Number(document.getElementById("pSellingPrice").value),
      stockQty: Number(document.getElementById("pStockQty").value),
    };

    btnCreateProduct.disabled = true;
    btnCreateProduct.textContent = "Creating...";
    addProductHint.textContent = "Saving product...";

    try {
      const data = await window.KGL.api("/api/products", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      showSuccess("Product created successfully.");
      window.KGL.ui.showToast("Product added", "success");

      addProductForm.reset();
      addProductCard.classList.add("d-none");

      // reload list
      await loadProducts();
    } catch (err) {
      showError(err.message || "Failed to create product.");
    } finally {
      btnCreateProduct.disabled = false;
      btnCreateProduct.textContent = "Create Product";
      addProductHint.textContent = "";
    }
  });

  // View action
  productsTable?.addEventListener("click", async (e) => {
  const btn = e.target.closest("button[data-view]");
  if (!btn) return;

  const id = btn.getAttribute("data-view");

  try {
    modalMsg("", "");
    const data = await window.KGL.api(`/api/products/${id}`);
    const p = data.product;

    pmId.value = p._id;
    pmTitle.textContent = p.name || "Product";
    pmSub.textContent = `${p.category || "—"} • Unit: ${p.unit || "—"}`;

    pmName.value = p.name || "";
    pmCategory.value = p.category || "";
    pmUnit.value = p.unit || "";
    pmBuyingPrice.value = Number(p.buyingPrice || 0);
    pmSellingPrice.value = Number(p.sellingPrice || 0);
    pmStockQty.value = Number(p.stockQty || 0);
    pmIsActive.value = String(p.isActive !== false);

    pmMeta.textContent = `Created: ${new Date(p.createdAt).toLocaleString()} • Updated: ${new Date(p.updatedAt).toLocaleString()}`;

    // Only manager can edit
    setModalEditable(role === "manager");

    productModal?.show();
  } catch (err) {
    window.KGL.ui.showToast(err.message || "Failed to load product", "danger");
  }
});

pmSaveBtn?.addEventListener("click", async () => {
  if (role !== "manager") return;

  modalMsg("", "");
  pmSaveBtn.disabled = true;
  pmSaveBtn.textContent = "Saving...";

  const id = pmId.value;

  const Payload = {
  name: pmName.value.trim(),
  category: pmCategory.value.trim(),
  unit: pmUnit.value.trim(),
  buyingPrice: Number(pmBuyingPrice.value),
  sellingPrice: Number(pmSellingPrice.value),
  isActive: pmIsActive.value === "true",
    };

    const stockValue = Number(pmStockQty.value);

  try {
    try {
      await window.KGL.api(`/api/products/${id}`, {
        method: "PATCH",
        body: JSON.stringify(Payload),
      });
      
        await window.KGL.api(`/api/products/${id}/stock`, {
        method: "PATCH",
        body: JSON.stringify({ set: stockValue }),
        });
    } catch (err) {
      if (err.status === 404 || err.status === 405) {
        await window.KGL.api(`/api/products/${id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        throw err;
      }
    }

    modalMsg("success", "Changes saved.");
    window.KGL.ui.showToast("Product updated", "success");

    // Refresh list
    await loadProducts();
  } catch (err) {
    modalMsg("error", err.message || "Failed to update product.");
  } finally {
    pmSaveBtn.disabled = false;
    pmSaveBtn.textContent = "Save changes";
  }
});

  loadProducts();
})();
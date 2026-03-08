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
let inventoryChart; // Declare chart globally in the file

function initInventoryChart(products) {
  const ctx = document.getElementById('inventoryChart').getContext('2d');
  
  // Aggregate data: Group by category and multiply stock by sellingPrice
  const stats = products.reduce((acc, p) => {
    const cat = p.category || "Uncategorized";
    const value = (Number(p.stockQty) || 0) * (Number(p.sellingPrice) || 0);
    acc[cat] = (acc[cat] || 0) + value;
    return acc;
  }, {});

  const data = {
    labels: Object.keys(stats),
    datasets: [{
      label: 'Inventory Value (UGX)',
      data: Object.values(stats),
      backgroundColor: '#063925', // Your forest green
      borderRadius: 5
    }]
  };

  if (inventoryChart) {
    inventoryChart.data = data;
    inventoryChart.update();
  } else {
    inventoryChart = new Chart(ctx, {
      type: 'bar',
      data: data,
      options: { responsive: true, maintainAspectRatio: false }
    });
  }
}
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
    productsTable.innerHTML = `<tr><td colspan="7" class="text-muted ps-3 py-4">No products found.</td></tr>`;
    return;
  }

  productsTable.innerHTML = list.map((p) => {
    // Construct the image URL. Ensure your backend returns the image path (e.g., "uploads/image.jpg")
    const imgUrl = p.image ? (p.image.startsWith('/') ? p.image : `/${p.image}`) : '../assets/no-image.png'; // Fallback image

    return `
      <tr>
        <td class="ps-3">
          <img src="${imgUrl}" alt="${escapeHtml(p.name)}" class="rounded border" style="width: 40px; height: 40px; object-fit: cover;">
        </td>
        <td class="fw-semibold">${escapeHtml(p.name)}${lowBadge(p)}</td>
        <td>${escapeHtml(p.category || "-")}</td>
        <td>${escapeHtml(p.unit || "-")}</td>
        <td class="text-end">${money(p.sellingPrice)}</td>
        <td class="text-end">${money(p.stockQty)}</td>
        <td class="text-end pe-3">
          <button class="btn btn-sm btn-primary" data-view="${p._id}">View</button>
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
      if (typeof initInventoryChart === 'function') initInventoryChart(allProducts);
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

  // Use FormData to handle the image file
  const formData = new FormData();
  formData.append("name", document.getElementById("pName").value.trim());
  formData.append("category", document.getElementById("pCategory").value.trim());
  formData.append("unit", document.getElementById("pUnit").value.trim());
  formData.append("buyingPrice", document.getElementById("pBuyingPrice").value);
  formData.append("sellingPrice", document.getElementById("pSellingPrice").value);
  formData.append("stockQty", document.getElementById("pStockQty").value);

  const imageFile = document.getElementById("pImage").files[0];
  if (imageFile) {
    formData.append("image", imageFile); // 'image' must match your Multer upload.single('image') name
  }

  btnCreateProduct.disabled = true;
  btnCreateProduct.textContent = "Creating...";

  try {
    // IMPORTANT: When sending FormData, do NOT set Content-Type header manually.
    // The browser will set it to multipart/form-data with the correct boundary.
    const data = await window.KGL.api("/api/products", {
      method: "POST",
      body: formData, // Send the FormData object directly
    });

    showSuccess("Product created successfully.");
    window.KGL.ui.showToast("Product added", "success");
    addProductForm.reset();
    addProductCard.classList.add("d-none");
    await loadProducts();
  } catch (err) {
    showError(err.message || "Failed to create product.");
  } finally {
    btnCreateProduct.disabled = false;
    btnCreateProduct.textContent = "Create Product";
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
    // Image Preview Logic
    const pmPreview = document.getElementById("pmPreview");
    const pmImageUploadContainer = document.getElementById("pmImageUploadContainer");

    if (p.image) {
      pmPreview.src = p.image; 
      pmPreview.style.display = "inline-block";
    } else {
      pmPreview.style.display = "none";
    }

    if (role === 'manager') {
      pmImageUploadContainer?.classList.remove("d-none");
    }

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

  try {
    // 1. Prepare FormData instead of a JSON Payload
    const formData = new FormData();
    formData.append("name", pmName.value.trim());
    formData.append("category", pmCategory.value.trim());
    formData.append("unit", pmUnit.value.trim());
    formData.append("buyingPrice", Number(pmBuyingPrice.value));
    formData.append("sellingPrice", Number(pmSellingPrice.value));
    formData.append("isActive", pmIsActive.value === "true");

    // Get the file from the new input we added to the modal
    const imageFile = document.getElementById("pmImage").files[0];
    if (imageFile) {
      formData.append("image", imageFile);
    }

    // 2. Update Product Details & Image
    // Note: We pass formData directly as the body. 
    // Do NOT use JSON.stringify here.
    await window.KGL.api(`/api/products/${id}`, {
      method: "PATCH",
      body: formData,
    });

    // 3. Update Stock (We can keep this as JSON)
    const stockValue = Number(pmStockQty.value);
    await window.KGL.api(`/api/products/${id}/stock`, {
      method: "PATCH",
      body: JSON.stringify({ set: stockValue }),
    });

    modalMsg("success", "Changes saved.");
    window.KGL.ui.showToast("Product updated", "success");
    await loadProducts();
    productModal?.hide();
  } catch (err) {
    modalMsg("error", err.message || "Failed to update product.");
  } finally {
    pmSaveBtn.disabled = false;
    pmSaveBtn.textContent = "Save changes";
  }
});

  loadProducts();
})();
(function () {
  const user = window.KGL.auth.getUser();
  const role = user?.role || "";

  // Allow manager + sales_agent to record sales
  if (!["manager", "sales_agent"].includes(role)) return;

  const saleProduct = document.getElementById("saleProduct");
  const saleProductMeta = document.getElementById("saleProductMeta");
  const saleQty = document.getElementById("saleQty");
  const btnAddToCart = document.getElementById("btnAddToCart");
  const btnClearCart = document.getElementById("btnClearCart");
  const cartTable = document.getElementById("cartTable");
  const cartTotalEl = document.getElementById("cartTotal");
  const btnSubmitSale = document.getElementById("btnSubmitSale");
  const btnReloadSaleProducts = document.getElementById("btnReloadSaleProducts");

  const saleError = document.getElementById("saleError");
  const saleSuccess = document.getElementById("saleSuccess");

  // Payment UI
  const saleCash = document.getElementById("saleCash");
  const saleCredit = document.getElementById("saleCredit");
  const creditFields = document.getElementById("creditFields");
  const customerName = document.getElementById("customerName");
  const customerPhone = document.getElementById("customerPhone");
  const amountPaidNow = document.getElementById("amountPaidNow");
  const creditBalance = document.getElementById("creditBalance");

  // Receipt modal
const receiptModalEl = document.getElementById("receiptModal");
const receiptModal = receiptModalEl ? new bootstrap.Modal(receiptModalEl) : null;

const rcSub = document.getElementById("rcSub");
const rcId = document.getElementById("rcId");
const rcDate = document.getElementById("rcDate");
const rcSoldBy = document.getElementById("rcSoldBy");
const rcType = document.getElementById("rcType");
const rcStatus = document.getElementById("rcStatus");

const rcCustomerBox = document.getElementById("rcCustomerBox");
const rcCustName = document.getElementById("rcCustName");
const rcCustPhone = document.getElementById("rcCustPhone");

const rcItems = document.getElementById("rcItems");
const rcTotal = document.getElementById("rcTotal");
const rcPaid = document.getElementById("rcPaid");
const rcBalance = document.getElementById("rcBalance");

const btnPrintReceipt = document.getElementById("btnPrintReceipt");
const receiptArea = document.getElementById("receiptArea");
  let products = [];
  let cart = []; // {productId, name, unitPrice, quantity}

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

    function statusBadge(status) {
    rcStatus.className = "badge";
    if (status === "paid") rcStatus.classList.add("text-bg-success");
    else if (status === "partial") rcStatus.classList.add("text-bg-warning");
    else rcStatus.classList.add("text-bg-secondary");
    rcStatus.textContent = status;
    }

    function openReceipt(sale) {
    // top bits
    rcSub.textContent = `${sale.saleType.toUpperCase()} • ${sale.paymentStatus.toUpperCase()}`;
    rcId.textContent = sale._id;
    rcDate.textContent = new Date(sale.createdAt).toLocaleString();

    rcSoldBy.textContent = sale.soldBy?.username || "-";
    rcType.textContent = sale.saleType;
    statusBadge(sale.paymentStatus);

    // customer (only credit)
    if (sale.saleType === "credit" && sale.customer?.name) {
        rcCustomerBox.style.display = "";
        rcCustName.textContent = sale.customer.name || "-";
        rcCustPhone.textContent = sale.customer.phone || "-";
    } else {
        rcCustomerBox.style.display = "none";
    }

    // items
    const items = sale.items || [];
    rcItems.innerHTML = items.map((i) => `
        <tr>
        <td>${escapeHtml(i.name)}</td>
        <td class="text-end">${money(i.unitPrice)}</td>
        <td class="text-end">${money(i.quantity)}</td>
        <td class="text-end">${money(i.lineTotal)}</td>
        </tr>
    `).join("");

    // totals
    rcTotal.textContent = money(sale.totalAmount);
    rcPaid.textContent = money(sale.amountPaid);
    rcBalance.textContent = money(sale.balance);

    receiptModal?.show();
    }

    btnPrintReceipt?.addEventListener("click", () => {
  if (!receiptArea) return;

  const w = window.open("", "PRINT", "height=650,width=900");
  if (!w) return;

  w.document.write(`
    <html>
      <head>
        <title>Receipt</title>
        <meta charset="utf-8" />
        <link rel="stylesheet" href="../vendor/bootstrap/bootstrap.min.css">
        <style>
          body { padding: 18px; }
          .table { margin-bottom: 0; }
        </style>
      </head>
      <body>
        ${receiptArea.innerHTML}
      </body>
    </html>
  `);

  w.document.close();
  w.focus();
  w.print();
  w.close();
    });

  function showMsg(type, msg) {
    saleError.classList.add("d-none");
    saleSuccess.classList.add("d-none");

    if (type === "error") {
      saleError.textContent = msg;
      saleError.classList.remove("d-none");
    }
    if (type === "success") {
      saleSuccess.textContent = msg;
      saleSuccess.classList.remove("d-none");
    }
  }

  function clearMsg() {
    saleError.classList.add("d-none");
    saleSuccess.classList.add("d-none");
  }

  function selectedProduct() {
    const id = saleProduct.value;
    return products.find((p) => p._id === id) || null;
  }

  function updateProductMeta() {
    const p = selectedProduct();
    if (!p) {
      saleProductMeta.textContent = "—";
      return;
    }
    saleProductMeta.textContent = `Stock: ${money(p.stockQty)} • Price: UGX ${money(p.sellingPrice)}`;
  }

  function renderCart() {
    if (!cart.length) {
      cartTable.innerHTML = `<tr><td colspan="5" class="text-muted py-4">Cart is empty.</td></tr>`;
      cartTotalEl.textContent = "0";
      updateCreditBalance();
      return;
    }

    cartTable.innerHTML = cart.map((item) => {
      const lineTotal = item.unitPrice * item.quantity;
      return `
        <tr>
          <td class="fw-semibold">${escapeHtml(item.name)}</td>
          <td class="text-end">${money(item.unitPrice)}</td>
          <td class="text-end">${money(item.quantity)}</td>
          <td class="text-end">${money(lineTotal)}</td>
          <td class="text-end">
            <button class="btn btn-sm btn-outline-danger" data-remove="${item.productId}">Remove</button>
          </td>
        </tr>
      `;
    }).join("");

    const total = cart.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
    cartTotalEl.textContent = money(total);
    updateCreditBalance();
  }

  function updateCreditBalance() {
    const total = cart.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
    const paid = Number(amountPaidNow?.value || 0);
    const bal = Math.max(0, total - paid);
    creditBalance.textContent = money(bal);
  }

  async function loadProductsIntoSale() {
    saleProduct.innerHTML = `<option value="">Loading...</option>`;
    try {
      const data = await window.KGL.api("/api/products");
      products = (data.products || []).filter((p) => p.isActive !== false);

      if (!products.length) {
        saleProduct.innerHTML = `<option value="">No products found</option>`;
        saleProductMeta.textContent = "—";
        return;
      }

      saleProduct.innerHTML = `<option value="">Select product...</option>` +
        products.map((p) => `<option value="${p._id}">${escapeHtml(p.name)}</option>`).join("");

      saleProduct.value = "";
      updateProductMeta();
    } catch (err) {
      saleProduct.innerHTML = `<option value="">Failed to load products</option>`;
      saleProductMeta.textContent = err.message || "Error loading products";
    }
        window.KGLSales = {
    init: () => {
        loadProductsIntoSale();
        renderCart();
    }
    };
  }

  function getSaleType() {
    return saleCredit.checked ? "credit" : "cash";
  }

  // Events
  saleProduct?.addEventListener("change", updateProductMeta);
  amountPaidNow?.addEventListener("input", updateCreditBalance);

  saleCash?.addEventListener("change", () => {
    creditFields.classList.add("d-none");
  });

  saleCredit?.addEventListener("change", () => {
    creditFields.classList.remove("d-none");
    updateCreditBalance();
  });

  btnReloadSaleProducts?.addEventListener("click", () => {
    loadProductsIntoSale();
    window.KGL.ui.showToast("Sale products reloaded", "success");
  });

  btnAddToCart?.addEventListener("click", () => {
    clearMsg();
    const p = selectedProduct();
    const qty = Number(saleQty.value || 0);

    if (!p) return showMsg("error", "Select a product first.");
    if (!qty || qty < 1) return showMsg("error", "Quantity must be at least 1.");

    // Check stock (basic client check; server still enforces)
    if (qty > Number(p.stockQty || 0)) {
      return showMsg("error", `Not enough stock. Available: ${p.stockQty}`);
    }

    // If already in cart, increment
    const existing = cart.find((i) => i.productId === p._id);
    if (existing) {
      const newQty = existing.quantity + qty;
      if (newQty > Number(p.stockQty || 0)) {
        return showMsg("error", `Total qty exceeds stock. Available: ${p.stockQty}`);
      }
      existing.quantity = newQty;
    } else {
      cart.push({
        productId: p._id,
        name: p.name,
        unitPrice: Number(p.sellingPrice || 0),
        quantity: qty,
      });
    }

    renderCart();
    window.KGL.ui.showToast("Added to cart", "success");
  });

  cartTable?.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-remove]");
    if (!btn) return;
    const id = btn.getAttribute("data-remove");
    cart = cart.filter((i) => i.productId !== id);
    renderCart();
  });

  btnClearCart?.addEventListener("click", () => {
    cart = [];
    renderCart();
    clearMsg();
    window.KGL.ui.showToast("Cart cleared", "warning");
  });

  btnSubmitSale?.addEventListener("click", async () => {
    clearMsg();

    if (!cart.length) return showMsg("error", "Cart is empty.");
    const saleType = getSaleType();

    const payload = {
      saleType,
      items: cart.map((i) => ({ productId: i.productId, quantity: i.quantity })),
    };

    if (saleType === "credit") {
      payload.customerName = (customerName.value || "").trim();
      payload.customerPhone = (customerPhone.value || "").trim();
      payload.amountPaidNow = Number(amountPaidNow.value || 0);

      if (!payload.customerName) return showMsg("error", "Customer name is required for credit sales.");
      if (!payload.customerPhone) return showMsg("error", "Customer phone is required for credit sales.");
      if (payload.amountPaidNow < 0) return showMsg("error", "Amount paid now cannot be negative.");
    }

    btnSubmitSale.disabled = true;
    btnSubmitSale.textContent = "Submitting...";

    try {
      const data = await window.KGL.api("/api/sales", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      openReceipt(data.sale);

      showMsg("success", "Sale recorded successfully.");
      window.KGL.ui.showToast("Sale recorded", "success");

      // reset UI
      cart = [];
      renderCart();
      saleQty.value = 1;
      customerName.value = "";
      customerPhone.value = "";
      amountPaidNow.value = 0;
      creditFields.classList.add("d-none");
      saleCash.checked = true;

      // Refresh products stock for next sale
      await loadProductsIntoSale();

      console.log("Sale response:", data);
    } catch (err) {
      showMsg("error", err.message || "Failed to record sale.");
    } finally {
      btnSubmitSale.disabled = false;
      btnSubmitSale.textContent = "Submit Sale";
    }
  });

  // initial load
  loadProductsIntoSale();
  renderCart();
})();
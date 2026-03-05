(function () {
  const salesListTable = document.getElementById("salesListTable");
  const salesListError = document.getElementById("salesListError");

  const salesFilterType = document.getElementById("salesFilterType");
  const salesFilterFrom = document.getElementById("salesFilterFrom");
  const salesFilterTo = document.getElementById("salesFilterTo");
  const btnLoadSalesList = document.getElementById("btnLoadSalesList");

  // Modal
  const saleViewModalEl = document.getElementById("saleViewModal");
  const saleViewModal = saleViewModalEl ? new bootstrap.Modal(saleViewModalEl) : null;

  const svSub = document.getElementById("svSub");
  const svId = document.getElementById("svId");
  const svDate = document.getElementById("svDate");
  const svSoldBy = document.getElementById("svSoldBy");
  const svType = document.getElementById("svType");
  const svStatus = document.getElementById("svStatus");
  const svCustomerLine = document.getElementById("svCustomerLine");
  const svCustomer = document.getElementById("svCustomer");
  const svItems = document.getElementById("svItems");
  const svTotal = document.getElementById("svTotal");
  const svPaid = document.getElementById("svPaid");
  const svBalance = document.getElementById("svBalance");
  const svError = document.getElementById("svError");
  const btnOpenReceiptFromSale = document.getElementById("btnOpenReceiptFromSale");

  let lastViewedSale = null;

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

  function badge(el, status) {
    el.className = "badge";
    if (status === "paid") el.classList.add("text-bg-success");
    else if (status === "partial") el.classList.add("text-bg-warning");
    else el.classList.add("text-bg-secondary");
    el.textContent = status || "-";
  }

  function showListError(msg) {
    salesListError.textContent = msg;
    salesListError.classList.remove("d-none");
  }

  function clearListError() {
    salesListError.classList.add("d-none");
  }

  function buildQuery() {
    const params = new URLSearchParams();

    const type = (salesFilterType?.value || "").trim();
    const from = (salesFilterFrom?.value || "").trim();
    const to = (salesFilterTo?.value || "").trim();

    if (type) params.set("saleType", type);
    if (from) params.set("from", from);
    if (to) params.set("to", to);

    const q = params.toString();
    return q ? `?${q}` : "";
  }

  function renderSales(list) {
    if (!list.length) {
      salesListTable.innerHTML = `<tr><td colspan="7" class="text-muted ps-3 py-4">No sales found.</td></tr>`;
      return;
    }

    salesListTable.innerHTML = list.map((s) => {
      const date = s.createdAt ? new Date(s.createdAt).toLocaleString() : "-";
      const cust = s.customer?.name ? `${s.customer.name} (${s.customer.phone || "-"})` : "-";
      const soldBy = s.soldBy?.username || "-";

      return `
        <tr>
          <td class="ps-3">${escapeHtml(date)}</td>
          <td>${escapeHtml(s.saleType || "-")}</td>
          <td>${escapeHtml(cust)}</td>
          <td>${escapeHtml(soldBy)}</td>
          <td class="text-end">${money(s.totalAmount)}</td>
          <td class="text-end">${money(s.balance)}</td>
          <td class="text-end pe-3">
            <button class="btn btn-sm btn-outline-secondary" data-view-sale="${s._id}">View</button>
          </td>
        </tr>
      `;
    }).join("");
  }

  async function loadSalesList() {
    clearListError();
    salesListTable.innerHTML = `<tr><td colspan="7" class="text-muted ps-3 py-4">Loading...</td></tr>`;

    try {
      const data = await window.KGL.api(`/api/sales${buildQuery()}`);
      renderSales(data.sales || []);
    } catch (err) {
      salesListTable.innerHTML = `<tr><td colspan="7" class="text-danger ps-3 py-4">Failed to load sales.</td></tr>`;
      showListError(err.message || "Failed to load sales.");
    }
  }

  async function openSale(id) {
    svError.classList.add("d-none");
    lastViewedSale = null;

    try {
      const data = await window.KGL.api(`/api/sales/${id}`);
      const sale = data.sale;
      lastViewedSale = sale;

      svSub.textContent = `${(sale.saleType || "").toUpperCase()} • ${(sale.paymentStatus || "").toUpperCase()}`;
      svId.textContent = sale._id || "-";
      svDate.textContent = sale.createdAt ? new Date(sale.createdAt).toLocaleString() : "-";
      svSoldBy.textContent = sale.soldBy?.username || "-";
      svType.textContent = sale.saleType || "-";
      badge(svStatus, sale.paymentStatus);

      if (sale.saleType === "credit" && sale.customer?.name) {
        svCustomerLine.style.display = "";
        svCustomer.textContent = `${sale.customer.name} (${sale.customer.phone || "-"})`;
      } else {
        svCustomerLine.style.display = "none";
      }

      const items = sale.items || [];
      svItems.innerHTML = items.map((i) => `
        <tr>
          <td>${escapeHtml(i.name)}</td>
          <td class="text-end">${money(i.unitPrice)}</td>
          <td class="text-end">${money(i.quantity)}</td>
          <td class="text-end">${money(i.lineTotal)}</td>
        </tr>
      `).join("");

      svTotal.textContent = money(sale.totalAmount);
      svPaid.textContent = money(sale.amountPaid);
      svBalance.textContent = money(sale.balance);

      saleViewModal?.show();
    } catch (err) {
      svError.textContent = err.message || "Failed to load sale details.";
      svError.classList.remove("d-none");
    }
  }

  // Table view click
  salesListTable?.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-view-sale]");
    if (!btn) return;
    openSale(btn.getAttribute("data-view-sale"));
  });

  // Open receipt from viewed sale
  btnOpenReceiptFromSale?.addEventListener("click", () => {
  if (!lastViewedSale) return;

  // Close sale modal first
  const el = document.getElementById("saleViewModal");
  if (el) {
    el.addEventListener("hidden.bs.modal", function handler() {
      el.removeEventListener("hidden.bs.modal", handler);

      // Now open receipt on top (after modal fully closes)
      if (window.KGLReceipt?.open) {
        window.KGLReceipt.open(lastViewedSale);
      } else {
        window.KGL.ui?.showToast?.("Receipt helper not found.", "warning");
      }
    });

    saleViewModal?.hide();
  } else {
    // fallback
    window.KGLReceipt?.open?.(lastViewedSale);
  }
    });

  btnLoadSalesList?.addEventListener("click", loadSalesList);

  // Expose for dashboard panel switch
  window.KGLSalesList = { load: loadSalesList };
})();
(function () {
  const user = window.KGL.auth.getUser();
  const role = user?.role || "";

  // who can receive payments?
  const canReceive = ["manager", "sales_agent"].includes(role);
  const canView = ["manager", "sales_agent", "director"].includes(role);
  if (!canView) return;

  const creditsTable = document.getElementById("creditsTable");
  const creditsError = document.getElementById("creditsError");
  const btnLoadCredits = document.getElementById("btnLoadCredits");
  const cpSearch = document.getElementById("cpSearch");

  // Modal
  const creditPayModalEl = document.getElementById("creditPayModal");
  const creditPayModal = creditPayModalEl ? new bootstrap.Modal(creditPayModalEl) : null;

  const cpModalSub = document.getElementById("cpModalSub");
  const cpSaleId = document.getElementById("cpSaleId");

  const cpCustomer = document.getElementById("cpCustomer");
  const cpPhone = document.getElementById("cpPhone");
  const cpSoldBy = document.getElementById("cpSoldBy");
  const cpTotal = document.getElementById("cpTotal");
  const cpPaid = document.getElementById("cpPaid");
  const cpBalance = document.getElementById("cpBalance");

  const cpAmount = document.getElementById("cpAmount");
  const cpNote = document.getElementById("cpNote");
  const btnAddPayment = document.getElementById("btnAddPayment");

  const cpModalError = document.getElementById("cpModalError");
  const cpModalSuccess = document.getElementById("cpModalSuccess");
  const cpPaymentsTable = document.getElementById("cpPaymentsTable");

  let credits = [];
  let currentSale = null;

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

  function showCreditsError(msg) {
    creditsError.textContent = msg;
    creditsError.classList.remove("d-none");
  }

  function clearCreditsError() {
    creditsError.classList.add("d-none");
  }

  function modalMsg(type, msg) {
    cpModalError.classList.add("d-none");
    cpModalSuccess.classList.add("d-none");

    if (type === "error") {
      cpModalError.textContent = msg;
      cpModalError.classList.remove("d-none");
    } else if (type === "success") {
      cpModalSuccess.textContent = msg;
      cpModalSuccess.classList.remove("d-none");
    }
  }

  function applySearch(list) {
    const q = (cpSearch?.value || "").trim().toLowerCase();
    if (!q) return list;

    return list.filter((s) => {
      const name = (s.customer?.name || "").toLowerCase();
      const phone = (s.customer?.phone || "").toLowerCase();
      return name.includes(q) || phone.includes(q);
    });
  }

  function renderCredits(list) {
    const view = applySearch(list);

    if (!view.length) {
      creditsTable.innerHTML = `<tr><td colspan="8" class="text-muted ps-3 py-4">No outstanding credit sales.</td></tr>`;
      return;
    }

    creditsTable.innerHTML = view.map((s) => {
      const date = s.createdAt ? new Date(s.createdAt).toLocaleString() : "-";
      const cust = s.customer?.name || "-";
      const phone = s.customer?.phone || "-";
      const soldBy = s.soldBy?.username || "-";

      return `
        <tr>
          <td class="ps-3">${escapeHtml(date)}</td>
          <td>${escapeHtml(cust)}</td>
          <td>${escapeHtml(phone)}</td>
          <td>${escapeHtml(soldBy)}</td>
          <td class="text-end">${money(s.totalAmount)}</td>
          <td class="text-end">${money(s.amountPaid)}</td>
          <td class="text-end fw-semibold">${money(s.balance)}</td>
          <td class="text-end pe-3">
            <button class="btn btn-sm btn-primary" data-pay="${s._id}" ${canReceive ? "" : "disabled"}>
              Pay
            </button>
          </td>
        </tr>
      `;
    }).join("");
  }

  async function loadCredits() {
    clearCreditsError();
    creditsTable.innerHTML = `<tr><td colspan="8" class="text-muted ps-3 py-4">Loading...</td></tr>`;

    try {
      const data = await window.KGL.api("/api/sales?saleType=credit");
      const list = data.sales || [];

      // show only unpaid/partial balances
      credits = list.filter((s) => Number(s.balance || 0) > 0);
      renderCredits(credits);
    } catch (err) {
      creditsTable.innerHTML = `<tr><td colspan="8" class="text-danger ps-3 py-4">Failed to load credit sales.</td></tr>`;
      showCreditsError(err.message || "Failed to load credit sales.");
    }
  }

  function renderPayments(payments) {
    if (!payments || !payments.length) {
      cpPaymentsTable.innerHTML = `<tr><td colspan="4" class="text-muted py-3">No payments yet.</td></tr>`;
      return;
    }

    cpPaymentsTable.innerHTML = payments.map((p) => {
      const date = p.createdAt ? new Date(p.createdAt).toLocaleString() : "-";
      const by = p.receivedBy?.username || "-";
      const note = p.note || "";
      return `
        <tr>
          <td>${escapeHtml(date)}</td>
          <td>${escapeHtml(by)}</td>
          <td class="text-end">${money(p.amount)}</td>
          <td>${escapeHtml(note)}</td>
        </tr>
      `;
    }).join("");
  }

  async function openPayModal(saleId) {
    modalMsg("", "");
    currentSale = null;

    // load sale details
    const saleData = await window.KGL.api(`/api/sales/${saleId}`);
    currentSale = saleData.sale;

    cpSaleId.value = currentSale._id;
    cpModalSub.textContent = `Sale ${currentSale._id}`;

    cpCustomer.textContent = currentSale.customer?.name || "-";
    cpPhone.textContent = currentSale.customer?.phone || "-";
    cpSoldBy.textContent = currentSale.soldBy?.username || "-";

    cpTotal.textContent = money(currentSale.totalAmount);
    cpPaid.textContent = money(currentSale.amountPaid);
    cpBalance.textContent = money(currentSale.balance);

    // load payments history
    const payData = await window.KGL.api(`/api/sales/${saleId}/payments`);
    renderPayments(payData.payments || []);

    // default amount = remaining balance
    cpAmount.value = currentSale.balance || 0;
    cpNote.value = "";

    // lock add button if role can't receive
    btnAddPayment.disabled = !canReceive;

    creditPayModal?.show();
  }

  async function refreshCurrentModalSale() {
    if (!currentSale) return;

    const saleId = currentSale._id;

    const saleData = await window.KGL.api(`/api/sales/${saleId}`);
    currentSale = saleData.sale;

    cpTotal.textContent = money(currentSale.totalAmount);
    cpPaid.textContent = money(currentSale.amountPaid);
    cpBalance.textContent = money(currentSale.balance);

    const payData = await window.KGL.api(`/api/sales/${saleId}/payments`);
    renderPayments(payData.payments || []);
  }

  // events
  btnLoadCredits?.addEventListener("click", loadCredits);
  cpSearch?.addEventListener("input", () => renderCredits(credits));

  creditsTable?.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-pay]");
    if (!btn) return;
    openPayModal(btn.getAttribute("data-pay")).catch((err) => {
      window.KGL.ui?.showToast?.(err.message || "Failed to open payment", "danger");
    });
  });

  btnAddPayment?.addEventListener("click", async () => {
    if (!canReceive) return;

    modalMsg("", "");
    const saleId = cpSaleId.value;
    const amount = Number(cpAmount.value || 0);
    const note = (cpNote.value || "").trim();

    if (!saleId) return modalMsg("error", "Missing sale id.");
    if (!amount || amount <= 0) return modalMsg("error", "Enter a valid amount.");

    btnAddPayment.disabled = true;
    btnAddPayment.textContent = "Adding...";

    try {
      await window.KGL.api(`/api/sales/${saleId}/payments`, {
        method: "POST",
        body: JSON.stringify({ amount, note }),
      });

      modalMsg("success", "Payment added.");

      // refresh modal numbers + history
      await refreshCurrentModalSale();

      // refresh credits list so cleared balances disappear
      await loadCredits();
    } catch (err) {
      modalMsg("error", err.message || "Failed to add payment.");
    } finally {
      btnAddPayment.disabled = !canReceive;
      btnAddPayment.textContent = "Add";
    }
  });

  // expose loader for panel switching
  window.KGLPayments = { load: loadCredits };
})();

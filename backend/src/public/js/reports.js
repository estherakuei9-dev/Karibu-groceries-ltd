(function () {
  const user = window.KGL.auth.getUser();
  const role = user?.role || "";

  // Only manager/director should view reports (matches your backend rules)
  if (!["manager", "director"].includes(role)) return;

  const repFrom = document.getElementById("repFrom");
  const repTo = document.getElementById("repTo");
  const btnLoadReports = document.getElementById("btnLoadReports");
  const repError = document.getElementById("repError");

  // Summary
  const repTotalSales = document.getElementById("repTotalSales");
  const repSalesCount = document.getElementById("repSalesCount");
  const repTotalPaid = document.getElementById("repTotalPaid");
  const repTotalBalance = document.getElementById("repTotalBalance");
  const repCashSales = document.getElementById("repCashSales");
  const repCreditSales = document.getElementById("repCreditSales");
  const repCashCount = document.getElementById("repCashCount");
  const repCreditCount = document.getElementById("repCreditCount");

  // Stock
  const repStockItems = document.getElementById("repStockItems");
  const repStockQty = document.getElementById("repStockQty");
  const repStockTable = document.getElementById("repStockTable");

  // Agents
  const repAgentTable = document.getElementById("repAgentTable");

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

  function showError(msg) {
    repError.textContent = msg;
    repError.classList.remove("d-none");
  }

  function clearError() {
    repError.classList.add("d-none");
  }

  function buildRangeQuery() {
    const from = (repFrom?.value || "").trim();
    const to = (repTo?.value || "").trim();
    const p = new URLSearchParams();
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    const q = p.toString();
    return q ? `?${q}` : "";
  }

  function setTodayRangeDefault() {
    // default last 7 days for nice demo
    const now = new Date();
    const to = now.toISOString().slice(0, 10);
    const fromDate = new Date(now);
    fromDate.setDate(fromDate.getDate() - 7);
    const from = fromDate.toISOString().slice(0, 10);

    if (repFrom && !repFrom.value) repFrom.value = from;
    if (repTo && !repTo.value) repTo.value = to;
  }

  async function loadSummary() {
    const q = buildRangeQuery();
    const data = await window.KGL.api(`/api/reports/summary${q}`);
    const s = data.summary || {};

    repSalesCount.textContent = money(s.salesCount);
    repTotalSales.textContent = money(s.totalSales);
    repTotalPaid.textContent = money(s.totalPaid);
    repTotalBalance.textContent = money(s.totalBalance);
    repCashSales.textContent = money(s.cashSales);
    repCreditSales.textContent = money(s.creditSales);

    // some versions of your backend summary may not include counts.
    repCashCount.textContent = money(s.cashCount || 0);
    repCreditCount.textContent = money(s.creditCount || 0);
  }

  async function loadStock() {
    const data = await window.KGL.api(`/api/reports/stock`);
    const totals = data.totals || {};
    const products = data.products || [];

    repStockItems.textContent = money(totals.items || products.length);
    repStockQty.textContent = money(totals.totalStockQty || 0);

    if (!products.length) {
      repStockTable.innerHTML = `<tr><td colspan="6" class="text-muted py-3">No products found.</td></tr>`;
      return;
    }

    repStockTable.innerHTML = products.map((p) => `
      <tr>
        <td class="fw-semibold">${escapeHtml(p.name)}</td>
        <td>${escapeHtml(p.category || "-")}</td>
        <td>${escapeHtml(p.unit || "-")}</td>
        <td class="text-end">${money(p.stockQty)}</td>
        <td class="text-end">${money(p.buyingPrice)}</td>
        <td class="text-end">${money(p.sellingPrice)}</td>
      </tr>
    `).join("");
  }

  async function loadSalesByAgent() {
    const q = buildRangeQuery();
    const data = await window.KGL.api(`/api/reports/sales-by-agent${q}`);
    const agents = data.agents || [];

    if (!agents.length) {
      repAgentTable.innerHTML = `<tr><td colspan="7" class="text-muted py-3">No data for this range.</td></tr>`;
      return;
    }

    repAgentTable.innerHTML = agents.map((a) => `
      <tr>
        <td class="fw-semibold">${escapeHtml(a.username || "-")}</td>
        <td class="text-end">${money(a.salesCount)}</td>
        <td class="text-end">${money(a.totalSales)}</td>
        <td class="text-end">${money(a.totalPaid)}</td>
        <td class="text-end">${money(a.totalBalance)}</td>
        <td class="text-end">${money(a.cashSales)}</td>
        <td class="text-end">${money(a.creditSales)}</td>
      </tr>
    `).join("");
  }

  async function loadReports() {
    clearError();
    repStockTable.innerHTML = `<tr><td colspan="6" class="text-muted py-3">Loading...</td></tr>`;
    repAgentTable.innerHTML = `<tr><td colspan="7" class="text-muted py-3">Loading...</td></tr>`;

    try {
      await Promise.all([loadSummary(), loadStock(), loadSalesByAgent()]);
      window.KGL.ui?.showToast?.("Reports updated", "success");
    } catch (err) {
      showError(err.message || "Failed to load reports.");
    }
  }

  btnLoadReports?.addEventListener("click", loadReports);

  // expose for panel switching
  window.KGLReports = { load: loadReports, setDefaults: setTodayRangeDefault };

  // defaults for first time
  setTodayRangeDefault();
})();

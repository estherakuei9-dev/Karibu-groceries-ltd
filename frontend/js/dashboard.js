(function () {
  
  if (!window.KGL.auth.requireAuth()) return;

  const user = window.KGL.auth.getUser();
  const role = user?.role || "";

  
  document.getElementById("navUser").textContent = user?.username || "—";
  document.getElementById("navRole").textContent = window.KGL.ui.formatRole(role) || "—";
  document.getElementById("cardUser").textContent = user?.fullName ? `${user.fullName} (${user.username})` : (user?.username || "—");
  document.getElementById("cardRole").textContent = window.KGL.ui.formatRole(role) || "—";

  // Logout
  document.getElementById("btnLogout").addEventListener("click", () => window.KGL.auth.logout());

  document.querySelectorAll("[data-role]").forEach((el) => {
    const allowed = (el.getAttribute("data-role") || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    if (allowed.includes(role)) el.classList.remove("d-none");
  });

  (async () => {
    try {
      const res = await window.KGL.api("/health");
      document.getElementById("cardBackend").textContent = res.ok ? "Online" : "Unknown";
    } catch {
      document.getElementById("cardBackend").textContent = "Offline";
    }
  })();

  const menu = document.getElementById("menu");
  const title = document.getElementById("pageTitle");
  const hint = document.getElementById("pageHint");

  function showPanel(key) {
    document.querySelectorAll(".kgl-panel").forEach((p) => p.classList.add("d-none"));
    document.getElementById(`panel-${key}`).classList.remove("d-none");

    if (key === "products") {
    window.KGLProducts?.load();
    }
    if (key === "sales") {
    window.KGLSales?.init();
    }
    if (key === "sales") {
    window.KGLSales?.init?.();
    window.KGLSalesList?.load?.();
    }
    const map = {
      home: ["Dashboard", "Quick overview"],
      products: ["Products", "View available items"],
      sales: ["Sales", "Record and view sales"],
      payments: ["Credit Payments", "Track credit clearing"],
      users: ["User Management", "Manager only"],
      "manage-products": ["Manage Products", "Manager only"],
      reports: ["Reports", "Director & Manager"],
    };
    const [t, h] = map[key] || ["Dashboard", ""];
    title.textContent = t;
    hint.textContent = h;
  }

  menu.addEventListener("click", (e) => {
    const link = e.target.closest("a[data-page]");
    if (!link) return;
    e.preventDefault();

    menu.querySelectorAll("a").forEach((a) => a.classList.remove("active"));
    link.classList.add("active");

    showPanel(link.getAttribute("data-page"));
  });

  const btnLoadProducts = document.getElementById("btnLoadProducts");
  const productsTable = document.getElementById("productsTable");
  let productsLoadedOnce = false;

  async function loadProducts() {
    productsTable.innerHTML = `<tr><td colspan="5" class="text-muted">Loading...</td></tr>`;
    try {
      const data = await window.KGL.api("/api/products");
      const products = data.products || [];

      if (!products.length) {
        productsTable.innerHTML = `<tr><td colspan="5" class="text-muted">No products found.</td></tr>`;
        return;
      }

      productsTable.innerHTML = products
        .map((p) => {
          return `
            <tr>
              <td class="fw-semibold">${escapeHtml(p.name)}</td>
              <td>${escapeHtml(p.category || "-")}</td>
              <td>${escapeHtml(p.unit || "-")}</td>
              <td class="text-end">${Number(p.sellingPrice || 0).toLocaleString()}</td>
              <td class="text-end">${Number(p.stockQty || 0).toLocaleString()}</td>
            </tr>
          `;
        })
        .join("");
    } catch (err) {
      productsTable.innerHTML = `<tr><td colspan="5" class="text-danger">Failed: ${escapeHtml(err.message)}</td></tr>`;
    }
  }

  function escapeHtml(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  btnLoadProducts.addEventListener("click", () => {
    loadProducts();
    window.KGL.ui.showToast("Products refreshed", "success");
  });

  showPanel("home");
})();

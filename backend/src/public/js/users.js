(function () {
  const user = window.KGL.auth.getUser();
  const role = user?.role || "";
  if (role !== "manager") return;

  const usersTable = document.getElementById("usersTable");
  const usersError = document.getElementById("usersError");
  const btnLoadUsers = document.getElementById("btnLoadUsers");
  const userSearch = document.getElementById("userSearch");

  const btnOpenAddUser = document.getElementById("btnOpenAddUser");

  // modal
  const addUserModalEl = document.getElementById("addUserModal");
  const addUserModal = addUserModalEl ? new bootstrap.Modal(addUserModalEl) : null;

  const auFullName = document.getElementById("auFullName");
  const auUsername = document.getElementById("auUsername");
  const auPassword = document.getElementById("auPassword");
  const auRole = document.getElementById("auRole");

  const btnCreateUser = document.getElementById("btnCreateUser");
  const auError = document.getElementById("auError");
  const auSuccess = document.getElementById("auSuccess");

  let users = [];

  function escapeHtml(str) {
    return String(str ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function badge(active) {
    return active
      ? `<span class="badge text-bg-success">Active</span>`
      : `<span class="badge text-bg-secondary">Disabled</span>`;
  }

  function showErr(msg) {
    usersError.textContent = msg;
    usersError.classList.remove("d-none");
  }

  function clearErr() {
    usersError.classList.add("d-none");
  }

  function modalMsg(type, msg) {
    auError.classList.add("d-none");
    auSuccess.classList.add("d-none");

    if (type === "error") {
      auError.textContent = msg;
      auError.classList.remove("d-none");
    } else if (type === "success") {
      auSuccess.textContent = msg;
      auSuccess.classList.remove("d-none");
    }
  }

  function filterUsers(list) {
    const q = (userSearch?.value || "").trim().toLowerCase();
    if (!q) return list;

    return list.filter((u) => {
      const fn = (u.fullName || "").toLowerCase();
      const un = (u.username || "").toLowerCase();
      return fn.includes(q) || un.includes(q);
    });
  }

  function renderUsers(list) {
    const view = filterUsers(list);

    if (!view.length) {
      usersTable.innerHTML = `<tr><td colspan="5" class="text-muted ps-3 py-4">No users found.</td></tr>`;
      return;
    }

    usersTable.innerHTML = view.map((u) => {
      const active = u.isActive !== false;
      return `
        <tr>
          <td class="ps-3 fw-semibold">${escapeHtml(u.fullName || "-")}</td>
          <td>${escapeHtml(u.username || "-")}</td>
          <td>${escapeHtml(u.role || "-")}</td>
          <td>${badge(active)}</td>
          <td class="text-end pe-3">
            <button class="btn btn-sm ${active ? "btn-outline-danger" : "btn-outline-success"}"
              data-toggle-user="${u.id}">
              ${active ? "Disable" : "Activate"}
            </button>
          </td>
        </tr>
      `;
    }).join("");
  }

  async function loadUsers() {
    clearErr();
    usersTable.innerHTML = `<tr><td colspan="5" class="text-muted ps-3 py-4">Loading...</td></tr>`;

    try {
      const data = await window.KGL.api("/api/users");
      users = data.users || [];
      renderUsers(users);
    } catch (err) {
      usersTable.innerHTML = `<tr><td colspan="5" class="text-danger ps-3 py-4">Failed to load users.</td></tr>`;
      showErr(err.message || "Failed to load users.");
    }
  }

  async function toggleUser(id) {
    const u = users.find((x) => x.id === id);
    if (!u) return;

    const newState = !(u.isActive !== false); // if active -> false, else true

    await window.KGL.api(`/api/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ isActive: newState }),
    });

    await loadUsers();
    window.KGL.ui?.showToast?.("User updated", "success");
  }

  // events
  btnLoadUsers?.addEventListener("click", loadUsers);
  userSearch?.addEventListener("input", () => renderUsers(users));

  btnOpenAddUser?.addEventListener("click", () => {
    modalMsg("", "");
    auFullName.value = "";
    auUsername.value = "";
    auPassword.value = "";
    auRole.value = "sales_agent";
    addUserModal?.show();
  });

  btnCreateUser?.addEventListener("click", async () => {
    modalMsg("", "");

    const payload = {
      fullName: (auFullName.value || "").trim(),
      username: (auUsername.value || "").trim(),
      password: (auPassword.value || ""),
      role: auRole.value,
    };

    if (!payload.fullName) return modalMsg("error", "Full name is required.");
    if (!payload.username) return modalMsg("error", "Username is required.");
    if (!payload.password || payload.password.length < 4) return modalMsg("error", "Password must be at least 4 characters.");

    btnCreateUser.disabled = true;
    btnCreateUser.textContent = "Creating...";

    try {
      await window.KGL.api("/api/users", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      modalMsg("success", "User created.");
      window.KGL.ui?.showToast?.("User created", "success");

      await loadUsers();
    } catch (err) {
      modalMsg("error", err.message || "Failed to create user.");
    } finally {
      btnCreateUser.disabled = false;
      btnCreateUser.textContent = "Create";
    }
  });

  usersTable?.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-toggle-user]");
    if (!btn) return;
    toggleUser(btn.getAttribute("data-toggle-user")).catch((err) => {
      window.KGL.ui?.showToast?.(err.message || "Failed to update user", "danger");
    });
  });

  window.KGLUsers = { load: loadUsers };
})();

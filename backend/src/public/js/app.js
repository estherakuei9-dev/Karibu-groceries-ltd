(function () {
  const BASE_URL = "http://localhost:3000";

  const STORAGE_KEYS = {
    token: "kgl_token",
    user: "kgl_user",
  };

  function getToken() {
    return localStorage.getItem(STORAGE_KEYS.token);
  }

  function setSession(token, user) {
    localStorage.setItem(STORAGE_KEYS.token, token);
    localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user));
  }

  function clearSession() {
    localStorage.removeItem(STORAGE_KEYS.token);
    localStorage.removeItem(STORAGE_KEYS.user);
  }

  function getUser() {
    const raw = localStorage.getItem(STORAGE_KEYS.user);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  function isLoggedIn() {
    return !!getToken();
  }

  function requireAuth() {
    if (!isLoggedIn()) {
      window.location.replace("../pages/login.html");
      return false;
    }
    return true;
  }

  function roleRedirect(user) {
    // dashboard hides/ shows menu based on role.
    window.location.replace("../pages/dashboard.html");
  }

  async function api(path, options = {}) {
    const headers = Object.assign(
      { "Content-Type": "application/json" },
      options.headers || {}
    );

    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers,
    });

    const contentType = res.headers.get("content-type") || "";
    const data = contentType.includes("application/json") ? await res.json() : await res.text();

    if (!res.ok) {
      const message =
        (data && data.message) ||
        (typeof data === "string" && data) ||
        `Request failed (${res.status})`;
      const err = new Error(message);
      err.status = res.status;
      err.data = data;
      throw err;
    }

    return data;
  }

  async function logout() {

    try {
      await api("/api/auth/logout", { method: "POST" });
    } catch (_) {
      
    }
    clearSession();
    window.location.replace("../pages/login.html");
  }

  function formatRole(role) {
    if (!role) return "";
    return role.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }

  function showToast(message, type = "info") {
    const el = document.getElementById("kglToast");
    const body = document.getElementById("kglToastBody");
    if (!el || !body) return alert(message);

    body.textContent = message;

    el.className = `toast align-items-center text-bg-${type} border-0`;
    const toast = new bootstrap.Toast(el, { delay: 2500 });
    toast.show();
  }

  window.KGL = {
    config: { BASE_URL },
    api,
    auth: { getToken, setSession, clearSession, getUser, isLoggedIn, requireAuth, roleRedirect, logout },
    ui: { showToast, formatRole },
  };
})();

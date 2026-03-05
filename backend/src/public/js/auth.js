(function () {
  const form = document.getElementById("loginForm");
  if (!form) return;

  if (window.KGL.auth.isLoggedIn()) {
    window.location.replace("./dashboard.html");
    return;
  }

  const inputUsername = document.getElementById("username");
  const inputPassword = document.getElementById("password");
  const btnLogin = document.getElementById("btnLogin");
  const errorBox = document.getElementById("errorBox");

  function setError(msg) {
    errorBox.textContent = msg;
    errorBox.classList.remove("d-none");
  }

  function clearError() {
    errorBox.textContent = "";
    errorBox.classList.add("d-none");
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearError();

    const username = (inputUsername.value || "").trim();
    const password = inputPassword.value || "";

    if (!username || !password) {
      setError("Please enter username and password.");
      return;
    }

    btnLogin.disabled = true;
    btnLogin.textContent = "Signing in...";

    try {
      const data = await window.KGL.api("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });

      window.KGL.auth.setSession(data.token, data.user);
      window.KGL.auth.roleRedirect(data.user);
    } catch (err) {
      setError(err.message || "Login failed.");
    } finally {
      btnLogin.disabled = false;
      btnLogin.textContent = "Login";
    }
  });
})();

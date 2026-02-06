/* ============================================================
   CCG ADMIN — AUTH CONTROLLER (NON-BLOCKING)
   File: /admin/js/auth.js

   Purpose:
   - Detect auth state
   - NEVER block editor boot
   - Allow read-only mode if session missing
   ============================================================ */

(() => {
  "use strict";

  const LOG = "[CCG-AUTH]";

  function log(...a) {
    console.log(LOG, ...a);
  }
  function warn(...a) {
    console.warn(LOG, ...a);
  }
  function err(...a) {
    console.error(LOG, ...a);
  }

  // Public state
  window.CCG_AUTH_READY = false;
  window.CCG_AUTH_LOGGED_IN = false;
  window.CCG_AUTH_ROLE = "none";

  /* -----------------------------
     SESSION CHECK
  ----------------------------- */

  async function checkSession() {
    try {
      const token =
        localStorage.getItem("ccg_admin_token") ||
        sessionStorage.getItem("ccg_admin_token");

      if (!token) {
        warn("role=none session=missing cache=cleared");

        window.CCG_AUTH_READY = true;
        window.CCG_AUTH_LOGGED_IN = false;
        window.CCG_AUTH_ROLE = "none";

        notifyAuthReady();
        return;
      }

      // Optional: future server validation hook
      // For now: token presence = logged in

      log("session=active");

      window.CCG_AUTH_READY = true;
      window.CCG_AUTH_LOGGED_IN = true;
      window.CCG_AUTH_ROLE =
        localStorage.getItem("ccg_admin_role") || "admin";

      notifyAuthReady();
    } catch (e) {
      err("Auth check failed:", e);

      // Fail open (never block editor)
      window.CCG_AUTH_READY = true;
      window.CCG_AUTH_LOGGED_IN = false;
      window.CCG_AUTH_ROLE = "none";

      notifyAuthReady();
    }
  }

  /* -----------------------------
     EVENT DISPATCH
  ----------------------------- */

  function notifyAuthReady() {
    window.dispatchEvent(
      new CustomEvent("ccg:auth:ready", {
        detail: {
          loggedIn: window.CCG_AUTH_LOGGED_IN,
          role: window.CCG_AUTH_ROLE,
        },
      })
    );
  }

  /* -----------------------------
     UI HELPERS (OPTIONAL)
  ----------------------------- */

  window.CCG_REQUIRE_AUTH = function () {
    if (!window.CCG_AUTH_LOGGED_IN) {
      alert("You must be signed in to perform this action.");
      return false;
    }
    return true;
  };

  /* -----------------------------
     INIT
  ----------------------------- */

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", checkSession);
  } else {
    checkSession();
  }
})();
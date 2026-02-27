// ============================================================
// CCG ADMIN NAV (LOCKED)
// - Safe nav injection (only when page lacks its own shell)
// - Robust logout binding (works for button + link variants)
// - Uses window.ccgSupabase.getClient() (no extra auth-ui injection)
// ============================================================

const DEFAULT_LINKS = [
  { href: "/admin/dashboard.html", label: "Dashboard", key: "dashboard" },
  { href: "/admin/games-editor.html", label: "Game Builder Wizard (Primary)", key: "games-editor" },
  { href: "/admin/games-json-editor.html", label: "Legacy Bulk Editor — Legacy (not used)", key: "games-json-editor" },
  { href: "/admin/announce.html", label: "Announcements", key: "announce" },
  { href: "/admin/members.html", label: "Members", key: "members" },
  { href: "/admin/help.html", label: "Help & Workflow", key: "help" }
];

function text(v) {
  return String(v ?? "").trim();
}

function getActiveKey(activeKey) {
  const key = text(activeKey);
  return key || "";
}

function markActiveLink(navEl, activeKey) {
  const key = getActiveKey(activeKey);
  if (!key) return;

  const links = navEl.querySelectorAll("[data-nav]");
  links.forEach((a) => {
    const k = text(a.getAttribute("data-nav"));
    if (k && k === key) a.classList.add("is-active");
    else a.classList.remove("is-active");
  });
}

function buildNavShell({ pageLabel = "CCG Admin Panel", active = "" } = {}) {
  const shell = document.createElement("div");
  shell.className = "omega-admin-shell";
  shell.setAttribute("data-admin-shell", "");

  const panel = document.createElement("nav");
  panel.className = "ccg-admin-nav ccg-admin-panel";
  panel.setAttribute("aria-label", "Admin navigation");

  // Primary row
  DEFAULT_LINKS.forEach((item) => {
    const a = document.createElement("a");
    a.href = item.href;
    a.textContent = item.label;
    a.setAttribute("data-nav", item.key);
    panel.appendChild(a);
  });

  // Logout
  const logoutBtn = document.createElement("button");
  logoutBtn.type = "button";
  logoutBtn.textContent = "Logout";
  logoutBtn.setAttribute("data-admin-logout", "");
  panel.appendChild(logoutBtn);

  const header = document.createElement("div");
  header.className = "ccg-admin-panel__meta";
  header.innerHTML = `
    <div class="ccg-admin-panel__title">${pageLabel}</div>
    <div class="ccg-admin-panel__user">
      <span data-admin-email></span>
      <span class="ccg-admin-panel__role" data-admin-role></span>
    </div>
  `;

  shell.appendChild(panel);
  shell.appendChild(header);

  markActiveLink(panel, active);

  return { shell, panel };
}

async function getSupabaseClient() {
  if (!window.ccgSupabase || typeof window.ccgSupabase.getClient !== "function") {
    throw new Error("Supabase client bootstrap is unavailable on this page.");
  }
  return window.ccgSupabase.getClient();
}

async function doLogout() {
  try {
    const supabase = await getSupabaseClient();
    await supabase.auth.signOut();
  } catch (e) {
    // fail-closed: still redirect even if signOut throws
    console.warn("[admin-nav] signOut failed (continuing)", e);
  } finally {
    // hard redirect (clears any in-memory state)
    location.href = "/admin/login.html";
  }
}

function bindLogoutOnce() {
  // Bind to every supported logout control.
  const selectors = ["[data-admin-logout]", "[data-logout]", "[data-admin-logout-link]"];
  const nodes = document.querySelectorAll(selectors.join(","));
  nodes.forEach((node) => {
    if (node.dataset && node.dataset.logoutBound === "1") return;
    if (node.dataset) node.dataset.logoutBound = "1";

    node.addEventListener("click", (e) => {
      e.preventDefault();
      doLogout();
    });
  });

  if (nodes.length) {
    console.log("[CCG-AUTH-UI] logout bound");
  }
}

export function initAdminNav({ pageLabel = "CCG Admin Panel", active = "" } = {}) {
  // If page already has its own shell/nav, do not inject.
  const hasShell = !!document.querySelector("[data-admin-shell]");
  if (!hasShell) {
    // Inject at top of body (safe, minimal)
    const { shell } = buildNavShell({ pageLabel, active });
    document.body.prepend(shell);
  } else {
    // Still mark active on existing nav if it has data-nav attributes.
    const existingNav = document.querySelector(".ccg-admin-nav");
    if (existingNav) markActiveLink(existingNav, active);
  }

  bindLogoutOnce();
}

// Also auto-bind on pages that include this script
// (does not inject unless initAdminNav is called)
document.addEventListener("DOMContentLoaded", () => bindLogoutOnce());
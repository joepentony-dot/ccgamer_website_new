import { getAuthContext, waitForAuthReady } from "./auth.js";

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[char]));
}

async function getSupabaseClient() {
  if (!window.ccgSupabase || typeof window.ccgSupabase.getClient !== "function") {
    throw new Error("Supabase client bootstrap is unavailable on this page.");
  }
  return window.ccgSupabase.getClient();
}

function bindLogout(shell) {
  const logoutEls = shell.querySelectorAll("[data-admin-logout], [data-logout], [data-admin-logout-link]");
  logoutEls.forEach((el) => {
    el.addEventListener("click", async (e) => {
      e.preventDefault();

      try {
        const supabase = await getSupabaseClient();
        await supabase.auth.signOut();
      } catch (err) {
        // fail-silent: we still redirect, because the goal is to end the session UX
        console.warn("[admin] signOut failed (continuing)", err);
      } finally {
        // hard redirect to login
        window.location.href = "/admin/login.html";
      }
    });
  });
}

export async function initAdminNav({ pageLabel = "Dashboard", active = "dashboard" } = {}) {
  const host = document.querySelector("[data-admin-shell]") || document.body;

  const shell = document.createElement("div");
  shell.className = "omega-admin-shell";

  shell.innerHTML = `
    <div class="omega-admin-bar">
      <div class="omega-admin-brand">
        <strong>CCG ADMIN PANEL</strong>
        <span>${escapeHtml(pageLabel)}</span>
      </div>

      <nav class="omega-admin-links" aria-label="CCG admin navigation">
        <a href="/admin/dashboard.html" data-nav="dashboard">Dashboard</a>
        <a href="/admin/games-editor.html" data-nav="editor">Game Builder Wizard (Primary)</a>
        <a href="/admin/games-json-editor.html" data-nav="audit">Legacy Bulk Editor — Legacy (not used)</a>
        <a href="/admin/announce.html" data-nav="announce">Announcements</a>
        <a href="/admin/members.html" data-nav="members">Members</a>
        <a href="/admin/member-submissions.html" data-nav="submissions">Member Submissions</a>
        <a href="/admin/help.html" data-nav="help">Help &amp; Workflow</a>
        <button type="button" class="ccg-btn ccg-btn--ghost" data-nav="logout" data-admin-logout>Logout</button>
      </nav>

      <div class="omega-admin-session" data-admin-session>Session: checking…</div>
    </div>
  `;

  host.prepend(shell);

  const activeLink = shell.querySelector(`[data-nav="${active}"]`);
  if (activeLink) activeLink.classList.add("is-active");

  bindLogout(shell);

  const sessionNode = shell.querySelector("[data-admin-session]");

  try {
    await waitForAuthReady();
    const context = await getAuthContext();

    if (!context?.session?.user) {
      sessionNode.textContent = "Session: guest";
      return;
    }

    const role = context.role || "unknown";
    const email = context?.session?.user?.email || context?.user?.email || "unknown";
    sessionNode.textContent = `${email} · role ${role}`;
  } catch {
    sessionNode.textContent = "Session status unavailable.";
  }
}

export function injectDeprecatedBanner(message = "Legacy admin page") {
  const existing = document.querySelector(".omega-deprecated-banner");
  if (existing) return;

  const banner = document.createElement("aside");
  banner.className = "omega-deprecated-banner";
  banner.innerHTML = `<strong>Deprecated:</strong> ${escapeHtml(message)}. Use <a href="/admin/games-editor.html">/admin/games-editor.html</a> for the guided game package workflow.`;

  const parent = document.querySelector(".ccg-page") || document.body;
  parent.prepend(banner);
}

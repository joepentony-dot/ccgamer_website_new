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
        console.warn("[admin] signOut failed (continuing)", err);
      } finally {
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
        <div class="omega-admin-links__group omega-admin-links__group--primary" aria-label="Main admin tools">
          <a href="/admin/dashboard.html" data-nav="dashboard">Dashboard</a>
          <a href="/admin/content-publisher.html" data-nav="publisher">Content Publisher</a>
          <a href="/admin/announce.html" data-nav="announce">Announcements</a>
          <a href="/admin/members.html" data-nav="members">Members</a>
          <a href="/admin/member-submissions.html" data-nav="submissions">Member Submissions</a>
        </div>

        <div class="omega-admin-links__group omega-admin-links__group--tools" aria-label="Admin tools and diagnostics">
          <span class="omega-admin-links__label">Tools</span>
          <a href="/admin/arcade-assets.html" data-nav="arcade">Arcade Asset Manager</a>
          <a href="/admin/lost-sizzler-feedback.html" data-nav="feedback">Bug Reports</a>
          <a href="/admin/analytics-growth.html" data-nav="analytics">Analytics &amp; Growth</a>
          <a href="/admin/seo-opportunity-centre.html" data-nav="seo">SEO Opportunity Centre</a>
          <a href="/admin/member-hub-health.html" data-nav="health">Member Hub Health</a>
          <a href="/admin/archive-quality.html" data-nav="quality">Archive Quality</a>
          <a href="/admin/games-editor.html" data-nav="editor">Legacy Game Builder</a>
          <a href="/admin/help.html" data-nav="help">Help &amp; Workflow</a>
        </div>

        <a href="/home.html" class="ccg-btn ccg-btn--ghost omega-admin-links__exit" data-nav="exit" title="Return to the public website without signing out">Exit Admin</a>
        <button type="button" class="ccg-btn ccg-btn--ghost omega-admin-links__logout" data-nav="logout" data-admin-logout>Logout</button>
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
  banner.innerHTML = `<strong>Legacy tool:</strong> ${escapeHtml(message)}. Use <a href="/admin/content-publisher.html">CCG Content Publisher</a> for normal game and video publishing.`;

  const parent = document.querySelector(".ccg-page") || document.body;
  parent.prepend(banner);
}

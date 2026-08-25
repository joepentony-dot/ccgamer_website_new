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

function adminGroup(label, key, links) {
  const renderedLinks = links.map((link) => (
    `<a href="${link.href}" data-nav="${link.nav}">${link.label}</a>`
  )).join("");

  return `
    <section class="omega-admin-links__group-card" data-admin-group="${key}" aria-label="${escapeHtml(label)}">
      <span class="omega-admin-links__label">${escapeHtml(label)}</span>
      <div class="omega-admin-links__group-items">${renderedLinks}</div>
    </section>
  `;
}

export async function initAdminNav({ pageLabel = "Dashboard", active = "dashboard" } = {}) {
  const host = document.querySelector("[data-admin-shell]") || document.body;

  const shell = document.createElement("div");
  shell.className = "omega-admin-shell";

  const groups = [
    adminGroup("Core", "core", [
      { href: "/admin/dashboard.html", nav: "dashboard", label: "Dashboard" },
      { href: "/admin/content-publisher.html", nav: "publisher", label: "Content Publisher" },
      { href: "/admin/announce.html", nav: "announce", label: "Announcements" },
    ]),
    adminGroup("Members", "members", [
      { href: "/admin/members.html", nav: "members", label: "Members" },
      { href: "/admin/member-submissions.html", nav: "submissions", label: "Member Submissions" },
    ]),
    adminGroup("Lost Sizzler", "lost-sizzler", [
      { href: "/admin/arcade-assets.html", nav: "arcade", label: "Arcade Asset Manager" },
      { href: "/admin/lost-sizzler-voices.html", nav: "voices", label: "Voice Overrides" },
      { href: "/admin/lost-sizzler-feedback.html", nav: "feedback", label: "Bug Reports" },
      { href: "/admin/lost-sizzler-ratings.html", nav: "ratings", label: "Game Ratings" },
    ]),
    adminGroup("Site & Growth", "site-growth", [
      { href: "/admin/analytics-growth.html", nav: "analytics", label: "Analytics &amp; Growth" },
      { href: "/admin/seo-opportunity-centre.html", nav: "seo", label: "SEO Opportunity Centre" },
      { href: "/admin/member-hub-health.html", nav: "health", label: "Member Hub Health" },
      { href: "/admin/archive-quality.html", nav: "quality", label: "Archive Quality" },
    ]),
    adminGroup("Maintenance", "maintenance", [
      { href: "/admin/games-editor.html", nav: "editor", label: "Legacy Game Builder" },
      { href: "/admin/help.html", nav: "help", label: "Help &amp; Workflow" },
    ]),
  ].join("");

  shell.innerHTML = `
    <div class="omega-admin-bar">
      <div class="omega-admin-brand">
        <strong>CCG ADMIN PANEL</strong>
        <span>${escapeHtml(pageLabel)}</span>
      </div>

      <nav class="omega-admin-links" aria-label="CCG admin navigation">
        <div class="omega-admin-links__group-grid" aria-label="Admin tool groups">
          ${groups}
        </div>

        <div class="omega-admin-links__session-actions" aria-label="Admin session actions">
          <a href="/home.html" class="ccg-btn ccg-btn--ghost omega-admin-links__exit" data-nav="exit" title="Return to the public website without signing out">Exit Admin</a>
          <button type="button" class="ccg-btn ccg-btn--ghost omega-admin-links__logout" data-nav="logout" data-admin-logout>Logout</button>
        </div>
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

import { AUTH_CONFIG } from './config.js';
import { logout, restoreSession } from './auth.js';
import { fetchUserRole } from './roles.js';

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}

export async function initAdminNav({ pageLabel = 'Dashboard', active = 'dashboard' } = {}) {
  const host = document.querySelector('[data-admin-shell]') || document.body;
  const shell = document.createElement('div');
  shell.className = 'omega-admin-shell';

  shell.innerHTML = `
    <div class="omega-admin-bar">
      <div class="omega-admin-brand">
        <strong>OMEGA CONTROL CENTRE</strong>
        <span>${escapeHtml(pageLabel)}</span>
      </div>
      <nav class="omega-admin-links" aria-label="Omega admin navigation">
        <a href="/admin/dashboard.html" data-nav="dashboard">Dashboard</a>
        <a href="/admin/games-editor.html" data-nav="editor">Editor</a>
        <a href="/admin/publish.html" data-nav="publish">Publish</a>
        <a href="/admin/help.html" data-nav="help">Help</a>
        <a href="#" data-nav="logout" data-admin-logout-link>Logout</a>
      </nav>
      <div class="omega-admin-session" data-admin-session>Session: checking…</div>
    </div>
  `;

  host.prepend(shell);
  const activeLink = shell.querySelector(`[data-nav="${active}"]`);
  if (activeLink) activeLink.classList.add('is-active');

  const sessionNode = shell.querySelector('[data-admin-session]');

  async function handleLogout(event) {
    event.preventDefault();
    try {
      await logout();
      window.location.replace(AUTH_CONFIG.postLogoutRedirect);
    } catch {
      sessionNode.textContent = 'Could not sign out. Try again.';
    }
  }

  const logoutLink = shell.querySelector('[data-admin-logout-link]');
  logoutLink?.addEventListener('click', handleLogout);

  try {
    const session = await restoreSession();
    if (!session?.user) {
      sessionNode.innerHTML = 'Session: guest';
      return;
    }

    const role = await fetchUserRole({ userId: session.user.id }).catch(() => 'unknown');
    sessionNode.textContent = `${session.user.email || 'unknown'} · role ${role}`;
  } catch {
    sessionNode.textContent = 'Session status unavailable.';
  }
}

export function injectDeprecatedBanner(message = 'Legacy admin page') {
  const existing = document.querySelector('.omega-deprecated-banner');
  if (existing) return;

  const banner = document.createElement('aside');
  banner.className = 'omega-deprecated-banner';
  banner.innerHTML = `<strong>Deprecated:</strong> ${escapeHtml(message)}. Use <a href="/admin/dashboard.html">/admin/dashboard.html</a> for the unified Omega workflow.`;

  const parent = document.querySelector('.ccg-page') || document.body;
  parent.prepend(banner);
}

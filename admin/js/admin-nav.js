import { getAuthContext, waitForAuthReady } from './auth.js';

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}


function ensureSharedLogoutBinding() {
  if (document.querySelector('script[data-ccg-auth-ui]')) return;
  const script = document.createElement('script');
  script.src = '/js/ccg-auth-ui.js';
  script.defer = true;
  script.dataset.ccgAuthUi = 'true';
  document.head.appendChild(script);
}

export async function initAdminNav({ pageLabel = 'Dashboard', active = 'dashboard' } = {}) {
  const host = document.querySelector('[data-admin-shell]') || document.body;
  const shell = document.createElement('div');
  shell.className = 'omega-admin-shell';

  shell.innerHTML = `
    <div class="omega-admin-bar">
      <div class="omega-admin-brand">
        <strong>CCG ADMIN PANEL</strong>
        <span>${escapeHtml(pageLabel)}</span>
      </div>
      <nav class="omega-admin-links" aria-label="CCG admin navigation">
        <a href="/admin/dashboard.html" data-nav="dashboard">Dashboard</a>
        <a href="/admin/games-editor.html" data-nav="editor">Editor</a>
        <a href="/admin/publish.html" data-nav="publish">Publish</a>
        <a href="/admin/help.html" data-nav="help">Help</a>
        <a href="#" data-nav="logout" data-admin-logout-link data-logout>Logout</a>
      </nav>
      <div class="omega-admin-session" data-admin-session>Session: checking…</div>
    </div>
  `;

  host.prepend(shell);
  ensureSharedLogoutBinding();
  const activeLink = shell.querySelector(`[data-nav="${active}"]`);
  if (activeLink) activeLink.classList.add('is-active');

  const sessionNode = shell.querySelector('[data-admin-session]');

  try {
    await waitForAuthReady();
    const context = await getAuthContext();
    if (!context?.isAuthenticated || !context?.user) {
      sessionNode.innerHTML = 'Session: guest';
      return;
    }

    const role = context.role || 'unknown';
    sessionNode.textContent = `${context.user.email || 'unknown'} · role ${role}`;
  } catch {
    sessionNode.textContent = 'Session status unavailable.';
  }
}

export function injectDeprecatedBanner(message = 'Legacy admin page') {
  const existing = document.querySelector('.omega-deprecated-banner');
  if (existing) return;

  const banner = document.createElement('aside');
  banner.className = 'omega-deprecated-banner';
  banner.innerHTML = `<strong>Deprecated:</strong> ${escapeHtml(message)}. Use <a href="/admin/games-editor.html">/admin/games-editor.html</a> for the guided game package workflow.`;

  const parent = document.querySelector('.ccg-page') || document.body;
  parent.prepend(banner);
}

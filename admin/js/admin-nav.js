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

async function getSupabaseClientSafe() {
  if (window.ccgSupabase && typeof window.ccgSupabase.getClient === 'function') {
    return window.ccgSupabase.getClient();
  }
  return null;
}

function bindLogout(root = document) {
  const nodes = root.querySelectorAll('[data-admin-logout], [data-admin-logout-link], [data-logout]');
  nodes.forEach((node) => {
    if (node.dataset.ccgLogoutBound === '1') return;
    node.dataset.ccgLogoutBound = '1';

    node.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();

      try {
        const supabase = await getSupabaseClientSafe();
        if (supabase?.auth?.signOut) {
          await supabase.auth.signOut();
        }
      } catch (err) {
        console.warn('[admin-nav] logout signOut failed (continuing)', err);
      } finally {
        // Hard redirect regardless, so you *always* leave authed pages
        window.location.href = '/admin/login.html';
      }
    });
  });
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
        <a href="/admin/games-editor.html" data-nav="editor">Game Builder Wizard (Primary)</a>
        <a href="/admin/games-json-editor.html" data-nav="audit">Legacy Bulk Editor — Legacy (not used)</a>
        <a href="/admin/announce.html" data-nav="announce">Announcements</a>
        <a href="/admin/members.html" data-nav="members">Members</a>
        <a href="/admin/help.html" data-nav="help">Help &amp; Workflow</a>
        <a href="/admin/login.html" data-nav="logout" data-admin-logout-link data-logout>Logout</a>
      </nav>
      <div class="omega-admin-session" data-admin-session>Session: checking…</div>
    </div>
  `;

  host.prepend(shell);

  const activeLink = shell.querySelector(`[data-nav="${active}"]`);
  if (activeLink) activeLink.classList.add('is-active');

  bindLogout(shell);

  const sessionNode = shell.querySelector('[data-admin-session]');

  try {
    await waitForAuthReady();
    const context = await getAuthContext();
    if (!context?.session?.user) {
      sessionNode.textContent = 'Session: guest';
      return;
    }

    const role = context.role || 'unknown';
    const email = context?.session?.user?.email || context?.user?.email || 'unknown';
    sessionNode.textContent = `${email} · role ${role}`;
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
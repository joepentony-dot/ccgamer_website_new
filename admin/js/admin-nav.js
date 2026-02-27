// admin/js/admin-nav.js
// ============================================================
// CCG Admin Nav (LOCKED DOWN)
// Fix: Logout always works (bind directly here)
// ============================================================

function text(value) {
  return String(value || '').trim();
}

async function getSupabaseClient() {
  if (!window.ccgSupabase || typeof window.ccgSupabase.getClient !== 'function') {
    throw new Error('Supabase client bootstrap is unavailable on this page.');
  }
  return window.ccgSupabase.getClient();
}

function ensureLogoutBinding(shell) {
  const logoutLink = shell.querySelector('[data-admin-logout-link], [data-logout]');
  if (!logoutLink) return;

  // Avoid double-binding
  if (logoutLink.dataset.bound === 'true') return;
  logoutLink.dataset.bound = 'true';

  logoutLink.addEventListener('click', async (e) => {
    e.preventDefault();

    try {
      const supabase = await getSupabaseClient();
      await supabase.auth.signOut();
    } catch (err) {
      // Even if signOut fails, we still force the user back to login.
      console.warn('[admin-nav] logout signOut failed', err);
    }

    // Hard redirect to ensure the admin pages can't keep using stale session state
    window.location.href = '/admin/login.html';
  });
}

export async function initAdminNav({ pageLabel = 'Admin', active = '' } = {}) {
  // If already mounted, just update active + label.
  const existing = document.querySelector('.omega-admin-shell');
  if (existing) {
    const activeLink = existing.querySelector(`[data-nav="${active}"]`);
    if (activeLink) activeLink.classList.add('is-active');
    const titleNode = existing.querySelector('[data-admin-title]');
    if (titleNode) titleNode.textContent = pageLabel;
    ensureLogoutBinding(existing);
    return;
  }

  const host = document.querySelector('[data-admin-shell]') || document.body;

  const shell = document.createElement('div');
  shell.className = 'omega-admin-shell';

  shell.innerHTML = `
    <div class="omega-admin-wrap">
      <div class="omega-admin-header">
        <div class="omega-admin-brand">
          <div class="omega-admin-brand__title">CCG ADMIN PANEL</div>
          <div class="omega-admin-brand__subtitle" data-admin-title>${pageLabel}</div>
        </div>

        <nav class="omega-admin-nav">
          <a href="/admin/dashboard.html" data-nav="dashboard">Dashboard</a>
          <a href="/admin/games-editor.html" data-nav="builder">Game Builder Wizard (Primary)</a>
          <a href="/admin/games-json-editor.html" data-nav="legacy">Legacy Bulk Editor — Legacy (not used)</a>
          <a href="/admin/announce.html" data-nav="announce">Announcements</a>
          <a href="/admin/members.html" data-nav="members">Members</a>
          <a href="/admin/help.html" data-nav="help">Help &amp; Workflow</a>
          <a href="#" data-nav="logout" data-admin-logout-link data-logout>Logout</a>
        </nav>

        <div class="omega-admin-session" data-admin-session>Session: checking…</div>
      </div>
    </div>
  `;

  host.prepend(shell);

  const activeLink = shell.querySelector(`[data-nav="${active}"]`);
  if (activeLink) activeLink.classList.add('is-active');

  // Bind logout immediately
  ensureLogoutBinding(shell);

  // Session label (best-effort)
  const sessionNode = shell.querySelector('[data-admin-session]');

  try {
    const supabase = await getSupabaseClient();
    const { data } = await supabase.auth.getSession();
    const email = text(data?.session?.user?.email);
    sessionNode.textContent = email ? `${email} · role checking…` : 'Session: active';
  } catch {
    sessionNode.textContent = 'Session: active';
  }
}
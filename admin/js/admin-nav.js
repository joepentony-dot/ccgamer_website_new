// ============================================================
// CCG Admin Nav — Omega Safe
// Fixes:
// - NEVER injects UI
// - ONLY binds existing admin shell
// - Restores menu, active state, logout
// ============================================================

function text(v) {
  return String(v || '').trim();
}

async function getSupabaseClient() {
  if (!window.ccgSupabase || typeof window.ccgSupabase.getClient !== 'function') {
    throw new Error('Supabase client not available');
  }
  return window.ccgSupabase.getClient();
}

function bindLogout(root) {
  const btn =
    root.querySelector('[data-admin-logout]') ||
    root.querySelector('.admin-logout') ||
    root.querySelector('a[href*="logout"]');

  if (!btn || btn.dataset.bound === 'true') return;

  btn.dataset.bound = 'true';

  btn.addEventListener('click', async (e) => {
    e.preventDefault();

    try {
      const supabase = await getSupabaseClient();
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('[admin-nav] signOut failed', err);
    }

    // Hard redirect — prevents stale auth state
    window.location.href = '/admin/login.html';
  });
}

function setActiveNav(root, active) {
  if (!active) return;

  root.querySelectorAll('[data-nav]').forEach((el) => {
    el.classList.toggle('is-active', el.dataset.nav === active);
  });
}

async function populateSession(root) {
  const node =
    root.querySelector('[data-admin-session]') ||
    root.querySelector('.admin-session');

  if (!node) return;

  try {
    const supabase = await getSupabaseClient();
    const { data } = await supabase.auth.getSession();
    const email = text(data?.session?.user?.email);
    node.textContent = email || 'Signed in';
  } catch {
    node.textContent = 'Signed in';
  }
}

// ------------------------------------------------------------

export async function initAdminNav({ active = '' } = {}) {
  // Find existing shell ONLY
  const root =
    document.querySelector('.ccg-admin-panel') ||
    document.querySelector('.omega-admin-shell') ||
    document;

  // Bind features
  bindLogout(root);
  setActiveNav(root, active);
  populateSession(root);
}
// ============================================================
// CCG ADMIN NAV — FINAL LOCKED VERSION
// Rules:
// - NEVER inject DOM
// - ONLY bind existing elements
// - Announcements must exist in HTML
// ============================================================

function text(v) {
  return String(v || '').trim();
}

async function getSupabase() {
  if (!window.ccgSupabase?.getClient) {
    throw new Error('Supabase client unavailable');
  }
  return window.ccgSupabase.getClient();
}

async function bindLogout(root) {
  const btn = root.querySelector('[data-admin-logout]');
  if (!btn || btn.dataset.bound) return;

  btn.dataset.bound = 'true';

  btn.addEventListener('click', async (e) => {
    e.preventDefault();

    try {
      const supabase = await getSupabase();
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('[admin-nav] signOut failed', err);
    }

    localStorage.clear();
    sessionStorage.clear();
    window.location.replace('/admin/login.html');
  });
}

function setActive(root, active) {
  if (!active) return;
  root.querySelectorAll('[data-nav]').forEach((el) => {
    el.classList.toggle('is-active', el.dataset.nav === active);
  });
}

async function populateSession(root) {
  const node = root.querySelector('[data-admin-session]');
  if (!node) return;

  try {
    const supabase = await getSupabase();
    const { data } = await supabase.auth.getSession();
    node.textContent = data?.session?.user?.email || '';
  } catch {
    node.textContent = '';
  }
}

export async function initAdminNav({ active = '' } = {}) {
  const root = document.querySelector('.ccg-admin-panel') || document;
  bindLogout(root);
  setActive(root, active);
  populateSession(root);
}

(function () {
  const BOUND_ATTR = 'dataLogoutBound';

  function getLogoutTargets() {
    return Array.from(document.querySelectorAll('[data-logout], #logout, .logout, #ccg-auth-logout'));
  }

  function getReturnTo() {
    return window.location.pathname + window.location.search + window.location.hash;
  }

  async function getSupabaseClient() {
    try {
      if (window.ccgSupabase && typeof window.ccgSupabase.getClient === 'function') {
        const c = await window.ccgSupabase.getClient();
        if (c && c.auth) return c;
      }
    } catch (_) {}
    return window.supabase || window.__ccgSupabaseClient || null;
  }

  async function handleLogoutClick(event) {
    event.preventDefault();

    const supabase = await getSupabaseClient();
    if (!supabase || !supabase.auth || typeof supabase.auth.signOut !== 'function') {
      console.warn('[CCG-AUTH-UI] Supabase client missing for logout');
      return;
    }

    await supabase.auth.signOut();

    // Admin logout -> admin login
    if (window.location.pathname.startsWith('/admin/')) {
      window.location.replace('/admin/login.html?reason=signed_out');
      return;
    }

    // Public pages: stay on the same page, but refresh so header updates cleanly.
    // (If you prefer redirect to /auth/login.html, swap this behaviour.)
    window.location.replace(getReturnTo());
  }

  function bindLogout() {
    getLogoutTargets().forEach((element) => {
      if (!element || element.getAttribute(BOUND_ATTR) === 'true') return;
      element.setAttribute(BOUND_ATTR, 'true');
      element.addEventListener('click', handleLogoutClick);
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    bindLogout();
    console.info('[CCG-AUTH-UI] logout bound');
  });
})();
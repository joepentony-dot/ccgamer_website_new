(function () {
  const BOUND_ATTR = 'dataLogoutBound';

  function getLogoutTargets() {
    return Array.from(document.querySelectorAll('[data-logout]'));
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
    window.location.replace('/auth/login.html?reason=signed_out');
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

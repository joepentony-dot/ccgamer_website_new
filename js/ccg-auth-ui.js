(function () {
  const BOUND_ATTR = 'dataLogoutBound';

  function getSupabaseClient() {
    return window.supabase || window.__ccgSupabaseClient || null;
  }

  function getLogoutTargets() {
    return Array.from(document.querySelectorAll('[data-logout], #logout, .logout'));
  }

  async function handleLogoutClick(event) {
    event.preventDefault();

    const supabase = getSupabaseClient();
    if (!supabase || !supabase.auth || typeof supabase.auth.signOut !== 'function') {
      console.warn('[CCG-AUTH-UI] Supabase client missing for logout');
      return;
    }

    await supabase.auth.signOut();

    if (window.location.pathname.startsWith('/admin/')) {
      window.location.replace('/admin/login.html?reason=signed_out');
      return;
    }

    const returnTo = encodeURIComponent(window.location.pathname);
    window.location.replace('/auth/login.html?reason=signed_out&returnTo=' + returnTo);
  }

  function bindLogout() {
    getLogoutTargets().forEach((element) => {
      if (element[BOUND_ATTR] === 'true') return;
      element[BOUND_ATTR] = 'true';
      element.addEventListener('click', handleLogoutClick);
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    bindLogout();
    console.info('[CCG-AUTH-UI] logout bound');
  });
})();

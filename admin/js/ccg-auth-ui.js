// /js/ccg-auth-ui.js
(async () => {
  if (!window.ccgSupabase || typeof window.ccgSupabase.getClient !== 'function') {
    console.error('[auth-ui] Supabase client not available');
    return;
  }

  const supabase = window.ccgSupabase.getClient();

  document.addEventListener('click', async (e) => {
    const logoutLink = e.target.closest('[data-admin-logout-link],[data-logout]');
    if (!logoutLink) return;

    e.preventDefault();

    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('[auth-ui] signOut failed', err);
    }

    // Hard redirect — clears admin state completely
    window.location.href = '/admin/login.html';
  });
})();
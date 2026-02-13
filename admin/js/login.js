(function () {
  const DASHBOARD_PATH = '/admin/dashboard.html';
  const CLIENT_TIMEOUT_MS = 8000;
  const POLL_INTERVAL_MS = 100;

  function setMessage(text, state) {
    const messageEl = document.querySelector('[data-message]');
    if (!messageEl) return;
    messageEl.textContent = text;
    if (state) messageEl.dataset.state = state;
  }

  async function waitForClient() {
    const startedAt = Date.now();

    while (Date.now() - startedAt < CLIENT_TIMEOUT_MS) {
      try {
        if (window.ccgSupabase && typeof window.ccgSupabase.getClient === 'function') {
          const client = await window.ccgSupabase.getClient();
          if (client) return client;
        }

        if (window.supabase && window.supabase.auth) {
          return window.supabase;
        }

        if (window.__ccgSupabaseClient && window.__ccgSupabaseClient.auth) {
          return window.__ccgSupabaseClient;
        }
      } catch (_error) {
        // keep polling until timeout
      }

      await new Promise(function (resolve) {
        setTimeout(resolve, POLL_INTERVAL_MS);
      });
    }

    throw new Error('Supabase client missing. Please refresh and try again.');
  }

  async function redirectIfAuthenticated(supabase) {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      setMessage(error.message || 'Unable to verify session.', 'error');
      return false;
    }

    if (data && data.session) {
      window.location.replace(DASHBOARD_PATH);
      return true;
    }

    return false;
  }

  function bindLoginSubmit(form, supabase) {
    form.addEventListener('submit', async function (event) {
      event.preventDefault();

      const emailInput = form.querySelector('[data-email-input]');
      const passwordInput = form.querySelector('[data-password-input]');
      const email = String(emailInput && emailInput.value || '').trim();
      const password = String(passwordInput && passwordInput.value || '');

      setMessage('Signing in…', 'info');

      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        setMessage(error.message || 'Unable to sign in.', 'error');
        return;
      }

      window.location.replace(DASHBOARD_PATH);
    });
  }

  document.addEventListener('DOMContentLoaded', async function () {
    const form = document.querySelector('[data-login-form]');
    if (!form) return;

    try {
      const supabase = await waitForClient();
      const redirected = await redirectIfAuthenticated(supabase);
      if (redirected) return;
      bindLoginSubmit(form, supabase);
    } catch (error) {
      setMessage((error && error.message) || 'Supabase client missing. Please refresh and try again.', 'error');
    }
  });
})();

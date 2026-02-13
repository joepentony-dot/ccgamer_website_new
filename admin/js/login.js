(function () {
  const DASHBOARD_PATH = '/admin/dashboard.html';

  function getSupabaseClient() {
    return window.supabase || window.__ccgSupabaseClient || null;
  }

  function setMessage(text, state) {
    const messageEl = document.querySelector('[data-message]');
    if (!messageEl) return;
    messageEl.textContent = text;
    if (state) messageEl.dataset.state = state;
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

  async function handleLoginSubmit(event) {
    event.preventDefault();

    const supabase = getSupabaseClient();
    if (!supabase) {
      setMessage('Supabase client missing. Please refresh and try again.', 'error');
      return;
    }

    const form = event.currentTarget;
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
  }

  document.addEventListener('DOMContentLoaded', async function () {
    const supabase = getSupabaseClient();
    const form = document.querySelector('[data-login-form]');

    if (!form) return;

    if (!supabase) {
      setMessage('Supabase client missing. Please refresh and try again.', 'error');
      return;
    }

    const redirected = await redirectIfAuthenticated(supabase);
    if (redirected) return;

    form.addEventListener('submit', handleLoginSubmit);
  });
})();

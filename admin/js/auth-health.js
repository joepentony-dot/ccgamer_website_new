import { ADMIN_BUILD_ID } from './build.js';
import { getAuthContext, waitForAuthReady } from './auth.js?v=20260207-01';

const statusEl = document.querySelector('[data-auth-health-status]');
const detailEl = document.querySelector('[data-auth-health-detail]');

function setStatus(state, detail) {
  if (statusEl) {
    statusEl.textContent = state;
    statusEl.dataset.state = state.toLowerCase();
  }
  if (detailEl) {
    detailEl.textContent = detail;
  }
}

async function runHealthCheck() {
  try {
    await waitForAuthReady();
    const context = await getAuthContext();
    const isReady = Boolean(window.CCG_AUTH_READY);
    const supabaseReady = Boolean(window.CCG_SUPABASE_CLIENT || window.ccgSupabaseClient);

    if (!isReady || !context) {
      setStatus('FAIL', 'Auth context unavailable.');
      return;
    }

    const summary = `Ready=${isReady} LoggedIn=${Boolean(context.isAuthenticated)} Role=${context.role || 'none'} Supabase=${supabaseReady}`;
    setStatus('PASS', summary);
  } catch (error) {
    const message = error?.message || String(error || 'Unknown error');
    setStatus('FAIL', message);
  }
}

if (ADMIN_BUILD_ID) {
  setStatus('RUNNING', `Build ${ADMIN_BUILD_ID}…`);
} else {
  setStatus('RUNNING', 'Running auth health check…');
}

runHealthCheck();

import { ensureRole, startAccessMonitor } from './guard.js?v=admin-stable-20260207';
import { initAdminNav } from './admin-nav.js?v=admin-stable-20260207';

const STORAGE_KEY = 'omegaPublishStepState';

function readState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return typeof parsed === 'object' && parsed ? parsed : {};
  } catch {
    return {};
  }
}

function writeState(next) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

function refreshWarnings(state) {
  for (let i = 1; i <= 8; i += 1) {
    const warning = document.querySelector(`[data-step-warning="${i}"]`);
    const stepNode = document.querySelector(`[data-step="${i}"]`);
    if (!warning || !stepNode) continue;

    const previousIncomplete = Array.from({ length: i - 1 }, (_, idx) => !state[idx + 1]).some(Boolean);
    const checked = !!state[i];
    warning.hidden = checked || !previousIncomplete;
    stepNode.classList.toggle('is-complete', checked);
    stepNode.classList.toggle('is-warning', !checked && previousIncomplete);
  }
}

async function notifyNewGameFromPrompt() {
  const status = document.getElementById('sendNewGameNotificationStatus');

  const gameName = window.prompt('Game name (required):') || '';
  if (!gameName.trim()) {
    if (status) status.textContent = 'Game name is required. Notification not sent.';
    return;
  }

  const notifyMembers = document.getElementById('notifyMembers')?.checked === true;
  const sendTestEmail = document.getElementById('sendTestEmail')?.checked === true;

  if (!notifyMembers && !sendTestEmail) {
    if (status) status.textContent = 'Download complete. No notification selected.';
    return;
  }

  if (status) status.textContent = 'Sending notification...';

  try {
    if (!window.ccgSupabase || typeof window.ccgSupabase.getClient !== 'function') {
      throw new Error('Supabase client unavailable in publish page context.');
    }

    const supabase = await window.ccgSupabase.getClient();
    const supabaseUrl = String(window.CCG_SUPABASE_URL || '').replace(/\/+$/, '');
    const anonKey = String(window.CCG_SUPABASE_ANON_KEY || '').trim();

    if (!supabaseUrl || !anonKey) {
      throw new Error('Supabase config unavailable in publish page context.');
    }

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw new Error(sessionError.message || 'Unable to read auth session.');

    const accessToken = String(sessionData?.session?.access_token || '').trim();

    // REQUIRED: Abort with clear admin-facing error, and DO NOT send fetch.
    if (!accessToken) {
      if (status) {
        status.textContent =
          'Auth required: your admin session has expired or is unavailable. Please sign in again, then retry.';
      }
      return;
    }

    // ------------------------------------------------------------
    // Build payload (TEST EMAIL ALWAYS OVERRIDES MEMBER NOTIFY)
    // ------------------------------------------------------------

    let payload;

    if (sendTestEmail) {
      payload = {
        game_name: gameName.trim(),
        mode: 'coming_soon',
        test_email: true,
        export_id: `publish-${Date.now()}`
      };
    } else if (notifyMembers) {
      payload = {
        game_name: gameName.trim(),
        mode: 'coming_soon_members',
        export_id: `publish-${Date.now()}`
      };
    }

    const response = await fetch(
      `${supabaseUrl}/functions/v1/send-new-game-notification`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: anonKey,
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify(payload)
      }
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data?.error || `Edge function request failed (${response.status}).`);
    }

    if (!data?.success) {
      throw new Error(data?.error || 'Unknown edge function error.');
    }

    const sent = Number(data?.sent || 0);
    const failed = Number(data?.failed || 0);

    if (sendTestEmail) {
      if (status) status.textContent = 'Test email sent successfully to admin address.';
    } else {
      if (status) {
        status.textContent =
          failed > 0
            ? `Coming Soon notification sent. Sent: ${sent}, failed: ${failed}.`
            : `Coming Soon notification sent to ${sent} members.`;
      }
    }
  } catch (error) {
    if (status) status.textContent = `Failed to send notification: ${error.message}`;
  }
}

async function bootstrap() {
  const roleCheck = await ensureRole(['superadmin', 'admin', 'editor']);
  if (!roleCheck) return;

  const state = readState();
  document.querySelectorAll('[data-step-toggle]').forEach((toggle) => {
    const step = Number(toggle.dataset.stepToggle);
    toggle.checked = !!state[step];
    toggle.addEventListener('change', () => {
      state[step] = toggle.checked;
      writeState(state);
      refreshWarnings(state);
    });
  });

  const notifyBtn = document.getElementById('sendNewGameNotificationBtn');
  notifyBtn?.addEventListener('click', notifyNewGameFromPrompt);

  refreshWarnings(state);
}

startAccessMonitor();
initAdminNav({ pageLabel: 'Publish Pipeline', active: 'publish' });
bootstrap();
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

    let payload;

    // TEST EMAIL ALWAYS OVERRIDES MEMBER NOTIFY
    if (sendTestEmail) {
      payload = {
        game_name: gameName.trim(),
        mode: 'coming_soon',
        test_email: true,
        export_id: `publish-${Date.now()}`
      };
    } else {
      payload = {
        game_name: gameName.trim(),
        mode: 'coming_soon_members',
        export_id: `publish-${Date.now()}`
      };
    }

    const { data, error } = await supabase.functions.invoke(
      'send-new-game-notification',
      { body: payload }
    );

    if (error) {
      throw new Error(error.message || 'Edge function invocation failed.');
    }

    if (!data?.success) {
      throw new Error(data?.error || 'Unknown edge function error.');
    }

    const sent = Number(data.sent || 0);
    const failed = Number(data.failed || 0);

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
  document.querySelectorAll('[data-step-toggle]').forEach(toggle => {
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
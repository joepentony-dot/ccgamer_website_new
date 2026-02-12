import { ensureRole, startAccessMonitor } from './guard.js?v=admin-stable-20260207';
import { initAdminNav } from './admin-nav.js?v=admin-stable-20260207';

const STORAGE_KEY = 'omegaPublishStepState';
const EDGE_BASE = 'https://sytcvxthkqyjvzbfljeb.functions.supabase.co';

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
  const slug = window.prompt('Game slug (required):');
  if (!slug) return;

  const title = window.prompt('Game title (required):') || '';
  const platform = window.prompt('Platform label (e.g. Commodore 64):') || '';
  const url = window.prompt('Canonical URL path or full URL:') || '';
  const summary = window.prompt('Short summary:') || '';

  if (!title || !platform || !url) {
    if (status) status.textContent = 'Missing required fields. Notification not sent.';
    return;
  }

  if (status) status.textContent = 'Sending notification...';
  try {
    const response = await fetch(`${EDGE_BASE}/send-new-game-notification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug, title, platform, url, summary })
    });

    const result = await response.json();
    if (!response.ok) throw new Error(result?.error || 'Unknown edge function error');
    if (status) status.textContent = `Notification job complete. Emails sent: ${result.sent ?? 0}`;
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

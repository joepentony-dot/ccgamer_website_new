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

function showAnnouncementGuidance() {
  const status = document.getElementById('sendNewGameNotificationStatus');
  if (!status) return;
  status.textContent =
    'Coming Soon notifications are retired. After deployment, send announcements from /admin/announce.html.';
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
  notifyBtn?.addEventListener('click', showAnnouncementGuidance);
  showAnnouncementGuidance();

  refreshWarnings(state);
}

startAccessMonitor();
initAdminNav({ pageLabel: 'Publish Pipeline', active: 'publish' });
bootstrap();

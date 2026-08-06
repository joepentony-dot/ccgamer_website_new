// admin/js/submission-builder-handoff.js
// Phase 20 — reviewable Member Submission handoff for the Game Builder Wizard.

const HANDOFF_KEY = 'ccg_admin_submission_builder_handoff_v1';
const HANDOFF_VERSION = 1;
const MAX_AGE_MS = 30 * 60 * 1000;
const CSS_PATH = '/resources/css/submission-builder-handoff.css';

function text(value, maxLength = 5000) {
  return String(value ?? '').trim().slice(0, maxLength);
}

function ensureStylesheet() {
  if (document.querySelector(`link[href="${CSS_PATH}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = CSS_PATH;
  document.head.appendChild(link);
}

function safeSessionRead() {
  try {
    const raw = window.sessionStorage.getItem(HANDOFF_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
}

function clearHandoff() {
  try {
    window.sessionStorage.removeItem(HANDOFF_KEY);
  } catch (error) {}
}

function safeLemonUrl(value) {
  const raw = text(value, 500);
  if (!raw) return '';
  try {
    const url = new URL(raw);
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    if (url.protocol !== 'https:' || host !== 'lemon64.com') return '';
    return url.href;
  } catch (error) {
    return '';
  }
}

function validHandoff(payload) {
  if (!payload || payload.version !== HANDOFF_VERSION) return false;
  if (payload.source !== 'member_submission') return false;
  if (payload.submission_type !== 'game_suggestion') return false;
  if (!text(payload.submission_id, 100)) return false;

  const createdAt = Number(payload.created_at);
  const expiresAt = Number(payload.expires_at);
  if (!Number.isFinite(createdAt) || !Number.isFinite(expiresAt)) return false;
  if (createdAt > Date.now() + 60_000) return false;
  if (expiresAt < Date.now() || Date.now() - createdAt > MAX_AGE_MS) return false;

  return Boolean(text(payload.draft?.title, 180) || text(payload.draft?.slug, 180));
}

function dispatchFieldEvents(field) {
  field.dispatchEvent(new Event('input', { bubbles: true }));
  field.dispatchEvent(new Event('change', { bubbles: true }));
  field.dispatchEvent(new Event('blur', { bubbles: true }));
}

function setField(fieldName, value, { overwrite = false } = {}) {
  const field = document.querySelector(`[data-field="${fieldName}"]`);
  if (!(field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement || field instanceof HTMLSelectElement)) {
    return { applied: false, reason: 'missing' };
  }

  const safeValue = text(value, fieldName === 'description' ? 3000 : 500);
  if (!safeValue) return { applied: false, reason: 'empty' };
  if (!overwrite && text(field.value)) return { applied: false, reason: 'occupied' };

  field.value = safeValue;
  dispatchFieldEvents(field);
  return { applied: true, reason: 'applied' };
}

function appendText(parent, className, value) {
  const node = document.createElement('span');
  node.className = className;
  node.textContent = value;
  parent.appendChild(node);
  return node;
}

function formatDate(value) {
  const date = new Date(Number(value));
  if (Number.isNaN(date.getTime())) return 'Date unavailable';
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

async function copyReviewBrief(payload, button) {
  const lines = [
    'CCG MEMBER SUBMISSION REVIEW BRIEF',
    `Submission: ${text(payload.submission_id, 100)}`,
    `Member: ${text(payload.member_display_name || payload.member_username, 180) || 'CCG Member'}`,
    `Subject: ${text(payload.subject, 180)}`,
    payload.game_slug ? `Suggested slug: ${text(payload.game_slug, 180)}` : '',
    '',
    text(payload.message, 3000)
  ].filter((line) => line !== '');

  try {
    await navigator.clipboard.writeText(lines.join('\n'));
    button.textContent = 'Review brief copied';
  } catch (error) {
    button.textContent = 'Copy unavailable';
  }
  window.setTimeout(() => { button.textContent = 'Copy review brief'; }, 1800);
}

function applyDraft(payload, panel) {
  const results = [];

  // Title is applied first so the existing wizard can run its own slug and ID derivation.
  results.push(['title', setField('title', payload.draft?.title)]);

  // An explicitly supplied or derived submission slug may replace only an empty generated field.
  results.push(['slug', setField('slug', payload.draft?.slug)]);
  results.push(['description', setField('description', payload.draft?.description)]);
  results.push(['Lemon64 URL', setField('lemonUrl', safeLemonUrl(payload.draft?.lemon_url))]);

  const applied = results.filter(([, result]) => result.applied).map(([label]) => label);
  const occupied = results.filter(([, result]) => result.reason === 'occupied').map(([label]) => label);
  const status = panel.querySelector('[data-handoff-status]');

  if (status) {
    const messages = [];
    if (applied.length) messages.push(`Applied: ${applied.join(', ')}.`);
    if (occupied.length) messages.push(`Left unchanged because already filled: ${occupied.join(', ')}.`);
    if (!applied.length && !occupied.length) messages.push('No usable draft fields were supplied.');
    messages.push('System, year, publisher, developer, credits and rating still require administrator verification.');
    status.textContent = messages.join(' ');
    status.dataset.state = applied.length ? 'success' : 'warning';
  }

  clearHandoff();
  panel.dataset.applied = 'true';

  const applyButton = panel.querySelector('[data-action="apply-submission-draft"]');
  if (applyButton instanceof HTMLButtonElement) {
    applyButton.disabled = true;
    applyButton.textContent = 'Draft applied';
  }

  document.querySelector('[data-step-jump="1"]')?.click();
  document.querySelector('[data-field="title"]')?.focus({ preventScroll: false });
}

function createPanel(payload) {
  const panel = document.createElement('aside');
  panel.className = 'submission-handoff';
  panel.dataset.submissionHandoff = 'true';
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-labelledby', 'submissionHandoffTitle');

  const header = document.createElement('div');
  header.className = 'submission-handoff__header';

  const headingGroup = document.createElement('div');
  const kicker = document.createElement('p');
  kicker.className = 'submission-handoff__kicker';
  kicker.textContent = 'Unverified member suggestion';
  const title = document.createElement('h2');
  title.id = 'submissionHandoffTitle';
  title.textContent = 'Builder draft available';
  headingGroup.append(kicker, title);

  const expires = document.createElement('span');
  expires.className = 'submission-handoff__expires';
  expires.textContent = `Prepared ${formatDate(payload.created_at)}`;
  header.append(headingGroup, expires);

  const warning = document.createElement('p');
  warning.className = 'submission-handoff__warning';
  warning.textContent = 'This imports member-supplied text into empty draft fields only. It does not validate facts, edit games.json or publish anything.';

  const details = document.createElement('dl');
  details.className = 'submission-handoff__details';

  const detailRows = [
    ['Suggested title', text(payload.draft?.title, 180) || 'Not supplied'],
    ['Member', text(payload.member_display_name || payload.member_username, 180) || 'CCG Member'],
    ['Submission ID', text(payload.submission_id, 100)],
    ['Suggested slug', text(payload.draft?.slug, 180) || 'Not supplied']
  ];

  detailRows.forEach(([label, value]) => {
    const term = document.createElement('dt');
    term.textContent = label;
    const description = document.createElement('dd');
    description.textContent = value;
    details.append(term, description);
  });

  const messageBlock = document.createElement('div');
  messageBlock.className = 'submission-handoff__message';
  appendText(messageBlock, 'submission-handoff__message-label', 'Original member message');
  const message = document.createElement('p');
  message.textContent = text(payload.message, 3000) || 'No message supplied.';
  messageBlock.appendChild(message);

  const actions = document.createElement('div');
  actions.className = 'submission-handoff__actions';

  const apply = document.createElement('button');
  apply.type = 'button';
  apply.className = 'ccg-btn ccg-btn--primary';
  apply.dataset.action = 'apply-submission-draft';
  apply.textContent = 'Apply safe draft fields';
  apply.addEventListener('click', () => applyDraft(payload, panel));

  const copy = document.createElement('button');
  copy.type = 'button';
  copy.className = 'ccg-btn ccg-btn--ghost';
  copy.textContent = 'Copy review brief';
  copy.addEventListener('click', () => { void copyReviewBrief(payload, copy); });

  const back = document.createElement('a');
  back.className = 'ccg-btn ccg-btn--ghost';
  back.href = `/admin/member-submissions.html?focus=${encodeURIComponent(text(payload.submission_id, 100))}`;
  back.textContent = 'Back to submissions';

  const discard = document.createElement('button');
  discard.type = 'button';
  discard.className = 'ccg-btn ccg-btn--ghost';
  discard.textContent = 'Discard handoff';
  discard.addEventListener('click', () => {
    clearHandoff();
    panel.remove();
  });

  actions.append(apply, copy, back, discard);

  const status = document.createElement('p');
  status.className = 'submission-handoff__status';
  status.dataset.handoffStatus = 'true';
  status.setAttribute('aria-live', 'polite');
  status.textContent = 'Review the original message, then apply the draft fields when ready.';

  panel.append(header, warning, details, messageBlock, actions, status);
  return panel;
}

function insertPanel(payload) {
  if (document.querySelector('[data-submission-handoff]')) return;
  const main = document.querySelector('main.builder-wrap, main');
  if (!main) return;
  const panel = createPanel(payload);
  main.insertBefore(panel, main.firstElementChild);
}

function init() {
  ensureStylesheet();
  const payload = safeSessionRead();
  if (!validHandoff(payload)) {
    clearHandoff();
    return;
  }
  insertPanel(payload);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  init();
}

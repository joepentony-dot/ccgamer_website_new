// admin/js/member-submissions.js
// Phase 10 — administrator review inbox for Member Hub submissions.

import { ensureRole, startAccessMonitor } from './guard.js';
import { initAdminNav } from './admin-nav.js';

const STATUS_LABELS = Object.freeze({
  new: 'New',
  reviewing: 'Reviewing',
  resolved: 'Resolved',
  declined: 'Declined'
});

const TYPE_LABELS = Object.freeze({
  game_suggestion: 'Game suggestion',
  correction: 'Correction',
  site_feedback: 'Website feedback'
});

const state = {
  client: null,
  submissions: [],
  loading: false,
  searchTimer: null
};

function text(value) {
  return String(value ?? '').trim();
}

function setStatus(message, mode = 'info') {
  const node = document.getElementById('submissionsInlineStatus');
  if (!node) return;
  node.textContent = message;
  node.dataset.state = mode;
}

function setAuthStatus(message, mode = 'info') {
  const node = document.querySelector('[data-admin-status]');
  if (!node) return;
  node.textContent = message;
  node.dataset.state = mode;
}

async function getGlobalSupabaseClient() {
  if (window.ccgSupabase && typeof window.ccgSupabase.getClient === 'function') {
    const result = window.ccgSupabase.getClient();
    return result && typeof result.then === 'function' ? await result : result;
  }
  return window.CCG_SUPABASE_CLIENT || null;
}

function formatDate(value) {
  const date = new Date(value || 0);
  if (Number.isNaN(date.getTime())) return 'Date unavailable';
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

function appendText(parent, className, value) {
  const node = document.createElement('span');
  node.className = className;
  node.textContent = value;
  parent.appendChild(node);
  return node;
}

function statusSelect(submission) {
  const select = document.createElement('select');
  select.className = 'submission-review__status';
  select.setAttribute('aria-label', `Status for ${text(submission.subject)}`);

  Object.entries(STATUS_LABELS).forEach(([value, label]) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    option.selected = submission.status === value;
    select.appendChild(option);
  });
  return select;
}

function createSubmissionCard(submission) {
  const card = document.createElement('article');
  card.className = 'submission-review';
  card.dataset.submissionId = submission.id;
  card.dataset.status = submission.status;

  const content = document.createElement('div');
  content.className = 'submission-review__content';

  const topline = document.createElement('div');
  topline.className = 'submission-review__topline';
  appendText(topline, 'submission-review__tag', TYPE_LABELS[submission.submission_type] || submission.submission_type || 'Submission');
  appendText(topline, 'submission-review__state', STATUS_LABELS[submission.status] || submission.status || 'Unknown');
  appendText(topline, 'submission-review__date', formatDate(submission.created_at));

  const subject = document.createElement('h3');
  subject.className = 'submission-review__subject';
  subject.textContent = text(submission.subject) || 'Untitled submission';

  const member = document.createElement('p');
  member.className = 'submission-review__member';
  const memberName = text(submission.member_display_name || submission.member_username) || 'CCG Member';
  const username = text(submission.member_username);
  member.textContent = username ? `${memberName} · @${username}` : memberName;

  const game = document.createElement('p');
  game.className = 'submission-review__game';
  if (submission.game_slug) {
    const label = document.createTextNode('Game: ');
    const link = document.createElement('a');
    link.href = `/games/${encodeURIComponent(submission.game_slug)}/`;
    link.target = '_blank';
    link.rel = 'noopener';
    link.textContent = submission.game_slug;
    game.append(label, link);
  } else {
    game.textContent = 'No specific game supplied.';
  }

  const message = document.createElement('p');
  message.className = 'submission-review__message';
  message.textContent = text(submission.message) || 'No message supplied.';

  content.append(topline, subject, member, game, message);

  const controls = document.createElement('div');
  controls.className = 'submission-review__controls';

  const statusLabel = document.createElement('label');
  statusLabel.append(document.createTextNode('Review status'), statusSelect(submission));

  const notesLabel = document.createElement('label');
  notesLabel.appendChild(document.createTextNode('Administrator notes'));
  const notes = document.createElement('textarea');
  notes.className = 'submission-review__notes';
  notes.maxLength = 5000;
  notes.placeholder = 'Private review notes. These are not shown to the member.';
  notes.value = text(submission.admin_notes);
  notesLabel.appendChild(notes);

  const save = document.createElement('button');
  save.type = 'button';
  save.className = 'ccg-btn ccg-btn--primary submission-review__save';
  save.dataset.action = 'save-submission';
  save.textContent = 'Save review';

  const updated = document.createElement('span');
  updated.className = 'submission-review__date';
  updated.textContent = `Last updated: ${formatDate(submission.updated_at)}`;

  controls.append(statusLabel, notesLabel, save, updated);
  card.append(content, controls);
  return card;
}

function currentFilters() {
  return {
    search: text(document.getElementById('submissionsSearch')?.value).toLowerCase(),
    status: text(document.getElementById('submissionsStatusFilter')?.value),
    type: text(document.getElementById('submissionsTypeFilter')?.value)
  };
}

function filteredSubmissions() {
  const filters = currentFilters();
  return state.submissions.filter((submission) => {
    if (filters.status && submission.status !== filters.status) return false;
    if (filters.type && submission.submission_type !== filters.type) return false;
    if (!filters.search) return true;

    const haystack = [
      submission.subject,
      submission.message,
      submission.game_slug,
      submission.member_username,
      submission.member_display_name
    ].map(text).join(' ').toLowerCase();
    return haystack.includes(filters.search);
  });
}

function updateSummary() {
  Object.keys(STATUS_LABELS).forEach((status) => {
    const count = state.submissions.filter((entry) => entry.status === status).length;
    const node = document.getElementById(`submissionsCount${status.charAt(0).toUpperCase()}${status.slice(1)}`);
    if (node) node.textContent = String(count);
  });
}

function renderSubmissions() {
  updateSummary();
  const host = document.getElementById('submissionsList');
  const countNode = document.getElementById('submissionsVisibleCount');
  if (!host) return;

  const submissions = filteredSubmissions();
  host.replaceChildren();
  if (countNode) countNode.textContent = `${submissions.length} ${submissions.length === 1 ? 'submission' : 'submissions'}`;

  if (!submissions.length) {
    const empty = document.createElement('p');
    empty.className = 'submissions-admin__empty';
    empty.textContent = state.submissions.length
      ? 'No submissions match the current filters.'
      : 'No member submissions have been received.';
    host.appendChild(empty);
    return;
  }

  submissions.forEach((submission) => host.appendChild(createSubmissionCard(submission)));
}

async function loadSubmissions() {
  if (!state.client || state.loading) return;
  state.loading = true;
  setStatus('Loading member submissions…', 'info');

  try {
    const { data, error } = await state.client.rpc('admin_list_member_submissions', {
      p_status: null,
      p_type: null,
      p_search: null,
      p_limit: 250
    });
    if (error) throw error;

    state.submissions = Array.isArray(data) ? data : [];
    renderSubmissions();
    setStatus(`Loaded ${state.submissions.length} ${state.submissions.length === 1 ? 'submission' : 'submissions'}.`, 'success');
  } catch (error) {
    console.error('[member-submissions-admin] Load failed', error);
    state.submissions = [];
    renderSubmissions();
    setStatus('The submissions inbox is awaiting the Phase 10 Supabase migration.', 'error');
  } finally {
    state.loading = false;
  }
}

async function saveReview(card, button) {
  if (!state.client || !card) return;
  const submissionId = card.dataset.submissionId;
  const status = card.querySelector('.submission-review__status')?.value;
  const notes = card.querySelector('.submission-review__notes')?.value || '';
  if (!submissionId || !status) return;

  button.disabled = true;
  button.textContent = 'Saving…';
  setStatus('Saving submission review…', 'info');

  try {
    const { data, error } = await state.client.rpc('admin_update_member_submission', {
      p_submission_id: submissionId,
      p_status: status,
      p_admin_notes: notes
    });
    if (error) throw error;
    if (data !== true) throw new Error('The submission was not updated.');

    setStatus('Submission review saved.', 'success');
    await loadSubmissions();
  } catch (error) {
    console.error('[member-submissions-admin] Save failed', error);
    setStatus(error?.message || 'Submission review could not be saved.', 'error');
    button.disabled = false;
    button.textContent = 'Save review';
  }
}

function bindControls() {
  document.getElementById('submissionsRefresh')?.addEventListener('click', () => {
    void loadSubmissions();
  });

  document.getElementById('submissionsStatusFilter')?.addEventListener('change', renderSubmissions);
  document.getElementById('submissionsTypeFilter')?.addEventListener('change', renderSubmissions);
  document.getElementById('submissionsSearch')?.addEventListener('input', () => {
    window.clearTimeout(state.searchTimer);
    state.searchTimer = window.setTimeout(renderSubmissions, 180);
  });

  document.getElementById('submissionsList')?.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target : null;
    const button = target?.closest('[data-action="save-submission"]');
    if (!(button instanceof HTMLButtonElement)) return;
    const card = button.closest('.submission-review');
    void saveReview(card, button);
  });
}

async function init() {
  try {
    setAuthStatus('Checking administrator session…', 'info');
    const access = await ensureRole(['admin', 'superadmin']);
    if (!access) return;

    document.documentElement.dataset.adminSubmissionsGate = 'granted';
    setAuthStatus('Signed in', 'success');
    await initAdminNav({ active: 'submissions', pageLabel: 'Member Submissions' });
    await startAccessMonitor();

    state.client = await getGlobalSupabaseClient();
    if (!state.client || typeof state.client.rpc !== 'function') {
      throw new Error('Supabase RPC client is unavailable.');
    }

    bindControls();
    await loadSubmissions();
  } catch (error) {
    console.error('[member-submissions-admin] Initialisation failed', error);
    setAuthStatus('Administrator access could not be verified.', 'error');
    setStatus(error?.message || 'The submissions inbox could not be started.', 'error');
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  void init();
}

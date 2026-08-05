import { getSupabaseClient } from './supabase-client.js';

const CSS_PATH = '/resources/css/member-achievement-badges.css';
const MISSING_SCHEMA_CODES = new Set([
  '42P01',
  '42703',
  '42883',
  'PGRST202',
  'PGRST204',
  'PGRST205'
]);

const state = {
  client: null,
  user: null,
  refreshTimer: null,
  refreshing: false,
  queued: false
};

function text(value) {
  return String(value ?? '').trim();
}

function badgeKey(value) {
  return text(value).toUpperCase().replace(/[-\s]+/g, '_');
}

function isMissingSchema(error) {
  return MISSING_SCHEMA_CODES.has(String(error?.code || ''));
}

function ensureStylesheet() {
  if (document.querySelector(`link[href="${CSS_PATH}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = CSS_PATH;
  document.head.appendChild(link);
}

function ensurePanel() {
  const section = document.getElementById('memberAchievements');
  const existingGrid = section?.querySelector('.member-achievements');
  if (!section || !existingGrid) return null;

  let panel = document.getElementById('memberAchievementPanel');
  if (panel) return panel;

  panel = document.createElement('article');
  panel.className = 'member-achievement-panel';
  panel.id = 'memberAchievementPanel';
  panel.innerHTML = `
    <div class="member-achievement-panel__header">
      <div>
        <p class="member-achievement-panel__kicker">Private achievements</p>
        <h3 class="member-achievement-panel__title">Commodore Milestones</h3>
        <p class="member-achievement-panel__intro">Badges are awarded from your ratings, comments and private game library. Locked badges show the next targets without exposing private activity publicly.</p>
      </div>
      <button type="button" class="auth-btn" id="memberRefreshAchievements">Check badges</button>
    </div>
    <p class="member-achievement-panel__status" id="memberAchievementStatus" aria-live="polite">Checking achievements…</p>
    <div class="member-achievement-grid" id="memberAchievementGrid"></div>
  `;

  section.insertBefore(panel, existingGrid);
  panel.querySelector('#memberRefreshAchievements')?.addEventListener('click', () => {
    void refreshAchievements({ award: true, manual: true });
  });
  return panel;
}

function setStatus(message, mode = '') {
  const node = document.getElementById('memberAchievementStatus');
  if (!node) return;
  node.textContent = message;
  node.dataset.state = mode;
}

function formatAwardDate(value) {
  const date = new Date(value || 0);
  if (Number.isNaN(date.getTime())) return 'Earned';
  return `Earned ${new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(date)}`;
}

function categoryLabel(value) {
  if (value === 'ratings') return 'Ratings';
  if (value === 'comments') return 'Comments';
  if (value === 'library') return 'My Games';
  if (value === 'systems') return 'Systems';
  return 'Achievement';
}

function renderAchievements(catalog, earnedRows) {
  const host = document.getElementById('memberAchievementGrid');
  if (!host) return;
  host.replaceChildren();

  const earned = new Map();
  (Array.isArray(earnedRows) ? earnedRows : []).forEach((row) => {
    const key = badgeKey(row?.badge_key);
    if (key && !earned.has(key)) earned.set(key, row);
  });

  const entries = Array.isArray(catalog) ? catalog : [];
  entries.forEach((entry) => {
    const key = badgeKey(entry.badge_key);
    const award = earned.get(key);
    const card = document.createElement('article');
    card.className = `member-achievement-card ${award ? 'is-earned' : 'is-locked'}`;
    card.dataset.badgeKey = key;

    const mark = document.createElement('span');
    mark.className = 'member-achievement-card__mark';
    mark.textContent = award ? '✓' : 'LOCKED';
    mark.setAttribute('aria-label', award ? 'Badge earned' : 'Badge locked');

    const body = document.createElement('div');
    body.className = 'member-achievement-card__body';

    const meta = document.createElement('p');
    meta.className = 'member-achievement-card__meta';
    meta.textContent = categoryLabel(entry.badge_category);

    const title = document.createElement('h4');
    title.className = 'member-achievement-card__title';
    title.textContent = text(entry.badge_name || key.replace(/_/g, ' '));

    const description = document.createElement('p');
    description.className = 'member-achievement-card__description';
    description.textContent = text(entry.badge_description);

    const stateLine = document.createElement('p');
    stateLine.className = 'member-achievement-card__state';
    stateLine.textContent = award ? formatAwardDate(award.assigned_at) : 'Not earned yet';

    body.append(meta, title, description, stateLine);
    card.append(mark, body);
    host.appendChild(card);
  });

  const total = entries.length;
  const earnedTotal = entries.filter((entry) => earned.has(badgeKey(entry.badge_key))).length;
  setStatus(`${earnedTotal} of ${total} activity badges earned.`, earnedTotal ? 'success' : 'ready');
}

async function awardEligibleBadges() {
  const { data, error } = await state.client.rpc('award_badge_if_eligible', {
    target_user_id: state.user.id
  });
  if (error) throw error;
  return (Array.isArray(data) ? data : []).some((row) => row?.newly_awarded === true);
}

async function loadAchievementData() {
  const [catalogResult, badgesResult] = await Promise.all([
    state.client.rpc('get_member_badge_catalog'),
    state.client.rpc('get_my_member_badges')
  ]);

  if (catalogResult.error) throw catalogResult.error;
  if (badgesResult.error) throw badgesResult.error;

  renderAchievements(catalogResult.data, badgesResult.data);
}

async function refreshAchievements({ award = false, manual = false } = {}) {
  if (!state.client || !state.user) return;
  if (state.refreshing) {
    state.queued = true;
    return;
  }

  state.refreshing = true;
  state.queued = false;
  setStatus(manual ? 'Checking current activity…' : 'Updating achievements…');

  try {
    const newlyAwarded = award ? await awardEligibleBadges() : false;
    await loadAchievementData();
    if (newlyAwarded) {
      document.dispatchEvent(new CustomEvent('ccg:member-achievement-earned'));
    }
  } catch (error) {
    if (isMissingSchema(error)) {
      setStatus('Achievements are awaiting the Phase 8 Supabase migration.', 'local');
      return;
    }
    console.warn('[member-achievements] Achievement refresh failed', error);
    setStatus('Achievements could not be checked right now.', 'error');
  } finally {
    state.refreshing = false;
    if (state.queued) void refreshAchievements({ award: true });
  }
}

function scheduleAwardCheck() {
  window.clearTimeout(state.refreshTimer);
  state.refreshTimer = window.setTimeout(() => {
    void refreshAchievements({ award: true });
  }, 900);
}

function bindEvents() {
  document.addEventListener('ccg:member-badges-updated', scheduleAwardCheck);
  document.addEventListener('ccg:personal-library-updated', scheduleAwardCheck);
}

async function init() {
  if (!document.getElementById('memberHub')) return;
  ensureStylesheet();
  if (!ensurePanel()) return;
  bindEvents();

  try {
    state.client = await getSupabaseClient();
    const { data, error } = await state.client.auth.getUser();
    if (error) throw error;
    state.user = data?.user || null;
    if (!state.user) return;

    await refreshAchievements({ award: true });
    window.setTimeout(scheduleAwardCheck, 1400);
  } catch (error) {
    console.warn('[member-achievements] Initialisation failed', error);
    setStatus('Achievements could not be started.', 'error');
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  void init();
}

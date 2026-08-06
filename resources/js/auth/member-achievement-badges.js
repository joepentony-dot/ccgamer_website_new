import { getSupabaseClient } from './supabase-client.js';

const CSS_PATH = '/resources/css/member-achievement-badges.css';
const COMPLETION_CSS_PATH = '/resources/css/commodore-completionist.css';
const MISSING_SCHEMA_CODES = new Set([
  '42P01',
  '42703',
  '42883',
  'PGRST202',
  'PGRST204',
  'PGRST205'
]);

const COMMODORE_MILESTONE_KEYS = Object.freeze([
  'FIRST_RATING',
  'RATED_10',
  'RATED_50',
  'FIRST_COMMENT',
  'COMMENTER_10',
  'FIRST_LIBRARY_GAME',
  'LIBRARY_10',
  'LIBRARY_50',
  'LIBRARY_100',
  'C64_EXPLORER',
  'AMIGA_EXPLORER',
  'DUAL_SYSTEM'
]);

const MILESTONE_TOTAL = COMMODORE_MILESTONE_KEYS.length;
const MILESTONE_KEY_SET = new Set(COMMODORE_MILESTONE_KEYS);

const COMPLETION_BADGE = Object.freeze({
  badge_key: 'COMMODORE_COMPLETIONIST',
  badge_name: 'Commodore Completionist',
  badge_description: 'Completed every Commodore Milestone.',
  badge_category: 'completion'
});

const state = {
  client: null,
  user: null,
  refreshTimer: null,
  refreshing: false,
  queued: false,
  sectionObserver: null
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

function ensureStylesheet(path) {
  if (document.querySelector(`link[href="${path}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = path;
  document.head.appendChild(link);
}

function retireRedundantBadgeDisplays() {
  const section = document.getElementById('memberAchievements');
  if (!section) return null;

  const intro = section.querySelector('.member-panel__intro');
  if (intro) {
    intro.textContent = 'Your account-backed Commodore Milestones and membership loyalty progress.';
  }

  const legacyGrid = section.querySelector('.member-achievements');
  if (legacyGrid) {
    if (legacyGrid.childElementCount) legacyGrid.replaceChildren();
    if (!legacyGrid.hidden) legacyGrid.hidden = true;
    legacyGrid.setAttribute('aria-hidden', 'true');
    legacyGrid.dataset.retiredBadgeSystem = 'true';
  }

  section.querySelectorAll('.member-server-badges').forEach((node) => node.remove());
  return legacyGrid;
}

function watchBadgeSection() {
  const section = document.getElementById('memberAchievements');
  if (!section || state.sectionObserver) return;

  state.sectionObserver = new MutationObserver(() => {
    retireRedundantBadgeDisplays();
  });
  state.sectionObserver.observe(section, { childList: true, subtree: true });
}

function ensurePanel() {
  const section = document.getElementById('memberAchievements');
  if (!section) return null;

  const legacyGrid = retireRedundantBadgeDisplays();

  let panel = document.getElementById('memberAchievementPanel');
  if (panel) return panel;

  panel = document.createElement('article');
  panel.className = 'member-achievement-panel';
  panel.id = 'memberAchievementPanel';
  panel.innerHTML = `
    <div class="member-achievement-panel__header">
      <div>
        <p class="member-achievement-panel__kicker">Account achievements</p>
        <h3 class="member-achievement-panel__title">Commodore Milestones</h3>
        <p class="member-achievement-panel__intro">Badges are awarded from ratings, comments and private game-library activity saved to your account. Complete all twelve milestones to unlock the final distinction.</p>
      </div>
      <button type="button" class="auth-btn" id="memberRefreshAchievements">Check badges</button>
    </div>
    <p class="member-achievement-panel__status" id="memberAchievementStatus" aria-live="polite">Checking achievements…</p>
    <div class="member-achievement-grid" id="memberAchievementGrid"></div>
  `;

  section.insertBefore(panel, legacyGrid);
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
  if (value === 'completion') return 'Completion Reward';
  return 'Achievement';
}

function completionState(earned) {
  const missing = COMMODORE_MILESTONE_KEYS.filter((key) => !earned.has(key));
  const dates = COMMODORE_MILESTONE_KEYS
    .map((key) => new Date(earned.get(key)?.assigned_at || 0))
    .filter((date) => !Number.isNaN(date.getTime()) && date.getTime() > 0)
    .sort((a, b) => b.getTime() - a.getTime());

  return {
    complete: missing.length === 0,
    missing,
    assignedAt: dates[0]?.toISOString() || ''
  };
}

async function shareCompletion(button) {
  const shareData = {
    title: 'Commodore Completionist',
    text: 'I completed all twelve Commodore Milestones at Cheeky Commodore Gamer.',
    url: 'https://www.cheekycommodoregamer.co.uk/'
  };

  try {
    if (typeof navigator.share === 'function') {
      await navigator.share(shareData);
      button.textContent = 'Shared';
    } else if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`);
      button.textContent = 'Copied';
    } else {
      button.textContent = 'Share unavailable';
    }
  } catch (error) {
    if (error?.name !== 'AbortError') button.textContent = 'Share unavailable';
  }

  window.setTimeout(() => { button.textContent = 'Share achievement'; }, 1800);
}

function createCompletionCard(completion) {
  const card = document.createElement('article');
  card.className = 'member-achievement-card member-completionist is-earned is-complete';
  card.dataset.badgeKey = COMPLETION_BADGE.badge_key;

  const mark = document.createElement('span');
  mark.className = 'member-achievement-card__mark member-completionist__mark';
  mark.textContent = '★';
  mark.setAttribute('aria-label', 'Completion reward earned');

  const body = document.createElement('div');
  body.className = 'member-achievement-card__body';

  const meta = document.createElement('p');
  meta.className = 'member-achievement-card__meta';
  meta.textContent = categoryLabel(COMPLETION_BADGE.badge_category);

  const title = document.createElement('h4');
  title.className = 'member-achievement-card__title';
  title.textContent = COMPLETION_BADGE.badge_name;

  const description = document.createElement('p');
  description.className = 'member-achievement-card__description';
  description.textContent = COMPLETION_BADGE.badge_description;

  const stateLine = document.createElement('p');
  stateLine.className = 'member-achievement-card__state';
  stateLine.textContent = formatAwardDate(completion.assignedAt);

  const share = document.createElement('button');
  share.type = 'button';
  share.className = 'auth-btn member-completionist__share';
  share.textContent = 'Share achievement';
  share.addEventListener('click', () => { void shareCompletion(share); });

  body.append(meta, title, description, stateLine, share);
  card.append(mark, body);
  return card;
}

function orderedMilestoneEntries(catalog) {
  const byKey = new Map();
  (Array.isArray(catalog) ? catalog : []).forEach((entry) => {
    const key = badgeKey(entry?.badge_key);
    if (MILESTONE_KEY_SET.has(key) && !byKey.has(key)) byKey.set(key, entry);
  });
  return COMMODORE_MILESTONE_KEYS.map((key) => byKey.get(key)).filter(Boolean);
}

function renderAchievements(catalog, earnedRows) {
  const host = document.getElementById('memberAchievementGrid');
  if (!host) return;
  host.replaceChildren();

  const earned = new Map();
  (Array.isArray(earnedRows) ? earnedRows : []).forEach((row) => {
    const key = badgeKey(row?.badge_key);
    if (MILESTONE_KEY_SET.has(key) && !earned.has(key)) earned.set(key, row);
  });

  const entries = orderedMilestoneEntries(catalog);
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

  const completion = completionState(earned);
  if (completion.complete) {
    host.prepend(createCompletionCard(completion));
  }

  const earnedTotal = COMMODORE_MILESTONE_KEYS.filter((key) => earned.has(key)).length;
  setStatus(
    completion.complete
      ? `${earnedTotal} of ${MILESTONE_TOTAL} Commodore Milestones earned. Commodore Completionist unlocked.`
      : `${earnedTotal} of ${MILESTONE_TOTAL} Commodore Milestones earned. Complete all twelve to unlock the final distinction.`,
    earnedTotal ? 'success' : 'ready'
  );
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
  ensureStylesheet(CSS_PATH);
  ensureStylesheet(COMPLETION_CSS_PATH);
  if (!ensurePanel()) return;
  watchBadgeSection();
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

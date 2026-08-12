import { ensureRole, startAccessMonitor } from './guard.js';

const SITE_ORIGIN = 'https://www.cheekycommodoregamer.co.uk';
const DEFAULT_GITHUB_OWNER = 'joepentony-dot';
const DEFAULT_GITHUB_REPO = 'ccgamer_website_new';
const DEFAULT_GITHUB_BRANCH = 'main';
const WORKFLOW_POLL_INTERVAL_MS = 6000;
const WORKFLOW_POLL_TIMEOUT_MS = 240000;
const RETRO_SPECIAL_MAX_SLUG_LENGTH = 55;
const ALLOWED_THUMBNAIL_PREFIX = 'resources/images/thumbnails/all/';
const ZZAP_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const STORAGE_KEYS = {
  owner: 'ccg_publisher_github_owner',
  repo: 'ccg_publisher_github_repo',
  branch: 'ccg_publisher_github_branch',
  token: 'ccg_publisher_github_token',
  legacyToken: 'ccg_retro_github_token'
};

const SOURCE_PATHS = {
  games: 'games/games.json',
  'retro-specials': 'data/retro-specials.json',
  'retro-events': 'data/retro-events.json',
  'amiga-demo-music': 'data/amiga-demo-music.json'
};

const LIVE_PATHS = {
  games: '/games/games.json',
  'retro-specials': '/data/retro-specials.json',
  'retro-events': '/data/retro-events.json',
  'amiga-demo-music': '/data/amiga-demo-music.json',
  metadata: '/data/video-metadata.json'
};

const FEATURE_LABELS = {
  'retro-specials': 'Retro Special',
  'retro-events': 'Retro Event',
  'amiga-demo-music': 'Amiga Demo / Music'
};

const state = {
  games: [],
  sections: {
    'retro-specials': [],
    'retro-events': [],
    'amiga-demo-music': []
  },
  videoMetadata: {},
  unverifiedIds: [],
  gameSlugTouched: false,
  gameIdTouched: false,
  featureSlugTouched: false,
  currentTab: 'game',
  lastPublish: null
};

const el = {
  tabs: Array.from(document.querySelectorAll('[data-tab]')),
  panels: Array.from(document.querySelectorAll('[data-panel]')),
  refresh: document.querySelector('[data-action="refresh"]'),
  showUnverified: document.querySelector('[data-action="show-unverified"]'),
  unverifiedList: document.querySelector('[data-unverified-list]'),
  connectionBadge: document.querySelector('[data-connection-badge]'),
  healthSummary: document.querySelector('[data-health-summary]'),
  statGames: document.querySelector('[data-stat="games"]'),
  statRetroPublic: document.querySelector('[data-stat="retro-public"]'),
  statVideoIds: document.querySelector('[data-stat="video-ids"]'),
  statVerified: document.querySelector('[data-stat="verified"]'),
  gameForm: document.querySelector('[data-game-form]'),
  featureForm: document.querySelector('[data-feature-form]'),
  zzapForm: document.querySelector('[data-zzap-form]'),
  zzapValidation: document.querySelector('[data-zzap-validation]'),
  zzapPreview: document.querySelector('[data-zzap-preview]'),
  zzapVideoSlug: document.querySelector('[data-zzap-video-slug]'),
  gameGenres: document.querySelector('[data-game-genres]'),
  gameCollections: document.querySelector('[data-game-collections]'),
  gameCanonicalPreview: document.querySelector('[data-game-canonical-preview]'),
  gameThumbnailFile: document.querySelector('[data-game-thumbnail-file]'),
  gameValidation: document.querySelector('[data-game-validation]'),
  featureValidation: document.querySelector('[data-feature-validation]'),
  resetGame: document.querySelector('[data-action="reset-game"]'),
  resetVideo: document.querySelector('[data-action="reset-video"]'),
  resetZzap: document.querySelector('[data-action="reset-zzap"]'),
  githubOwner: document.querySelector('[data-github-owner]'),
  githubRepo: document.querySelector('[data-github-repo]'),
  githubBranch: document.querySelector('[data-github-branch]'),
  githubToken: document.querySelector('[data-github-token]'),
  rememberToken: document.querySelector('[data-remember-token]'),
  testGithub: document.querySelector('[data-action="test-github"]'),
  clearToken: document.querySelector('[data-action="clear-token"]'),
  githubStatus: document.querySelector('[data-github-status]'),
  clearLog: document.querySelector('[data-action="clear-log"]'),
  log: document.querySelector('[data-publisher-log]'),
  pipeline: Array.from(document.querySelectorAll('[data-pipeline-step]'))
};

init();

async function init() {
  try {
    const access = await ensureRole(['editor', 'admin', 'superadmin']);
    if (!access) return;
    await startAccessMonitor();

    hydrateGithubConfig();
    bindEvents();
    activateTab(tabFromHash());
    await refreshLiveData();
    resetGameForm();
    resetFeatureForm();
    resetZzapForm();
    document.body.dataset.publisherReady = 'true';
  } catch (error) {
    document.body.dataset.publisherReady = 'true';
    writeLog(`Publisher failed to initialise: ${error.message}`, true);
    setHealthBadge('Initialisation error', 'warning');
  }
}

function bindEvents() {
  el.tabs.forEach((button) => {
    button.addEventListener('click', () => activateTab(button.dataset.tab || 'game'));
  });

  el.refresh?.addEventListener('click', refreshLiveData);
  el.showUnverified?.addEventListener('click', toggleUnverifiedList);
  el.resetGame?.addEventListener('click', resetGameForm);
  el.resetVideo?.addEventListener('click', resetFeatureForm);
  el.resetZzap?.addEventListener('click', resetZzapForm);
  el.gameForm?.addEventListener('submit', publishGame);
  el.featureForm?.addEventListener('submit', publishFeature);
  el.zzapForm?.addEventListener('submit', publishZzapAwards);
  document.querySelector('[data-zzap-field="year"]')?.addEventListener('input', updateZzapPreview);
  document.querySelector('[data-zzap-field="records"]')?.addEventListener('input', updateZzapPreview);
  el.testGithub?.addEventListener('click', testGithubConnection);
  el.clearToken?.addEventListener('click', clearSavedToken);
  el.clearLog?.addEventListener('click', () => {
    if (el.log) el.log.textContent = 'Publisher log cleared.';
  });

  document.querySelector('[data-game-field="title"]')?.addEventListener('input', onGameTitleInput);
  document.querySelector('[data-game-field="slug"]')?.addEventListener('input', () => {
    state.gameSlugTouched = true;
    updateGameCanonicalPreview();
  });
  document.querySelector('[data-game-field="id"]')?.addEventListener('input', () => {
    state.gameIdTouched = true;
  });
  document.querySelector('[data-game-field="youtubeUrl"]')?.addEventListener('input', () => syncYoutubeFromUrl('game'));
  document.querySelector('[data-game-field="videoId"]')?.addEventListener('input', () => renderVideoPreview('game'));

  document.querySelector('[data-feature-field="title"]')?.addEventListener('input', onFeatureTitleInput);
  document.querySelector('[data-feature-field="slug"]')?.addEventListener('input', () => {
    state.featureSlugTouched = true;
  });
  document.querySelector('[data-feature-field="youtubeUrl"]')?.addEventListener('input', () => syncYoutubeFromUrl('feature'));
  document.querySelector('[data-feature-field="youtubeId"]')?.addEventListener('input', () => renderVideoPreview('feature'));

  [el.githubOwner, el.githubRepo, el.githubBranch].forEach((node) => {
    node?.addEventListener('change', persistGithubConfig);
  });
  el.githubToken?.addEventListener('change', persistGithubToken);
  el.rememberToken?.addEventListener('change', persistGithubToken);

  window.addEventListener('hashchange', () => activateTab(tabFromHash(), false));
}

function tabFromHash() {
  const value = String(window.location.hash || '').replace(/^#/, '').toLowerCase();
  if (value === 'video' || value === 'zzap' || value === 'status' || value === 'game') return value;
  return 'game';
}

function activateTab(tabName, updateHash = true) {
  const tab = ['game', 'video', 'zzap', 'status'].includes(tabName) ? tabName : 'game';
  state.currentTab = tab;

  el.tabs.forEach((button) => {
    const active = button.dataset.tab === tab;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-selected', active ? 'true' : 'false');
  });

  el.panels.forEach((panel) => {
    const active = panel.dataset.panel === tab;
    panel.hidden = !active;
    panel.classList.toggle('is-active', active);
  });

  if (updateHash && window.location.hash !== `#${tab}`) {
    window.history.replaceState(null, '', `#${tab}`);
  }
}

function hydrateGithubConfig() {
  if (el.githubOwner) el.githubOwner.value = localStorage.getItem(STORAGE_KEYS.owner) || DEFAULT_GITHUB_OWNER;
  if (el.githubRepo) el.githubRepo.value = localStorage.getItem(STORAGE_KEYS.repo) || DEFAULT_GITHUB_REPO;
  if (el.githubBranch) el.githubBranch.value = localStorage.getItem(STORAGE_KEYS.branch) || DEFAULT_GITHUB_BRANCH;

  const sessionToken = sessionStorage.getItem(STORAGE_KEYS.token) || '';
  const rememberedToken = localStorage.getItem(STORAGE_KEYS.token) || '';
  const legacyToken = localStorage.getItem(STORAGE_KEYS.legacyToken) || '';
  const token = sessionToken || rememberedToken || legacyToken;

  if (el.githubToken) el.githubToken.value = token;
  if (el.rememberToken) el.rememberToken.checked = Boolean(rememberedToken || legacyToken);
  setHealthBadge(token ? 'Publisher ready' : 'GitHub token needed', token ? 'ok' : 'warning');
}

function persistGithubConfig() {
  if (el.githubOwner) localStorage.setItem(STORAGE_KEYS.owner, el.githubOwner.value.trim());
  if (el.githubRepo) localStorage.setItem(STORAGE_KEYS.repo, el.githubRepo.value.trim());
  if (el.githubBranch) localStorage.setItem(STORAGE_KEYS.branch, el.githubBranch.value.trim());
}

function persistGithubToken() {
  const token = String(el.githubToken?.value || '').trim();
  sessionStorage.setItem(STORAGE_KEYS.token, token);

  if (el.rememberToken?.checked && token) {
    localStorage.setItem(STORAGE_KEYS.token, token);
  } else {
    localStorage.removeItem(STORAGE_KEYS.token);
  }

  setHealthBadge(token ? 'Publisher ready' : 'GitHub token needed', token ? 'ok' : 'warning');
}

function clearSavedToken() {
  sessionStorage.removeItem(STORAGE_KEYS.token);
  localStorage.removeItem(STORAGE_KEYS.token);
  localStorage.removeItem(STORAGE_KEYS.legacyToken);
  if (el.githubToken) el.githubToken.value = '';
  if (el.rememberToken) el.rememberToken.checked = false;
  setGithubStatus('Saved GitHub publishing token cleared from this browser.', false);
  setHealthBadge('GitHub token needed', 'warning');
}

function getGithubConfig() {
  const config = {
    owner: String(el.githubOwner?.value || '').trim(),
    repo: String(el.githubRepo?.value || '').trim(),
    branch: String(el.githubBranch?.value || '').trim(),
    token: String(el.githubToken?.value || '').trim()
  };

  if (!config.owner || !config.repo || !config.branch || !config.token) {
    throw new Error('Open “GitHub publishing connection” and enter the repository token before publishing.');
  }

  return config;
}

async function refreshLiveData() {
  setHealthBadge('Refreshing…', '');
  if (el.healthSummary) el.healthSummary.textContent = 'Refreshing current source and verified video metadata…';

  try {
    const [games, specials, events, demoMusic, metadata] = await Promise.all([
      fetchJson(LIVE_PATHS.games),
      fetchJson(LIVE_PATHS['retro-specials']),
      fetchJson(LIVE_PATHS['retro-events']),
      fetchJson(LIVE_PATHS['amiga-demo-music']),
      fetchJson(LIVE_PATHS.metadata)
    ]);

    state.games = Array.isArray(games) ? games : [];
    state.sections['retro-specials'] = Array.isArray(specials) ? specials : [];
    state.sections['retro-events'] = Array.isArray(events) ? events : [];
    state.sections['amiga-demo-music'] = Array.isArray(demoMusic) ? demoMusic : [];
    state.videoMetadata = metadata?.videos && typeof metadata.videos === 'object' ? metadata.videos : {};

    renderDynamicOptions();
    renderHealth();
    renderVideoPreview('game');
    renderVideoPreview('feature');
    setHealthBadge('Live data loaded', 'ok');
  } catch (error) {
    setHealthBadge('Live data error', 'warning');
    if (el.healthSummary) el.healthSummary.textContent = `Could not refresh one or more data files: ${error.message}`;
    writeLog(`Live data refresh failed: ${error.message}`, true);
  }
}

async function fetchJson(url) {
  const separator = url.includes('?') ? '&' : '?';
  const response = await fetch(`${url}${separator}t=${Date.now()}`, { cache: 'no-store' });
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}`);
  return response.json();
}

function renderHealth() {
  const retroEntries = Object.values(state.sections).flat();
  const publicRetro = retroEntries.filter((entry) => !entry?.membersOnly);
  const ids = new Set();

  state.games.forEach((game) => {
    const id = normalizeYoutubeId(game?.videoid || game?.videoId || '');
    if (id) ids.add(id);
  });
  retroEntries.forEach((entry) => {
    const id = normalizeYoutubeId(entry?.youtubeId || entry?.videoid || '');
    if (id) ids.add(id);
  });

  const verifiedIds = new Set(Object.keys(state.videoMetadata));
  state.unverifiedIds = [...ids].filter((id) => !verifiedIds.has(id)).sort();

  if (el.statGames) el.statGames.textContent = String(state.games.length);
  if (el.statRetroPublic) el.statRetroPublic.textContent = String(publicRetro.length);
  if (el.statVideoIds) el.statVideoIds.textContent = String(ids.size);
  if (el.statVerified) el.statVerified.textContent = String([...ids].filter((id) => verifiedIds.has(id)).length);

  if (el.healthSummary) {
    if (!state.unverifiedIds.length) {
      el.healthSummary.textContent = `All ${ids.size} current site video IDs have verified YouTube metadata.`;
    } else {
      el.healthSummary.textContent = `${ids.size - state.unverifiedIds.length} of ${ids.size} current site video IDs have verified metadata; ${state.unverifiedIds.length} remain unavailable or await the next sync.`;
    }
  }

  if (el.unverifiedList) {
    el.unverifiedList.textContent = state.unverifiedIds.length
      ? state.unverifiedIds.join(', ')
      : 'No unverified video IDs were found.';
  }
}

function toggleUnverifiedList() {
  if (!el.unverifiedList) return;
  el.unverifiedList.hidden = !el.unverifiedList.hidden;
}

function setHealthBadge(text, stateName) {
  if (!el.connectionBadge) return;
  el.connectionBadge.textContent = text;
  el.connectionBadge.classList.remove('is-ok', 'is-warning');
  if (stateName === 'ok') el.connectionBadge.classList.add('is-ok');
  if (stateName === 'warning') el.connectionBadge.classList.add('is-warning');
}

function renderDynamicOptions() {
  const genres = [...new Set(state.games.flatMap((game) => Array.isArray(game?.genres) ? game.genres : []).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b));
  const collections = [...new Set(state.games.flatMap((game) => Array.isArray(game?.collections) ? game.collections : []).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b));

  renderChipOptions(el.gameGenres, 'genre', genres);
  renderChipOptions(el.gameCollections, 'collection', collections);
}

function renderChipOptions(container, type, values) {
  if (!container) return;
  const selected = new Set(
    Array.from(container.querySelectorAll('input:checked')).map((input) => input.value)
  );
  container.innerHTML = '';

  values.forEach((value) => {
    const label = document.createElement('label');
    label.className = 'publisher-chip';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.value = value;
    input.dataset.optionType = type;
    input.checked = selected.has(value);
    const span = document.createElement('span');
    span.textContent = value;
    label.append(input, span);
    container.appendChild(label);
  });
}

function onGameTitleInput() {
  const title = gameValue('title');
  if (!state.gameSlugTouched) setGameValue('slug', slugify(title));
  if (!state.gameIdTouched) setGameValue('id', idify(title));
  updateGameCanonicalPreview();
}

function onFeatureTitleInput() {
  if (state.featureSlugTouched) return;
  setFeatureValue('slug', slugify(featureValue('title')));
}

function updateGameCanonicalPreview() {
  const slug = slugify(gameValue('slug'));
  if (el.gameCanonicalPreview) el.gameCanonicalPreview.textContent = slug ? `/games/${slug}/` : '/games/…/';
}

function syncYoutubeFromUrl(kind) {
  const url = kind === 'game' ? gameValue('youtubeUrl') : featureValue('youtubeUrl');
  const id = extractYoutubeId(url);
  if (id) {
    if (kind === 'game') setGameValue('videoId', id);
    else setFeatureValue('youtubeId', id);
  }
  renderVideoPreview(kind);
}

function renderVideoPreview(kind) {
  const id = normalizeYoutubeId(kind === 'game' ? gameValue('videoId') : featureValue('youtubeId'));
  const image = document.querySelector(`[data-video-thumb="${kind}"]`);
  const status = document.querySelector(`[data-video-status="${kind}"]`);
  const detail = document.querySelector(`[data-video-detail="${kind}"]`);

  if (!image || !status || !detail) return;
  if (!id) {
    image.hidden = true;
    image.removeAttribute('src');
    status.textContent = 'Paste a YouTube URL to begin.';
    detail.textContent = kind === 'game'
      ? 'The secure GitHub Action will fetch the official upload date, duration, title, thumbnail and chapters after publishing.'
      : 'If the YouTube description contains timestamps, the next SEO run can turn them into visible chapters and Clip Key Moments.';
    return;
  }

  image.src = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
  image.hidden = false;

  const metadata = state.videoMetadata[id];
  if (metadata) {
    const chapters = countTimestampLines(metadata.description || '');
    status.textContent = `Verified YouTube metadata already exists for ${id}.`;
    detail.textContent = [
      metadata.title || '',
      metadata.uploadDate ? `Uploaded ${formatDate(metadata.uploadDate)}` : '',
      metadata.duration ? `Duration ${formatIsoDuration(metadata.duration)}` : '',
      chapters ? `${chapters} timestamp chapter${chapters === 1 ? '' : 's'} detected` : 'No timestamp chapters detected in the current YouTube description'
    ].filter(Boolean).join(' · ');
  } else {
    status.textContent = `New/unverified YouTube ID: ${id}`;
    detail.textContent = 'This is expected for a newly added video. GitHub Actions will verify it with YouTube Data API v3 after the source commit reaches main. If YouTube does not return the video, VideoObject markup will be withheld rather than guessed.';
  }
}

function resetGameForm() {
  el.gameForm?.reset();
  state.gameSlugTouched = false;
  state.gameIdTouched = false;
  setGameValue('ccg_rating', '6');
  if (el.gameThumbnailFile) el.gameThumbnailFile.value = '';
  el.gameGenres?.querySelectorAll('input').forEach((input) => { input.checked = false; });
  el.gameCollections?.querySelectorAll('input').forEach((input) => { input.checked = false; });
  clearValidation(el.gameValidation);
  updateGameCanonicalPreview();
  renderVideoPreview('game');
}

function resetFeatureForm() {
  el.featureForm?.reset();
  state.featureSlugTouched = false;
  setFeatureValue('type', 'retro-specials');
  clearValidation(el.featureValidation);
  renderVideoPreview('feature');
}

function resetZzapForm() {
  el.zzapForm?.reset();
  clearValidation(el.zzapValidation);
  updateZzapPreview();
}

function zzapValue(name) {
  return String(document.querySelector(`[data-zzap-field="${name}"]`)?.value || '').trim();
}

function canonicalMonth(value) {
  const raw = String(value || '').trim().toLowerCase();
  return ZZAP_MONTHS.find((month) => month.toLowerCase() === raw) || '';
}

function normalizeZzapAward(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (raw.includes('gold')) return 'Gold Medal';
  if (raw.includes('silver')) return 'Silver Medal';
  if (raw.includes('sizzler')) return 'Sizzler';
  return '';
}

function normalizeZzapSystem(value) {
  const raw = String(value || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (raw === 'C64' || raw === 'COMMODORE64') return 'C64';
  if (raw === 'AMIGA' || raw === 'COMMODOREAMIGA') return 'AMIGA';
  return '';
}

function parseCsvLine(line) {
  const values = [];
  let current = '';
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (quoted && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === ',' && !quoted) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current.trim());
  return values;
}

function splitZzapRow(line) {
  if (line.includes('\t')) return line.split('\t').map((part) => part.trim());
  if (line.includes('|')) return line.split('|').map((part) => part.trim());
  if (line.includes(';')) return line.split(';').map((part) => part.trim());
  return parseCsvLine(line);
}

function normaliseZzapRecord(raw, year, rowNumber) {
  const source = Array.isArray(raw)
    ? { month: raw[0], title: raw[1], award: raw[2], score: raw[3], system: raw[4] }
    : {
        month: raw?.month,
        title: raw?.title || raw?.game,
        award: raw?.award,
        score: raw?.score,
        system: raw?.system || raw?.platform
      };

  const month = canonicalMonth(source.month);
  const title = String(source.title || '').trim();
  const award = normalizeZzapAward(source.award);
  const system = normalizeZzapSystem(source.system);
  const rawScore = source.score;
  const score = rawScore === null || rawScore === undefined || String(rawScore).trim() === ''
    ? null
    : Number(String(rawScore).replace('%', '').trim());

  const errors = [];
  if (!month) errors.push(`row ${rowNumber}: invalid month “${source.month || ''}”`);
  if (!title) errors.push(`row ${rowNumber}: title is missing`);
  if (!award) errors.push(`row ${rowNumber}: award must be Sizzler, Gold Medal or Silver Medal`);
  if (!system) errors.push(`row ${rowNumber}: system must be C64 or Amiga`);
  if (score !== null && (!Number.isInteger(score) || score < 0 || score > 100)) errors.push(`row ${rowNumber}: score must be 0–100 or blank`);

  return {
    record: { year, month, title, award, score, system },
    errors
  };
}

function parseZzapAwardsInput(text, year) {
  const input = String(text || '').trim();
  const errors = [];
  if (!Number.isInteger(year) || year < 1985 || year > 2100) return { records: [], errors: ['Enter a valid magazine year from 1985 onwards.'] };
  if (!input) return { records: [], errors: ['Paste the Zzap!64 award records for this year.'] };

  let rows;
  if (input.startsWith('[') || input.startsWith('{')) {
    try {
      const parsed = JSON.parse(input);
      rows = Array.isArray(parsed) ? parsed : (Array.isArray(parsed?.entries) ? parsed.entries : parsed?.awards);
      if (!Array.isArray(rows)) throw new Error('JSON must be an array or contain an entries/awards array.');
    } catch (error) {
      return { records: [], errors: [`JSON could not be parsed: ${error.message}`] };
    }
  } else {
    rows = input
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'))
      .map(splitZzapRow)
      .filter((fields, index) => !(index === 0 && String(fields[0] || '').toLowerCase() === 'month'));
  }

  const records = [];
  rows.forEach((row, index) => {
    const result = normaliseZzapRecord(row, year, index + 1);
    errors.push(...result.errors);
    if (!result.errors.length) records.push(result.record);
  });

  const seen = new Set();
  records.forEach((record) => {
    const key = [record.month.toLowerCase(), record.system, record.title.toLowerCase()].join('|');
    if (seen.has(key)) errors.push(`duplicate entry: ${record.month} · ${record.system} · ${record.title}`);
    seen.add(key);
  });

  records.sort((a, b) => ZZAP_MONTHS.indexOf(a.month) - ZZAP_MONTHS.indexOf(b.month)
    || a.title.localeCompare(b.title, 'en-GB', { numeric: true })
    || a.system.localeCompare(b.system));

  return { records, errors: [...new Set(errors)] };
}

function updateZzapPreview() {
  const year = Number(zzapValue('year'));
  const result = parseZzapAwardsInput(zzapValue('records'), year);
  const displayYear = Number.isInteger(year) && year >= 1985 ? year : 1990;
  if (el.zzapVideoSlug) el.zzapVideoSlug.textContent = `/retro-specials/zzap64-gold-medals-sizzlers-${displayYear}/`;
  if (!el.zzapPreview) return;

  if (!zzapValue('records')) {
    el.zzapPreview.innerHTML = '<strong>Paste the year\'s award list to preview it.</strong><p>No magazine page numbers are required here; those are verified automatically against the official Zzap Bible.</p>';
    return;
  }

  if (result.errors.length) {
    el.zzapPreview.innerHTML = `<strong>Preview needs attention.</strong><p>${escapeHtml(result.errors.slice(0, 3).join(' · '))}${result.errors.length > 3 ? ' …' : ''}</p>`;
    return;
  }

  const months = new Set(result.records.map((record) => record.month));
  const c64 = result.records.filter((record) => record.system === 'C64').length;
  const amiga = result.records.filter((record) => record.system === 'AMIGA').length;
  el.zzapPreview.innerHTML = `<strong>${result.records.length} award records ready for ${displayYear}.</strong><p>${months.size} months represented · C64 ${c64} · Amiga ${amiga}. Direct Zzap scan pages will be resolved after publish.</p>`;
}

async function publishZzapAwards(event) {
  event.preventDefault();
  const year = Number(zzapValue('year'));
  const parsed = parseZzapAwardsInput(zzapValue('records'), year);
  renderValidation(el.zzapValidation, parsed.errors);
  if (parsed.errors.length) return;

  let config;
  try {
    config = getGithubConfig();
  } catch (error) {
    renderValidation(el.zzapValidation, [error.message]);
    return;
  }

  const sourcePath = `data/zzap64-awards/${year}.json`;
  const publishButton = document.querySelector('[data-publish-zzap]');
  setButtonBusy(publishButton, true, 'Publishing…');
  resetPipeline();
  setPipelineStep('source', 'running', 'Checking');
  activateTab('status');
  writeLog(`Preparing Zzap!64 award year ${year}: ${parsed.records.length} records.`);

  try {
    if (await githubFileExists(config, sourcePath)) {
      throw new Error(`${sourcePath} already exists. This publisher refuses to overwrite an existing historical award year automatically.`);
    }

    const result = await commitFiles(config, [{
      path: sourcePath,
      text: `${JSON.stringify(parsed.records, null, 2)}\n`
    }], `Add Zzap64 ${year} award archive via CCG Content Publisher`, `zzap64-${year}`);

    state.lastPublish = { type: 'zzap', year, records: parsed.records, result };
    setPipelineStep('source', 'ok', result.mode === 'direct' ? 'Committed' : 'PR opened');
    setPipelineStep('metadata', 'ok', 'Not applicable');
    setPipelineStep('library', 'ok', 'Not applicable');
    setPipelineStep('sitemaps', 'ok', 'Existing sitemap');

    writeLog(result.mode === 'direct'
      ? `Zzap ${year} source committed: ${result.commitSha}`
      : `Direct main update was unavailable. Pull request created: ${result.prUrl}`);

    if (result.mode === 'pr') {
      markPipelineWaitingForMerge();
      return;
    }

    setPipelineStep('pages', 'running', 'Refreshing archive');
    setPipelineStep('validation', 'running', 'Resolving scans');
    setPipelineStep('live', 'running', 'Deploy pending');
    void monitorZzapAwardsLive(year, parsed.records.length);
  } catch (error) {
    setPipelineStep('source', 'error', 'Failed');
    writeLog(`Zzap award publish failed: ${error.message}`, true);
  } finally {
    setButtonBusy(publishButton, false, 'Publish Zzap Awards Year');
  }
}

async function monitorZzapAwardsLive(year, expectedCount) {
  const sourceUrl = `${SITE_ORIGIN}/data/zzap64-awards/${year}.json`;
  const reviewUrl = `${SITE_ORIGIN}/data/zzap64-review-links.json`;
  const prefix = `${year}|`;

  for (let attempt = 0; attempt < 24; attempt += 1) {
    try {
      const [sourceResponse, reviewResponse] = await Promise.all([
        fetch(`${sourceUrl}?publisher_check=${Date.now()}`, { cache: 'no-store' }),
        fetch(`${reviewUrl}?publisher_check=${Date.now()}`, { cache: 'no-store' })
      ]);
      if (sourceResponse.ok && reviewResponse.ok) {
        const sourceData = await sourceResponse.json();
        const reviewData = await reviewResponse.json();
        const yearLinks = Object.entries(reviewData?.entries || {}).filter(([key]) => key.startsWith(prefix));
        const directLinks = yearLinks.filter(([, row]) => row?.precision === 'page');
        if (Array.isArray(sourceData) && sourceData.length === expectedCount && yearLinks.length === expectedCount && directLinks.length === expectedCount) {
          setPipelineStep('pages', 'ok', 'Archive updated');
          setPipelineStep('validation', 'ok', 'Direct scans verified');
          setPipelineStep('live', 'ok', 'Live');
          writeLog(`Zzap ${year} is live with ${directLinks.length}/${expectedCount} direct original review scan links.`);
          return;
        }
      }
    } catch (_error) {
      // The deployment or automated review-link refresh may still be in progress.
    }
    await sleep(5000);
  }

  writeLog(`Zzap ${year} source was published, but the direct-scan refresh is still processing. Check Publishing Status or GitHub Actions shortly.`);
}

async function publishGame(event) {
  event.preventDefault();
  const entry = buildGameEntry();
  const errors = validateGameEntry(entry);
  renderValidation(el.gameValidation, errors);
  if (errors.length) return;

  let config;
  try {
    config = getGithubConfig();
  } catch (error) {
    renderValidation(el.gameValidation, [error.message]);
    return;
  }

  const publishButton = document.querySelector('[data-publish-game]');
  setButtonBusy(publishButton, true, 'Publishing…');
  resetPipeline();
  setPipelineStep('source', 'running', 'Committing');
  activateTab('status');
  writeLog(`Preparing new game: ${entry.title} (${entry.slug})`);

  try {
    const latestGames = await fetchGithubJsonFile(config, SOURCE_PATHS.games);
    if (!Array.isArray(latestGames)) throw new Error('GitHub games/games.json is not an array.');

    const liveDuplicate = latestGames.find((game) =>
      String(game?.slug || '').toLowerCase() === entry.slug.toLowerCase() ||
      String(game?.id || '').toLowerCase() === entry.id.toLowerCase()
    );
    if (liveDuplicate) throw new Error(`The slug or ID already exists in the current GitHub games.json (${liveDuplicate.title || liveDuplicate.slug}).`);

    const thumbnailCollision = latestGames.find((game) => String(game?.thumbnail || '') === entry.thumbnail);
    if (thumbnailCollision) throw new Error(`Thumbnail path is already used by ${thumbnailCollision.title || thumbnailCollision.slug}. Choose a unique thumbnail path.`);

    const mergedGames = [...latestGames, entry].sort(compareGameEntries);
    const files = [
      {
        path: SOURCE_PATHS.games,
        text: `${JSON.stringify(mergedGames, null, 2)}\n`
      }
    ];

    const thumbnailFile = el.gameThumbnailFile?.files?.[0] || null;
    if (thumbnailFile) {
      files.push({
        path: entry.thumbnail,
        base64: await fileToBase64(thumbnailFile)
      });
    } else {
      const thumbnailExists = await githubFileExists(config, entry.thumbnail);
      if (!thumbnailExists) {
        throw new Error(`Thumbnail does not exist in GitHub at ${entry.thumbnail}. Select the local thumbnail file before publishing.`);
      }
    }

    const result = await commitFiles(config, files, `Add ${entry.title} via CCG Content Publisher`, entry.slug);
    state.lastPublish = { type: 'game', entry, result };
    setPipelineStep('source', 'ok', result.mode === 'direct' ? 'Committed' : 'PR opened');
    writeLog(result.mode === 'direct'
      ? `Source commit created: ${result.commitSha}`
      : `Direct main update was unavailable. Pull request created: ${result.prUrl}`);

    if (result.mode === 'pr') {
      markPipelineWaitingForMerge();
      return;
    }

    void monitorPublish(config, {
      type: 'game',
      sourceSha: result.commitSha,
      liveUrl: `${SITE_ORIGIN}/games/${entry.slug}/`,
      videoId: entry.videoid
    });
  } catch (error) {
    setPipelineStep('source', 'error', 'Failed');
    writeLog(`Game publish failed: ${error.message}`, true);
  } finally {
    setButtonBusy(publishButton, false, 'Publish Game');
  }
}

async function publishFeature(event) {
  event.preventDefault();
  const entry = buildFeatureEntry();
  const errors = validateFeatureEntry(entry);
  renderValidation(el.featureValidation, errors);
  if (errors.length) return;

  let config;
  try {
    config = getGithubConfig();
  } catch (error) {
    renderValidation(el.featureValidation, [error.message]);
    return;
  }

  const publishButton = document.querySelector('[data-publish-feature]');
  setButtonBusy(publishButton, true, 'Publishing…');
  resetPipeline();
  setPipelineStep('source', 'running', 'Committing');
  activateTab('status');
  writeLog(`Preparing ${FEATURE_LABELS[entry.type] || 'video feature'}: ${entry.title} (${entry.slug})`);

  try {
    const sourcePath = SOURCE_PATHS[entry.type];
    const latestEntries = await fetchGithubJsonFile(config, sourcePath);
    if (!Array.isArray(latestEntries)) throw new Error(`${sourcePath} is not an array.`);

    const duplicate = latestEntries.find((item) => String(item?.slug || '').toLowerCase() === entry.slug.toLowerCase());
    if (duplicate) throw new Error(`Slug already exists in ${sourcePath}: ${duplicate.title || duplicate.slug}.`);

    entry.order = getNextOrder(latestEntries);
    const nextEntries = [...latestEntries, entry];
    const files = [{ path: sourcePath, text: `${JSON.stringify(nextEntries, null, 2)}\n` }];

    const result = await commitFiles(config, files, `Add ${entry.title} via CCG Content Publisher`, entry.slug);
    state.lastPublish = { type: 'feature', entry, result };
    setPipelineStep('source', 'ok', result.mode === 'direct' ? 'Committed' : 'PR opened');
    writeLog(result.mode === 'direct'
      ? `Source commit created: ${result.commitSha}`
      : `Direct main update was unavailable. Pull request created: ${result.prUrl}`);

    if (result.mode === 'pr') {
      markPipelineWaitingForMerge();
      return;
    }

    void monitorPublish(config, {
      type: 'feature',
      sourceSha: result.commitSha,
      liveUrl: `${SITE_ORIGIN}/${entry.type}/${entry.slug}/`,
      videoId: entry.youtubeId
    });
  } catch (error) {
    setPipelineStep('source', 'error', 'Failed');
    writeLog(`Feature publish failed: ${error.message}`, true);
  } finally {
    setButtonBusy(publishButton, false, 'Publish Video / Feature');
  }
}

function buildGameEntry() {
  const title = gameValue('title');
  const slug = slugify(gameValue('slug') || title);
  const id = idify(gameValue('id') || title);
  const thumbnail = normalizeThumbnailPath(gameValue('thumbnail'), slug);
  const developer = gameValue('developer');

  const entry = {
    system: gameValue('system').toUpperCase(),
    id,
    slug,
    title,
    sorttitle: title,
    year: Number(gameValue('year')),
    genres: selectedChipValues(el.gameGenres),
    collections: selectedChipValues(el.gameCollections),
    videoid: normalizeYoutubeId(gameValue('videoId')),
    thumbnail,
    pdf: gameValue('pdf'),
    disk: parseLines(gameValue('disk')),
    lemon: gameValue('lemonUrl') ? [gameValue('lemonUrl')] : [],
    zzap: gameValue('zzapUrl') ? [gameValue('zzapUrl')] : [],
    description: gameValue('description'),
    ccg_rating: Number(gameValue('ccg_rating')),
    ccg_rating_reason: gameValue('ccg_rating_reason'),
    credits: {
      publisher: parseCommaList(gameValue('publisher')),
      producer: gameValue('producer'),
      coder: parseCommaList(gameValue('coder')),
      graphics: parseCommaList(gameValue('graphics')),
      musician: parseCommaList(gameValue('musician')),
      re_releaser: parseCommaList(gameValue('reReleaser')),
      developer
    },
    developer,
    _ccg_enforced: false,
    _ccg_migrated: false
  };
  return entry;
}

function validateGameEntry(entry) {
  const errors = [];
  if (!entry.title) errors.push('Title is required.');
  if (!['C64', 'AMIGA'].includes(entry.system)) errors.push('System must be C64 or AMIGA.');
  if (!Number.isInteger(entry.year) || entry.year < 1970 || entry.year > 2100) errors.push('Year must be between 1970 and 2100.');
  if (!entry.slug || entry.slug !== gameValue('slug')) errors.push('Slug must be lowercase kebab-case with no extra characters.');
  if (!entry.id || entry.id !== gameValue('id')) errors.push('ID must be lowercase snake_case.');
  if (!entry.description || entry.description.length < 70) errors.push('Description should be at least 70 characters for useful page/search copy.');
  if (!entry.videoid || !isYoutubeId(entry.videoid)) errors.push('A valid 11-character YouTube video ID is required.');
  if (!entry.thumbnail || !isSafeThumbnailPath(entry.thumbnail)) errors.push(`Thumbnail must be an image inside ${ALLOWED_THUMBNAIL_PREFIX}`);
  if (!Array.isArray(entry.genres) || !entry.genres.length) errors.push('Choose at least one genre.');
  if (!entry.credits.publisher.length) errors.push('Publisher is required.');
  if (!Number.isInteger(entry.ccg_rating) || entry.ccg_rating < 1 || entry.ccg_rating > 10) errors.push('CCG rating must be an integer from 1 to 10.');
  if (entry.pdf && !isHttpUrl(entry.pdf)) errors.push('PDF/manual URL is not valid.');
  entry.disk.forEach((url) => { if (!isHttpUrl(url)) errors.push(`Invalid disk/download URL: ${url}`); });
  entry.lemon.forEach((url) => { if (!isHttpUrl(url)) errors.push(`Invalid Lemon64 URL: ${url}`); });
  entry.zzap.forEach((url) => { if (!isValidZzapReviewUrl(url)) errors.push(`Zzap!64 review URL must be a direct zzap64.co.uk displaypage link: ${url}`); });

  if (state.games.some((game) => String(game?.slug || '').toLowerCase() === entry.slug.toLowerCase())) errors.push('Slug already exists in the loaded games library.');
  if (state.games.some((game) => String(game?.id || '').toLowerCase() === entry.id.toLowerCase())) errors.push('ID already exists in the loaded games library.');
  return errors;
}

function buildFeatureEntry() {
  const type = featureValue('type') || 'retro-specials';
  const title = featureValue('title');
  const slug = slugify(featureValue('slug') || title);
  const youtubeId = normalizeYoutubeId(featureValue('youtubeId'));
  const summary = featureValue('summary');
  const description = featureValue('description');
  const seoTitle = featureValue('seoTitle') || buildFeatureSeoTitle(title, type);
  const seoDescription = featureValue('seoDescription') || buildFeatureSeoDescription(summary, description);

  const entry = {
    id: slug,
    slug,
    type,
    title,
    youtubeId,
    thumbnail: youtubeId ? `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg` : '',
    membersOnly: Boolean(document.querySelector('[data-feature-field="membersOnly"]')?.checked),
    order: 0,
    summary,
    description,
    collection: type,
    seo: {
      title: seoTitle,
      description: seoDescription
    },
    created_at: new Date().toISOString()
  };

  const relatedSlugs = parseCommaList(featureValue('relatedSlugs'));
  if (relatedSlugs.length) entry.relatedSlugs = relatedSlugs;

  const relatedGameSlugs = parseCommaList(featureValue('relatedGameSlugs'));
  if (relatedGameSlugs.length) entry.relatedGameSlugs = relatedGameSlugs;

  return entry;
}

function validateFeatureEntry(entry) {
  const errors = [];
  if (!SOURCE_PATHS[entry.type]) errors.push('Choose a supported video section.');
  if (!entry.title) errors.push('Title is required.');
  if (!entry.slug || entry.slug !== featureValue('slug')) errors.push('Slug must be lowercase kebab-case.');
  if (entry.type === 'retro-specials' && entry.slug.length > RETRO_SPECIAL_MAX_SLUG_LENGTH) errors.push(`Retro Special slugs must be ${RETRO_SPECIAL_MAX_SLUG_LENGTH} characters or fewer.`);
  if (!entry.youtubeId || !isYoutubeId(entry.youtubeId)) errors.push('A valid 11-character YouTube video ID is required.');
  if (!entry.summary || entry.summary.length < 30) errors.push('Summary should be at least 30 characters.');
  if (!entry.description || entry.description.length < 70) errors.push('Description should be at least 70 characters.');
  if (!entry.seo.title || entry.seo.title.length > 110) errors.push('SEO title is missing or unusually long.');
  if (!entry.seo.description || entry.seo.description.length < 70 || entry.seo.description.length > 180) errors.push('SEO description should be between 70 and 180 characters.');

  const current = state.sections[entry.type] || [];
  if (current.some((item) => String(item?.slug || '').toLowerCase() === entry.slug.toLowerCase())) errors.push('Slug already exists in the selected video section.');
  return errors;
}

function buildFeatureSeoTitle(title, type) {
  const label = FEATURE_LABELS[type] || 'Retro Video';
  const suffix = ` | ${label} | Cheeky Commodore Gamer`;
  const maxBase = Math.max(25, 105 - suffix.length);
  const base = title.length > maxBase ? `${title.slice(0, maxBase - 1).trim()}…` : title;
  return `${base}${suffix}`;
}

function buildFeatureSeoDescription(summary, description) {
  const source = String(summary || description || '').trim().replace(/\s+/g, ' ');
  if (!source) return '';
  if (source.length >= 70 && source.length <= 170) return source;
  if (source.length > 170) return `${source.slice(0, 167).trim()}…`;
  const expanded = `${source} Watch this Cheeky Commodore Gamer video feature with supporting retro gaming context.`;
  return expanded.length > 170 ? `${expanded.slice(0, 167).trim()}…` : expanded;
}

function compareGameEntries(a, b) {
  const left = String(a?.sorttitle || a?.title || a?.slug || a?.id || '').toLowerCase();
  const right = String(b?.sorttitle || b?.title || b?.slug || b?.id || '').toLowerCase();
  return left.localeCompare(right, 'en', { numeric: true, sensitivity: 'base' });
}

function getNextOrder(entries) {
  if (!entries.length) return 0;
  return entries.reduce((max, item) => {
    const value = Number(item?.order);
    return Number.isFinite(value) && value >= max ? value + 1 : max;
  }, 0);
}

async function testGithubConnection() {
  try {
    const config = getGithubConfig();
    const repo = await githubRequest(config, '');
    if (!repo?.full_name) throw new Error('Unexpected GitHub repository response.');
    persistGithubConfig();
    persistGithubToken();
    setGithubStatus(`Connected to ${repo.full_name}.`, false);
    setHealthBadge('GitHub connected', 'ok');
  } catch (error) {
    setGithubStatus(`GitHub connection failed: ${error.message}`, true);
    setHealthBadge('GitHub connection failed', 'warning');
  }
}

async function fetchGithubJsonFile(config, path) {
  const payload = await githubRequest(config, `/contents/${encodePath(path)}?ref=${encodeURIComponent(config.branch)}`);
  if (!payload?.content) throw new Error(`GitHub did not return content for ${path}.`);
  const text = decodeBase64Utf8(payload.content);
  return JSON.parse(text);
}

async function githubFileExists(config, path) {
  try {
    await githubRequest(config, `/contents/${encodePath(path)}?ref=${encodeURIComponent(config.branch)}`);
    return true;
  } catch (error) {
    if (error.status === 404) return false;
    throw error;
  }
}

async function commitFiles(config, files, message, slugHint) {
  const branchPath = config.branch.split('/').map(encodeURIComponent).join('/');
  const ref = await githubRequest(config, `/git/ref/heads/${branchPath}`);
  const headSha = ref?.object?.sha;
  if (!headSha) throw new Error(`Could not resolve ${config.branch} head commit.`);

  const headCommit = await githubRequest(config, `/git/commits/${headSha}`);
  const baseTreeSha = headCommit?.tree?.sha;
  if (!baseTreeSha) throw new Error('Could not resolve the GitHub base tree.');

  const treeEntries = [];
  for (const file of files) {
    const blob = await githubRequest(config, '/git/blobs', {
      method: 'POST',
      body: file.base64
        ? { content: file.base64, encoding: 'base64' }
        : { content: String(file.text || ''), encoding: 'utf-8' }
    });
    if (!blob?.sha) throw new Error(`Could not create GitHub blob for ${file.path}.`);
    treeEntries.push({ path: file.path, mode: '100644', type: 'blob', sha: blob.sha });
  }

  const tree = await githubRequest(config, '/git/trees', {
    method: 'POST',
    body: { base_tree: baseTreeSha, tree: treeEntries }
  });
  const commit = await githubRequest(config, '/git/commits', {
    method: 'POST',
    body: { message, tree: tree.sha, parents: [headSha] }
  });

  try {
    await githubRequest(config, `/git/refs/heads/${branchPath}`, {
      method: 'PATCH',
      body: { sha: commit.sha, force: false }
    });
    return { mode: 'direct', commitSha: commit.sha };
  } catch (error) {
    if (config.branch !== 'main') throw error;
    writeLog(`Direct main update was rejected (${error.message}). Creating a review branch instead.`);
    return createFallbackPullRequest(config, commit.sha, slugHint, message);
  }
}

async function createFallbackPullRequest(config, commitSha, slugHint, title) {
  const safeSlug = slugify(slugHint || 'content').slice(0, 42) || 'content';
  const branch = `admin/publish-${safeSlug}-${Date.now()}`;
  await githubRequest(config, '/git/refs', {
    method: 'POST',
    body: { ref: `refs/heads/${branch}`, sha: commitSha }
  });

  const pr = await githubRequest(config, '/pulls', {
    method: 'POST',
    body: {
      title,
      head: branch,
      base: 'main',
      body: 'Created by the CCG Content Publisher because the configured main branch could not be updated directly. Merge after the repository checks pass.'
    }
  });

  return { mode: 'pr', commitSha, branch, prUrl: pr?.html_url || '' };
}

async function githubRequest(config, endpoint, options = {}) {
  const method = options.method || 'GET';
  const url = `https://api.github.com/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}${endpoint}`;
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${config.token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(options.body ? { 'Content-Type': 'application/json' } : {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  if (!response.ok) {
    const text = await response.text();
    const error = new Error(`GitHub ${method} ${endpoint} returned ${response.status}: ${text.slice(0, 220)}`);
    error.status = response.status;
    throw error;
  }

  if (response.status === 204) return null;
  return response.json();
}

async function monitorPublish(config, job) {
  setPipelineStep('metadata', 'running', 'Waiting for SEO');
  setPipelineStep('pages', 'running', 'Waiting for build');
  setPipelineStep('library', 'running', 'Waiting for build');
  setPipelineStep('sitemaps', 'running', 'Waiting for build');
  setPipelineStep('validation', 'running', 'Waiting for checks');
  writeLog('Source commit accepted. Waiting for the automated publishing workflows…');

  try {
    const seoPromise = waitForWorkflow(config, 'seo.yml', job.sourceSha);
    const gamesPromise = job.type === 'game'
      ? waitForWorkflow(config, 'games-publishing.yml', job.sourceSha)
      : Promise.resolve({ conclusion: 'success', synthetic: true });

    const [seoRun, gamesRun] = await Promise.all([seoPromise, gamesPromise]);

    if (seoRun.conclusion !== 'success') {
      throw new Error(`SEO Automation finished with ${seoRun.conclusion || 'an unknown result'}.`);
    }
    if (gamesRun.conclusion !== 'success') {
      throw new Error(`Reliable Games Publishing finished with ${gamesRun.conclusion || 'an unknown result'}.`);
    }

    setPipelineStep('metadata', 'ok', 'Verified');
    setPipelineStep('pages', 'ok', 'Generated');
    setPipelineStep('library', 'ok', 'Updated');
    setPipelineStep('sitemaps', 'ok', 'Updated');
    setPipelineStep('validation', 'ok', 'Passed');
    writeLog('Automated metadata, page, library, sitemap and validation workflows completed successfully.');

    await sleep(8000);
    const live = await waitForLiveUrl(job.liveUrl);
    if (live) {
      setPipelineStep('live', 'ok', 'Live');
      writeLog(`Live page confirmed: ${job.liveUrl}`);
    } else {
      setPipelineStep('live', 'running', 'Deploy pending');
      writeLog(`Publishing workflows passed, but the live URL has not updated yet: ${job.liveUrl}`);
    }

    await refreshLiveData();
    const metadata = state.videoMetadata[job.videoId];
    if (metadata) {
      const chapterCount = countTimestampLines(metadata.description || '');
      writeLog(`YouTube verified: ${metadata.title || job.videoId}${metadata.duration ? ` · ${formatIsoDuration(metadata.duration)}` : ''}${chapterCount ? ` · ${chapterCount} chapters detected` : ''}`);
    } else {
      writeLog(`YouTube did not provide verified metadata for ${job.videoId}; VideoObject remains withheld until verification succeeds.`);
    }
  } catch (error) {
    ['metadata', 'pages', 'library', 'sitemaps', 'validation'].forEach((step) => {
      const node = pipelineNode(step);
      if (node && !node.classList.contains('is-ok')) setPipelineStep(step, 'error', 'Check failed');
    });
    writeLog(`Automated publishing check failed: ${error.message}`, true);
  }
}

async function waitForWorkflow(config, workflowFile, sourceSha) {
  const started = Date.now();
  while (Date.now() - started < WORKFLOW_POLL_TIMEOUT_MS) {
    const payload = await githubRequest(config, `/actions/workflows/${encodeURIComponent(workflowFile)}/runs?branch=${encodeURIComponent(config.branch)}&per_page=20`);
    const runs = Array.isArray(payload?.workflow_runs) ? payload.workflow_runs : [];
    const run = runs.find((item) => item?.head_sha === sourceSha);

    if (run) {
      writeLog(`${run.name || workflowFile}: ${run.status}${run.conclusion ? ` / ${run.conclusion}` : ''}`);
      if (run.status === 'completed') return run;
    }

    await sleep(WORKFLOW_POLL_INTERVAL_MS);
  }

  throw new Error(`${workflowFile} was not confirmed within ${Math.round(WORKFLOW_POLL_TIMEOUT_MS / 60000)} minutes.`);
}

async function waitForLiveUrl(url) {
  const attempts = 6;
  for (let index = 0; index < attempts; index += 1) {
    try {
      const response = await fetch(`${url}?publisher_check=${Date.now()}`, { cache: 'no-store' });
      if (response.ok) return true;
    } catch (_error) {
      // Retry below.
    }
    await sleep(5000);
  }
  return false;
}

function markPipelineWaitingForMerge() {
  ['metadata', 'pages', 'library', 'sitemaps', 'validation', 'live'].forEach((step) => setPipelineStep(step, 'running', 'Merge PR first'));
}

function resetPipeline() {
  el.pipeline.forEach((node) => {
    node.classList.remove('is-running', 'is-ok', 'is-error');
    const status = node.querySelector('b');
    if (status) status.textContent = 'Waiting';
  });
}

function setPipelineStep(step, statusName, text) {
  const node = pipelineNode(step);
  if (!node) return;
  node.classList.remove('is-running', 'is-ok', 'is-error');
  if (statusName === 'running') node.classList.add('is-running');
  if (statusName === 'ok') node.classList.add('is-ok');
  if (statusName === 'error') node.classList.add('is-error');
  const status = node.querySelector('b');
  if (status) status.textContent = text;
}

function pipelineNode(step) {
  return el.pipeline.find((node) => node.dataset.pipelineStep === step) || null;
}

function writeLog(message, isError = false) {
  if (!el.log) return;
  const current = el.log.textContent === 'No publishing job has been started in this session.' ? '' : el.log.textContent;
  const prefix = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  el.log.textContent = `${current}${current ? '\n' : ''}[${prefix}] ${isError ? 'ERROR: ' : ''}${message}`;
  el.log.scrollTop = el.log.scrollHeight;
}

function renderValidation(node, errors) {
  if (!node) return;
  if (!errors.length) {
    node.hidden = false;
    node.classList.add('is-ok');
    node.innerHTML = '<strong>Validation passed.</strong>';
    return;
  }
  node.hidden = false;
  node.classList.remove('is-ok');
  node.innerHTML = `<strong>Fix these items before publishing:</strong><ul>${errors.map((error) => `<li>${escapeHtml(error)}</li>`).join('')}</ul>`;
}

function clearValidation(node) {
  if (!node) return;
  node.hidden = true;
  node.classList.remove('is-ok');
  node.innerHTML = '';
}

function setGithubStatus(message, isError) {
  if (!el.githubStatus) return;
  el.githubStatus.textContent = message;
  el.githubStatus.classList.toggle('is-error', Boolean(isError));
  el.githubStatus.classList.toggle('is-ok', !isError);
}

function setButtonBusy(button, busy, label) {
  if (!button) return;
  button.disabled = busy;
  button.textContent = label;
}

function gameValue(name) {
  return String(document.querySelector(`[data-game-field="${name}"]`)?.value || '').trim();
}

function featureValue(name) {
  return String(document.querySelector(`[data-feature-field="${name}"]`)?.value || '').trim();
}

function setGameValue(name, value) {
  const node = document.querySelector(`[data-game-field="${name}"]`);
  if (node) node.value = value;
}

function setFeatureValue(name, value) {
  const node = document.querySelector(`[data-feature-field="${name}"]`);
  if (node) node.value = value;
}

function selectedChipValues(container) {
  if (!container) return [];
  return Array.from(container.querySelectorAll('input:checked')).map((input) => input.value);
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');
}

function idify(value) {
  return slugify(value).replace(/-/g, '_');
}

function normalizeThumbnailPath(value, slug) {
  const raw = String(value || '').trim().replace(/^\/+/, '');
  if (!raw) return `${ALLOWED_THUMBNAIL_PREFIX}${slug}.jpg`;
  if (raw.startsWith(ALLOWED_THUMBNAIL_PREFIX)) return raw;
  if (!raw.includes('/')) return `${ALLOWED_THUMBNAIL_PREFIX}${raw}`;
  return raw;
}

function isSafeThumbnailPath(value) {
  return String(value || '').startsWith(ALLOWED_THUMBNAIL_PREFIX) && /\.(?:png|jpe?g|webp)$/i.test(value);
}

function extractYoutubeId(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (isYoutubeId(raw)) return raw;

  try {
    const url = new URL(raw);
    const host = url.hostname.replace(/^www\./i, '').toLowerCase();
    if (host === 'youtu.be') return normalizeYoutubeId(url.pathname.split('/').filter(Boolean)[0] || '');
    if (host.endsWith('youtube.com')) {
      const queryId = url.searchParams.get('v');
      if (queryId) return normalizeYoutubeId(queryId);
      const parts = url.pathname.split('/').filter(Boolean);
      if (['shorts', 'live', 'embed'].includes(parts[0])) return normalizeYoutubeId(parts[1] || '');
    }
  } catch (_error) {
    // Fall through to regex parsing.
  }

  const match = raw.match(/(?:v=|youtu\.be\/|shorts\/|live\/|embed\/)([A-Za-z0-9_-]{11})/i);
  return match ? match[1] : '';
}

function normalizeYoutubeId(value) {
  const raw = String(value || '').trim().replace(/[?&].*$/, '');
  return isYoutubeId(raw) ? raw : '';
}

function isYoutubeId(value) {
  return /^[A-Za-z0-9_-]{11}$/.test(String(value || '').trim());
}

function parseLines(value) {
  return String(value || '').split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
}

function parseCommaList(value) {
  return String(value || '').split(/[\n,]/).map((item) => item.trim()).filter(Boolean);
}

function isHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (_error) {
    return false;
  }
}

function isValidZzapReviewUrl(value) {
  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\./i, '').toLowerCase();
    const issue = Number(url.searchParams.get('issue'));
    const page = Number(url.searchParams.get('page'));
    return url.protocol === 'https:'
      && host === 'zzap64.co.uk'
      && url.pathname.toLowerCase() === '/cgi-bin/displaypage.pl'
      && Number.isInteger(issue)
      && issue > 0
      && Number.isInteger(page)
      && page > 0;
  } catch (_error) {
    return false;
  }
}

function countTimestampLines(description) {
  return String(description || '')
    .split(/\r?\n/)
    .filter((line) => /^\s*(?:\d{1,2}:)?\d{1,2}:\d{2}\s+\S/.test(line))
    .length;
}

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value || '') : date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatIsoDuration(value) {
  const match = String(value || '').match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/i);
  if (!match) return String(value || '');
  const hours = Number(match[1] || 0);
  const minutes = Number(match[2] || 0);
  const seconds = Number(match[3] || 0);
  return hours ? `${hours}h ${minutes}m ${seconds}s` : `${minutes}m ${seconds}s`;
}

async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      resolve(result.includes(',') ? result.split(',')[1] : result);
    };
    reader.onerror = () => reject(new Error(`Could not read ${file.name}.`));
    reader.readAsDataURL(file);
  });
}

function decodeBase64Utf8(value) {
  const normalized = String(value || '').replace(/\s+/g, '');
  const binary = atob(normalized);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function encodePath(path) {
  return String(path || '').split('/').map(encodeURIComponent).join('/');
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// admin/js/archive-quality.js
// Phase 20 — administrator-only, read-only archive quality inspection.

import { ensureRole, startAccessMonitor } from './guard.js';
import { initAdminNav } from './admin-nav.js';

const SITE_ORIGIN = 'https://www.cheekycommodoregamer.co.uk';
const GAMES_URL = '/games/games.json';
const THUMBNAIL_SIZE_LIMIT = 1_500_000;
const BOX_SIZE_LIMIT = 2_000_000;
const RESOURCE_CONCURRENCY = 8;
const VALID_GENRES = new Set([
  'action adventure',
  'adventure',
  'arcade',
  'casino games',
  'fighting games',
  'horror',
  'miscellaneous',
  'platform',
  'puzzle',
  'racing',
  'role playing',
  'quiz',
  'shooting',
  'sports',
  'strategy'
]);

const SEVERITY_ORDER = Object.freeze({ critical: 0, warning: 1, info: 2 });

const state = {
  games: [],
  findings: [],
  resourceCache: new Map(),
  resourcesChecked: 0,
  running: false,
  lastCheckedAt: null
};

function text(value) {
  return String(value ?? '').trim();
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined || value === '') return [];
  return [value];
}

function normalizePlatform(value) {
  const raw = text(value).toLowerCase();
  if (raw === 'c64' || raw === 'commodore 64') return 'c64';
  if (raw === 'amiga' || raw === 'commodore amiga') return 'amiga';
  return 'other';
}

function platformLabel(value) {
  if (value === 'c64') return 'C64';
  if (value === 'amiga') return 'Amiga';
  return 'Other';
}

function normalizeTitle(value) {
  return text(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function gameLabel(game, index = 0) {
  return text(game?.title) || text(game?.slug) || text(game?.id) || `Record ${index + 1}`;
}

function gamePublishers(game) {
  return asArray(game?.credits?.publisher ?? game?.publisher)
    .map(text)
    .filter(Boolean);
}

function makeFinding({
  game = null,
  index = -1,
  severity = 'warning',
  category = 'Data quality',
  code = 'quality',
  title = 'Archive finding',
  detail = '',
  resource = '',
  reviewUrl = ''
}) {
  const platform = normalizePlatform(game?.system || game?.platform);
  const slug = text(game?.slug);
  return {
    id: `${code}:${slug || index}:${state.findings.length + 1}`,
    code,
    severity,
    category,
    title,
    detail,
    resource: text(resource),
    reviewUrl: text(reviewUrl),
    gameTitle: gameLabel(game, index),
    slug,
    gameId: text(game?.id),
    platform,
    publisher: gamePublishers(game).join(', '),
    recordIndex: index
  };
}

function addFinding(input) {
  state.findings.push(makeFinding(input));
}

function setStatus(message, mode = 'info') {
  const node = document.getElementById('archiveQualityStatus');
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

function setProgress(done, total, label) {
  const panel = document.getElementById('archiveQualityProgressPanel');
  const progress = document.getElementById('archiveQualityProgress');
  const value = document.getElementById('archiveQualityProgressValue');
  const labelNode = document.getElementById('archiveQualityProgressLabel');
  if (!panel || !progress || !value || !labelNode) return;

  const percent = total ? Math.round((done / total) * 100) : 0;
  panel.hidden = false;
  progress.value = percent;
  value.textContent = `${percent}%`;
  labelNode.textContent = label;
}

function hideProgress() {
  const panel = document.getElementById('archiveQualityProgressPanel');
  if (panel) panel.hidden = true;
}

function hasValidHttpUrl(value) {
  const raw = text(value);
  if (!raw) return true;
  try {
    const url = new URL(raw, window.location.origin);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function auditUrlValues(game, index, fieldLabel, values) {
  asArray(values).forEach((value) => {
    const raw = text(value);
    if (!raw) return;
    if (!hasValidHttpUrl(raw)) {
      addFinding({
        game,
        index,
        severity: 'warning',
        category: 'Link format',
        code: `link:${fieldLabel}`,
        title: `Malformed ${fieldLabel} link`,
        detail: 'The value is not a usable HTTP or HTTPS address.',
        resource: raw
      });
    }
  });
}

function auditRequiredFields(game, index) {
  const platform = normalizePlatform(game?.system || game?.platform);
  const year = Number(game?.year);
  const genres = asArray(game?.genres).map((value) => text(value).toLowerCase()).filter(Boolean);
  const videoId = text(game?.videoid || game?.videoId);
  const rating = Number(game?.ccg_rating);
  const description = text(game?.description);
  const slug = text(game?.slug);
  const thumbnail = text(game?.thumbnail);
  const publishers = gamePublishers(game);

  const required = [
    ['id', text(game?.id), 'Game ID'],
    ['slug', slug, 'Canonical slug'],
    ['title', text(game?.title), 'Title'],
    ['system', platform === 'other' ? '' : platform, 'C64 or Amiga system'],
    ['year', Number.isInteger(year) ? String(year) : '', 'Release year'],
    ['genres', genres.length ? genres.join(', ') : '', 'Genre'],
    ['description', description, 'Description'],
    ['video', videoId, 'YouTube video ID'],
    ['publisher', publishers.join(', '), 'Publisher'],
    ['thumbnail', thumbnail, 'Thumbnail path'],
    ['rating', Number.isFinite(rating) ? String(rating) : '', 'CCG rating']
  ];

  required.forEach(([code, value, label]) => {
    if (value) return;
    addFinding({
      game,
      index,
      severity: 'critical',
      category: 'Required information',
      code: `required:${code}`,
      title: `${label} is missing`,
      detail: 'The Game Builder treats this as required catalogue information.'
    });
  });

  if (slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    addFinding({
      game,
      index,
      severity: 'critical',
      category: 'Canonical identity',
      code: 'identity:slug-format',
      title: 'Slug format is unsafe',
      detail: 'Use lowercase letters, numbers and single hyphens only.',
      resource: slug
    });
  }

  if (Number.isInteger(year) && (year < 1980 || year > 2035)) {
    addFinding({
      game,
      index,
      severity: 'warning',
      category: 'Data quality',
      code: 'data:year-range',
      title: 'Release year needs review',
      detail: `The recorded year is ${year}, outside the expected archive range.`
    });
  }

  if (videoId && !/^[A-Za-z0-9_-]{11}$/.test(videoId)) {
    addFinding({
      game,
      index,
      severity: 'critical',
      category: 'Video',
      code: 'video:id-format',
      title: 'YouTube video ID is malformed',
      detail: 'A YouTube video ID should contain exactly 11 supported characters.',
      resource: videoId,
      reviewUrl: videoId ? `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}` : ''
    });
  }

  if (Number.isFinite(rating) && (rating < 1 || rating > 10)) {
    addFinding({
      game,
      index,
      severity: 'critical',
      category: 'Rating',
      code: 'rating:range',
      title: 'CCG rating is outside 1–10',
      detail: `The recorded rating is ${rating}.`
    });
  }

  if (description && description.length < 80) {
    addFinding({
      game,
      index,
      severity: 'info',
      category: 'Editorial depth',
      code: 'editorial:short-description',
      title: 'Description is very short',
      detail: `The description contains ${description.length} characters. A fuller summary may help visitors and search visibility.`
    });
  }

  genres.forEach((genre) => {
    if (VALID_GENRES.has(genre)) return;
    addFinding({
      game,
      index,
      severity: 'warning',
      category: 'Taxonomy',
      code: 'taxonomy:genre',
      title: 'Genre is outside the supported list',
      detail: `Review the genre value “${genre}”.`,
      resource: genre
    });
  });

  auditUrlValues(game, index, 'manual', game?.pdf);
  auditUrlValues(game, index, 'download', game?.disk);
  auditUrlValues(game, index, 'reference', game?.lemon);
  auditUrlValues(game, index, 'external', game?.externalLinks || game?.external_links);
}

function auditDuplicates() {
  const indexes = {
    id: new Map(),
    slug: new Map(),
    title: new Map()
  };

  state.games.forEach((game, index) => {
    const id = text(game?.id);
    const slug = text(game?.slug);
    const platform = normalizePlatform(game?.system || game?.platform);
    const titleKey = `${platform}:${normalizeTitle(game?.title)}`;

    if (id) {
      if (!indexes.id.has(id)) indexes.id.set(id, []);
      indexes.id.get(id).push(index);
    }
    if (slug) {
      if (!indexes.slug.has(slug)) indexes.slug.set(slug, []);
      indexes.slug.get(slug).push(index);
    }
    if (normalizeTitle(game?.title)) {
      if (!indexes.title.has(titleKey)) indexes.title.set(titleKey, []);
      indexes.title.get(titleKey).push(index);
    }
  });

  for (const [id, records] of indexes.id) {
    if (records.length < 2) continue;
    records.forEach((index) => addFinding({
      game: state.games[index],
      index,
      severity: 'critical',
      category: 'Duplicate records',
      code: 'duplicate:id',
      title: 'Duplicate game ID',
      detail: `The ID “${id}” appears in ${records.length} records.`,
      resource: id
    }));
  }

  for (const [slug, records] of indexes.slug) {
    if (records.length < 2) continue;
    records.forEach((index) => addFinding({
      game: state.games[index],
      index,
      severity: 'critical',
      category: 'Duplicate records',
      code: 'duplicate:slug',
      title: 'Duplicate canonical slug',
      detail: `The slug “${slug}” appears in ${records.length} records.`,
      resource: slug
    }));
  }

  for (const [, records] of indexes.title) {
    if (records.length < 2) continue;
    const slugs = new Set(records.map((index) => text(state.games[index]?.slug)).filter(Boolean));
    if (slugs.size < 2) continue;
    records.forEach((index) => addFinding({
      game: state.games[index],
      index,
      severity: 'warning',
      category: 'Duplicate records',
      code: 'duplicate:title-platform',
      title: 'Repeated title on the same system',
      detail: `The same normalised title appears in ${records.length} records. Confirm that these are intentional variants.`
    }));
  }
}

function runMetadataAudit() {
  state.findings = state.findings.filter((finding) => finding.code.startsWith('resource:'));
  state.games.forEach(auditRequiredFields);
  auditDuplicates();
  sortFindings();
}

function sortFindings() {
  state.findings.sort((a, b) => {
    const severity = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
    if (severity) return severity;
    const game = a.gameTitle.localeCompare(b.gameTitle, 'en-GB', { sensitivity: 'base' });
    if (game) return game;
    return a.title.localeCompare(b.title, 'en-GB', { sensitivity: 'base' });
  });
}

function localPath(value) {
  const raw = text(value);
  if (!raw) return '';
  try {
    const url = new URL(raw, window.location.origin);
    if (url.origin !== window.location.origin && url.origin !== SITE_ORIGIN) return '';
    return `${url.pathname}${url.search}`;
  } catch {
    return '';
  }
}

function musicPath(value) {
  const raw = text(value);
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw) || raw.startsWith('/')) return localPath(raw);
  if (raw.includes('/')) return localPath(raw);
  return `/resources/audio/games/${encodeURIComponent(raw).replace(/%2F/gi, '/')}`;
}

function buildResourceTasks() {
  const tasks = [];

  state.games.forEach((game, index) => {
    const slug = text(game?.slug);
    const thumbnail = localPath(game?.thumbnail);
    const box = localPath(game?.box3d || game?.box_3d || game?.box3D);

    if (thumbnail) {
      tasks.push({
        game,
        index,
        kind: 'thumbnail',
        category: 'Local artwork',
        url: thumbnail,
        missingSeverity: 'critical',
        sizeLimit: THUMBNAIL_SIZE_LIMIT,
        sizeLabel: 'thumbnail'
      });
    }

    if (box) {
      tasks.push({
        game,
        index,
        kind: 'box3d',
        category: 'Local artwork',
        url: box,
        missingSeverity: 'warning',
        sizeLimit: BOX_SIZE_LIMIT,
        sizeLabel: '3D box image'
      });
    }

    asArray(game?.music).map(musicPath).filter(Boolean).forEach((url) => {
      tasks.push({
        game,
        index,
        kind: 'music',
        category: 'Local audio',
        url,
        missingSeverity: 'warning',
        sizeLimit: 0,
        sizeLabel: 'audio file'
      });
    });

    [game?.pdf, game?.disk].flatMap(asArray).map(localPath).filter(Boolean).forEach((url) => {
      tasks.push({
        game,
        index,
        kind: 'local-link',
        category: 'Local files',
        url,
        missingSeverity: 'warning',
        sizeLimit: 0,
        sizeLabel: 'local linked file'
      });
    });

    if (slug) {
      tasks.push({
        game,
        index,
        kind: 'canonical-page',
        category: 'Canonical pages',
        url: `/games/${encodeURIComponent(slug)}/`,
        missingSeverity: 'critical',
        sizeLimit: 0,
        sizeLabel: 'canonical game page'
      });
    }
  });

  return tasks;
}

async function fetchHead(url) {
  if (state.resourceCache.has(url)) return state.resourceCache.get(url);

  const request = fetch(url, {
    method: 'HEAD',
    cache: 'no-store',
    credentials: 'same-origin',
    redirect: 'follow'
  }).then((response) => ({
    ok: response.ok,
    status: response.status,
    type: text(response.headers.get('content-type')).toLowerCase(),
    size: Number(response.headers.get('content-length') || 0)
  })).catch((error) => ({
    ok: false,
    status: 0,
    type: '',
    size: 0,
    error: text(error?.message) || 'Network request failed'
  }));

  state.resourceCache.set(url, request);
  return request;
}

function addResourceFinding(task, result) {
  if (!result.ok) {
    const unverifiable = result.status === 0 || result.status === 405;
    addFinding({
      game: task.game,
      index: task.index,
      severity: unverifiable ? 'info' : task.missingSeverity,
      category: task.category,
      code: `resource:${task.kind}:missing`,
      title: unverifiable ? 'Local file could not be verified' : `${task.sizeLabel[0].toUpperCase()}${task.sizeLabel.slice(1)} is missing`,
      detail: unverifiable
        ? 'The host did not return a usable HEAD response. Open the resource to review it directly.'
        : `The live site returned HTTP ${result.status || 'failure'} for this path.`,
      resource: task.url,
      reviewUrl: task.url
    });
    return;
  }

  if (task.kind === 'canonical-page' && result.type && !result.type.includes('text/html')) {
    addFinding({
      game: task.game,
      index: task.index,
      severity: 'warning',
      category: task.category,
      code: 'resource:canonical-page:type',
      title: 'Canonical route returned an unexpected file type',
      detail: `The route reported “${result.type}” instead of HTML.`,
      resource: task.url,
      reviewUrl: task.url
    });
  }

  if (task.sizeLimit > 0 && result.size > task.sizeLimit) {
    addFinding({
      game: task.game,
      index: task.index,
      severity: 'warning',
      category: 'Oversized media',
      code: `resource:${task.kind}:size`,
      title: `${task.sizeLabel[0].toUpperCase()}${task.sizeLabel.slice(1)} is oversized`,
      detail: `${formatBytes(result.size)} exceeds the ${formatBytes(task.sizeLimit)} review threshold.`,
      resource: task.url,
      reviewUrl: task.url
    });
  }
}

async function runResourceAudit() {
  state.findings = state.findings.filter((finding) => !finding.code.startsWith('resource:'));
  state.resourceCache.clear();
  state.resourcesChecked = 0;

  const tasks = buildResourceTasks();
  let cursor = 0;
  let completed = 0;

  setProgress(0, tasks.length, `Checking ${tasks.length} local files and pages…`);

  async function worker() {
    while (cursor < tasks.length) {
      const taskIndex = cursor;
      cursor += 1;
      const task = tasks[taskIndex];
      const result = await fetchHead(task.url);
      addResourceFinding(task, result);
      completed += 1;
      state.resourcesChecked = completed;
      if (completed === tasks.length || completed % 10 === 0) {
        setProgress(completed, tasks.length, `Checked ${completed} of ${tasks.length} local files and pages`);
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(RESOURCE_CONCURRENCY, tasks.length || 1) }, worker));
  sortFindings();
}

function formatBytes(bytes) {
  const value = Number(bytes || 0);
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(2)} MB`;
}

function filteredFindings() {
  const query = text(document.getElementById('archiveQualitySearch')?.value).toLowerCase();
  const severity = text(document.getElementById('archiveQualitySeverity')?.value) || 'all';
  const category = text(document.getElementById('archiveQualityCategory')?.value) || 'all';
  const platform = text(document.getElementById('archiveQualityPlatform')?.value) || 'all';

  return state.findings.filter((finding) => {
    if (severity !== 'all' && finding.severity !== severity) return false;
    if (category !== 'all' && finding.category !== category) return false;
    if (platform !== 'all' && finding.platform !== platform) return false;
    if (!query) return true;

    const haystack = [
      finding.gameTitle,
      finding.slug,
      finding.gameId,
      finding.publisher,
      finding.title,
      finding.detail,
      finding.resource,
      finding.category
    ].join(' ').toLowerCase();
    return haystack.includes(query);
  });
}

function appendText(parent, className, value, tagName = 'span') {
  const node = document.createElement(tagName);
  if (className) node.className = className;
  node.textContent = value;
  parent.appendChild(node);
  return node;
}

function findingCard(finding) {
  const card = document.createElement('article');
  card.className = `archive-quality__finding is-${finding.severity}`;

  appendText(card, 'archive-quality__severity', finding.severity);

  const game = document.createElement('div');
  game.className = 'archive-quality__game';
  appendText(game, '', finding.gameTitle, 'strong');
  if (finding.slug) appendText(game, '', finding.slug, 'code');
  const meta = document.createElement('div');
  meta.className = 'archive-quality__meta';
  appendText(meta, 'archive-quality__platform', platformLabel(finding.platform));
  appendText(meta, 'archive-quality__category', finding.category);
  game.appendChild(meta);
  card.appendChild(game);

  const detail = document.createElement('div');
  detail.className = 'archive-quality__detail';
  appendText(detail, '', finding.title, 'strong');
  appendText(detail, '', finding.detail || 'Review this record.', 'p');
  if (finding.resource) appendText(detail, '', finding.resource, 'code');
  card.appendChild(detail);

  const actions = document.createElement('div');
  actions.className = 'archive-quality__actions';

  if (finding.slug) {
    const gameLink = document.createElement('a');
    gameLink.href = `/games/${encodeURIComponent(finding.slug)}/`;
    gameLink.target = '_blank';
    gameLink.rel = 'noopener';
    gameLink.textContent = 'Open game';
    actions.appendChild(gameLink);
  }

  if (finding.reviewUrl) {
    const resourceLink = document.createElement('a');
    resourceLink.href = finding.reviewUrl;
    resourceLink.target = '_blank';
    resourceLink.rel = 'noopener noreferrer';
    resourceLink.textContent = 'Open resource';
    actions.appendChild(resourceLink);
  }

  if (finding.resource) {
    const copy = document.createElement('button');
    copy.type = 'button';
    copy.textContent = 'Copy value';
    copy.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(finding.resource);
        copy.textContent = 'Copied';
      } catch {
        copy.textContent = 'Copy unavailable';
      }
      window.setTimeout(() => { copy.textContent = 'Copy value'; }, 1600);
    });
    actions.appendChild(copy);
  }

  card.appendChild(actions);
  return card;
}

function renderCategoryOptions() {
  const select = document.getElementById('archiveQualityCategory');
  if (!select) return;
  const selected = select.value || 'all';
  const categories = [...new Set(state.findings.map((finding) => finding.category))]
    .sort((a, b) => a.localeCompare(b, 'en-GB'));

  select.replaceChildren();
  const all = document.createElement('option');
  all.value = 'all';
  all.textContent = 'All categories';
  select.appendChild(all);
  categories.forEach((category) => {
    const option = document.createElement('option');
    option.value = category;
    option.textContent = category;
    select.appendChild(option);
  });
  select.value = categories.includes(selected) ? selected : 'all';
}

function renderSummary() {
  const counts = { critical: 0, warning: 0, info: 0 };
  state.findings.forEach((finding) => { counts[finding.severity] += 1; });

  document.getElementById('archiveQualityGameCount').textContent = String(state.games.length);
  document.getElementById('archiveQualityCriticalCount').textContent = String(counts.critical);
  document.getElementById('archiveQualityWarningCount').textContent = String(counts.warning);
  document.getElementById('archiveQualityInfoCount').textContent = String(counts.info);
  document.getElementById('archiveQualityResourceCount').textContent = String(state.resourcesChecked);
}

function renderFindings() {
  renderSummary();
  renderCategoryOptions();

  const findings = filteredFindings();
  const host = document.getElementById('archiveQualityResults');
  const count = document.getElementById('archiveQualityVisibleCount');
  if (!host || !count) return;

  host.replaceChildren();
  count.textContent = `${findings.length} of ${state.findings.length} findings shown.`;

  if (!findings.length) {
    const empty = document.createElement('p');
    empty.className = 'archive-quality__empty';
    empty.textContent = state.findings.length
      ? 'No findings match the current filters.'
      : 'No catalogue issues were found by the checks completed so far.';
    host.appendChild(empty);
    return;
  }

  const fragment = document.createDocumentFragment();
  findings.forEach((finding) => fragment.appendChild(findingCard(finding)));
  host.appendChild(fragment);
}

function renderCheckedAt() {
  const node = document.getElementById('archiveQualityCheckedAt');
  if (!node || !state.lastCheckedAt) return;
  node.textContent = `Checked ${new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(state.lastCheckedAt)}`;
}

async function loadCatalogue() {
  const response = await fetch(`${GAMES_URL}?archive-quality=${Date.now()}`, {
    cache: 'no-store',
    credentials: 'same-origin'
  });
  if (!response.ok) throw new Error(`games.json returned HTTP ${response.status}.`);
  const data = await response.json();
  if (!Array.isArray(data) || !data.length) throw new Error('games.json did not return a populated array.');
  state.games = data;
}

async function runQuickAudit() {
  setStatus('Loading the live game catalogue…', 'info');
  await loadCatalogue();
  state.resourcesChecked = 0;
  state.findings = [];
  runMetadataAudit();
  state.lastCheckedAt = new Date();
  renderFindings();
  renderCheckedAt();

  const critical = state.findings.filter((finding) => finding.severity === 'critical').length;
  setStatus(
    `Quick audit complete: ${state.games.length} games inspected. Run the full audit to verify local files and canonical pages.`,
    critical ? 'warning' : 'success'
  );
}

async function runFullAudit() {
  if (state.running) return;
  state.running = true;
  const button = document.getElementById('archiveQualityRun');
  if (button) {
    button.disabled = true;
    button.textContent = 'Audit running…';
  }

  try {
    setStatus('Refreshing the catalogue before the full audit…', 'info');
    await loadCatalogue();
    state.findings = [];
    runMetadataAudit();
    renderFindings();

    setStatus('Checking live local files and canonical pages…', 'info');
    await runResourceAudit();
    state.lastCheckedAt = new Date();
    renderFindings();
    renderCheckedAt();

    const critical = state.findings.filter((finding) => finding.severity === 'critical').length;
    const warnings = state.findings.filter((finding) => finding.severity === 'warning').length;
    setStatus(
      `Full audit complete: ${critical} critical, ${warnings} warning and ${state.resourcesChecked} local file checks.`,
      critical ? 'warning' : 'success'
    );
  } catch (error) {
    console.error('[archive-quality] Full audit failed', error);
    setStatus(error?.message || 'The archive audit could not be completed.', 'error');
  } finally {
    state.running = false;
    hideProgress();
    if (button) {
      button.disabled = false;
      button.textContent = 'Run full audit';
    }
  }
}

function reportRows() {
  return filteredFindings().map((finding) => ({
    severity: finding.severity,
    category: finding.category,
    system: platformLabel(finding.platform),
    title: finding.gameTitle,
    slug: finding.slug,
    game_id: finding.gameId,
    finding: finding.title,
    detail: finding.detail,
    resource: finding.resource
  }));
}

function csvEscape(value) {
  const raw = String(value ?? '');
  return `"${raw.replace(/"/g, '""')}"`;
}

function downloadText(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function copyVisibleReport() {
  const rows = reportRows();
  const payload = rows.map((row, index) => (
    `${index + 1}. [${row.severity.toUpperCase()}] ${row.title} (${row.system}) — ${row.finding}${row.resource ? ` — ${row.resource}` : ''}`
  )).join('\n');
  const button = document.getElementById('archiveQualityCopy');

  try {
    await navigator.clipboard.writeText(payload || 'No findings match the current filters.');
    if (button) button.textContent = 'Report copied';
  } catch {
    if (button) button.textContent = 'Copy unavailable';
  }
  window.setTimeout(() => { if (button) button.textContent = 'Copy visible report'; }, 1700);
}

function exportCsv() {
  const rows = reportRows();
  const columns = ['severity', 'category', 'system', 'title', 'slug', 'game_id', 'finding', 'detail', 'resource'];
  const csv = [
    columns.map(csvEscape).join(','),
    ...rows.map((row) => columns.map((column) => csvEscape(row[column])).join(','))
  ].join('\n');
  downloadText('ccg-archive-quality-report.csv', csv, 'text/csv;charset=utf-8');
}

function exportJson() {
  const payload = {
    generated_at: new Date().toISOString(),
    games_inspected: state.games.length,
    local_resources_checked: state.resourcesChecked,
    filters_applied: true,
    findings: reportRows()
  };
  downloadText('ccg-archive-quality-report.json', `${JSON.stringify(payload, null, 2)}\n`, 'application/json;charset=utf-8');
}

function bindControls() {
  document.getElementById('archiveQualityRun')?.addEventListener('click', () => { void runFullAudit(); });
  document.getElementById('archiveQualityCopy')?.addEventListener('click', () => { void copyVisibleReport(); });
  document.getElementById('archiveQualityCsv')?.addEventListener('click', exportCsv);
  document.getElementById('archiveQualityJson')?.addEventListener('click', exportJson);

  ['archiveQualitySearch', 'archiveQualitySeverity', 'archiveQualityCategory', 'archiveQualityPlatform']
    .forEach((id) => document.getElementById(id)?.addEventListener('input', renderFindings));
}

async function init() {
  try {
    setAuthStatus('Checking administrator session…', 'info');
    const access = await ensureRole(['admin', 'superadmin']);
    if (!access) return;

    document.documentElement.dataset.archiveQualityGate = 'granted';
    setAuthStatus('Signed in', 'success');
    await initAdminNav({ active: 'quality', pageLabel: 'Archive Quality' });
    await startAccessMonitor();

    bindControls();
    await runQuickAudit();
  } catch (error) {
    console.error('[archive-quality] Initialisation failed', error);
    document.documentElement.dataset.archiveQualityGate = 'granted';
    setAuthStatus('Administrator access could not be verified.', 'error');
    setStatus(error?.message || 'The Archive Quality Centre could not be started.', 'error');
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  void init();
}

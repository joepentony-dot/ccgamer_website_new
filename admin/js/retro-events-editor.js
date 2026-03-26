const DEFAULT_GITHUB_OWNER = 'joepentony-dot';
const DEFAULT_GITHUB_REPO = 'ccgamer_website_new';
const DEFAULT_GITHUB_BRANCH = 'main';

const BUILD_POLL_INTERVAL_MS = 5000;
const BUILD_POLL_TIMEOUT_MS = 120000;
const MAX_COMMIT_PAYLOAD_BYTES = 1024 * 1024;

const STORAGE_KEYS = {
  owner: 'ccg_retro_github_owner',
  repo: 'ccg_retro_github_repo',
  branch: 'ccg_retro_github_branch',
  token: 'ccg_retro_github_token'
};

const DATA_FILES = {
  'retro-events': '/data/retro-events.json',
  'retro-specials': '/data/retro-specials.json',
  'amiga-demo-music': '/data/amiga-demo-music.json'
};

const LIVE_URLS = {
  'retro-events': 'https://www.cheekycommodoregamer.co.uk/retro-events/',
  'retro-specials': 'https://www.cheekycommodoregamer.co.uk/retro-specials/',
  'amiga-demo-music': 'https://www.cheekycommodoregamer.co.uk/amiga-demo-music/'
};

const TYPE_TO_SECTION = {
  retro_event: 'retro-events',
  'retro-events': 'retro-events',
  retro_special: 'retro-specials',
  'retro-specials': 'retro-specials',
  demo_music: 'amiga-demo-music',
  'amiga-demo-music': 'amiga-demo-music'
};

const state = {
  events: [],
  bySection: {
    'retro-events': [],
    'retro-specials': [],
    'amiga-demo-music': []
  }
};

const el = {
  status: document.querySelector('[data-status]'),
  form: document.querySelector('[data-form]'),
  list: document.querySelector('[data-event-list]'),
  saveRetroJson: document.querySelector('[data-action="save-retro-json"]'),
  saveSpecialsJson: document.querySelector('[data-action="save-specials-json"]'),
  saveDemoJson: document.querySelector('[data-action="save-demo-json"]'),
  resetForm: document.querySelector('[data-action="reset-form"]'),
  typeFilter: document.querySelector('[data-filter="type"]'),
  githubOwner: document.querySelector('[data-github-owner]'),
  githubRepo: document.querySelector('[data-github-repo]'),
  githubBranch: document.querySelector('[data-github-branch]'),
  githubToken: document.querySelector('[data-github-token]'),
  clearToken: document.querySelector('[data-action="clear-token"]'),
  commitStatus: document.querySelector('#ccgCommitStatus'),
  buildStatus: document.querySelector('#ccgBuildStatus'),
  liveStatus: document.querySelector('#ccgLiveStatus')
};

const fields = {
  type: document.querySelector('[data-field="type"]'),
  title: document.querySelector('[data-field="title"]'),
  slug: document.querySelector('[data-field="slug"]'),
  youtubeUrl: document.querySelector('[data-field="youtubeUrl"]'),
  youtubeId: document.querySelector('[data-field="youtubeId"]'),
  summary: document.querySelector('[data-field="summary"]'),
  description: document.querySelector('[data-field="description"]'),
  membersOnly: document.querySelector('[data-field="membersOnly"]')
};

init();

async function init() {
  hydrateGithubFields();
  bindEvents();
  await loadEvents();
  renderEvents();
  resetForm();
}

function bindEvents() {
  el.form?.addEventListener('submit', onSaveEvent);
  el.resetForm?.addEventListener('click', resetForm);
  el.saveRetroJson?.addEventListener('click', () => saveSection('retro-events'));
  el.saveSpecialsJson?.addEventListener('click', () => saveSection('retro-specials'));
  el.saveDemoJson?.addEventListener('click', () => saveSection('amiga-demo-music'));
  el.typeFilter?.addEventListener('change', renderEvents);

  el.githubOwner?.addEventListener('change', persistGithubField);
  el.githubRepo?.addEventListener('change', persistGithubField);
  el.githubBranch?.addEventListener('change', persistGithubField);
  el.githubToken?.addEventListener('change', persistGithubField);
  el.clearToken?.addEventListener('click', clearSavedToken);
}

function hydrateGithubFields() {
  if (el.githubOwner) el.githubOwner.value = localStorage.getItem(STORAGE_KEYS.owner) || DEFAULT_GITHUB_OWNER;
  if (el.githubRepo) el.githubRepo.value = localStorage.getItem(STORAGE_KEYS.repo) || DEFAULT_GITHUB_REPO;
  if (el.githubBranch) el.githubBranch.value = localStorage.getItem(STORAGE_KEYS.branch) || DEFAULT_GITHUB_BRANCH;
  if (el.githubToken) el.githubToken.value = localStorage.getItem(STORAGE_KEYS.token) || '';
}

function persistGithubField(event) {
  const target = event?.target;
  if (!target) return;

  if (target === el.githubOwner) localStorage.setItem(STORAGE_KEYS.owner, target.value.trim());
  if (target === el.githubRepo) localStorage.setItem(STORAGE_KEYS.repo, target.value.trim());
  if (target === el.githubBranch) localStorage.setItem(STORAGE_KEYS.branch, target.value.trim());
  if (target === el.githubToken) localStorage.setItem(STORAGE_KEYS.token, target.value.trim());
}

function clearSavedToken() {
  localStorage.removeItem(STORAGE_KEYS.token);
  if (el.githubToken) el.githubToken.value = '';
  setStatus('Saved token cleared from this browser.', false);
}

async function loadEvents() {
  try {
    const sections = Object.keys(DATA_FILES);
    const responses = await Promise.all(sections.map((section) => loadData(section)));

    sections.forEach((section, index) => {
      state.bySection[section] = Array.isArray(responses[index]) ? responses[index] : [];
    });

    state.events = sections.flatMap((section) => state.bySection[section]);
    setStatus(`Loaded ${state.events.length} entries across 3 JSON files.`, false);
  } catch (error) {
    setStatus(error.message, true);
  }
}

async function loadData(section) {
  const file = DATA_FILES[section];
  const response = await fetch(`${file}?t=${Date.now()}`, { cache: 'no-store' });

  if (!response.ok) {
    throw new Error(`Failed to load ${file}`);
  }

  return response.json();
}

async function saveSection(section) {
  const github = getGithubConfig();
  if (!github.ok) {
    setStatus(github.message, true);
    return;
  }

  const path = `data/${section}.json`;
  const sectionPayload = getSectionPayload(section);
  if (!Array.isArray(sectionPayload) || sectionPayload.length === 0) {
    setStatus(`❌ Refusing to commit empty payload for ${path}.`, true);
    setPipelineStatus('commit', '❌ Commit blocked (empty payload)', 'status-error');
    return;
  }

  const payload = JSON.stringify(sectionPayload, null, 2) + '\n';
  if (!payload || payload.trim() === '[]' || payload.length > MAX_COMMIT_PAYLOAD_BYTES) {
    setStatus(`❌ Payload safety check failed for ${path}.`, true);
    setPipelineStatus('commit', '❌ Commit blocked (payload safety)', 'status-error');
    return;
  }

  try {
    console.log('Commit started', { section, path });
    const fileState = await fetchFileState(github.config, path);

    if (fileState.content === payload) {
      setStatus(`ℹ️ No changes detected for ${path}; skipping commit.`, false);
      setPipelineStatus('commit', 'ℹ️ No changes to commit', 'status-idle');
      setPipelineStatus('build', 'No build needed', 'status-idle');
      setPipelineStatus('live', 'No deploy needed', 'status-idle');
      return;
    }

    await putFileContent(github.config, path, payload, fileState.sha);
    console.log('Commit success', { section, path });
    setStatus(`✅ Committed ${path} to ${github.config.owner}/${github.config.repo}@${github.config.branch}.`, false);

    setPipelineStatus('commit', '✅ Committed to GitHub', 'status-ok');
    setPipelineStatus('build', '🔄 Build running...', 'status-running');
    setPipelineStatus('live', 'Waiting for deploy...', 'status-idle');
    console.log('Build detected', { section, path });

    const latestEntry = getLatestEntryForSection(section);
    void sendDiscordNotification(latestEntry, section);
    void sendEmailNotification(latestEntry, section);

    const buildResult = await pollLatestBuildStatus(github.config);
    if (buildResult === 'success') {
      console.log('Build complete', { section, path, status: buildResult });
      setPipelineStatus('build', '✅ Build complete', 'status-ok');
      await sleep(7000);
      await updateLiveStatus(section);
    } else if (buildResult === 'failure') {
      setPipelineStatus('build', '❌ Build failed', 'status-error');
      setPipelineStatus('live', '⚠️ Live check pending', 'status-idle');
    } else {
      setPipelineStatus('build', '⚠️ Build status timeout', 'status-idle');
      setPipelineStatus('live', '⚠️ Live check pending', 'status-idle');
    }
  } catch (err) {
    setStatus(`❌ Save failed for ${path}: ${err.message}`, true);
    setPipelineStatus('commit', '❌ Commit failed', 'status-error');
    setPipelineStatus('build', 'No build yet', 'status-idle');
    setPipelineStatus('live', 'Not deployed', 'status-idle');
  }
}

function getGithubConfig() {
  const owner = (el.githubOwner?.value || '').trim();
  const repo = (el.githubRepo?.value || '').trim();
  const branch = (el.githubBranch?.value || '').trim();
  const token = (el.githubToken?.value || '').trim();

  if (!owner || !repo || !branch || !token) {
    return { ok: false, message: 'GitHub owner, repo, branch, and token are all required.' };
  }

  return { ok: true, config: { owner, repo, branch, token } };
}

async function fetchFileState(config, path) {
  const endpoint = `https://api.github.com/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}/contents/${path}?ref=${encodeURIComponent(config.branch)}`;
  const response = await fetch(endpoint, {
    headers: {
      Authorization: `Bearer ${config.token}`,
      Accept: 'application/vnd.github+json'
    }
  });

  if (response.status === 404) return { sha: null, content: '' };

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Unable to fetch file SHA (${response.status}). ${text.slice(0, 160)}`);
  }

  const fileData = await response.json();
  return {
    sha: fileData.sha || null,
    content: decodeBase64Unicode(fileData.content || '')
  };
}

async function putFileContent(config, path, content, sha) {
  const endpoint = `https://api.github.com/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}/contents/${path}`;
  const body = {
    message: `chore(retro-data): update ${path} via retro editor`,
    content: encodeBase64Unicode(content),
    branch: config.branch
  };

  if (sha) body.sha = sha;

  const response = await fetch(endpoint, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${config.token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub commit failed (${response.status}). ${text.slice(0, 180)}`);
  }
}

async function pollLatestBuildStatus(config) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < BUILD_POLL_TIMEOUT_MS) {
    const run = await fetchLatestWorkflowRun(config);
    if (run?.status === 'completed') {
      return run.conclusion === 'success' ? 'success' : 'failure';
    }
    await sleep(BUILD_POLL_INTERVAL_MS);
  }
  return 'timeout';
}

async function fetchLatestWorkflowRun(config) {
  const endpoint = `https://api.github.com/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}/actions/runs?per_page=1`;
  const response = await fetch(endpoint, {
    headers: {
      Authorization: `Bearer ${config.token}`,
      Accept: 'application/vnd.github+json'
    }
  });

  if (!response.ok) return null;

  const payload = await response.json();
  const run = Array.isArray(payload?.workflow_runs) ? payload.workflow_runs[0] : null;
  return run || null;
}

async function updateLiveStatus(section) {
  const liveUrl = LIVE_URLS[section] || LIVE_URLS['retro-events'];
  try {
    const response = await fetch(liveUrl, { method: 'HEAD', cache: 'no-store' });
    if (response.status === 200) {
      setPipelineStatus('live', '✅ Live', 'status-ok');
      return;
    }
  } catch (_error) {
    // Ignore and degrade gracefully.
  }

  setPipelineStatus('live', '⚠️ Live check pending', 'status-idle');
}

async function sendDiscordNotification(entry, section) {
  const webhook = localStorage.getItem('ccg_discord_webhook');
  if (!webhook || !entry) return;

  const payload = {
    content: '🆕 New retro content added!',
    embeds: [
      {
        title: entry.title || 'New retro item',
        url: buildFuturePageUrl(entry, section),
        description: 'New entry published via CCG admin',
        color: 5814783
      }
    ]
  };

  try {
    await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (_error) {
    // Do not block main commit flow.
  }
}

async function sendEmailNotification(entry, section) {
  const endpoint = localStorage.getItem('ccg_email_endpoint');
  if (!endpoint || !entry) return;

  const payload = {
    type: 'new_content',
    title: entry.title || 'Untitled',
    slug: entry.slug || entry.id || '',
    category: 'retro',
    section
  };

  try {
    await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (_error) {
    // Optional hook should fail silently.
  }
}

function buildFuturePageUrl(entry, section) {
  const slug = entry.slug || entry.id || '';
  const root = 'https://www.cheekycommodoregamer.co.uk';
  if (!slug) return LIVE_URLS[section] || `${root}/retro-events/`;
  return `${root}/${section}/${slug}/`;
}

function setPipelineStatus(kind, message, statusClass) {
  const node = kind === 'commit' ? el.commitStatus : kind === 'build' ? el.buildStatus : el.liveStatus;
  if (!node) return;

  node.textContent = message;
  node.classList.remove('status-idle', 'status-ok', 'status-running', 'status-error');
  node.classList.add(statusClass);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getLatestEntryForSection(section) {
  const items = state.events
    .filter((entry) => mapTypeToSection(entry?.type) === section)
    .sort((a, b) => (Number(b?.order) || 0) - (Number(a?.order) || 0));

  return items[0] || null;
}

function encodeBase64Unicode(input) {
  return btoa(unescape(encodeURIComponent(input)));
}

function decodeBase64Unicode(input) {
  const normalized = String(input || '').replace(/\s+/g, '');
  if (!normalized) return '';
  return decodeURIComponent(escape(atob(normalized)));
}

function getSectionPayload(section) {
  const sectionItems = state.events.filter((entry) => mapTypeToSection(entry?.type) === section);
  const sorted = [...sectionItems].sort((a, b) => {
    const aOrder = Number.isFinite(Number(a?.order)) ? Number(a.order) : Number.MAX_SAFE_INTEGER;
    const bOrder = Number.isFinite(Number(b?.order)) ? Number(b.order) : Number.MAX_SAFE_INTEGER;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return String(a?.title || '').localeCompare(String(b?.title || ''));
  });

  return sorted.map((entry, index) => ({
    ...entry,
    created_at: entry?.created_at || new Date().toISOString(),
    order: index
  }));
}

function mapTypeToSection(typeValue) {
  return TYPE_TO_SECTION[String(typeValue || '').trim()] || 'retro-events';
}

function onSaveEvent(event) {
  event.preventDefault();

  const title = (fields.title?.value || '').trim();
  const youtubeId = resolveYoutubeId((fields.youtubeId?.value || '').trim(), (fields.youtubeUrl?.value || '').trim());
  const section = mapTypeToSection(fields.type?.value);

  if (!title || !youtubeId) {
    setStatus('Title and YouTube ID/URL are required.', true);
    return;
  }

  const slug = toSlug((fields.slug?.value || '').trim() || title);

  const newItem = {
    id: slug,
    slug,
    type: section,
    title,
    youtubeId,
    thumbnail: `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`,
    membersOnly: Boolean(fields.membersOnly?.checked),
    order: getNextOrderForSection(section),
    summary: (fields.summary?.value || '').trim(),
    description: (fields.description?.value || '').trim(),
    collection: section,
    created_at: new Date().toISOString()
  };

  state.events.push(newItem);
  renderEvents();
  setStatus('Added item to in-memory draft. Click a Save button to commit JSON to GitHub.', false);
}

function getNextOrderForSection(section) {
  const sectionItems = state.events.filter((entry) => mapTypeToSection(entry?.type) === section);
  if (!sectionItems.length) return 0;

  return sectionItems.reduce((max, item) => {
    const current = Number(item?.order);
    return Number.isFinite(current) && current > max ? current : max;
  }, -1) + 1;
}

function resolveYoutubeId(rawId, rawUrl) {
  if (rawId) return rawId.replace(/[?&].*$/, '');
  if (!rawUrl) return '';

  const normalized = rawUrl.trim();
  const match = normalized.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{6,})/i);
  return match ? match[1] : normalized;
}

function renderEvents() {
  if (!el.list) return;

  const filterValue = el.typeFilter?.value || 'all';
  const items = state.events
    .filter((entry) => filterValue === 'all' || mapTypeToSection(entry?.type) === filterValue)
    .sort((a, b) => {
      const byType = mapTypeToSection(a?.type).localeCompare(mapTypeToSection(b?.type));
      if (byType !== 0) return byType;
      return (Number(a?.order) || 0) - (Number(b?.order) || 0);
    });

  el.list.innerHTML = '';

  items.forEach((item) => {
    const li = document.createElement('li');
    li.className = 'retro-item';
    li.innerHTML = `
      <div>
        <div class="retro-item-title">${escapeHtml(item.title || '(Untitled)')}</div>
        <div class="retro-item-sub">${escapeHtml(mapTypeToSection(item.type))} · order ${Number(item.order) || 0}${item.membersOnly ? ' · members only' : ''}</div>
      </div>
    `;
    el.list.appendChild(li);
  });
}

function resetForm() {
  el.form?.reset();
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function toSlug(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function setStatus(message, isError) {
  if (!el.status) return;
  el.status.textContent = message;
  el.status.classList.toggle('error', Boolean(isError));
  el.status.classList.toggle('ok', !isError);
}

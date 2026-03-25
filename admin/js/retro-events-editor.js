const DEFAULT_GITHUB_OWNER = 'joepentony-dot';
const DEFAULT_GITHUB_REPO = 'ccgamer_website_new';
const DEFAULT_GITHUB_BRANCH = 'main';

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

const TYPE_TO_SECTION = {
  'retro_event': 'retro-events',
  'retro-events': 'retro-events',
  'retro_special': 'retro-specials',
  'retro-specials': 'retro-specials',
  'demo_music': 'amiga-demo-music',
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
  clearToken: document.querySelector('[data-action="clear-token"]')
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
  const payload = JSON.stringify(getSectionPayload(section), null, 2) + '\n';

  try {
    const sha = await fetchFileSha(github.config, path);
    await putFileContent(github.config, path, payload, sha);
    setStatus(`✅ Committed ${path} to ${github.config.owner}/${github.config.repo}@${github.config.branch}.`, false);
  } catch (err) {
    setStatus(`❌ Save failed for ${path}: ${err.message}`, true);
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

async function fetchFileSha(config, path) {
  const endpoint = `https://api.github.com/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}/contents/${path}?ref=${encodeURIComponent(config.branch)}`;
  const response = await fetch(endpoint, {
    headers: {
      Authorization: `Bearer ${config.token}`,
      Accept: 'application/vnd.github+json'
    }
  });

  if (response.status === 404) return null;

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Unable to fetch file SHA (${response.status}). ${text.slice(0, 160)}`);
  }

  const fileData = await response.json();
  return fileData.sha || null;
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

function encodeBase64Unicode(input) {
  return btoa(unescape(encodeURIComponent(input)));
}

function getSectionPayload(section) {
  const sectionItems = state.events.filter((entry) => mapTypeToSection(entry?.type) === section);
  const sorted = [...sectionItems].sort((a, b) => {
    const aOrder = Number.isFinite(Number(a?.order)) ? Number(a.order) : Number.MAX_SAFE_INTEGER;
    const bOrder = Number.isFinite(Number(b?.order)) ? Number(b.order) : Number.MAX_SAFE_INTEGER;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return String(a?.title || '').localeCompare(String(b?.title || ''));
  });

  return sorted.map((entry, index) => ({ ...entry, order: index }));
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
    collection: section
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

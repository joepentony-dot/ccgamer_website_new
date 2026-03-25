// ===============================
// CCG EDITOR — GITHUB MODE (FULL FILE)
// ===============================

// ===============================
// GITHUB CONFIG
// ===============================

const GITHUB_OWNER = "joepentony-dot";
const GITHUB_REPO = "ccgamer_website_new";
const GITHUB_BRANCH = "main";

const GITHUB_TOKEN = sessionStorage.getItem("ccg_token") || prompt("Enter GitHub Token");
sessionStorage.setItem("ccg_token", GITHUB_TOKEN);

// ===============================
// DATA CONFIG
// ===============================

const DATA_FILES = {
  'retro-events': '/data/retro-events.json',
  'retro-specials': '/data/retro-specials.json',
  'amiga-demo-music': '/data/amiga-demo-music.json'
};

const SECTION_TYPES = {
  'retro-events': 'retro_event',
  'retro-specials': 'retro_special',
  'amiga-demo-music': 'demo_music'
};

const TYPE_TO_SECTION = Object.fromEntries(
  Object.entries(SECTION_TYPES).map(([section, type]) => [type, section])
);

const state = {
  events: [],
  editingId: null
};

const el = {
  status: document.querySelector('[data-status]'),
  form: document.querySelector('[data-form]'),
  formHeading: document.querySelector('[data-form-heading]'),
  list: document.querySelector('[data-event-list]'),
  saveRetroJson: document.querySelector('[data-action="save-retro-json"]'),
  saveSpecialsJson: document.querySelector('[data-action="save-specials-json"]'),
  saveDemoJson: document.querySelector('[data-action="save-demo-json"]'),
  resetForm: document.querySelector('[data-action="reset-form"]'),
  saveEvent: document.querySelector('[data-action="save-event"]'),
  builderButtons: Array.from(document.querySelectorAll('[data-builder-select]')),
  previewTitle: document.querySelector('[data-preview-title]'),
  previewThumb: document.querySelector('[data-preview-thumb]'),
  previewMembers: document.querySelector('[data-preview-members]'),
  typeFilter: document.querySelector('[data-filter="type"]')
};

const fields = {
  type: document.querySelector('[data-field="type"]'),
  title: document.querySelector('[data-field="title"]'),
  slug: document.querySelector('[data-field="slug"]'),
  youtubeUrl: document.querySelector('[data-field="youtubeUrl"]'),
  youtubeId: document.querySelector('[data-field="youtubeId"]'),
  publishedDate: document.querySelector('[data-field="publishedDate"]'),
  sortOrder: document.querySelector('[data-field="sortOrder"]'),
  summary: document.querySelector('[data-field="summary"]'),
  description: document.querySelector('[data-field="description"]'),
  visible: document.querySelector('[data-field="visible"]'),
  membersOnly: document.querySelector('[data-field="membersOnly"]'),
  seoTitle: document.querySelector('[data-field="seoTitle"]'),
  seoDescription: document.querySelector('[data-field="seoDescription"]')
};

init();

async function init() {
  bindEvents();
  await loadEvents();
  renderEvents();
  resetForm();
}

// ===============================
// EVENTS
// ===============================

function bindEvents() {
  el.form?.addEventListener('submit', onSaveEvent);
  el.resetForm?.addEventListener('click', resetForm);
  el.saveRetroJson?.addEventListener('click', () => saveJsonFile('retro_event'));
  el.saveSpecialsJson?.addEventListener('click', () => saveJsonFile('retro_special'));
  el.saveDemoJson?.addEventListener('click', () => saveJsonFile('demo_music'));
  el.typeFilter?.addEventListener('change', renderEvents);
}

// ===============================
// LOAD DATA
// ===============================

async function loadEvents() {
  try {
    const sections = Object.keys(DATA_FILES);
    const responses = await Promise.all(sections.map((section) => loadData(section)));

    state.events = responses.flatMap((items) => (Array.isArray(items) ? items : []));
    setStatus(`Loaded ${state.events.length} entries.`, false);

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

// ===============================
// SAVE TO GITHUB (CORE FIX)
// ===============================

async function saveJsonFile(type) {
  const section = TYPE_TO_SECTION[type] || 'retro-events';
  const fileName = `${section}.json`;
  const path = `data/${fileName}`;

  const payload = JSON.stringify(state.events, null, 2);

  try {
    // Get SHA
    const getRes = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`, {
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`
      }
    });

    const fileData = await getRes.json();
    const sha = fileData.sha;

    const content = btoa(unescape(encodeURIComponent(payload)));

    // Commit
    const putRes = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`, {
      method: "PUT",
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: `Update ${fileName} via editor`,
        content,
        sha,
        branch: GITHUB_BRANCH
      })
    });

    if (!putRes.ok) throw new Error("Commit failed");

    setStatus("✅ Saved to GitHub. Auto rebuild running...", false);

  } catch (err) {
    setStatus(`❌ Save failed: ${err.message}`, true);
  }
}

// ===============================
// BASIC UI
// ===============================

function onSaveEvent(e) {
  e.preventDefault();

  const newItem = {
    id: fields.slug.value,
    type: fields.type.value,
    title: fields.title.value,
    youtube_video_id: fields.youtubeId.value
  };

  state.events.push(newItem);
  renderEvents();
  setStatus("Added item (not yet saved to GitHub)", false);
}

function renderEvents() {
  if (!el.list) return;

  el.list.innerHTML = '';

  state.events.forEach((item) => {
    const li = document.createElement('li');
    li.textContent = `${item.title} (${item.type})`;
    el.list.appendChild(li);
  });
}

function resetForm() {
  el.form?.reset();
}

// ===============================
// STATUS
// ===============================

function setStatus(message, isError) {
  if (!el.status) return;
  el.status.textContent = message;
  el.status.className = isError ? 'error' : 'ok';
}
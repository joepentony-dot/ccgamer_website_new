const DATA_PATH = '/games/collections/retro-events.json';

const state = {
  events: [],
  editingId: null
};

const el = {
  status: document.querySelector('[data-status]'),
  form: document.querySelector('[data-form]'),
  formHeading: document.querySelector('[data-form-heading]'),
  list: document.querySelector('[data-event-list]'),
  saveJson: document.querySelector('[data-action="save-json"]'),
  resetForm: document.querySelector('[data-action="reset-form"]'),
  saveEvent: document.querySelector('[data-action="save-event"]'),
  builderButtons: Array.from(document.querySelectorAll('[data-builder-select]')),
  previewTitle: document.querySelector('[data-preview-title]'),
  previewThumb: document.querySelector('[data-preview-thumb]'),
  previewMembers: document.querySelector('[data-preview-members]')
};

const fields = {
  title: document.querySelector('[data-field="title"]'),
  youtubeId: document.querySelector('[data-field="youtubeId"]'),
  membersOnly: document.querySelector('[data-field="membersOnly"]')
};

init();

async function init() {
  bindEvents();
  await loadEvents();
  renderEvents();
  renderPreview();
}

function bindEvents() {
  el.form?.addEventListener('submit', onSaveEvent);
  el.resetForm?.addEventListener('click', resetForm);
  el.saveJson?.addEventListener('click', saveJsonFile);
  el.builderButtons.forEach((button) => {
    button.addEventListener('click', () => {
      if (button.dataset.builderSelect === 'game') {
        window.location.href = '/admin/games-editor.html';
      }
    });
  });

  document.addEventListener('input', (event) => {
    if (!event.target.matches('[data-field]')) return;
    renderPreview();
  });

  document.addEventListener('change', (event) => {
    if (!event.target.matches('[data-field]')) return;
    renderPreview();
  });
}

async function loadEvents() {
  try {
    const response = await fetch(DATA_PATH, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`Failed to load retro-events.json (${response.status})`);
    }
    const data = await response.json();
    state.events = sanitizeEvents(data);
    setStatus(`Loaded ${state.events.length} retro events.`, false);
  } catch (error) {
    state.events = [];
    setStatus(error.message, true);
  }
}

function sanitizeEvents(data) {
  if (!Array.isArray(data)) return [];
  return data
    .map((event) => ({
      id: String(event?.id || '').trim(),
      title: String(event?.title || '').trim(),
      youtubeId: String(event?.youtubeId || '').trim(),
      membersOnly: event?.membersOnly === true
    }))
    .filter((event) => event.id && event.title && event.youtubeId);
}

function onSaveEvent(event) {
  event.preventDefault();

  const title = fields.title.value.trim();
  const youtubeId = fields.youtubeId.value.trim();
  const membersOnly = fields.membersOnly.checked;
  const id = `retro-events-${slugify(title)}`;

  const next = { id, title, youtubeId, membersOnly };
  const validationErrors = validateEvent(next);
  if (validationErrors.length) {
    setStatus(validationErrors.join(' '), true);
    return;
  }

  if (state.editingId) {
    const idx = state.events.findIndex((item) => item.id === state.editingId);
    if (idx >= 0) {
      state.events[idx] = next;
      setStatus(`Updated retro event "${next.title}".`, false);
    }
  } else {
    state.events.push(next);
    setStatus(`Added retro event "${next.title}".`, false);
  }

  resetForm();
  renderEvents();
}

function validateEvent(next) {
  const errors = [];
  if (!next.title) errors.push('SEO Title is required.');
  if (!next.youtubeId) errors.push('YouTube Video ID is required.');
  if (!/^[A-Za-z0-9_-]{6,20}$/.test(next.youtubeId)) {
    errors.push('YouTube Video ID format looks invalid.');
  }

  const duplicate = state.events.find((item) => item.id === next.id && item.id !== state.editingId);
  if (duplicate) {
    errors.push(`An event with this title-derived id already exists: "${next.id}".`);
  }

  return errors;
}

function renderPreview() {
  const title = fields.title.value.trim() || 'Retro Event Title';
  const youtubeId = fields.youtubeId.value.trim() || 'dQw4w9WgXcQ';
  if (el.previewTitle) el.previewTitle.textContent = title;
  if (el.previewThumb) el.previewThumb.src = `https://img.youtube.com/vi/${encodeURIComponent(youtubeId)}/hqdefault.jpg`;
  if (el.previewMembers) {
    el.previewMembers.hidden = !fields.membersOnly.checked;
  }
}

function renderEvents() {
  el.list.innerHTML = '';

  if (!state.events.length) {
    el.list.innerHTML = '<li class="retro-item"><span class="retro-item-title">No events yet.</span></li>';
    return;
  }

  state.events.forEach((eventItem) => {
    const item = document.createElement('li');
    item.className = 'retro-item';

    item.innerHTML = `
      <div>
        <span class="retro-item-title">${escapeHtml(eventItem.title)}</span>
        ${eventItem.membersOnly ? '<span class="retro-pill members">Members Only</span>' : ''}
        <div class="retro-item-sub">${escapeHtml(eventItem.id)} · ${escapeHtml(eventItem.youtubeId)}</div>
      </div>
      <div class="retro-item-buttons">
        <button type="button" class="ccg-btn ccg-btn--ghost" data-action="edit" data-id="${escapeHtml(eventItem.id)}">Edit</button>
        <button type="button" class="ccg-btn ccg-btn--ghost" data-action="delete" data-id="${escapeHtml(eventItem.id)}">Delete</button>
      </div>
    `;

    item.querySelector('[data-action="edit"]')?.addEventListener('click', () => startEdit(eventItem.id));
    item.querySelector('[data-action="delete"]')?.addEventListener('click', () => deleteEvent(eventItem.id));

    el.list.appendChild(item);
  });
}

function startEdit(id) {
  const eventItem = state.events.find((entry) => entry.id === id);
  if (!eventItem) return;

  state.editingId = id;
  fields.title.value = eventItem.title;
  fields.youtubeId.value = eventItem.youtubeId;
  fields.membersOnly.checked = eventItem.membersOnly;

  el.formHeading.textContent = `Edit Retro Event: ${eventItem.title}`;
  el.saveEvent.textContent = 'Save / Update';
  renderPreview();
}

function deleteEvent(id) {
  const eventItem = state.events.find((entry) => entry.id === id);
  if (!eventItem) return;

  state.events = state.events.filter((entry) => entry.id !== id);
  if (state.editingId === id) {
    resetForm();
  }
  renderEvents();
  setStatus(`Deleted retro event "${eventItem.title}".`, false);
}

async function saveJsonFile() {
  const payload = JSON.stringify(state.events, null, 2);

  if (typeof window.showSaveFilePicker === 'function') {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: 'retro-events.json',
        types: [{ description: 'JSON Files', accept: { 'application/json': ['.json'] } }]
      });
      const writable = await handle.createWritable();
      await writable.write(payload + '\n');
      await writable.close();
      setStatus('Saved retro-events.json using file picker.', false);
      return;
    } catch (error) {
      setStatus(`File picker save cancelled or failed: ${error.message}`, true);
      return;
    }
  }

  const blob = new Blob([payload + '\n'], { type: 'application/json' });
  const anchor = document.createElement('a');
  anchor.href = URL.createObjectURL(blob);
  anchor.download = 'retro-events.json';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(anchor.href);
  setStatus('Downloaded retro-events.json. Replace /games/collections/retro-events.json with this file.', false);
}

function resetForm() {
  state.editingId = null;
  el.form?.reset();
  fields.membersOnly.checked = false;
  el.formHeading.textContent = 'Add Retro Event';
  el.saveEvent.textContent = 'Save / Update';
  renderPreview();
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function setStatus(message, isError) {
  if (!el.status) return;
  el.status.textContent = message;
  el.status.className = `retro-status ${isError ? 'error' : 'ok'}`;
}
